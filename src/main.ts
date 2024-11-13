import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import { Cell } from "./board.ts";
import { Geocache } from "./geocache.ts";

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
const playerMarker = createPlayerMarker(
  leaflet.latLng(INITIAL_LOCATION.lat, INITIAL_LOCATION.lng),
);

// Function to create player marker
function createPlayerMarker(location: leaflet.LatLng): leaflet.Marker {
  const marker = leaflet.marker(location);
  marker.bindTooltip("You are here!");
  marker.addTo(map);
  return marker;
}

// Create control buttons for movement
function createMovementControls(): void {
  const controlsDiv = document.createElement("div");
  controlsDiv.id = "controls";
  controlsDiv.style.display = "flex";
  controlsDiv.style.flexDirection = "column";
  controlsDiv.style.alignItems = "center";
  controlsDiv.style.position = "fixed";
  controlsDiv.style.bottom = "20px";
  controlsDiv.style.width = "100%";

  // Create the "up" button
  const btnUp = document.createElement("button");
  btnUp.textContent = "↑";
  btnUp.id = "btn-up";
  styleButton(btnUp);

  // Create the "down" button
  const btnDown = document.createElement("button");
  btnDown.textContent = "↓";
  btnDown.id = "btn-down";
  styleButton(btnDown);

  // Create the "left" button
  const btnLeft = document.createElement("button");
  btnLeft.textContent = "←";
  btnLeft.id = "btn-left";
  styleButton(btnLeft);

  // Create the "right" button
  const btnRight = document.createElement("button");
  btnRight.textContent = "→";
  btnRight.id = "btn-right";
  styleButton(btnRight);

  // Arrange buttons in layout
  controlsDiv.appendChild(btnUp);

  const horizontalButtons = document.createElement("div");
  horizontalButtons.style.display = "flex";
  horizontalButtons.style.justifyContent = "center";
  horizontalButtons.style.gap = "5px";

  horizontalButtons.appendChild(btnLeft);
  horizontalButtons.appendChild(btnDown);
  horizontalButtons.appendChild(btnRight);
  controlsDiv.appendChild(horizontalButtons);

  document.body.appendChild(controlsDiv);

  // Add event listeners to handle movement
  btnUp.addEventListener("click", () => movePlayer("up"));
  btnDown.addEventListener("click", () => movePlayer("down"));
  btnLeft.addEventListener("click", () => movePlayer("left"));
  btnRight.addEventListener("click", () => movePlayer("right"));
}

// Helper function to style buttons
function styleButton(button: HTMLButtonElement): void {
  button.style.backgroundColor = "#4CAF50";
  button.style.color = "white";
  button.style.border = "none";
  button.style.padding = "10px";
  button.style.margin = "5px";
  button.style.fontSize = "18px";
  button.style.borderRadius = "5px";
  button.style.cursor = "pointer";
}

let currentLocation = playerMarker.getLatLng();
// Function to move the player in a specified direction
function movePlayer(direction: "up" | "down" | "left" | "right"): void {
  currentLocation = playerMarker.getLatLng();

  let newLocation;
  switch (direction) {
    case "up":
      newLocation = leaflet.latLng(
        currentLocation.lat + TILE_SIZE,
        currentLocation.lng,
      );
      break;
    case "down":
      newLocation = leaflet.latLng(
        currentLocation.lat - TILE_SIZE,
        currentLocation.lng,
      );
      break;
    case "left":
      newLocation = leaflet.latLng(
        currentLocation.lat,
        currentLocation.lng - TILE_SIZE,
      );
      break;
    case "right":
      newLocation = leaflet.latLng(
        currentLocation.lat,
        currentLocation.lng + TILE_SIZE,
      );
      break;
  }

  // Update the player's location on the map
  playerMarker.setLatLng(newLocation);
  map.setView(newLocation);

  // Regenerate caches based on the new player location
  generateCaches(CACHE_SPAWN_RADIUS, CACHE_SPAWN_PROBABILITY);
}

