// A spatial grid: a quick way to find particles near a point.
//
// Space is split into square cells, and each particle is filed in the cell
// it sits in. To find particles near a point, we only look in that point's
// cell and the 8 cells around it, instead of checking every particle in the
// snowflake. The cells are as wide as the farthest distance we ever search,
// so those 9 cells always contain everything close enough to matter.

class SpatialGrid {

  constructor(cellSize) {
    this.cellSize = cellSize;
    this.cells = new Map();   // cell key -> array of particles in that cell
  }

  // Turn cell column/row numbers into one number to use as a Map key
  key(col, row) {
    return (col + 50000) * 100000 + (row + 50000);
  }

  add(particle) {
    let col = Math.floor(particle.pos.x / this.cellSize);
    let row = Math.floor(particle.pos.y / this.cellSize);
    let k = this.key(col, row);
    if (!this.cells.has(k)) this.cells.set(k, []);
    this.cells.get(k).push(particle);
  }

  // Returns the closest particle less than maxDist from pos, or null if none.
  // maxDist must be no bigger than cellSize.
  closest(pos, maxDist) {
    let col = Math.floor(pos.x / this.cellSize);
    let row = Math.floor(pos.y / this.cellSize);
    let best = null;
    let bestDistSq = maxDist * maxDist;   // compare squared distances (skips a slow square root)

    for (let c = col - 1; c <= col + 1; c++) {
      for (let r = row - 1; r <= row + 1; r++) {
        let cell = this.cells.get(this.key(c, r));
        if (!cell) continue;
        for (let p of cell) {
          let dx = p.pos.x - pos.x;
          let dy = p.pos.y - pos.y;
          let dSq = dx * dx + dy * dy;
          if (dSq < bestDistSq) {
            best = p;
            bestDistSq = dSq;
          }
        }
      }
    }
    return best;
  }
}
