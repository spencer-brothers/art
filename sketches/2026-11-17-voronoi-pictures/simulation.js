// The seed simulation: places the seeds, then each frame moves them (gradient
// pull, gas pressure, collisions, friction) and gradually settles them.

class Simulation {

  // field: the picture's GradientField (gradient, brightness, and spacing maps)
  constructor(field) {
    this.field = field;
    this.grid = new SpatialGrid(2 * SETTINGS.bubbles.max);   // cells as wide as the farthest two bubbles can reach
    this.seeds = [];
    this.frame = 0;   // frames since this picture started
    this.placeSeeds();
  }

  // Start the seeds evenly spaced (Poisson disk sampling), each spaced by its
  // full bubble size where it lands
  placeSeeds() {
    let { min, max } = SETTINGS.bubbles;
    let bubbleAt = (x, y) => lerp(min, max, this.field.spacingAt(x, y));
    let points = poissonDisk(width, height, bubbleAt, min, max).slice(0, SETTINGS.seeds.max);
    this.seeds = points.map((p, i) => new Seed(p.x, p.y, i));
    console.log(`Placed ${this.seeds.length} seeds`);
  }

  // How much the seeds can still move: 1 (freely) until settle.start, then
  // easing smoothly down to 0 (settled) over settle.frames
  settleAmount() {
    let t = constrain((this.frame - SETTINGS.settle.start) / SETTINGS.settle.frames, 0, 1);
    return 1 - t * t * (3 - 2 * t);
  }

  get settled() {
    return this.settleAmount() === 0;
  }

  // Advance one frame
  step() {
    this.frame++;
    let settle = this.settleAmount();
    if (settle > 0) this.move(settle);
  }

  // One frame of movement for every seed. `settle` (1 down to 0) scales how
  // far seeds may move, so they gradually come to rest.
  move(settle) {
    let d = SETTINGS.descent;

    // Remember where every seed started this frame (for the friction below)
    for (let s of this.seeds) s.prev.set(s.pos);

    // Gas pressure: work out how hard each seed's neighbors push on it
    this.updateBubbles();
    this.computeRepulsion();

    // Move every seed: momentum + downhill pull + neighbors' push
    for (let s of this.seeds) {
      s.descend(this.field, d.learningRate, d.minStep, d.maxStep, d.momentum, d.maxSpeed);
    }

    // Push apart any seeds whose bubbles now overlap
    this.updateBubbles();
    this.resolveCollisions();

    // Friction: where seeds pack tightly, they move only part of the way this
    // frame, and everything moves less as the picture settles
    for (let s of this.seeds) {
      let mobility = settle * lerp(SETTINGS.collisions.tightMobility, 1, this.field.spacingAt(s.prev.x, s.prev.y));
      s.pos.set(lerp(s.prev.x, s.pos.x, mobility), lerp(s.prev.y, s.pos.y, mobility));

      // Velocity = how far the seed actually moved, so speed lost to
      // collisions and friction is lost from its momentum too
      s.vel.set(s.pos.x - s.prev.x, s.pos.y - s.prev.y);
    }
  }

  // Each seed's bubble size comes from the spacing map where it is
  updateBubbles() {
    let { min, max } = SETTINGS.bubbles;
    for (let s of this.seeds) {
      s.bubble = lerp(min, max, this.field.spacingAt(s.pos.x, s.pos.y));
    }
  }

  // Refill the spatial grid with where every seed is now
  refillGrid() {
    this.grid.clear();
    for (let s of this.seeds) this.grid.add(s);
  }

  // Gas pressure. Every pair of seeds closer than gas.range x the sum of their
  // bubbles pushes apart: gas.strength when on top of each other, fading in a
  // straight line to zero at the edge of the range. Then tightly packed seeds
  // resist: each seed's push is scaled down where the spacing map is low.
  computeRepulsion() {
    let { range, strength, tightPush } = SETTINGS.gas;
    this.refillGrid();
    for (let s of this.seeds) s.push.set(0, 0);

    for (let a of this.seeds) {
      // Far enough to reach any neighbor, even one with the biggest bubble
      let searchRadius = range * (a.bubble + SETTINGS.bubbles.max);

      for (let b of this.grid.near(a.pos, searchRadius)) {
        if (b.id <= a.id) continue;   // handle each pair once (and skip a itself)

        let dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y;
        let dist = Math.hypot(dx, dy);
        let reach = range * (a.bubble + b.bubble);
        if (dist >= reach || dist === 0) continue;   // out of range (exact overlaps are left to collisions)

        let f = strength * (1 - dist / reach);
        let ux = dx / dist, uy = dy / dist;
        a.push.x -= ux * f;
        a.push.y -= uy * f;
        b.push.x += ux * f;
        b.push.y += uy * f;
      }
    }

    for (let s of this.seeds) {
      s.push.mult(lerp(tightPush, 1, this.field.spacingAt(s.pos.x, s.pos.y)));
    }
  }

  // Keep bubbles from overlapping: two seeds' centers must be at least the sum
  // of their bubble radii apart. Each overlapping pair moves apart by half the
  // overlap each. Fixing one pair can push a seed into another, so this runs
  // collisions.passes passes.
  resolveCollisions() {
    for (let pass = 0; pass < SETTINGS.collisions.passes; pass++) {
      this.refillGrid();

      for (let a of this.seeds) {
        for (let b of this.grid.near(a.pos)) {
          if (b.id <= a.id) continue;   // handle each pair once (and skip a itself)

          let dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y;
          let dist = Math.hypot(dx, dy);
          let minDist = a.bubble + b.bubble;
          if (dist >= minDist) continue;   // not overlapping

          // Exactly on top of each other: pick a random direction to separate
          if (dist === 0) {
            let angle = random(TWO_PI);
            dx = cos(angle);
            dy = sin(angle);
            dist = 1;
          }

          let half = (minDist - dist) / 2;
          let ux = dx / dist, uy = dy / dist;
          a.pos.x -= ux * half;
          a.pos.y -= uy * half;
          b.pos.x += ux * half;
          b.pos.y += uy * half;
        }
      }

      for (let s of this.seeds) s.stayOnCanvas();
    }
  }
}