// Call the function to create movement controls when the game loads
createMovementControls();

// Initialize knownTiles map for tracking geocaches by coordinates
const knownTiles: Map<string, Geocache> = new Map(); // Use Map instead of plain object

// Initialize a Set to store discovered cells by coordinates
const discoveredCells: Set<string> = new Set();

function generateCaches(radius: number, probability: number): void {
  for (let i = -radius; i <= radius; i++) {
    for (let j = -radius; j <= radius; j++) {
      // Calculate absolute coordinates for this cell
      const cellLat = currentLocation.lat + i * TILE_SIZE;
      const cellLng = currentLocation.lng + j * TILE_SIZE;
      const key = `${cellLat.toFixed(5)}:${cellLng.toFixed(5)}`; // Unique key with precise lat/lng

      // Skip generating caches in cells that are already discovered
      if (discoveredCells.has(key)) {
        console.log(`Skipping ${key} - already discovered`);
        continue;
      }

      // Only spawn cache based on probability
      if (Math.random() < probability) {
        const cacheLocation = leaflet.latLng(cellLat, cellLng);
        console.log(`Spawning cache at ${key}`);
        spawnCache(cacheLocation, { i, j });
      } else {
        console.log(`No cache spawned at ${key}`);
      }

      // Mark cell as discovered
      discoveredCells.add(key);
    }
  }
}

// Updated spawnCache function
function spawnCache(location: leaflet.LatLng, cell: Cell): void {
  // Convert LatLng object to LatLngTuple for leaflet.rectangle
  const bounds: leaflet.LatLngBoundsExpression = [
    [location.lat, location.lng],
    [location.lat + TILE_SIZE, location.lng + TILE_SIZE],
  ];

  const rect = leaflet.rectangle(bounds, { color: "#28a745", weight: 1 });
  rect.addTo(map);

  // Create the Geocache object
  const cache = new Geocache(location);

  // Store the cache in the knownTiles map using the Cell as the key
  const key = `${cell.i}:${cell.j}`;
  knownTiles.set(key, cache);

  // Pass the Geocache object to setupCachePopup
  setupCachePopup(rect, cache);
}

function setupCachePopup(rect: leaflet.Rectangle, geocache: Geocache): void {
  const popupDiv = document.createElement("div");

  // Display the cache location (i:j)
  const cacheCoords = `${geocache.location.lat.toFixed(5)}:${
    geocache.location.lng.toFixed(5)
  }`;
  const coordsDiv = document.createElement("div");
  coordsDiv.textContent = `Cache: ${cacheCoords}`;
  popupDiv.appendChild(coordsDiv);

  // List coins in the cache with unique identifiers
  const coinsListDiv = document.createElement("div");
  coinsListDiv.innerHTML = `<strong>Inventory:</strong>`;
  geocache.coins.forEach((coin) => {
    const coinDiv = document.createElement("div");
    coinDiv.textContent = `Coin ID: ${coin}`;
    const collectButton = document.createElement("button");
    collectButton.textContent = "Collect";
    // Pass rect and geocache to collectCoin function
    collectButton.addEventListener(
      "click",
      () => collectCoin(geocache, coin, rect),
    );
    coinDiv.appendChild(collectButton);
    coinsListDiv.appendChild(coinDiv);
  });

  popupDiv.appendChild(coinsListDiv);

  // Add Deposit button if the user has coins in inventory
  const depositButtonDiv = document.createElement("div");
  depositButtonDiv.innerHTML = "";

  // Show the Deposit button only if the player has coins
  const depositButton = document.createElement("button");
  depositButton.textContent = "Deposit Coin";
  depositButton.addEventListener("click", () => depositCoin(geocache, rect));
  depositButtonDiv.appendChild(depositButton);

  popupDiv.appendChild(depositButtonDiv);

  // Add the popup to the rectangle
  rect.bindPopup(popupDiv);
}

