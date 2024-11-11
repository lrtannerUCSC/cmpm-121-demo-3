import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";

// Import custom utilities
import luck from "./luck.ts"; // RNG module
import { Geocache } from "./geocache.ts"; // Memento pattern for cache state

// Define gameplay constants
const INITIAL_LOCATION = { lat: 36.98949379578401, lng: -122.06277128548504 };
const TILE_SIZE = 0.0001;
const MAP_ZOOM = 19;
const CACHE_SPAWN_RADIUS = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

// Initialize map
const map = leaflet.map(document.getElementById("map")!, {
  center: leaflet.latLng(INITIAL_LOCATION.lat, INITIAL_LOCATION.lng),
  zoom: MAP_ZOOM,
  minZoom: MAP_ZOOM,
  maxZoom: MAP_ZOOM,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Set up map tiles
leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: MAP_ZOOM,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// Initialize player marker and status
let playerCoins = 0;
const _playerMarker = createPlayerMarker(
  leaflet.latLng(INITIAL_LOCATION.lat, INITIAL_LOCATION.lng),
);
updateStatusPanel();

// Function to create player marker
function createPlayerMarker(location: leaflet.LatLng): leaflet.Marker {
  const marker = leaflet.marker(location);
  marker.bindTooltip("You are here!");
  marker.addTo(map);
  return marker;
}

// Function to update the player’s coin status
function updateStatusPanel() {
  const statusPanel = document.getElementById("statusPanel")!;
  statusPanel.innerHTML = `Coins: ${playerCoins}`;
}

// Function to generate caches within a radius
function generateCaches(radius: number, probability: number): void {
  for (let i = -radius; i <= radius; i++) {
    for (let j = -radius; j <= radius; j++) {
      const probabilityCheck = Math.random(); // Using Math.random() for randomness
      if (probabilityCheck < probability) {
        const cacheLocation = leaflet.latLng(
          INITIAL_LOCATION.lat + i * TILE_SIZE,
          INITIAL_LOCATION.lng + j * TILE_SIZE,
        );
        spawnCache(cacheLocation, i, j);
      }
    }
  }
}

// Updated spawnCache function
function spawnCache(location: leaflet.LatLng, i: number, j: number): void {
  // Convert LatLng object to LatLngTuple for leaflet.rectangle
  const bounds: leaflet.LatLngBoundsExpression = [
    [location.lat, location.lng],
    [location.lat + TILE_SIZE, location.lng + TILE_SIZE],
  ];

  const rect = leaflet.rectangle(bounds, { color: "#28a745", weight: 1 });
  rect.addTo(map);

  // Create the Geocache object
  const cache = new Geocache(
    location,
    Math.floor(luck([i, j, "initialCoins"].toString()) * 10) + 1,
  );

  // Pass the Geocache object to setupCachePopup
  setupCachePopup(rect, cache);
}

// Updated setupCachePopup function to handle Geocache object
function setupCachePopup(rect: leaflet.Rectangle, cache: Geocache): void {
  const popupDiv = document.createElement("div");
  popupDiv.innerHTML = `
    <div>Coins available: <span id="coin-count">${cache.numCoins}</span></div>
    <button id="collect-btn">Collect</button>
    <button id="deposit-btn">Deposit</button>
  `;

  // Handling the coin collection logic
  popupDiv.querySelector("#collect-btn")?.addEventListener("click", () => {
    if (cache.numCoins > 0) {
      cache.numCoins--; // Collect one coin from cache
      playerCoins++; // Increase the player's coins
      updatePopupAndStatus(popupDiv, cache);
    }
  });

  // Handling the coin deposit logic
  popupDiv.querySelector("#deposit-btn")?.addEventListener("click", () => {
    if (playerCoins > 0) {
      cache.numCoins++; // Deposit one coin into the cache
      playerCoins--; // Decrease the player's coins
      updatePopupAndStatus(popupDiv, cache);
    }
  });

  rect.bindPopup(popupDiv);
}

// Function to update the popup display and player status panel
function updatePopupAndStatus(popupDiv: HTMLElement, cache: Geocache) {
  popupDiv.querySelector("#coin-count")!.textContent = cache.numCoins
    .toString();
  updateStatusPanel();
}

// Generate caches around the player
generateCaches(CACHE_SPAWN_RADIUS, CACHE_SPAWN_PROBABILITY);
