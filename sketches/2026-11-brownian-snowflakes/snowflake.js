// Snowflake class, adapted from:
// Coding Challenge 127: Brownian Motion Snowflake
// Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/127-brownian-snowflake.html

class Snowflake {

  // x, y: where the center of the snowflake is drawn on the canvas
  // radius: how far from the center new particles start (the snowflake's max size)
  // col: the color every particle in this snowflake is drawn with
  constructor(x, y, radius, col) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.particleR = radius * PARTICLE_SCALE;   // particle size grows with the snowflake
    this.color = col;
    this.particles = [];   // particles that have stuck to the snowflake
    this.current = new Particle(this.radius, 0, this.particleR);
    this.done = false;
  }

  // Let the current particle wander until it hits the edge of the
  // center or sticks to another particle, then start a new one.
  update() {
    if (this.done) return;

    let count = 0;
    while (!this.current.finished() && !this.current.intersects(this.particles)) {
      this.current.update();
      count++;
    }

    // If a particle doesn't move at all, there's no room left: we're done
    if (count == 0) {
      this.done = true;
      return;
    }

    let hit = this.current.intersects(this.particles);
    if (hit) {
      // Snap onto the hexagonal grid next to the particle it hit.
      // If there's no free spot, drop this particle and try a new one.
      if (this.current.snapTo(hit, this.particles)) {
        this.particles.push(this.current);
      }
    } else {
      // It reached the center without hitting anything (the very first
      // particle). Put it exactly at the center so the grid starts there.
      this.current.pos.set(0, 0);
      this.particles.push(this.current);
    }

    this.current = new Particle(this.radius, 0, this.particleR);
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
