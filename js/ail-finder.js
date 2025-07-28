// js/ail-finder.js
let map, markers = [], ailData = [], mapInitialized = false, ailFinderComponent = null;

const australiaBounds = { north: -8.0, south: -44.0, west: 112.0, east: 154.0 };
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

    // Stabilise projection and bounds
    setTimeout(() => {
      google.maps.event.trigger(map, 'resize');

      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(australiaBounds.south, australiaBounds.west),
        new google.maps.LatLng(australiaBounds.north, australiaBounds.east)
      );
      map.fitBounds(bounds);

      if (ailData.length > 0) loadMarkers();

      // Zoom correction
      setTimeout(() => {
        google.maps.event.trigger(map, 'idle');
        map.setZoom(Math.max(map.getZoom() - 0.5, 4.0));
      }, 400);
    }, 600);

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

  // Force reposition for accuracy
  setTimeout(() => {
    google.maps.event.trigger(map, 'resize');
    markers.forEach(marker => marker.setPosition(marker.getPosition()));
  }, 1000);
}

window.initMap = initMap;
document.addEventListener('DOMContentLoaded', () => {
  if (window.google?.maps && !mapInitialized) setTimeout(initMap, 1000);
});
