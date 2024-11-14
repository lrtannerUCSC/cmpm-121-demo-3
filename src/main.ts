import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import { Cell } from "./board.ts"; // Assuming Cell is an object or interface now
import { removeCoin } from "./geocache.ts";
import { receiveCoin } from "./geocache.ts";
import { createGeocache, Geocache } from "./geocache.ts";

// Define gameplay constants
const INITIAL_LOCATION = { lat: 36.98949379578401, lng: -122.06277128548504 };
const TILE_SIZE = 0.0001;
const MAP_ZOOM = 19;
const CACHE_SPAWN_RADIUS = 8;
//convert to meters for measuring distance
const CACHE_SPAWN_RADIUS_METERS = CACHE_SPAWN_RADIUS * TILE_SIZE * 111000;
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
        updateCacheVisibility(),
        updatePlayerRadiusVisualization(),
      );
      break;
    case "down":
      newLocation = leaflet.latLng(
        currentLocation.lat - TILE_SIZE,
        currentLocation.lng,
        updateCacheVisibility(),
        updatePlayerRadiusVisualization(),
      );
      break;
    case "left":
      newLocation = leaflet.latLng(
        currentLocation.lat,
        currentLocation.lng - TILE_SIZE,
        updateCacheVisibility(),
        updatePlayerRadiusVisualization(),
      );
      break;
    case "right":
      newLocation = leaflet.latLng(
        currentLocation.lat,
        currentLocation.lng + TILE_SIZE,
        updateCacheVisibility(),
        updatePlayerRadiusVisualization(),
      );
      break;
  }

  // Update the player's location and the radius circle
  playerMarker.setLatLng(newLocation);
  map.setView(newLocation);

  // Update the player's radius circle visualization
  currentLocation = newLocation;
  //updatePlayerRadiusVisualization();

  // Regenerate caches based on the new player location
  generateCaches(CACHE_SPAWN_RADIUS, CACHE_SPAWN_PROBABILITY);
}

// Call the function to create movement controls when the game loads
createMovementControls();

// Array to hold the player's collected coins
const playerInventory: string[] = [];

// Consolidated cell state map
const cellState: Map<string, { discovered: boolean; cache?: Geocache }> =
  new Map();

// Modify generateCaches to work with cellState
function generateCaches(radius: number, probability: number): void {
  // Function to calculate the Euclidean distance from the center
  const isWithinRadius = (i: number, j: number): boolean => {
    const distance = Math.sqrt(i * i + j * j);
    return distance <= radius; // Only return true if the point is within the radius
  };

  for (let i = -radius; i <= radius; i++) {
    for (let j = -radius; j <= radius; j++) {
      // Check if the point is within the circular radius
      if (!isWithinRadius(i, j)) {
        continue; // Skip if the point is outside the radius
      }

      const cellLat = currentLocation.lat + i * TILE_SIZE;
      const cellLng = currentLocation.lng + j * TILE_SIZE;
      const key = `${cellLat.toFixed(5)}:${cellLng.toFixed(5)}`;

      // Check if the cell has already been discovered (and thus no cache should be generated)
      if (cellState.has(key) && cellState.get(key)?.discovered) {
        continue; // Skip already discovered cells
      }

      // Mark the cell as discovered only if it's not already discovered
      if (!cellState.has(key)) {
        cellState.set(key, { discovered: true });
      }

      // Only spawn cache based on probability
      if (Math.random() < probability) {
        const cacheLocation = leaflet.latLng(cellLat, cellLng);
        const cache = createGeocache(cacheLocation);

        // Store cache in cellState
        cellState.set(key, { discovered: true, cache });

        // Spawn the cache on the map
        spawnCache(cacheLocation, { i, j }, cache);
      }
    }
  }
}

