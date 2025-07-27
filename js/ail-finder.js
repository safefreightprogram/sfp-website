// js/ail-finder.js
let map, markers = [], ailData = [], mapInitialized = false, ailFinderComponent = null;

const australiaBounds = { north: -5.0, south: -48.0, west: 108.0, east: 158.0 };
const stateBounds = {
  NSW: { north: -28.15, south: -37.5, west: 140.9, east: 153.6 },
  QLD: { north: -10.0, south: -29.2, west: 137.9, east: 154.0 },
  VIC: { north: -33.9, south: -39.2, west: 140.9, east: 150.0 },
  SA: { north: -25.9, south: -38.1, west: 129.0, east: 141.0 },
  WA: { north: -13.7, south: -35.1, west: 112.9, east: 129.0 },
  NT: { north: -10.9, south: -26.0, west: 129.0, east: 138.0 },
  TAS: { north: -39.2, south: -43.6, west: 143.8, east: 148.4 }
};

function domainStyleAilFinder() {
  return {
    filteredLocations: [], selectedLocation: null, loadingLocation: false, loading: true,
    userLocation: null, selectedState: 'all', searchQuery: '', showFilters: false, showList: false,
    showSearchResults: false, searchSuggestions: [], highlightedIndex: -1,
    stateOptions: [
      { value: 'all', label: 'All States' }, { value: 'NSW', label: 'NSW' }, { value: 'QLD', label: 'QLD' },
      { value: 'VIC', label: 'VIC' }, { value: 'SA', label: 'SA' }, { value: 'WA', label: 'WA' },
      { value: 'NT', label: 'NT' }, { value: 'TAS', label: 'TAS' }
    ],

    async init() {
      ailFinderComponent = this;
      try {
        const paths = ['./data/ail-locations.json', 'data/ail-locations.json', '/data/ail-locations.json', './ail-locations.json'];
        let response, jsonText;
        
        for (const path of paths) {
          try {
            response = await fetch(path);
            if (response.ok) { jsonText = await response.text(); break; }
          } catch (e) { continue; }
        }
        
        if (!response?.ok || !jsonText) throw new Error('Could not find ail-locations.json');
        
        let rawData = JSON.parse(jsonText);
        console.log('Raw data sample:', rawData[0]); // Debug log
        ailData = rawData.map(location => {
          const lat = parseFloat(location.lat);
          const lng = parseFloat(location.lng);
          
          // More restrictive land-based coordinate validation for Australia
          const isValidMainlandLat = lat >= -43.5 && lat <= -9.5; // Tighter mainland bounds
          const isValidMainlandLng = lng >= 113.5 && lng <= 153.5; // Tighter mainland bounds
          
          // Check for suspicious coordinates that might be in water
          const isPossiblyOffshore = (
            // Queensland coast edge
            (lat >= -28 && lat <= -10 && lng >= 152.8) ||
            // NSW coast edge  
            (lat >= -37 && lat <= -28 && lng >= 151.5) ||
            // Tasmania edge
            (lat >= -43.5 && lat <= -40 && (lng <= 144 || lng >= 148.5)) ||
            // WA coast edge
            (lat >= -35 && lat <= -13 && lng <= 114.5) ||
            // SA coast edge
            (lat >= -38 && lat <= -32 && lng <= 135.5)
          );
          
          if (!isValidMainlandLat || !isValidMainlandLng) {
            console.warn(`⚠️ OUTSIDE AUSTRALIA: ${location.name} - lat: ${lat}, lng: ${lng}`);
          }
          
          if (isPossiblyOffshore) {
            console.warn(`🌊 POSSIBLY OFFSHORE: ${location.name} - lat: ${lat}, lng: ${lng} (${location.suburb}, ${location.state})`);
          }
          
          console.log(`Processing: ${location.name} - lat: ${lat}, lng: ${lng}`); // Debug log
          return {
            ...location, 
            lat: lat, 
            lng: lng,
            id: parseInt(location.id), 
            address: location.address || null,
            suburb: location.suburb || null, 
            inspector: location.inspector || '-'
          };
        }).filter(location => {
          const isValid = !isNaN(location.lat) && !isNaN(location.lng) && location.lat && location.lng;
          
          // Additional filter to exclude likely offshore coordinates
          const isProbablyOnshore = !(
            // Exclude far east Queensland (Coral Sea)
            (location.lat >= -28 && location.lat <= -10 && location.lng >= 152.8) ||
            // Exclude far east NSW (Tasman Sea)  
            (location.lat >= -37 && location.lat <= -28 && location.lng >= 151.5) ||
            // Exclude far west WA (Indian Ocean)
            (location.lat >= -35 && location.lat <= -13 && location.lng <= 114.5)
          );
          
          if (!isValid) console.log(`❌ Invalid coordinates for: ${location.name}`);
          if (!isProbablyOnshore) console.log(`🌊 FILTERED OFFSHORE: ${location.name} - lat: ${location.lat}, lng: ${location.lng}`);
          
          return isValid && isProbablyOnshore;
        });
        
        this.filteredLocations = [...ailData];
        this.loading = false;
        
        setTimeout(() => { if (window.google?.maps && !mapInitialized) initMap(); }, 500);
        setTimeout(() => { if (window.google?.maps && mapInitialized && markers.length === 0) loadMarkers(); }, 2000);
      } catch (error) {
        console.error('Error loading AIL data:', error);
        this.loading = false;
        alert('Unable to load AIL location data. Please check your internet connection and try again.');
      }
    },

    clearAllFilters() {
      this.selectedState = 'all'; 
      this.searchQuery = ''; 
      this.showFilters = false;
      this.selectedLocation = null;
      this.showList = false;
      this.showSearchResults = false;
      this.searchSuggestions = [];
      this.filterLocations();
      if (mapInitialized) setTimeout(() => this.fitMapToAustralia(), 100);
    },

    selectState(state) {
      this.selectedState = state; this.filterLocations();
      if (mapInitialized) setTimeout(() => state !== 'all' ? this.zoomToState(state) : this.fitMapToAustralia(), 100);
    },

    handleSearch() { 
      this.filterLocations(); 
      this.updateSearchSuggestions();
      this.highlightedIndex = -1; // Reset highlighting when search changes
    },

    handleKeydown(event) {
      if (!this.showSearchResults || this.searchSuggestions.length === 0) return;
      
      const maxIndex = Math.min(this.searchSuggestions.length - 1, 7); // Max 8 items shown
      
      switch(event.key) {
        case 'ArrowDown':
          event.preventDefault();
          this.highlightedIndex = this.highlightedIndex < maxIndex ? this.highlightedIndex + 1 : 0;
          this.scrollToHighlighted();
          break;
          
        case 'ArrowUp':
          event.preventDefault();
          this.highlightedIndex = this.highlightedIndex > 0 ? this.highlightedIndex - 1 : maxIndex;
          this.scrollToHighlighted();
          break;
          
        case 'Enter':
          event.preventDefault();
          if (this.highlightedIndex >= 0 && this.highlightedIndex <= maxIndex) {
            this.selectSuggestion(this.searchSuggestions[this.highlightedIndex]);
          }
          break;
          
        case 'Escape':
          this.showSearchResults = false;
          this.highlightedIndex = -1;
          break;
      }
    },

    scrollToHighlighted() {
      // Scroll the highlighted item into view
      setTimeout(() => {
        const dropdown = document.querySelector('[x-show="showSearchResults && searchQuery.trim() !== \'\' && searchSuggestions.length > 0"]');
        const highlighted = dropdown?.children[this.highlightedIndex];
        if (highlighted) {
          highlighted.scrollIntoView({ 
            block: 'nearest', 
            behavior: 'smooth' 
          });
        }
      }, 10);
    },

    updateSearchSuggestions() {
      if (this.searchQuery.trim() === '') {
        this.searchSuggestions = [];
        this.highlightedIndex = -1;
        return;
      }
      
      const query = this.searchQuery.toLowerCase().trim();
      console.log(`🔍 UPDATING SUGGESTIONS for: "${query}"`);
      
      let suggestions = ailData.filter(location => 
        location.name.toLowerCase().includes(query) ||
        (location.suburb && location.suburb.toLowerCase().includes(query)) ||
        location.state.toLowerCase().includes(query) ||
        (location.address && location.address.toLowerCase().includes(query))
      );
      
      // Filter by selected state if applicable
      if (this.selectedState !== 'all') {
        suggestions = suggestions.filter(location => location.state === this.selectedState);
      }
      
      console.log(`💡 Found ${suggestions.length} suggestions`);
      this.searchSuggestions = suggestions.slice(0, 10); // Limit to 10 suggestions
      this.highlightedIndex = -1; // Reset highlighting when suggestions change
    },

    selectSuggestion(suggestion) {
      this.searchQuery = suggestion.name;
      this.showSearchResults = false;
      this.highlightedIndex = -1;
      this.selectedLocation = suggestion;
      this.filterLocations();
      
      // Center map on selected location
      if (mapInitialized) {
        setTimeout(() => {
          map.setCenter({ lat: suggestion.lat, lng: suggestion.lng });
          map.setZoom(12);
        }, 100);
      }
    },

    filterLocations() {
      console.log(`🔍 FILTERING: State="${this.selectedState}", Search="${this.searchQuery}"`);
      
      let filtered = [...ailData];
      
      // Filter by state first
      if (this.selectedState !== 'all') {
        filtered = filtered.filter(location => location.state === this.selectedState);
        console.log(`📍 After state filter (${this.selectedState}): ${filtered.length} locations`);
      }
      
      // Filter by search query
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase().trim();
        const beforeCount = filtered.length;
        
        filtered = filtered.filter(location => 
          location.name.toLowerCase().includes(query) ||
          (location.suburb && location.suburb.toLowerCase().includes(query)) ||
          location.state.toLowerCase().includes(query) ||
          (location.address && location.address.toLowerCase().includes(query))
        );
        
        console.log(`🔍 After search filter ("${query}"): ${filtered.length} locations (was ${beforeCount})`);
      }
      
      this.filteredLocations = filtered;
      console.log(`✅ FINAL RESULT: ${this.filteredLocations.length} locations shown`);
      
      // Update map markers
      if (mapInitialized) {
        this.updateMapMarkers();
      }
    },

    updateMapMarkers() {
      markers.forEach(marker => {
        const shouldShow = this.filteredLocations.some(filtered => 
          Math.abs(filtered.lat - marker.getPosition().lat()) < 0.0001 && 
          Math.abs(filtered.lng - marker.getPosition().lng()) < 0.0001
        );
        marker.setVisible(shouldShow);
      });
    },

    findNearest() {
      if (!navigator.geolocation) { alert('Geolocation is not supported by this browser.'); return; }
      this.loadingLocation = true;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
          const locationsWithDistance = ailData.map(location => ({
            ...location, distance: this.calculateDistance(this.userLocation.lat, this.userLocation.lng, location.lat, location.lng)
          })).sort((a, b) => a.distance - b.distance);
          this.filteredLocations = locationsWithDistance; this.selectedState = 'all'; this.searchQuery = '';
          if (mapInitialized) { map.setCenter(this.userLocation); map.setZoom(10); }
          this.loadingLocation = false;
        },
        (error) => { console.error('Error getting location:', error); alert('Unable to get your location. Please check your browser permissions.'); this.loadingLocation = false; }
      );
    },

    returnToAustraliaView() {
      this.userLocation = null;
      this.filteredLocations = [...ailData];
      this.selectedState = 'all';
      this.searchQuery = '';
      if (mapInitialized) {
        setTimeout(() => this.fitMapToAustralia(), 100);
      }
    },

    calculateDistance(lat1, lng1, lat2, lng2) {
      const R = 6371, dLat = this.toRadians(lat2 - lat1), dLng = this.toRadians(lng2 - lng1);
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    },

    toRadians(degrees) { return degrees * (Math.PI/180); },

    getDisplayAddress(location) {
      if (location.address === 'Mobile Inspector') return `Mobile Inspector - ${location.state}`;
      const parts = [];
      if (location.address) parts.push(location.address);
      if (location.suburb) parts.push(location.suburb);
      if (location.state && location.postcode) parts.push(`${location.state} ${location.postcode}`);
      return parts.join(', ');
    },

    getDirections(location) {
      const address = this.getDisplayAddress(location), encodedAddress = encodeURIComponent(address);
      const googleMapsApp = `comgooglemaps://?daddr=${encodedAddress}`;
      const googleMapsWeb = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
      if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        window.location.href = googleMapsApp;
        setTimeout(() => window.open(googleMapsWeb, '_blank'), 1000);
      } else window.open(googleMapsWeb, '_blank');
    },

    hasNamedInspector(location) { return location.inspector && location.inspector !== '-'; },

    viewOnMap(location) {
      this.selectedLocation = location; this.showList = false;
      if (mapInitialized) this.zoomToLocation(location);
    },

    zoomToLocation(location) {
      if (!mapInitialized) return;
      setTimeout(() => { google.maps.event.trigger(map, 'resize'); map.setCenter({ lat: location.lat, lng: location.lng }); map.setZoom(12); }, 100);
    },

    zoomToState(state) {
      if (!mapInitialized || !stateBounds[state]) return;
      const bounds = stateBounds[state];
      setTimeout(() => {
        google.maps.event.trigger(map, 'resize');
        const mapBounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(bounds.south, bounds.west),
          new google.maps.LatLng(bounds.north, bounds.east)
        );
        map.fitBounds(mapBounds);
        setTimeout(() => {
          const currentZoom = map.getZoom();
          let zoomReduction = ['TAS', 'NT'].includes(state) ? 0.3 : (['SA', 'VIC'].includes(state) ? 0.4 : 0.5);
          if (currentZoom > 5) map.setZoom(Math.max(currentZoom - zoomReduction, 5));
        }, 200);
      }, 50);
    },

    fitMapToAustralia() {
      if (!mapInitialized) return;
      setTimeout(() => {
        google.maps.event.trigger(map, 'resize');
        const bounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(australiaBounds.south, australiaBounds.west),
          new google.maps.LatLng(australiaBounds.north, australiaBounds.east)
        );
        map.fitBounds(bounds);
        setTimeout(() => map.setZoom(Math.max(map.getZoom() - 0.5, 4.0)), 300);
      }, 100);
    }
  }
}

