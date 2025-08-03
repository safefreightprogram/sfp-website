let map, markers = [], ailData = [], mapInitialized = false, ailFinderComponent = null;

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 5,
    center: { lat: -25.0, lng: 134.0 },
    mapTypeId: 'roadmap',
    zoomControl: true,
    streetViewControl: false,
    fullscreenControl: true,
    styles: [
      { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
      { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
      { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] }
    ]
  });

  mapInitialized = true;

  map.addListener('click', () => {
    if (ailFinderComponent?.selectedLocation) ailFinderComponent.selectedLocation = null;
  });

  if (ailFinderComponent && ailData.length > 0) {
    loadMarkers();
    setTimeout(() => {
      ailFinderComponent.fitMapToAustralia();
    }, 300);
  }
}

function loadMarkers() {
  if (!mapInitialized || !ailData.length) return;
  markers.forEach(marker => marker.setMap(null));
  markers = [];

  ailData.forEach(ail => {
    const marker = new google.maps.Marker({
      position: new google.maps.LatLng(ail.lat, ail.lng),
      map,
      title: ail.name,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8" cy="8" r="6" fill="#1e40af" stroke="white" stroke-width="2"/>
          </svg>`),
        scaledSize: new google.maps.Size(16, 16),
        anchor: new google.maps.Point(8, 8)
      }
    });

    marker.addListener("click", () => {
      if (ailFinderComponent) {
        ailFinderComponent.selectedLocation = ail;
        map.panTo(marker.getPosition());
        map.setZoom(12);
      }
    });

    markers.push(marker);
  });
}

function domainStyleAilFinder() {
  return {
    searchQuery: '',
    searchSuggestions: [],
    selectedState: 'all',
    userLocation: null,
    showList: true,
    showSearch: true,
    selectedLocation: null,
    filteredLocations: [],

    async init() {
      ailFinderComponent = this;
      try {
        const res = await fetch('./data/ail-locations.json');
        const data = await res.json();
        ailData = data.map(loc => ({
          ...loc,
          lat: parseFloat(loc.lat),
          lng: parseFloat(loc.lng)
        }));
        this.filteredLocations = [...ailData];
        if (mapInitialized) loadMarkers();
      } catch (err) {
        console.error('Failed to load AIL data:', err);
      }
    },

    handleSearch() {
      this.searchSuggestions = this.searchQuery.trim() !== ''
        ? ailData.filter(s =>
            s.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
            s.suburb.toLowerCase().includes(this.searchQuery.toLowerCase())
          ).slice(0, 6)
        : [];
    },

    handleSearchKeydown(event) {
      if (event.key === 'Enter' && this.searchSuggestions.length > 0) {
        this.selectSuggestion(this.searchSuggestions[0]);
        document.activeElement.blur();
        this.showSearch = false;
      }
    },

    selectSuggestion(suggestion) {
      this.searchQuery = suggestion.name;
      this.searchSuggestions = [];
      this.selectedLocation = suggestion;
      this.showSearch = false;

      if (mapInitialized) {
        const pos = new google.maps.LatLng(suggestion.lat, suggestion.lng);
        map.setCenter(pos);
        map.setZoom(12);
      }
    },

    clearAllFilters() {
      this.searchQuery = '';
      this.selectedState = 'all';
      this.userLocation = null;
      this.searchSuggestions = [];
      this.selectedLocation = null;
      this.showSearch = false;
      this.filteredLocations = [...ailData];
      if (mapInitialized) {
        map.setCenter({ lat: -25.0, lng: 134.0 });
        map.setZoom(5);
        loadMarkers();
      }
    },

    getDisplayAddress(loc) {
      return `${loc.address || ''}, ${loc.suburb || ''} ${loc.state || ''} ${loc.postcode || ''}`.trim();
    },

    formatPhoneNumber(phone) {
      if (!phone) return '';
      const digits = phone.replace(/\D/g, '');
      if (digits.length === 10 && digits.startsWith('04')) {
        return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
      } else if (digits.length === 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)} ${digits.slice(6)}`;
      }
      return phone;
    },

    viewOnMap(loc) {
      this.selectedLocation = loc;
      if (mapInitialized) {
        const pos = new google.maps.LatLng(loc.lat, loc.lng);
        map.setCenter(pos);
        map.setZoom(12);
      }
    }
  };
}

window.initMap = initMap;
