import leaflet from "leaflet";

// Geocache interface to define a geocache's properties and methods
// Example Geocache structure - Add a rectangle property if needed
export interface Geocache {
  location: leaflet.LatLng;
  coins: string[];
  rectangle?: leaflet.Rectangle; // Optional rectangle property
  visible?: boolean; // Track visibility state
}

// Function to create a new geocache
export function createGeocache(location: leaflet.LatLng): Geocache {
  const geocache: Geocache = {
    location,
    coins: [],
  };
  populateCoins(geocache);
  return geocache;
}

// Populate coins with unique identifiers for the geocache
function populateCoins(geocache: Geocache) {
  const coinCount = Math.floor(Math.random() * 5) + 1; // Random number of coins per cache
  for (let i = 0; i < coinCount; i++) {
    geocache.coins.push(
      `${geocache.location.lat.toFixed(5)}:${
        geocache.location.lng.toFixed(5)
      }#${i}`,
    );
  }
}

export function receiveCoin(geocache: Geocache, coin: string): boolean {
  if (geocache.coins.indexOf(coin) === -1) {
    geocache.coins.push(coin);
    return true; // Successfully added the coin
  }
  return false; // Coin already exists in cache
}

export function removeCoin(geocache: Geocache, coin: string): boolean {
  const coinIndex = geocache.coins.indexOf(coin);
  if (coinIndex > -1) {
    geocache.coins.splice(coinIndex, 1); // Remove the coin from the cache
    return true;
  }
  return false; // Coin not found in cache
}

// Memento Pattern: Create the memento interface for Geocache state
export function toMemento(geocache: Geocache): GeocacheMemento {
  return { location: geocache.location, coins: geocache.coins };
}

// Memento Pattern: Restore the state of the Geocache from the memento
export function fromMemento(
  geocache: Geocache,
  memento: GeocacheMemento,
): void {
  geocache.location = memento.location;
  geocache.coins = memento.coins;
}

// Geocache Memento type
export interface GeocacheMemento {
  location: leaflet.LatLng;
  coins: string[];
}
