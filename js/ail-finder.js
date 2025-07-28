let map, markers = [], ailData = [], mapInitialized = false, ailFinderComponent = null;

const australiaBounds = { north: -8.0, south: -44.0, west: 112.0, east: 154.0 };

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

    google.maps.event.addListenerOnce(map, 'idle', () => {
      google.maps.event.trigger(map, 'resize');
    });

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
          <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0C7.2 0 0 7.2 0 16c0 8.8 16 24 16 24s16-15.2 16-24C32 7.2 24.8 0 16 0z" fill="#1e40af" stroke="white" stroke-width="2"/>
            <circle cx="16" cy="16" r="8" fill="white"/>
            <circle cx="16" cy="16" r="4" fill="#1e40af"/>
          </svg>`),
        scaledSize: new google.maps.Size(32, 40),
        anchor: new google.maps.Point(16, 40)
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

  setTimeout(() => {
    google.maps.event.trigger(map, 'resize');
    markers.forEach(m => m.setPosition(m.getPosition()));
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
        const paths = [
          './data/ail-locations.json', 'data/ail-locations.json',
          '/data/ail-locations.json', './ail-locations.json'
        ];

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
          setTimeout(() => {
            const bounds = new google.maps.LatLngBounds(
              new google.maps.LatLng(australiaBounds.south, australiaBounds.west),
              new google.maps.LatLng(australiaBounds.north, australiaBounds.east)
            );
            map.fitBounds(bounds);
            setTimeout(() => map.setZoom(Math.max(map.getZoom() - 0.5, 4.0)), 300);
          }, 300);
        } else {
          setTimeout(() => {
            if (window.google?.maps && !mapInitialized) initMap();
          }, 500);
        }

      } catch (err) {
        console.error('Failed to load locations:', err);
        this.loading = false;
        alert('Failed to load location data.');
      }
    },

    hasNamedInspector(loc) {
      return loc.inspector && loc.inspector !== '-';
    },

    getDisplayAddress(loc) {
      if (loc.address === 'Mobile Inspector') return `Mobile Inspector – ${loc.state}`;
      return [loc.address, loc.suburb, loc.state + ' ' + loc.postcode].filter(Boolean).join(', ');
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
    }
  };
}

window.initMap = initMap;

document.addEventListener('DOMContentLoaded', () => {
  if (window.google?.maps && !mapInitialized) setTimeout(initMap, 1000);
});