function updateCachePopup(rect: leaflet.Rectangle, geocache: Geocache): void {
  const popupDiv = document.createElement("div");

  // Display the cache location (i:j)
  const cacheCoords = `${geocache.location.lat.toFixed(5)}:${
    geocache.location.lng.toFixed(5)
  }`;
  const coordsDiv = document.createElement("div");
  coordsDiv.textContent = `Cache: ${cacheCoords}`;
  popupDiv.appendChild(coordsDiv);

  // List coins in the cache with unique identifiers
  const coinsListDiv = document.createElement("div");
  coinsListDiv.innerHTML = `<strong>Coins in Cache:</strong>`;
  geocache.coins.forEach((coin) => {
    const coinDiv = document.createElement("div");
    coinDiv.textContent = `Coin ID: ${coin}`;

    // Collect button
    const collectButton = document.createElement("button");
    collectButton.textContent = "Collect";
    collectButton.addEventListener(
      "click",
      () => collectCoin(geocache, coin, rect),
    );
    coinDiv.appendChild(collectButton);
    coinsListDiv.appendChild(coinDiv);
  });

  popupDiv.appendChild(coinsListDiv);

  // Add Deposit button if the user has coins in inventory
  const depositDiv = document.createElement("div");

  // Create a button to deposit the topmost coin from the user's inventory
  const depositButton = document.createElement("button");
  depositButton.textContent = "Deposit Coin";
  depositButton.addEventListener("click", () => depositCoin(geocache, rect)); // Automatically deposit topmost coin
  depositDiv.appendChild(depositButton);
  popupDiv.appendChild(depositDiv);
  // Set the new content for the existing popup without closing it
  rect.getPopup()?.setContent(popupDiv);
}

function collectCoin(cache: Geocache, coin: string, rect: leaflet.Rectangle) {
  // Remove the coin from the cache
  const isRemoved = cache.removeCoin(coin);

  if (isRemoved) {
    // Add the coin to the user's inventory
    playerInventory.push(coin);
    console.log(`Collected coin ${coin}`);

    // Update the popup content without closing the popup
    updateCachePopup(rect, cache);
  } else {
    console.log(`Coin ${coin} not found in the cache.`);
  }
  updatePopupAndStatus();
  updateInventoryDisplay();
}

function depositCoin(geocache: Geocache, rect: leaflet.Rectangle): void {
  // Ensure there is at least one coin in the player's inventory
  if (playerInventory.length > 0) {
    const coinToDeposit = playerInventory.pop(); // Remove the last coin from the inventory

    if (coinToDeposit) {
      // Add the coin to the cache
      const isDeposited = geocache.depositCoin(coinToDeposit);
      if (isDeposited) {
        console.log(`Deposited coin ${coinToDeposit}`);
        updateCachePopup(rect, geocache); // Update the popup after depositing
        updateInventoryDisplay(); // Update the inventory display after depositing
      } else {
        console.log(`Failed to deposit coin ${coinToDeposit}`);
      }
    }
  } else {
    console.log("No coins to deposit.");
  }
}

const playerInventory: string[] = []; // Array to track the coins the player has collected

function updateInventoryDisplay(): void {
  const inventoryDiv = document.getElementById("inventory")!;
  inventoryDiv.innerHTML = `<strong>Your Inventory:</strong>`;
  playerInventory.forEach((coin) => {
    const coinDiv = document.createElement("div");
    coinDiv.textContent = `Coin ID: ${coin}`;
    inventoryDiv.appendChild(coinDiv);
  });
}

function updatePopupAndStatus(): void {
  // Update other UI elements if necessary (like coin counts)
  updateInventoryDisplay();
}

// Generate caches around the player
generateCaches(CACHE_SPAWN_RADIUS, CACHE_SPAWN_PROBABILITY);
