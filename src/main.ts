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

import {
  addItemToInventory,
  clearState,
  getCurrentLocation,
  getInventory,
  removeItemFromInventory,
  setCellState,
  setCurrentLocation,
  state,
} from "./stateManager.ts";

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

//let currentLocation = playerMarker.getLatLng();
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
    map.locate({ watch: true, setView: true, maxZoom: MAP_ZOOM });

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
  setCurrentLocation({ lat, lng });
  //generateCaches(CACHE_SPAWN_RADIUS, CACHE_SPAWN_PROBABILITY);

  // Update other elements tied to player location
  updateCacheVisibility();
  updatePlayerRadiusVisualization();

  // Regenerate caches based on the new location
}

// Update player's location using discrete movement
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
  map.setView(newLatLng); // Center map to new location

  // Update the currentLocation in the state manager to the new position
  setCurrentLocation({ lat: newLatLng.lat, lng: newLatLng.lng });

  // Now updateMovementHistory with the new location
  updateMovementHistory(newLatLng.lat, newLatLng.lng);

  // Regenerate caches based on the new location
  generateCaches(CACHE_SPAWN_RADIUS, CACHE_SPAWN_PROBABILITY);

  // Update visibility and radius visualization
  updateCacheVisibility();
  updatePlayerRadiusVisualization();
}

// Initialize an array to hold the player's movement history
let movementHistory: leaflet.LatLng[] = [];

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
//const playerInventory: string[] = [];

interface CellState {
  discovered: boolean;
  cache?: Geocache;
  memento?: GeocacheMemento;
}

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

      const { lat, lng } = getCurrentLocation();
      const cellLat = lat + i * TILE_SIZE;
      const cellLng = lng + j * TILE_SIZE;
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

function spawnCache(
  location: leaflet.LatLng,
  cell: Cell,
  cache: Geocache,
): void {
  const bounds: leaflet.LatLngBoundsExpression = [
    [location.lat, location.lng],
    [location.lat + TILE_SIZE, location.lng + TILE_SIZE],
  ];
  const { lat, lng } = getCurrentLocation();
  const cellLat = (lat + cell.i * TILE_SIZE).toFixed(5);
  const cellLng = (lng + cell.j * TILE_SIZE).toFixed(5);
  const key = `${cellLat}:${cellLng}`;

  // Check for existing cache state with memento
  const cacheState = cellState.get(key);
  if (cacheState && cacheState.memento) {
    fromMemento(cache, cacheState.memento); // Restore the cache using memento

    if (cacheState.cache?.rectangle) {
      // Check if the rectangle is already visible
      if (!rectangleVisibilityMap.has(key)) {
        const rectangleBounds = leaflet.latLngBounds(
          leaflet.latLng(
            cacheState.cache.rectangle.bounds.southWest.lat,
            cacheState.cache.rectangle.bounds.southWest.lng,
          ),
          leaflet.latLng(
            cacheState.cache.rectangle.bounds.northEast.lat,
            cacheState.cache.rectangle.bounds.northEast.lng,
          ),
        );

        const rectangle = leaflet.rectangle(rectangleBounds, {
          color: cacheState.cache.rectangle.color || "#28a745",
        });

        rectangle.addTo(map);
        rectangleVisibilityMap.set(key, rectangle);

        cache.visible = true;
        setupCachePopup(rectangle, cache); // Pass the actual Leaflet rectangle
      }
    }
  }

  // If the rectangle doesn't exist (and not restored), create it fresh
  if (!cache.rectangle) {
    cache.rectangle = {
      bounds: {
        southWest: { lat: location.lat, lng: location.lng },
        northEast: {
          lat: location.lat + TILE_SIZE,
          lng: location.lng + TILE_SIZE,
        },
      },
      color: "#28a745",
    };

    const rect = leaflet.rectangle(bounds, {
      color: cache.rectangle.color,
      weight: 1,
    });
    rect.addTo(map);

    rectangleVisibilityMap.set(key, rect);
    cache.visible = true;

    setupCachePopup(rect, cache); // Pass the Leaflet rectangle
  }
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
    addItemToInventory(coin); // Add coin to inventory

    updateCachePopup(rect, geocache); // Refresh popup content to reflect coin removal
  }

  updateInventoryDisplay(); // Update the inventory display
}

