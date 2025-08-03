let map, markers = [], ailData = [], mapInitialized = false, ailFinderComponent = null;

// Expanded Australia bounds to ensure Tasmania and top end are included
const australiaBounds = { 
  north: -8.0,    // Top end (Darwin area)
  south: -43.8,   // Tasmania bottom
  west: 112.0,    // Western Australia
  east: 154.0     // Eastern coast
};

const stateBounds = {
  NSW: { north: -28.15, south: -37.5, west: 140.9, east: 153.6 },
  QLD: { north: -10.0, south: -29.2, west: 137.9, east: 154.0 },
  VIC: { north: -33.9, south: -39.2, west: 140.9, east: 150.0 },
  SA: { north: -25.9, south: -38.1, west: 129.0, east: 141.0 },
  WA: { north: -13.7, south: -35.1, west: 112.9, east: 129.0 },
  NT: { north: -10.9, south: -26.0, west: 129.0, east: 138.0 },
  TAS: { north: -39.2, south: -43.6, west: 143.8, east: 148.4 }
};

function initMap() {
  try {
    map = new google.maps.Map(document.getElementById("map"), {
      zoom: 5,
      center: { lat: -25.0, lng: 134.0 },
      mapTypeId: 'roadmap',
      zoomControl: true,
      zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
      disableDefaultUI: false,
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] }
      ]
    });

    mapInitialized = true;

    // Wait for map to be fully loaded before fitting bounds
    google.maps.event.addListenerOnce(map, 'idle', () => {
      // Trigger a resize to ensure proper rendering
      google.maps.event.trigger(map, 'resize');
      
      // Fit Australia bounds after a short delay
      setTimeout(() => {
        if (ailFinderComponent) {
          ailFinderComponent.fitMapToAustralia();
        }
      }, 500);
    });

    // Clear selected location when clicking on map
    map.addListener('click', () => {
      if (ailFinderComponent?.selectedLocation) ailFinderComponent.selectedLocation = null;
    });

  } catch (error) {
    console.error('Error initializing map:', error);
  }
}

