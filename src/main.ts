//main.ts
import leaflet from "leaflet";
import { LocationEvent } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";
import { Cell } from "./board.ts"; // Assuming Cell is an object or interface now
import {
  createGeocache,
  fromMemento,
  Geocache,
  GeocacheMemento,
  receiveCoin,
  removeCoin,
  toMemento,
} from "./geocache.ts";

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

const currentLocation = playerMarker.getLatLng();
// Function to move the player in a specified direction
// Add a geolocation toggle button
const geolocationToggle = document.createElement("button");
geolocationToggle.style.position = "absolute";
geolocationToggle.style.bottom = "10px"; // Adjust to "bottom-right" if needed
geolocationToggle.style.right = "10px";
geolocationToggle.textContent = "🌐";
document.body.appendChild(geolocationToggle);

// Flag to track current mode
let isGeolocationEnabled = false;

// Event listener for toggling geolocation
geolocationToggle.addEventListener("click", () => {
  isGeolocationEnabled = !isGeolocationEnabled;

  if (isGeolocationEnabled) {
    enableLeafletGeolocation();
  } else {
    disableLeafletGeolocation();
    enableDiscreteMovement();
  }
});

// Enable Leaflet geolocation
function enableLeafletGeolocation() {
  console.log("Enabling Leaflet geolocation...");
  if (map && map.locate) {
    map.locate({ watch: true, setView: true, maxZoom: 16 });

    map.on("locationfound", handleLocationFound);
    map.on("locationerror", handleLocationError);
  } else {
    console.error(
      "Leaflet geolocation unavailable. Falling back to discrete movement.",
    );
    enableDiscreteMovement();
  }
}

// Disable Leaflet geolocation
function disableLeafletGeolocation() {
  console.log("Disabling Leaflet geolocation...");
  map.stopLocate();
  map.off("locationfound", handleLocationFound);
  map.off("locationerror", handleLocationError);
}

// Handle Leaflet geolocation updates
function handleLocationFound(e: LocationEvent) {
  const { lat, lng } = e.latlng;
  console.log(`Location found: ${lat}, ${lng}`);
  updatePlayerLocation(lat, lng);
}

// Handle Leaflet geolocation errors
function handleLocationError(e: ErrorEvent) {
  console.error("Leaflet geolocation failed:", e.message);
  enableDiscreteMovement();
}

// Enable discrete movement using existing buttons
function enableDiscreteMovement() {
  console.log("Switching to discrete movement...");

  const btnUp = document.getElementById("btnUp") as HTMLButtonElement;
  const btnDown = document.getElementById("btnDown") as HTMLButtonElement;
  const btnLeft = document.getElementById("btnLeft") as HTMLButtonElement;
  const btnRight = document.getElementById("btnRight") as HTMLButtonElement;

  btnUp.addEventListener("click", () => movePlayer("up"));
  btnDown.addEventListener("click", () => movePlayer("down"));
  btnLeft.addEventListener("click", () => movePlayer("left"));
  btnRight.addEventListener("click", () => movePlayer("right"));
}

// Update player's location
function updatePlayerLocation(lat: number, lng: number): void {
  const newLocation = leaflet.latLng(lat, lng);
  playerMarker.setLatLng(newLocation); // Move the player marker
  map.setView(newLocation); // Center map to new location

  // Update the global currentLocation reference
  currentLocation.lat = lat;
  currentLocation.lng = lng;

  // Update other elements tied to player location
  updateCacheVisibility();
  updatePlayerRadiusVisualization();

  // Regenerate caches based on the new location
  generateCaches(CACHE_SPAWN_RADIUS, CACHE_SPAWN_PROBABILITY);
}

// Update player's location using discrete movement
function movePlayer(direction: "up" | "down" | "left" | "right"): void {
  const currentLatLng = playerMarker.getLatLng();
  let newLatLng;

  switch (direction) {
    case "up":
      newLatLng = leaflet.latLng(
        currentLatLng.lat + TILE_SIZE,
        currentLatLng.lng,
      );
      break;
    case "down":
      newLatLng = leaflet.latLng(
        currentLatLng.lat - TILE_SIZE,
        currentLatLng.lng,
      );
      break;
    case "left":
      newLatLng = leaflet.latLng(
        currentLatLng.lat,
        currentLatLng.lng - TILE_SIZE,
      );
      break;
    case "right":
      newLatLng = leaflet.latLng(
        currentLatLng.lat,
        currentLatLng.lng + TILE_SIZE,
      );
      break;
  }

  // Update the player's position
  playerMarker.setLatLng(newLatLng);
  map.setView(newLatLng);

  // Update global currentLocation
  currentLocation.lat = newLatLng.lat;
  currentLocation.lng = newLatLng.lng;

  // Update visibility and radius visualization
  updateCacheVisibility();
  updatePlayerRadiusVisualization();
  updateMovementHistory(currentLocation.lat, currentLocation.lng);

  // Regenerate caches based on the new location
  generateCaches(CACHE_SPAWN_RADIUS, CACHE_SPAWN_PROBABILITY);
}

// Initialize an array to hold the player's movement history
const movementHistory: leaflet.LatLng[] = [];

// Create a polyline to display the movement history
let movementPolyline: leaflet.Polyline;

