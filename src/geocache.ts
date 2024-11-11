// Geocache.ts
import leaflet from "leaflet";

export class Geocache {
  location: leaflet.LatLng;
  coins: string[]; // An array to hold unique coin identifiers like "i:j#serial"

  constructor(location: leaflet.LatLng) {
    this.location = location;
    this.coins = [];
    this.populateCoins();
  }

  // Generate coins with unique identifiers
  populateCoins() {
    const coinCount = Math.floor(Math.random() * 5) + 1; // Random number of coins per cache
    for (let i = 0; i < coinCount; i++) {
      this.coins.push(
        `${this.location.lat.toFixed(5)}:${this.location.lng.toFixed(5)}#${i}`,
      );
    }
  }

  // Memento Pattern: Create the memento interface for Geocache state
  toMemento(): GeocacheMemento {
    return { location: this.location, coins: this.coins };
  }

  // Memento Pattern: Restore the state of the Geocache from the memento
  fromMemento(memento: GeocacheMemento): void {
    this.location = memento.location;
    this.coins = memento.coins;
  }

  depositCoin(coin: string): boolean {
    if (this.coins.indexOf(coin) === -1) {
      this.coins.push(coin);
      return true; // Successfully added the coin
    }
    return false; // Coin already exists in cache
  }

  // Remove a coin from the cache by its unique identifier
  removeCoin(coin: string): boolean {
    const coinIndex = this.coins.indexOf(coin);
    if (coinIndex > -1) {
      this.coins.splice(coinIndex, 1); // Remove the coin from the cache
      return true;
    }
    return false; // Coin not found in cache
  }
}

// Geocache Memento type
export interface GeocacheMemento {
  location: leaflet.LatLng;
  coins: string[];
}
