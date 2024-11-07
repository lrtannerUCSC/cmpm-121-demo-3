import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import luck from "./luck.ts";

// Constants
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const CACHE_SPAWN_PROBABILITY = 0.1;
const NEIGHBORHOOD_SIZE = 8;

// Initialize map
const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Player marker
const playerMarker = leaflet.marker(OAKES_CLASSROOM).bindTooltip("That's you!");
playerMarker.addTo(map);

// Status panel
let playerCoins = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!;
statusPanel.innerHTML = `Coins: ${playerCoins}`;

// Cache generation
function spawnCache(i: number, j: number) {
  const origin = OAKES_CLASSROOM;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  // Create the cache marker
  const rect = leaflet.rectangle(bounds).addTo(map);

  // Coin count for this cache
  let coinCount = Math.floor(luck([i, j, "coinCount"].toString()) * 10);

  // Popup with "Collect" and "Deposit" buttons
  rect.bindPopup(() => {
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `
      <div>Cache at ${i},${j}: <span id="cache-coins">${coinCount}</span> coins</div>
      <button id="collect">Collect</button>
      <button id="deposit">Deposit</button>`;

    popupDiv.querySelector<HTMLButtonElement>("#collect")!.addEventListener(
      "click",
      () => {
        if (coinCount > 0) {
          coinCount--;
          playerCoins++;
          statusPanel.innerHTML = `Coins: ${playerCoins}`;
          popupDiv.querySelector<HTMLSpanElement>("#cache-coins")!.innerHTML =
            coinCount.toString();
        }
      },
    );

    popupDiv.querySelector<HTMLButtonElement>("#deposit")!.addEventListener(
      "click",
      () => {
        if (playerCoins > 0) {
          coinCount++;
          playerCoins--;
          statusPanel.innerHTML = `Coins: ${playerCoins}`;
          popupDiv.querySelector<HTMLSpanElement>("#cache-coins")!.innerHTML =
            coinCount.toString();
        }
      },
    );

    return popupDiv;
  });
}

// Generate nearby caches
for (let i = -NEIGHBORHOOD_SIZE; i <= NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j <= NEIGHBORHOOD_SIZE; j++) {
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache(i, j);
    }
  }
}