// Simplified spawnCache function
function spawnCache(
  location: leaflet.LatLng,
  cell: Cell,
  cache: Geocache,
): void {
  const bounds: leaflet.LatLngBoundsExpression = [
    [location.lat, location.lng],
    [location.lat + TILE_SIZE, location.lng + TILE_SIZE],
  ];

  const rect = leaflet.rectangle(bounds, { color: "#28a745", weight: 1 });
  rect.addTo(map);

  cache.visible = true;
  cache.rectangle = rect;

  const cellLat = (cell.i + currentLocation.lat * TILE_SIZE).toFixed(5);
  const cellLng = (cell.j + currentLocation.lng * TILE_SIZE).toFixed(5);
  const key = `${cellLat}:${cellLng}`;

  // Store cache in the cell state
  cellState.set(key, { discovered: true, cache });

  setupCachePopup(rect, cache);
}

function setupCachePopup(rect: leaflet.Rectangle, geocache: Geocache): void {
  const popupDiv = document.createElement("div");

  // Display cache location
  const cacheCoords = `${geocache.location.lat.toFixed(5)}:${
    geocache.location.lng.toFixed(5)
  }`;
  const coordsDiv = document.createElement("div");
  coordsDiv.textContent = `Cache: ${cacheCoords}`;
  popupDiv.appendChild(coordsDiv);

  // Display coins in the cache with "Collect" buttons
  const coinsListDiv = document.createElement("div");
  coinsListDiv.innerHTML = "<strong>Coins in Cache:</strong>";
  geocache.coins.forEach((coin: string) => {
    const coinDiv = document.createElement("div");
    coinDiv.textContent = `Coin ID: ${coin}`;

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

  // Add a single "Deposit" button for the cache
  const depositButton = document.createElement("button");
  depositButton.textContent = "Deposit Coin";
  depositButton.addEventListener("click", () => depositCoin(geocache, rect));
  popupDiv.appendChild(depositButton);

  rect.bindPopup(popupDiv);
}

// Modify collectCoin in main.ts
function collectCoin(
  geocache: Geocache,
  coin: string,
  rect: leaflet.Rectangle,
) {
  const isRemoved = removeCoin(geocache, coin); // Call the removeCoin function

  if (isRemoved) {
    playerInventory.push(coin); // Add coin to inventory
    //console.log(`Collected coin ${coin}`);
    updateCachePopup(rect, geocache); // Refresh popup content to reflect coin removal
  } else {
    //console.log(`Coin ${coin} not found in the cache.`);
  }

  updatePopupAndStatus();
  updateInventoryDisplay();
}

function depositCoin(geocache: Geocache, rect: leaflet.Rectangle): void {
  // Ensure there is at least one coin in the player's inventory
  if (playerInventory.length > 0) {
    const coinToDeposit = playerInventory.pop(); // Remove the last coin from the inventory

    if (coinToDeposit) {
      const isDeposited = receiveCoin(geocache, coinToDeposit);
      if (isDeposited) {
        //console.log(`Deposited coin ${coinToDeposit}`);
        updateCachePopup(rect, geocache); // Update the popup after depositing
        updateInventoryDisplay(); // Update the inventory display after depositing
      } else {
        //console.log(`Failed to deposit coin ${coinToDeposit}`);
      }
    }
  } else {
    //console.log("No coins to deposit.");
  }
}

// Updates any additional status or UI elements related to the popup
function updatePopupAndStatus(): void {
  // Implement as needed, such as refreshing the popup to show updated coin status
  //console.log("Popup and status updated.");
}

// Updates the player's inventory display on the UI
function updateInventoryDisplay(): void {
  const inventoryDiv = document.getElementById("inventory");
  if (!inventoryDiv) {
    console.warn("Inventory display element not found.");
    return;
  }
  inventoryDiv.innerHTML = "<strong>Player Inventory:</strong>";
  playerInventory.forEach((coin) => {
    const coinDiv = document.createElement("div");
    coinDiv.textContent = `Coin ID: ${coin}`;
    inventoryDiv.appendChild(coinDiv);
  });
}

function updateCachePopup(rect: leaflet.Rectangle, cache: Geocache): void {
  // Rebuild the popup content to show updated cache and inventory status
  const popupDiv = document.createElement("div");

  // Cache location
  const cacheCoords = `${cache.location.lat.toFixed(5)}:${
    cache.location.lng.toFixed(5)
  }`;
  const coordsDiv = document.createElement("div");
  coordsDiv.textContent = `Cache: ${cacheCoords}`;
  popupDiv.appendChild(coordsDiv);

  // Display coins in cache
  if (cache.coins.length > 0) {
    const coinsListDiv = document.createElement("div");
    coinsListDiv.innerHTML = "<strong>Coins in Cache:</strong>";
    cache.coins.forEach((coin: string) => {
      const coinDiv = document.createElement("div");
      coinDiv.textContent = `Coin ID: ${coin}`;

      const collectButton = document.createElement("button");
      collectButton.textContent = "Collect";
      collectButton.addEventListener(
        "click",
        () => collectCoin(cache, coin, rect),
      );
      coinDiv.appendChild(collectButton);

      coinsListDiv.appendChild(coinDiv);
    });
    popupDiv.appendChild(coinsListDiv);
  } else {
    popupDiv.innerHTML += "<div>No coins in cache.</div>";
  }

  // Single "Deposit" button
  const depositButton = document.createElement("button");
  depositButton.textContent = "Deposit Coin";
  depositButton.addEventListener("click", () => depositCoin(cache, rect));
  popupDiv.appendChild(depositButton);

  rect.bindPopup(popupDiv).openPopup(); // Re-open popup to display updated content
}

// Function to check if the cache is within the spawn radius using Leaflet's distanceTo method
function isCacheWithinSpawnRadius(cacheLocation: leaflet.LatLng): boolean {
  const distance = currentLocation.distanceTo(cacheLocation); // Get the distance in meters
  console.log("distance: ", distance);
  return distance <= CACHE_SPAWN_RADIUS_METERS; // Check if the cache is within the radius
}

function updateCacheVisibility(): void {
  // Iterate through each entry in the cellState map
  cellState.forEach((cell, cellId) => {
    console.log(cell);
    // Check if the cache exists and whether it's within the spawn radius
    const isInRange = cell.cache
      ? isCacheWithinSpawnRadius(cell.cache.location)
      : false;

    // Log the cache position and whether it's in range
    console.log(`Checking cache at ${cellId}. In range: ${isInRange}`);

    // If the cache is discovered and is within range, make sure its rectangle is added to the map
    if (isInRange && cell.discovered && cell.cache) {
      const cache = cell.cache;

      // Only add the rectangle to the map if it isn't already there and it's not null
      if (cache.rectangle && !cache.rectangle._map) {
        console.log(`Cache at ${cellId} is now visible. Adding rectangle.`);
        cache.rectangle.addTo(map); // Add the rectangle to the map
        cache.visible = true; // Update visibility state
      }
    } // If the cache is out of range or not discovered, and its rectangle is on the map, hide it
    else if (cell.cache && cell.cache.rectangle && cell.cache.rectangle._map) {
      console.log(
        `Cache at ${cellId} is out of range or not discovered. Hiding rectangle.`,
      );
      cell.cache.rectangle.remove(); // Remove the rectangle from the map
      if (cell.cache) {
        cell.cache.visible = false; // Update visibility state to false
      }
    }
  });
}

// Create a circle to visualize the player's radius range
let playerRadiusCircle: leaflet.Circle;

// Function to add or update the player's radius visualization
function updatePlayerRadiusVisualization(): void {
  // If the circle already exists, update its position
  if (playerRadiusCircle) {
    playerRadiusCircle.setLatLng(currentLocation); // Update position to current player location
  } else {
    // Create the circle with the given radius in meters (CACHE_SPAWN_RADIUS_METERS)
    playerRadiusCircle = leaflet.circle(currentLocation, {
      color: "#FF0000", // Red color for the circle
      fillColor: "#FF0000", // Red fill
      fillOpacity: 0.2, // Semi-transparent
      radius: CACHE_SPAWN_RADIUS_METERS, // Radius in meters
    }).addTo(map);
  }
}

// Call the function to update the player's radius visualization
updatePlayerRadiusVisualization();