function loadMarkers() {
  if (!mapInitialized || !ailData.length) return;

  markers.forEach(marker => marker.setMap(null));
  markers = [];

  ailData.forEach(ail => {
    const marker = new google.maps.Marker({
      position: new google.maps.LatLng(ail.lat, ail.lng),
      map: map,
      title: ail.name,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="6" fill="#1e40af" stroke="white" stroke-width="2"/>
          </svg>`),
        scaledSize: new google.maps.Size(16, 16),
        anchor: new google.maps.Point(8, 8)
      },
      animation: google.maps.Animation.DROP
    });

    marker.addListener("click", () => {
      if (ailFinderComponent) {
        ailFinderComponent.selectedLocation = ail;
        map.panTo(marker.getPosition());
      }
    });

    markers.push(marker);
  });

  // Ensure map is resized and fitted after markers are loaded
  setTimeout(() => {
    google.maps.event.trigger(map, 'resize');
    if (ailFinderComponent) {
      ailFinderComponent.fitMapToAustralia();
    }
  }, 500);
}

function domainStyleAilFinder() {
  return {
    filteredLocations: [],
    selectedLocation: null,
    loadingLocation: false,
    loading: true,
    userLocation: null,
    selectedState: 'all',
    searchQuery: '',
    showFilters: false,
    showList: false,
    showSearchResults: false,
    searchSuggestions: [],
    highlightedIndex: -1,
    showSearch: false,
    showStateDropdown: false,
    showMobileFilters: false,
    stateOptions: [
      { value: 'all', label: 'All States' },
      { value: 'NSW', label: 'NSW' }, { value: 'QLD', label: 'QLD' },
      { value: 'VIC', label: 'VIC' }, { value: 'SA', label: 'SA' },
      { value: 'WA', label: 'WA' }, { value: 'NT', label: 'NT' },
      { value: 'TAS', label: 'TAS' }
    ],

    async init() {
      ailFinderComponent = this;
      try {
        const paths = ['./data/ail-locations.json', 'data/ail-locations.json', '/data/ail-locations.json', './ail-locations.json'];
        let jsonText = null;
        for (const path of paths) {
          try {
            const response = await fetch(path);
            if (response.ok) {
              jsonText = await response.text();
              break;
            }
          } catch (e) {}
        }

        if (!jsonText) throw new Error('Could not load AIL data');

        const rawData = JSON.parse(jsonText);
        ailData = rawData.map(loc => ({
          ...loc,
          lat: parseFloat(loc.lat),
          lng: parseFloat(loc.lng),
          id: parseInt(loc.id),
          address: loc.address || '',
          suburb: loc.suburb || '',
          inspector: loc.inspector || '-'
        })).filter(loc => !isNaN(loc.lat) && !isNaN(loc.lng));

        this.filteredLocations = [...ailData];
        this.loading = false;

        if (mapInitialized) {
          loadMarkers();
        } else {
          // Wait for map initialization
          setTimeout(() => {
            if (window.google?.maps && !mapInitialized) {
              initMap();
            }
          }, 500);
        }

      } catch (err) {
        console.error('Failed to load locations:', err);
        this.loading = false;
        alert('Failed to load location data.');
      }
    },

    returnToAustraliaView() {
      this.userLocation = null;
      this.selectedState = 'all';
      this.searchQuery = '';
      this.filteredLocations = [...ailData];

      if (mapInitialized) {
        this.updateMapMarkers();
        this.fitMapToAustralia();
      }
    },

    filterLocations() {
      let filtered = [...ailData];

      if (this.selectedState !== 'all') {
        filtered = filtered.filter(loc => loc.state === this.selectedState);
      }

      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase().trim();
        filtered = filtered.filter(loc =>
          loc.name.toLowerCase().includes(q) ||
          loc.suburb.toLowerCase().includes(q) ||
          loc.address.toLowerCase().includes(q) ||
          loc.state.toLowerCase().includes(q)
        );
      }

      this.filteredLocations = filtered;

      if (mapInitialized) this.updateMapMarkers();
    },

    updateMapMarkers() {
      if (!mapInitialized) return;
      markers.forEach(marker => {
        const match = this.filteredLocations.find(loc =>
          Math.abs(marker.getPosition().lat() - loc.lat) < 0.0001 &&
          Math.abs(marker.getPosition().lng() - loc.lng) < 0.0001
        );
        marker.setVisible(!!match);
      });
    },

    selectState(state) {
      this.selectedState = state;
      this.filterLocations();

      if (!mapInitialized) return;

      setTimeout(() => {
        const bounds = state === 'all'
          ? new google.maps.LatLngBounds(
              new google.maps.LatLng(australiaBounds.south, australiaBounds.west),
              new google.maps.LatLng(australiaBounds.north, australiaBounds.east))
          : new google.maps.LatLngBounds(
              new google.maps.LatLng(stateBounds[state].south, stateBounds[state].west),
              new google.maps.LatLng(stateBounds[state].north, stateBounds[state].east));
        
        map.fitBounds(bounds, { padding: 20 }); // Add padding for better fit
      }, 300);
    },

    handleSearch() {
      this.filterLocations();
      this.updateSearchSuggestions();
      this.highlightedIndex = -1; // Reset highlight when search changes
    },

    clearAllFilters() {
      this.selectedState = 'all';
      this.searchQuery = '';
      this.filterLocations();
      if (mapInitialized) this.fitMapToAustralia();
    },

    fitMapToAustralia() {
      if (!mapInitialized) return;
      
      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(australiaBounds.south, australiaBounds.west),
        new google.maps.LatLng(australiaBounds.north, australiaBounds.east)
      );
      
      // Use fitBounds with padding to ensure everything fits nicely
      map.fitBounds(bounds, { padding: 40 });
      
      // Optional: Set a maximum zoom level to ensure we don't zoom in too much
      setTimeout(() => {
        const currentZoom = map.getZoom();
        if (currentZoom > 6) {
          map.setZoom(6);
        }
      }, 500);
    },

    findNearest() {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }

      this.loadingLocation = true;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.userLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          };

          const sorted = ailData.map(loc => ({
            ...loc,
            distance: this.calculateDistance(
              this.userLocation.lat,
              this.userLocation.lng,
              loc.lat,
              loc.lng
            )
          })).sort((a, b) => a.distance - b.distance);

          this.filteredLocations = sorted;
          this.selectedState = 'all';
          this.searchQuery = '';

          if (mapInitialized) {
            map.setCenter(this.userLocation);
            map.setZoom(10);
            this.updateMapMarkers();
          }

          this.loadingLocation = false;
        },
        (err) => {
          console.error('Geolocation error:', err);
          alert('Unable to access your location. Please check browser settings.');
          this.loadingLocation = false;
        }
      );
    },

    calculateDistance(lat1, lng1, lat2, lng2) {
      const R = 6371;
      const dLat = this.toRadians(lat2 - lat1);
      const dLng = this.toRadians(lng2 - lng1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },

    toRadians(deg) {
      return deg * (Math.PI / 180);
    },

    getDisplayAddress(loc) {
      if (loc.address === 'Mobile Inspector') return `Mobile Inspector – ${loc.state}`;
      return [loc.address, loc.suburb, loc.state + ' ' + loc.postcode].filter(Boolean).join(', ');
    },

    hasNamedInspector(loc) {
      return loc.inspector && loc.inspector !== '-';
    },

    getDirections(loc) {
      const encoded = encodeURIComponent(this.getDisplayAddress(loc));
      const web = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
      window.open(web, '_blank');
    },

    viewOnMap(loc) {
      this.selectedLocation = loc;
      this.showList = false;
      if (mapInitialized) {
        const pos = new google.maps.LatLng(loc.lat, loc.lng);
        map.setCenter(pos);
        map.setZoom(12);
      }
    },

    updateSearchSuggestions() {
      if (!this.searchQuery.trim()) {
        this.searchSuggestions = [];
        return;
      }
      const q = this.searchQuery.toLowerCase().trim();
      this.searchSuggestions = ailData.filter(loc =>
        loc.name.toLowerCase().includes(q) ||
        loc.suburb.toLowerCase().includes(q) ||
        loc.address.toLowerCase().includes(q) ||
        loc.state.toLowerCase().includes(q)
      ).slice(0, 10);
    },

    selectSuggestion(suggestion) {
      this.selectedLocation = suggestion;
      this.searchQuery = suggestion.name;
      if (mapInitialized) {
        const pos = new google.maps.LatLng(suggestion.lat, suggestion.lng);
        map.setCenter(pos);
        map.setZoom(12);
      }
    },

    handleSearchKeydown(event) {
      if (!this.searchSuggestions.length) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.searchSuggestions.length - 1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          this.highlightedIndex = Math.max(this.highlightedIndex - 1, -1);
          break;
        case 'Enter':
          event.preventDefault();
          if (this.highlightedIndex >= 0 && this.highlightedIndex < this.searchSuggestions.length) {
            this.selectSuggestion(this.searchSuggestions[this.highlightedIndex]);
            this.showSearch = false;
          }
          break;
        case 'Escape':
          this.showSearch = false;
          this.highlightedIndex = -1;
          break;
      }
    },

    formatPhoneNumber(phone) {
      if (!phone) return '';
      
      // Remove all non-digits
      const digits = phone.replace(/\D/g, '');
      
      if (digits.length === 10) {
        // Landline format: (02) 9999 9999
        if (digits.startsWith('02') || digits.startsWith('03') || digits.startsWith('07') || digits.startsWith('08')) {
          return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)} ${digits.slice(6)}`;
        }
        // Mobile format: 0444 444 444
        else if (digits.startsWith('04')) {
          return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
        }
      }
      
      // Fallback: return as-is if format doesn't match
      return phone;
    }
  };
}

window.initMap = initMap;

document.addEventListener('DOMContentLoaded', () => {
  if (window.google?.maps && !mapInitialized) setTimeout(initMap, 1000);
});
