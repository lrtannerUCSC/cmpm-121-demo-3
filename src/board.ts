import leaflet from "leaflet";

// Cell interface for representing a specific cell with (i, j) coordinates and a coin count
export interface Cell {
  readonly i: number;
  readonly j: number;
}

// BoardConfig interface to hold configuration for the board
export interface BoardConfig {
  tileWidth: number;
  tileVisibilityRadius: number;
  knownCells: Map<string, Cell>;
}

// Initialize a new board with the configuration
export function createBoard(config: BoardConfig): BoardConfig {
  return {
    ...config,
    knownCells: new Map<string, Cell>(),
  };
}

// Retrieves or creates a canonical Cell
export function getCanonicalCell(
  board: BoardConfig,
  cell: Cell,
): Cell {
  const { i, j } = cell;
  const key = `${i}:${j}`;
  if (!board.knownCells.has(key)) {
    board.knownCells.set(key, { i, j });
  }
  return board.knownCells.get(key)!;
}

// Converts a geographical point to the corresponding cell on the board
export function getCellForPoint(
  board: BoardConfig,
  point: leaflet.LatLng,
): Cell {
  const i = Math.floor((point.lat - 36.98949379578401) / board.tileWidth);
  const j = Math.floor((point.lng + 122.06277128548504) / board.tileWidth);
  return getCanonicalCell(board, { i, j });
}

// Returns cells near a given point
export function getCellsNearPoint(
  board: BoardConfig,
  point: leaflet.LatLng,
): Cell[] {
  const resultCells: Cell[] = [];
  const originCell = getCellForPoint(board, point);
  for (
    let i = originCell.i - board.tileVisibilityRadius;
    i <= originCell.i + board.tileVisibilityRadius;
    i++
  ) {
    for (
      let j = originCell.j - board.tileVisibilityRadius;
      j <= originCell.j + board.tileVisibilityRadius;
      j++
    ) {
      resultCells.push(getCanonicalCell(board, { i, j }));
    }
  }
  return resultCells;
}
