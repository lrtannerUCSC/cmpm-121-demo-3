// Board.ts
import leaflet from "leaflet";
import { Geocache } from "./geocache.ts"; // Memento pattern for cache state

// Cell interface for representing a specific cell with (i, j) coordinates and a coin count
export interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;
  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map<string, Cell>();
  }

  // Retrieves or creates a canonical Cell
  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = `${i}:${j}`;
    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, { i, j });
    }
    return this.knownCells.get(key)!;
  }

  // Converts a geographical point to the corresponding cell on the board
  getCellForPoint(point: leaflet.LatLng): Cell {
    const i = Math.floor((point.lat - 36.98949379578401) / this.tileWidth);
    const j = Math.floor((point.lng + 122.06277128548504) / this.tileWidth);
    return this.getCanonicalCell({ i, j });
  }

  // Creates a Geocache at a specific location with coins
  createGeocache(location: leaflet.LatLng): Geocache {
    return new Geocache(location);
  }

  // Returns cells near a given point
  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    for (
      let i = originCell.i - this.tileVisibilityRadius;
      i <= originCell.i + this.tileVisibilityRadius;
      i++
    ) {
      for (
        let j = originCell.j - this.tileVisibilityRadius;
        j <= originCell.j + this.tileVisibilityRadius;
        j++
      ) {
        resultCells.push(this.getCanonicalCell({ i, j })); // Ensure numCoins is set
      }
    }
    return resultCells;
  }
}
