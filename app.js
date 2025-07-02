// Haversine formula (udaljenost u km)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

navigator.geolocation.getCurrentPosition(async position => {
  const userLat = position.coords.latitude;
  const userLon = position.coords.longitude;

  const map = L.map('map').setView([userLat, userLon], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  L.marker([userLat, userLon]).addTo(map)
    .bindPopup("You are here").openPopup();

  const response = await fetch('shelters.json');
  const shelters = await response.json();

  const greenIcon = L.icon({
    iconUrl: 'pics/green-dot.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  const redCrossIcon = L.icon({
    iconUrl: 'pics/red-cross.png',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });

  let currentLine = null;
  let routingControl = null;

  // Dodaj skloništa (zelene markere)
  shelters.forEach(shelter => {
    const distance = getDistance(userLat, userLon, shelter.lat, shelter.lon).toFixed(2);
    const marker = L.marker([shelter.lat, shelter.lon], { icon: greenIcon }).addTo(map);
    marker.bindPopup('');

    marker.on('click', () => {
      if (routingControl) {
         map.removeControl(routingControl);
        }

    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(userLat, userLon),
            L.latLng(shelter.lat, shelter.lon)
        ],
        lineOptions: {
            styles: [{ color: 'blue', weight: 4 }]
        },
        createMarker: () => null,
        addWaypoints: false,
        draggableWaypoints: false,
        routeWhileDragging: false,
        show: false //sakriva sidebar sa detaljima rute
        }).addTo(map);
    
    marker.setPopupContent(`${shelter.name}<br>Distance: ${distance} km`);
    marker.openPopup();
  });
});

  // Učitaj i prikaži medicinske ustanove iz med.json
  const medResponse = await fetch('med.json');
  const hospitals = await medResponse.json();

  hospitals.forEach(hospital => {
    const distance = getDistance(userLat, userLon, hospital.lat, hospital.lon).toFixed(2);
    const marker = L.marker([hospital.lat, hospital.lon], { icon: redCrossIcon }).addTo(map);
    marker.bindPopup('');

    marker.on('click', () => {
      if (routingControl) {
        map.removeControl(routingControl);
      }

      routingControl = L.Routing.control({
        waypoints: [
          L.latLng(userLat, userLon),
          L.latLng(hospital.lat, hospital.lon)
        ],
        lineOptions: {
          styles: [{ color: 'red', weight: 4 }]
        },
        createMarker: () => null,
        addWaypoints: false,
        draggableWaypoints: false,
        routeWhileDragging: false,
        show: false //sakriva sidebar sa detaljima rute
      }).addTo(map);

      marker.setPopupContent(`${hospital.name}<br>Distance: ${distance} km`);
      marker.openPopup();
    });
  });

    // Učitaj i prikaži senzore iz sensors.json
  const sensorResponse = await fetch('sensors.json');
  const sensors = await sensorResponse.json();

  const sensorIcon = L.icon({
    iconUrl: 'pics/sensor.png',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });

  sensors.forEach(sensor => {
  const marker = L.marker([sensor.lat, sensor.lon], { icon: sensorIcon }).addTo(map);
  marker.bindPopup(`<strong>${sensor.name}</strong><br>Reading: ${sensor.reading}`);

  // Odredi boju kruga na osnovu očitavanja
  const color = sensor.reading < 50 ? 'yellow' : 'red';

  // Dodaj krug sa poluprečnikom proporcionalnim očitavanju
  const circle = L.circle([sensor.lat, sensor.lon], {
    color: color,
    fillColor: color,
    fillOpacity: 0.3,
    radius: sensor.reading * 5  // ili neka druga vrednost za skaliranje
  }).addTo(map);
});


  // --- DODATO ZA DUGMAD ---

  // Funkcija za pronalazak najbliže lokacije iz liste
  function findClosestLocation(list) {
    let minDistance = Infinity;
    let closest = null;
    for (const loc of list) {
      const dist = getDistance(userLat, userLon, loc.lat, loc.lon);
      if (dist < minDistance) {
        minDistance = dist;
        closest = loc;
      }
    }
    return closest;
  }

  // Funkcija za prikaz rute do lokacije
  function showRoute(destination, color) {
    if (routingControl) {
      map.removeControl(routingControl);
    }
    routingControl = L.Routing.control({
      waypoints: [
        L.latLng(userLat, userLon),
        L.latLng(destination.lat, destination.lon)
      ],
      lineOptions: {
        styles: [{ color: color, weight: 5 }]
      },
      createMarker: () => null,
      addWaypoints: false,
      draggableWaypoints: false,
      routeWhileDragging: false,
      show: false
    }).addTo(map);
  }

  // Poveži dugmad sa funkcijama
  document.getElementById('btnShelter').addEventListener('click', () => {
    const closestShelter = findClosestLocation(shelters);
    if (closestShelter) {
      showRoute(closestShelter, 'blue');
      alert(`Najbliže sklonište: ${closestShelter.name}`);
    }
  });

  document.getElementById('btnHospital').addEventListener('click', () => {
    const closestHospital = findClosestLocation(hospitals);
    if (closestHospital) {
      showRoute(closestHospital, 'red');
      alert(`Najbliža bolnica: ${closestHospital.name}`);
    }
  });


}, error => {
  alert("Location error: " + error.message);
});
