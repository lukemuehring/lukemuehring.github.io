export class GameMap {
  tsize: number;
  cols: number;
  rows: number;
  tiles: number[];
  length: number; // horizontal length of the map in Tiles

  constructor(tsize: number = 64, cols: number = 888, rows: number = 2) {
    this.tsize = tsize;
    this.cols = cols;
    this.rows = rows;

    this.tiles = new Array(this.cols * this.rows);
    this.tiles.fill(0, 0, this.cols);
    this.tiles.fill(1, this.cols);
    this.length = cols * tsize;
  }

  // Gets the tile index number (0,1,2...?) at the specified column and row
  // Returns undefined if the coordinates are out of bounds
  getTile(col: number, row: number): number | undefined {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return undefined;
    }
    return this.tiles[row * this.cols + col];
  }
}