// Mark depositCoin as async to handle the asynchronous functions
async function depositCoin(
  geocache: Geocache,
  rect: leaflet.Rectangle,
): Promise<void> {
  // Use the state manager to get the current inventory
  const inventory = getInventory(); // Fetch inventory from stateManager

  // Ensure there is at least one coin in the player's inventory
  if (inventory.length > 0) {
    const coinToDeposit = removeItemFromInventory(); // Remove the last coin from the inventory
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
  const inventory = getInventory();
  inventoryDiv.innerHTML = "<strong>Player Inventory:</strong>";
  inventory.forEach((coin) => {
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
  const { lat, lng } = getCurrentLocation();
  const distance = leaflet.latLng(lat, lng).distanceTo(cacheLocation);
  return distance <= CACHE_SPAWN_RADIUS_METERS; // Check if the cache is within the radius
}

const rectangleVisibilityMap: Map<string, leaflet.Rectangle> = new Map();

function updateCacheVisibility(): void {
  cellState.forEach((cell, cellId) => {
    const cache = cell.cache;

    if (cache) {
      const isInRange = isCacheWithinSpawnRadius(cache.location);

      if (isInRange && cell.discovered) {
        if (
          cache.rectangle && cache.rectangle.bounds &&
          !rectangleVisibilityMap.has(cellId)
        ) {
          const bounds = leaflet.latLngBounds(
            leaflet.latLng(
              cache.rectangle.bounds.southWest.lat,
              cache.rectangle.bounds.southWest.lng,
            ),
            leaflet.latLng(
              cache.rectangle.bounds.northEast.lat,
              cache.rectangle.bounds.northEast.lng,
            ),
          );
          const rectangle = leaflet.rectangle(bounds, {
            color: cache.rectangle.color || "green",
          });

          rectangle.addTo(map);
          rectangleVisibilityMap.set(cellId, rectangle);
          //console.log(`Made rectangle for cache at ${cellId} visible.`);
          setupCachePopup(rectangle, cache);
          cache.visible = true;
        }
      } else if (!isInRange || !cell.discovered) {
        if (rectangleVisibilityMap.has(cellId)) {
          const rectangle = rectangleVisibilityMap.get(cellId);
          if (rectangle) {
            rectangle.remove();
          }

          rectangleVisibilityMap.delete(cellId);
          cache.visible = false;
        }
      }
    }
  });
}

// Add a variable to track the player radius visibility
let playerRadiusVisible = false;
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
  if (playerRadiusVisible) {
    const { lat, lng } = getCurrentLocation(); // Get the current location from state manager.

    if (playerRadiusCircle) {
      playerRadiusCircle.setLatLng({ lat, lng }); // Update the existing circle's position.
    } else {
      // Create a new circle if it doesn't exist
      playerRadiusCircle = leaflet.circle({ lat, lng }, { // Use lat and lng from state manager
        radius: CACHE_SPAWN_RADIUS_METERS,
        color: "blue",
        weight: 1,
        opacity: 0.5,
        fillOpacity: 0.1,
      }).addTo(map);
    }
  }
}

// Call the function to create the toggle button when the game loads
createRadiusToggleButton();

// Save button to save the game state
const saveButton = document.createElement("button");
saveButton.textContent = "Save Game";
saveButton.style.position = "absolute";
saveButton.style.bottom = "100px";
saveButton.style.right = "10px";
document.body.appendChild(saveButton);

// Reset button to reset the game state
const resetButton = document.createElement("button");
resetButton.textContent = "Reset Game";
resetButton.style.position = "absolute";
resetButton.style.bottom = "50px";
resetButton.style.right = "10px";
document.body.appendChild(resetButton);

function saveGameState() {
  try {
    console.log("Starting to save game state...");

    // Serialize currentLocation
    const currentLocation = getCurrentLocation(); // Use stateManager to get current location
    const currentLocationStr = JSON.stringify(currentLocation);

    console.log("Serialized currentLocation:", currentLocationStr);

    // Serialize playerInventory
    const playerInventory = getInventory(); // Fetch inventory from stateManager
    const playerInventoryStr = JSON.stringify(playerInventory);

    console.log("Serialized playerInventory:", playerInventoryStr);

    // Serialize cellState
    let cellStateStr = "[]"; // Fallback value for an empty array
    try {
      const cellStateArray = Array.from(state.cellState.entries()).map(
        ([key, value]) => {
          const serializedCache = value.cache
            ? {
              location: value.cache.location, // Save the coordinates (lat, lng)
              coins: value.cache.coins,
            }
            : undefined;

          console.log("Serialized cell", key, ":", serializedCache);
          return [key, { ...value, cache: serializedCache }];
        },
      );
      cellStateStr = JSON.stringify(cellStateArray);
      console.log("Serialized cellState:", cellStateStr);
    } catch (error) {
      console.error(
        "Error serializing cellState:",
        error,
        Array.from(state.cellState.entries()),
      );
    }

    // Serialize movementHistory
    let movementHistoryStr = "[]"; // Fallback value for an empty array
    try {
      const movementHistoryArray = movementPolyline
        ? movementPolyline.getLatLngs().map((latLng: leaflet.LatLng) => ({
          lat: latLng.lat,
          lng: latLng.lng,
        }))
        : [];
      movementHistoryStr = JSON.stringify(movementHistoryArray);
      console.log("Serialized movementHistory:", movementHistoryStr);
    } catch (error) {
      console.error(
        "Error serializing movementHistory:",
        error,
        movementPolyline?.getLatLngs(),
      );
    }

    // Construct gameState object
    const gameState: GameState = {
      currentLocation: currentLocation, // Already in serialized form
      playerInventory: JSON.parse(playerInventoryStr), // Default to empty inventory
      cellState: JSON.parse(cellStateStr), // Already serialized above
      movementHistory: JSON.parse(movementHistoryStr), // Already serialized above
    };

    console.log("Constructed gameState:", gameState);

    // Save to localStorage
    try {
      localStorage.setItem("gameState", JSON.stringify(gameState));
      console.log("Game state saved successfully.");
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  } catch (error) {
    console.error("Unexpected error in saveGameState:", error);
  }
}

interface CellState {
  discovered: boolean;
  cache?: Geocache;
  memento?: GeocacheMemento;
}

interface GameState {
  currentLocation: { lat: number; lng: number };
  playerInventory: string[];
  cellState: [string, CellState][];
  movementHistory: { lat: number; lng: number }[];
}

function loadGameState() {
  const savedState = localStorage.getItem("gameState");
  if (savedState) {
    const gameState: GameState = JSON.parse(savedState);

    // Clear previous state before loading new data
    clearState(); // Use the clearState function to reset the state

    // Restore player location
    if (gameState.currentLocation) {
      const location = {
        lat: gameState.currentLocation.lat,
        lng: gameState.currentLocation.lng,
      };
      setCurrentLocation(location); // Use stateManager to set the current location
      const latLng = leaflet.latLng(location.lat, location.lng);
      playerMarker.setLatLng(latLng); // Update player's marker position
      map.setView(latLng); // Ensure the map view is set to the player's location
    }

    // Restore player inventory
    if (Array.isArray(gameState.playerInventory)) {
      gameState.playerInventory.forEach((item: string) => {
        addItemToInventory(item); // Use stateManager to add items to inventory
      });
    }

    // Restore cell state and cache rectangles
    gameState.cellState.forEach(([key, value]: [string, CellState]) => {
      const cellId = key; // Use the key from the saved cell state
      // Restore the cache for the cell if it exists
      if (value.cache) {
        const cache = value.cache;
        // Recreate the cache location (if necessary)
        if (cache.location) {
          const cacheLocation = leaflet.latLng(
            cache.location.lat,
            cache.location.lng,
          );
          // Check if the cache's cell is discovered
          if (value.discovered) {
            // Recreate the rectangle for the discovered cell
            const bounds = leaflet.latLngBounds(
              cacheLocation,
              leaflet.latLng(
                cacheLocation.lat + TILE_SIZE,
                cacheLocation.lng + TILE_SIZE,
              ),
            );
            // Create a new rectangle using the bounds and color
            const rectangle = leaflet.rectangle(bounds, {
              color: "#28a745",
              weight: 1,
            });
            // Add the rectangle to the map
            rectangle.addTo(map);
            // Bind the cache popup
            setupCachePopup(rectangle, cache);
            // Store the rectangle back in the cache object
            cache.rectangle = rectangle;
          }
        }
        // Rebuild the cell state with the new cache (or any other data)
        setCellState(cellId, value); // Use stateManager to set cell state
      }
    });

    // Restore movement history / polyline if available
    if (gameState.movementHistory && gameState.movementHistory.length > 0) {
      movementPolyline = leaflet.polyline(gameState.movementHistory).addTo(map);
    }

    console.log("Game state loaded.");
  } else {
    console.log("No saved game state found.");
  }
}

function resetGameState() {
  console.log("Resetting game state...");

  // Clear the game save from localStorage
  localStorage.removeItem("gameSave");
  localStorage.clear();

  // Reset player location to starting point using stateManager
  const initialLocation = { lat: 36.98949379578401, lng: -122.06277128548504 };
  setCurrentLocation(initialLocation); // Use stateManager to set initial location
  const initialLatLng = leaflet.latLng(
    initialLocation.lat,
    initialLocation.lng,
  );

  playerMarker.setLatLng(initialLatLng); // Set the player's marker position
  map.setView(initialLatLng); // Center the map on the player's initial location

  // Instead of handling inventory reset separately, use the clearState function
  clearState(); // This resets the inventory, cell state, and rectangle visibility map

  // Reset movement history
  movementHistory = []; // Assuming this is still a local variable

  // Remove any existing layers (e.g., movement polyline, cache rectangles)
  if (movementPolyline) {
    map.removeLayer(movementPolyline);
    movementPolyline = null; // Reset the reference
  }

  console.log("Game state reset.");

  // Optional: Reload the page to ensure the reset is clean
  self.location.reload(); // Uncomment if you choose to reload the page
}

saveButton.addEventListener("click", () => saveGameState());
resetButton.addEventListener("click", () => resetGameState());

updateCacheVisibility();
// generateCaches(CACHE_SPAWN_RADIUS, CACHE_SPAWN_PROBABILITY);
loadGameState();
