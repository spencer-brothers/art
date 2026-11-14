// Snowflake class, adapted from:
// Coding Challenge 127: Brownian Motion Snowflake
// Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/127-brownian-snowflake.html

class Snowflake {

  // x, y: where the center of the snowflake is drawn on the canvas
  // radius: how far from the center new particles start (the snowflake's max size)
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.particles = [];   // particles that have stuck to the snowflake
    this.current = new Particle(this.radius, 0);
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

    this.particles.push(this.current);
    this.current = new Particle(this.radius, 0);
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
    this.current.show();
    for (let p of this.particles) {
      p.show();
    }
  }
}
