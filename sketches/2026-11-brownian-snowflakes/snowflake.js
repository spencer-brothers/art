// Snowflake class, adapted from:
// Coding Challenge 127: Brownian Motion Snowflake
// Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/127-brownian-snowflake.html

class Snowflake {

  // x, y: where the center of the snowflake is drawn on the canvas
  // radius: how far from the center new particles start (the snowflake's max size)
  // col: the color every particle in this snowflake is drawn with
  // particleScale: particle radius as a fraction of the snowflake's radius
  // jitter: how far particles jiggle sideways each step, in particle radii
  constructor(x, y, radius, col, particleScale, jitter) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.particleR = radius * particleScale;   // particle size grows with the snowflake
    this.jitter = jitter;
    this.color = col;
    this.particles = [];   // particles that have stuck to the snowflake (for drawing)
    // The same particles filed by location, for fast "what's nearby?" checks.
    // Cells are 2 particle radii wide: the farthest distance we ever check.
    this.grid = new SpatialGrid(this.particleR * 2);
    this.current = new Particle(this.radius, 0, this.particleR, this.jitter);
    this.done = false;

    // Stats, for the analysis page (the art doesn't use these)
    this.updates = 0;   // how many times update() ran: frames to finish in the art
    this.steps = 0;     // total wandering steps taken by all particles
    this.dropped = 0;   // particles thrown away because they had no free spot
  }

  // Let the current particle wander until it hits the edge of the
  // center or sticks to another particle, then start a new one.
  update() {
    if (this.done) return;
    this.updates++;

    let count = 0;
    while (!this.current.finished() && !this.current.intersects(this.grid)) {
      this.current.update();
      count++;
    }
    this.steps += count;

    // If a particle doesn't move at all, there's no room left: we're done
    if (count == 0) {
      this.done = true;
      return;
    }

    let hit = this.current.intersects(this.grid);
    if (hit) {
      // Snap onto the hexagonal grid next to the particle it hit.
      // If there's no free spot, drop this particle and try a new one.
      if (this.current.snapTo(hit, this.grid)) {
        this.addParticle(this.current);
      } else {
        this.dropped++;
      }
    } else {
      // It reached the center without hitting anything (the very first
      // particle). Put it exactly at the center so the grid starts there.
      this.current.pos.set(0, 0);
      this.addParticle(this.current);
    }

    this.current = new Particle(this.radius, 0, this.particleR, this.jitter);
  }

  // Add a stuck particle to both the drawing list and the spatial grid
  addParticle(p) {
    this.particles.push(p);
    this.grid.add(p);
  }

  // Draw all particles 12 times (6 rotations, each mirrored) for symmetry
  show() {
    push();
    translate(this.x, this.y);
    rotate(PI / 6);

    for (let i = 0; i < 6; i++) {
      rotate(PI / 3);
      this.showParticles();

      push();
      scale(1, -1);
      this.showParticles();
      pop();
    }

    pop();
  }

  showParticles() {
    this.current.show(this.color);
    for (let p of this.particles) {
      p.show(this.color);
    }
  }
}