function initMap() {
  try {
    map = new google.maps.Map(document.getElementById("map"), {
      zoom: 5, center: { lat: -25.0, lng: 134.0 }, mapTypeId: 'roadmap',
      zoomControl: true, zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
      streetViewControl: false, mapTypeControl: false, fullscreenControl: false, disableDefaultUI: false,
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] }
      ]
    });
    mapInitialized = true;
    if (ailData.length > 0) loadMarkers();
    setTimeout(() => {
      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(australiaBounds.south, australiaBounds.west),
        new google.maps.LatLng(australiaBounds.north, australiaBounds.east)
      );
      map.fitBounds(bounds);
      setTimeout(() => map.setZoom(Math.max(map.getZoom() - 0.5, 4.0)), 300);
    }, 100);
    map.addListener('click', () => { if (ailFinderComponent?.selectedLocation) ailFinderComponent.selectedLocation = null; });
  } catch (error) { console.error('Error initializing map:', error); }
}

function loadMarkers() {
  if (!mapInitialized || !ailData.length) return;
  console.log(`Loading ${ailData.length} markers...`);
  markers.forEach(marker => marker.setMap(null));
  markers = [];
  ailData.forEach(ail => {
    try {
      console.log(`Creating marker for: ${ail.name} at lat: ${ail.lat}, lng: ${ail.lng}`); // Debug log
      const marker = new google.maps.Marker({
        position: { lat: ail.lat, lng: ail.lng }, map: map, title: ail.name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg"><defs><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><dropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.3"/></filter></defs><path d="M16 0C7.2 0 0 7.2 0 16c0 8.8 16 24 16 24s16-15.2 16-24C32 7.2 24.8 0 16 0z" fill="#1e40af" stroke="white" stroke-width="2" filter="url(#shadow)"/><circle cx="16" cy="16" r="8" fill="white"/><circle cx="16" cy="16" r="4" fill="#1e40af"/></svg>`),
          scaledSize: new google.maps.Size(32, 40), anchor: new google.maps.Point(16, 40)
        },
        animation: google.maps.Animation.DROP
      });
      marker.addListener("click", () => { if (ailFinderComponent) { ailFinderComponent.selectedLocation = ail; map.panTo(marker.getPosition()); } });
      markers.push(marker);
    } catch (error) { console.error(`Error creating marker for ${ail.name}:`, error); }
  });
  console.log(`Successfully loaded ${markers.length} markers on map`);
}

window.initMap = initMap;
document.addEventListener('DOMContentLoaded', () => { if (window.google?.maps && !mapInitialized) setTimeout(initMap, 1000); });

// Component loader
async function loadComponent(elementId, componentPath) {
  try {
    const response = await fetch(componentPath);
    if (response.ok) document.getElementById(elementId).innerHTML = await response.text();
    else console.error(`Failed to load component: ${componentPath}`);
  } catch (error) { console.error(`Error loading component ${componentPath}:`, error); }
}

document.addEventListener('DOMContentLoaded', () => {
  loadComponent('header-component', '/components/header.html');
  loadComponent('footer-component', '/components/footer.html');
});
