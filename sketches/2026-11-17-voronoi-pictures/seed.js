// A seed of the Voronoi diagram: one point. Later, each seed will own the
// cell of all pixels closer to it than to any other seed.

class Seed {

  // x, y: where the seed sits on the canvas
  // id: this seed's number (used to handle each pair of seeds only once)
  constructor(x, y, id) {
    this.pos = createVector(x, y);
    this.id = id;
    this.bubble = 0;   // personal-space radius, set each frame from the brightness
    this.prev = createVector(x, y);   // where the seed was at the start of the frame
    this.vel = createVector(0, 0);    // velocity: how far it moved last frame (its momentum)
    this.push = createVector(0, 0);   // total repulsion from neighbors this frame
  }

  // One step of gradient descent with momentum: move toward -gradient (toward
  // dark areas, or toward edges in edges mode), like a ball rolling downhill.
  // The downhill step is the gradient times learningRate, capped so steep
  // edges don't fling the seed. The cap depends on the spacing map: maxStep
  // where seeds spread out, minStep where they pack tightest. The seed keeps `momentum` of last frame's
  // velocity and adds this step to it, so it picks up speed on long slopes;
  // its speed is capped at maxSpeed. The repulsion from neighbors (this.push,
  // worked out beforehand) is added too. Every frame takes the same kind of step
  // (a fixed time step), so the motion doesn't depend on how fast the
  // computer is.
  descend(field, learningRate, minStep, maxStep, momentum, maxSpeed) {
    let step = field.gradientAt(this.pos.x, this.pos.y);
    step.mult(-learningRate);   // minus: downhill, toward darker

    let spacing = field.spacingAt(this.pos.x, this.pos.y);   // 0 where seeds pack tightest
    step.limit(lerp(minStep, maxStep, spacing));

    this.vel.mult(momentum);
    this.vel.add(step);
    this.vel.add(this.push);
    this.vel.limit(maxSpeed);

    this.pos.add(this.vel);
    this.stayOnCanvas();
  }

  stayOnCanvas() {
    this.pos.x = constrain(this.pos.x, 0, width - 1);
    this.pos.y = constrain(this.pos.y, 0, height - 1);
  }

  // Draw the seed as a small dot
  show() {
    point(this.pos.x, this.pos.y);
  }
}
