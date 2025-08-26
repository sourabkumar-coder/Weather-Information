const placeInput = document.getElementById('place');
const searchBtn = document.getElementById('searchBtn');
const geoBtn = document.getElementById('geoBtn');

// Utility to show message in output area
function showMessage(html) {
  const out = document.getElementById('output');
  out.innerHTML = html;
}

// Optional: loading state
function setLoading(state, msg = '') {
  const out = document.getElementById('output');
  out.innerHTML = state ? `<p>${msg}</p>` : '';
}

// Fetch temperature by coordinates
async function fetchTemperatureByCoords(lat, lon, label) {
  try {
    setLoading(true, 'Fetching temperature…');
    const legacyUrl = new URL('https://api.open-meteo.com/v1/forecast');
    legacyUrl.searchParams.set('latitude', lat);
    legacyUrl.searchParams.set('longitude', lon);
    legacyUrl.searchParams.set('current_weather', 'true');
    legacyUrl.searchParams.set('timezone', 'auto');

    const res2 = await fetch(legacyUrl.toString());
    const d2 = await res2.json();
    let temp = d2?.current_weather?.temperature;
    let unit = typeof temp === 'number' ? '°C' : '';
    let feels; // Not provided by Open-Meteo (optional)

    if (typeof temp !== 'number') throw new Error('Temperature not available');

    const rounded = Math.round(temp * 10) / 10;
    const feelsTxt = (typeof feels === 'number') ? ` (Feels like ${Math.round(feels)}${unit})` : '';

    showMessage(`
      <div>
        <div class="temp">${rounded}${unit}</div>
        <div class="meta">Location: <strong>${label}</strong><br/>Lat/Lon: ${lat.toFixed(3)}, ${lon.toFixed(3)}${feelsTxt}</div>
      </div>
    `);
  } catch (err) {
    console.error(err);
    showMessage('❌ Sorry, temperature not available. Please try another location.');
  }
}

// Fetch latitude & longitude from place name
async function fetchLatLon(place) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', place);
  url.searchParams.set('count', '1');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Geocoding API error');
  const data = await res.json();
  const first = data?.results?.[0];
  if (!first) return null;

  const labelParts = [first.name, first.admin1, first.country].filter(Boolean);
  return {
    lat: first.latitude,
    lon: first.longitude,
    label: labelParts.join(', ')
  };
}

// Handle search button click
async function handleSearch() {
  const q = placeInput.value.trim();
  if (!q) {
    showMessage('Please enter a location first.');
    placeInput.focus();
    return;
  }
  setLoading(true, 'Searching location…');
  const loc = await fetchLatLon(q);
  if (!loc) {
    showMessage('Location not found. Please try with correct spelling.');
    return;
  }
  await fetchTemperatureByCoords(loc.lat, loc.lon, loc.label);
}

// Handle geolocation
async function handleGeo() {
  if (!('geolocation' in navigator)) {
    showMessage('Geolocation not supported by your browser.');
    return;
  }
  setLoading(true, 'Getting your location…');
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude: lat, longitude: lon } = pos.coords;
    await fetchTemperatureByCoords(lat, lon, 'Your Location');
  }, (err) => {
    console.warn(err);
    showMessage('Location permission denied or unavailable.');
  }, { enableHighAccuracy: true, timeout: 10000 });
}

// Event listeners
searchBtn.addEventListener('click', handleSearch);
placeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearch(); });
geoBtn.addEventListener('click', handleGeo);

// Quick chips
document.querySelectorAll('.chip').forEach(ch =>
  ch.addEventListener('click', () => {
    placeInput.value = ch.dataset.q;
    handleSearch();
  })
);
