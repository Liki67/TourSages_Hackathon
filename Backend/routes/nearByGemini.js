const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function getNearbyPlaces(lat, lng, keyword = "cafe") {
  const mapsUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
  
  const { data } = await axios.get(mapsUrl, {
    params: {
      location: `${lat},${lng}`,
      radius: 2000,
      keyword,
      key: process.env.GOOGLE_MAPS_API_KEY,
    },
  });

  return data.results.slice(0, 5).map(place => ({
    name: place.name,
    rating: place.rating,
    address: place.vicinity,
    types: place.types.join(", "),
  }));
}

router.post("/get-coordinates", async (req, res) => {
  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ error: "Address is required" });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json`;
    const response = await axios.get(url, {
      params: {
        address,
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });

    const result = response.data.results[0];

    if (!result) {
      return res.status(404).json({ error: "Location not found" });
    }

    const { lat, lng } = result.geometry.location;
    res.json({ lat, lng });
  } catch (err) {
    console.error("Error fetching coordinates:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function askGeminiAboutPlaces(query, places) {
  const context = places
    .map((place, i) => `${i + 1}. ${place.name}\nAddress: ${place.address}\nRating: ${place.rating}\nTypes: ${place.types}`)
    .join("\n\n");

  const prompt = `
  Based on the following list of places for: "${query}", summarize and recommend the best 3 places with reasons.

  ${context}
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

router.post("/nearby-places", async (req, res) => {
  try {
    const { lat, lng, keyword } = req.body;

    const places = await getNearbyPlaces(lat, lng, keyword || "restaurant");
    const answer = await askGeminiAboutPlaces(keyword, places);

    res.json({ places, summary: answer });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Something went wrong." });
  }
});

const placesData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../places.json"), "utf-8")
);

// Utility to check if a place lies in a bounding box between two coordinates
function toRad(deg) {
  return deg * (Math.PI / 180);
}

// Haversine distance between two coordinates
function haversineDistance(coord1, coord2) {
  const R = 6371; // Radius of Earth in km
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(coord1.lat)) *
      Math.cos(toRad(coord2.lat)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a)); // in km
}

// Distance from a point to a line segment (route), using projection math
function distanceFromRoute(point, start, end) {
  const toRadians = x => (x * Math.PI) / 180;

  const lat1 = toRadians(start.lat);
  const lng1 = toRadians(start.lng);
  const lat2 = toRadians(end.lat);
  const lng2 = toRadians(end.lng);
  const lat3 = toRadians(point.lat);
  const lng3 = toRadians(point.lng);

  const d13 = haversineDistance(start, point);
  const θ13 = Math.atan2(
    Math.sin(lng3 - lng1) * Math.cos(lat3),
    Math.cos(lat1) * Math.sin(lat3) -
      Math.sin(lat1) * Math.cos(lat3) * Math.cos(lng3 - lng1)
  );
  const θ12 = Math.atan2(
    Math.sin(lng2 - lng1) * Math.cos(lat2),
    Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1)
  );

  const angle = θ13 - θ12;
  return Math.abs(Math.asin(Math.sin(d13 / 6371) * Math.sin(angle)) * 6371); // in km
}

router.post("/route-places", (req, res) => {
  const { source, destination } = req.body;

  if (!source || !destination) {
    return res.status(400).json({ error: "Source and destination required." });
  }

  const placesWithinRoute = placesData.filter(place => {
    const lat = parseFloat(place.latitude);
    const lng = parseFloat(place.longitude);

    const distanceToRoute = distanceFromRoute(
      { lat, lng },
      source,
      destination
    );

    return distanceToRoute <= 50; // only include if <= 50km from route
  });

  res.json({ inRoutePlaces: placesWithinRoute });
});

module.exports = router;