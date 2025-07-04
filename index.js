const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const HARDCODED_LOCATIONS = {
  'Adelaide CBD': '-34.9285,138.6007',
  'Adelaide Airport': '-34.9461,138.5290',
  'Melbourne CBD': '-37.8136,144.9631',
  'Melbourne Airport': '-37.6733,144.8430',
  'Sydney CBD': '-33.8688,151.2093',
  'Sydney Airport': '-33.9399,151.1753',
  'Brisbane CBD': '-27.4698,153.0251',
  'Brisbane Airport': '-27.3842,153.1175',
  'Perth CBD': '-31.9505,115.8605',
  'Perth Airport': '-31.9403,115.9672'
};

function isHardcodedAmenity(name) {
  return Object.keys(HARDCODED_LOCATIONS).includes(name.trim());
}

app.post('/api/distance', async (req, res) => {
  const { address, amenities } = req.body;

  if (!address || !Array.isArray(amenities)) {
    return res.status(400).json({ error: 'Invalid request format' });
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_MAPS_API_KEY}`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (!geoData.results || !geoData.results[0]) {
      return res.status(500).json({ error: 'Failed to geocode address' });
    }

    const origin = geoData.results[0].geometry.location;
    const originString = `${origin.lat},${origin.lng}`;

    const results = [];

    for (const rawAmenity of amenities) {
      const amenity = rawAmenity.replace(/\*\*/g, '').trim();

      let destCoords;
      if (isHardcodedAmenity(amenity)) {
        destCoords = HARDCODED_LOCATIONS[amenity];
      } else {
        const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(amenity)}&inputtype=textquery&locationbias=point:${originString}&key=${GOOGLE_MAPS_API_KEY}`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();
        const candidate = searchData.candidates?.[0];

        if (!candidate || !candidate.geometry) {
          console.warn(`Skipping: ${amenity} not found`);
          continue;
        }

        destCoords = `${candidate.geometry.location.lat},${candidate.geometry.location.lng}`;
      }

      const distUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originString}&destinations=${destCoords}&key=${GOOGLE_MAPS_API_KEY}`;
      const distRes = await fetch(distUrl);
      const distData = await distRes.json();

      const info = distData.rows[0].elements[0];
      if (info.status === 'OK') {
        results.push({
          name: amenity,
          distance: info.distance.text,
          duration: info.duration.text
        });
      }
    }

    // Sort by ascending distance
    results.sort((a, b) => {
      const kmA = parseFloat(a.distance.replace(' km', '').replace(',', ''));
      const kmB = parseFloat(b.distance.replace(' km', '').replace(',', ''));
      return kmA - kmB;
    });

    // Format output
    const output = results.map(r => `${r.distance} (${r.duration}), ${r.name}`);
    res.json({ address, results: output });

  } catch (err) {
    console.error('❌ Backend error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

app.listen(5000, () => {
  console.log('✅ Backend running on http://localhost:5000');
});
