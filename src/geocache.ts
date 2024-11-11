import leaflet from "leaflet";
import "leaflet/dist/leaflet.css";

// Define a Memento type for Geocache
interface GeocacheMemento {
  lat: number;
  lng: number;
  numCoins: number;
}

export class Geocache {
  location: leaflet.LatLng; // Location is a leaflet LatLng object
  numCoins: number;

  constructor(location: leaflet.LatLng, numCoins: number) {
    this.location = location;
    this.numCoins = numCoins;
  }

  // Memento pattern: Save the state of the geocache
  toMemento(): GeocacheMemento {
    // Instead of saving the whole LatLng object, save its properties
    return {
      lat: this.location.lat,
      lng: this.location.lng,
      numCoins: this.numCoins,
    };
  }

  // Memento pattern: Restore the state of the geocache
  fromMemento(memento: GeocacheMemento): void {
    // Recreate the LatLng object from the saved properties
    this.location = leaflet.latLng(memento.lat, memento.lng);
    this.numCoins = memento.numCoins;
  }
}
