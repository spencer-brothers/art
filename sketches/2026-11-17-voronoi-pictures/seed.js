// A seed of the Voronoi diagram: one point. Later, each seed will own the
// cell of all pixels closer to it than to any other seed.

class Seed {

  // x, y: where the seed sits on the canvas
  constructor(x, y) {
    this.pos = createVector(x, y);
  }

  // Draw the seed as a small dot
  show() {
    point(this.pos.x, this.pos.y);
  }
}