// Function to update the polyline with new movement
function updateMovementHistory(lat: number, lng: number): void {
  // Add the new position to the movement history
  const newPosition = new leaflet.LatLng(lat, lng);
  movementHistory.push(newPosition);

  // If the polyline already exists, update it
  if (movementPolyline) {
    movementPolyline.setLatLngs(movementHistory);
  } else {
    // If it's the first movement, create the polyline
    movementPolyline = leaflet.polyline(movementHistory, {
      color: "blue",
      weight: 3,
      opacity: 0.5,
      smoothFactor: 1,
    }).addTo(map);
  }
}

// Call the function to create movement controls when the game loads
createMovementControls();

// Array to hold the player's collected coins
const playerInventory: string[] = [];

// Consolidated cell state map
const cellState: Map<
  string,
  { discovered: boolean; cache?: Geocache; memento?: GeocacheMemento }
> = new Map();

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
        const memento = toMemento(cache);
        cellState.set(key, { discovered: true, cache, memento });

        // Spawn the cache on the map
        spawnCache(cacheLocation, { i, j }, cache);
      }
    }
  }
}

generateCaches(CACHE_SPAWN_RADIUS, CACHE_SPAWN_PROBABILITY);
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
  const cacheState = cellState.get(key);
  if (cacheState && cacheState.memento) {
    fromMemento(cache, cacheState.memento);
    cache.rectangle?.addTo(map); // Re-add the rectangle if it was visible before
  }

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

// Mark collectCoin as async to handle the asynchronous functions
async function collectCoin(
  geocache: Geocache,
  coin: string,
  rect: leaflet.Rectangle,
) {
  // Use await to wait for the asynchronous removeCoin to complete
  const isRemoved = await removeCoin(geocache, coin); // Await the promise to resolve

  if (isRemoved) {
    playerInventory.push(coin); // Add coin to inventory

    updateCachePopup(rect, geocache); // Refresh popup content to reflect coin removal
  }

  updateInventoryDisplay(); // Update the inventory display
}

// Mark depositCoin as async to handle the asynchronous functions
async function depositCoin(
  geocache: Geocache,
  rect: leaflet.Rectangle,
): Promise<void> {
  // Ensure there is at least one coin in the player's inventory
  if (playerInventory.length > 0) {
    const coinToDeposit = playerInventory.pop(); // Remove the last coin from the inventory

    if (coinToDeposit) {
      // Await the promise returned by receiveCoin
      const isDeposited = await receiveCoin(geocache, coinToDeposit);

      if (isDeposited) {
        updateCachePopup(rect, geocache); // Update the popup after depositing
        updateInventoryDisplay(); // Update the inventory display after depositing
      }
    }
  }
}

// Updates any additional status or UI elements related to the popup
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
  return distance <= CACHE_SPAWN_RADIUS_METERS; // Check if the cache is within the radius
}

function updateCacheVisibility(): void {
  // Iterate through each entry in the cellState map
  cellState.forEach((cell, cellId) => {
    // Check if the cache exists and whether it's within the spawn radius
    const isInRange = cell.cache
      ? isCacheWithinSpawnRadius(cell.cache.location)
      : false;

    // Log the cache position and whether it's in range

    // If the cache is discovered and is within range, make sure its rectangle is added to the map
    if (isInRange && cell.discovered && cell.cache) {
      const cache = cell.cache;

      // Only add the rectangle to the map if it isn't already there and it's not null
      if (cache.rectangle && !cache.rectangle._map) {
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

// Add a variable to track the player radius visibility
let playerRadiusVisible = true;
let playerRadiusCircle: leaflet.Circle | null = null;

// Function to create the toggle button for player radius visibility
function createRadiusToggleButton(): void {
  const toggleButton = document.createElement("button");
  toggleButton.textContent = "Toggle Player Radius";
  toggleButton.style.backgroundColor = "#FF6347";
  toggleButton.style.color = "white";
  toggleButton.style.border = "none";
  toggleButton.style.padding = "10px";
  toggleButton.style.margin = "5px";
  toggleButton.style.fontSize = "18px";
  toggleButton.style.borderRadius = "5px";
  toggleButton.style.cursor = "pointer";
  toggleButton.addEventListener("click", togglePlayerRadius);

  // Add the toggle button to the controls div
  const controlsDiv = document.getElementById("controls");
  if (controlsDiv) {
    controlsDiv.appendChild(toggleButton);
  }
}

// Toggle the visibility of the player's radius circle
function togglePlayerRadius(): void {
  playerRadiusVisible = !playerRadiusVisible;
  if (playerRadiusCircle) {
    if (playerRadiusVisible) {
      playerRadiusCircle.addTo(map); // Show the radius circle
    } else {
      playerRadiusCircle.remove(); // Hide the radius circle
    }
  }
}

// Update the function to visualize the player radius when moving
function updatePlayerRadiusVisualization(): void {
  if (playerRadiusCircle) {
    playerRadiusCircle.setLatLng(currentLocation);
  } else {
    // Create a new circle if it doesn't exist
    playerRadiusCircle = leaflet.circle(currentLocation, {
      radius: CACHE_SPAWN_RADIUS_METERS,
      color: "blue",
      weight: 1,
      opacity: 0.5,
      fillOpacity: 0.1,
    }).addTo(map);
  }
}

// Call the function to create the toggle button when the game loads
createRadiusToggleButton();
