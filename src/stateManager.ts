// stateManager.ts
import { Geocache, GeocacheMemento } from "./geocache.ts"; // Import geocache types
import leaflet from "leaflet";
type LatLng = { lat: number; lng: number };

const state = {
  currentLocation: { lat: 36.98949379578401, lng: -122.06277128548504 },
  playerInventory: [] as string[],
  // Update cellState to use Geocache and GeocacheMemento types
  cellState: new Map<
    string,
    { discovered: boolean; cache?: Geocache; memento?: GeocacheMemento }
  >(),
  rectangleVisibilityMap: new Map<string, leaflet.Rectangle>(), // Adjust if you have a specific rectangle type
};

// Getter for currentLocation
const getCurrentLocation = (): LatLng => {
  return state.currentLocation;
};

// Setter for currentLocation
const setCurrentLocation = (location: LatLng): void => {
  state.currentLocation = location;
};

// Functions for playerInventory
const addItemToInventory = (item: string): void => {
  state.playerInventory.push(item);
};

const removeItemFromInventory = (): string | undefined => {
  return state.playerInventory.pop(); // Remove the last item
};

const getInventory = (): string[] => {
  return state.playerInventory;
};

// Functions for cell state management
const setCellState = (
  key: string,
  cellData: {
    discovered: boolean;
    cache?: Geocache;
    memento?: GeocacheMemento;
  },
): void => {
  state.cellState.set(key, cellData);
};

const getCellState = (
  key: string,
):
  | { discovered: boolean; cache?: Geocache; memento?: GeocacheMemento }
  | undefined => {
  return state.cellState.get(key);
};

// Clear state function
const clearState = (): void => {
  state.cellState.clear();
  state.rectangleVisibilityMap.clear();
  state.playerInventory.length = 0;
};

// Exporting state and management methods
export {
  addItemToInventory,
  clearState,
  getCellState,
  getCurrentLocation,
  getInventory,
  removeItemFromInventory,
  setCellState,
  setCurrentLocation,
  state,
};
