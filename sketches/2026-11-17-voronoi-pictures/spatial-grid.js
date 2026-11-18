// A spatial grid: a quick way to find seeds near a point.
// (Adapted from my Brownian Snowflakes sketch.)
//
// Space is split into square cells, and each seed is filed in the cell it
// sits in. To find seeds near a point, we only look in that point's cell and
// the 8 cells around it, instead of checking every seed. The cells are as wide
// as the farthest distance we ever search, so those 9 cells always contain
// everything close enough to matter.
//
// Seeds move, so the grid is cleared and refilled every time it's used.

class SpatialGrid {

  constructor(cellSize) {
    this.cellSize = cellSize;
    this.cells = new Map();   // cell key -> array of seeds in that cell
  }

  // Turn cell column/row numbers into one number to use as a Map key
  key(col, row) {
    return (col + 50000) * 100000 + (row + 50000);
  }

  clear() {
    this.cells.clear();
  }

  add(seed) {
    let col = Math.floor(seed.pos.x / this.cellSize);
    let row = Math.floor(seed.pos.y / this.cellSize);
    let k = this.key(col, row);
    if (!this.cells.has(k)) this.cells.set(k, []);
    this.cells.get(k).push(seed);
  }

  // Returns every seed in the 9 cells around pos (some may be a bit farther
  // than cellSize away; the caller checks the exact distance)
  near(pos) {
    let col = Math.floor(pos.x / this.cellSize);
    let row = Math.floor(pos.y / this.cellSize);
    let found = [];
    for (let c = col - 1; c <= col + 1; c++) {
      for (let r = row - 1; r <= row + 1; r++) {
        let cell = this.cells.get(this.key(c, r));
        if (cell) found.push(...cell);
      }
    }
    return found;
  }
}
