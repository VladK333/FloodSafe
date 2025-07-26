// Haversine formula (distance in km)
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
let dangerZones = []; // Red zones (lat, lon, radius)

//live user location
/*navigator.geolocation.getCurrentPosition(async position => {
  const userLat = position.coords.latitude;
  const userLon = position.coords.longitude;
*/

// Fixed user location
const userLat = 45.239485;
const userLon = 19.843993;

(async () => {
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
      showRoute(shelter, 'blue');
    
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
       showRoute(hospital, 'red');

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
  const color = sensor.reading >= 60 && sensor.reading <= 84 ? 'yellow' : 
              sensor.reading >= 85 ? 'red' : 'green';

  if (sensor.reading >= 85) {
  dangerZones.push({
    lat: sensor.lat,
    lon: sensor.lon,
    radius: sensor.reading * 5  // isti kao kod kruga
  });
}

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

  function isInDangerZone(lat, lon) {
    return dangerZones.some(zone => {
      const dist = getDistance(lat, lon, zone.lat, zone.lon) * 1000;
      return dist < zone.radius;
    });
  }

  // Pomeri tačku dok ne izađe iz opasne zone
  function findSafePoint(lat, lon) {
    let safeLat = lat;
    let safeLon = lon;
    let attempts = 0;
    const delta = 0.0015;

    while (isInDangerZone(safeLat, safeLon) && attempts < 20) {
      safeLat += delta;
      safeLon += delta;
      attempts++;
    }

    return { lat: safeLat, lon: safeLon };
  }

  let start = { lat: userLat, lon: userLon };
  let end = { lat: destination.lat, lon: destination.lon };

  if (isInDangerZone(start.lat, start.lon)) {
    start = findSafePoint(start.lat, start.lon);
  }

  if (isInDangerZone(end.lat, end.lon)) {
    end = findSafePoint(end.lat, end.lon);
  }

  routingControl = L.Routing.control({
    waypoints: [
      L.latLng(start.lat, start.lon),
      L.latLng(end.lat, end.lon)
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
    }
  });

  document.getElementById('btnHospital').addEventListener('click', () => {
    const closestHospital = findClosestLocation(hospitals);
    if (closestHospital) {
      showRoute(closestHospital, 'red');
    }
  });


}, error => {
  alert("Location error: " + error.message);
});
