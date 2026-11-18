// A seed of the Voronoi diagram: one point. Later, each seed will own the
// cell of all pixels closer to it than to any other seed.

class Seed {

  // x, y: where the seed sits on the canvas
  constructor(x, y) {
    this.pos = createVector(x, y);
  }

  // One step of gradient descent: move downhill on the picture's brightness
  // (toward darker areas). The step is the gradient times learningRate, capped
  // so steep edges don't fling the seed across the canvas. The cap depends on
  // brightness: maxStep on white, minStep on black, so seeds slow down in dark
  // areas. Every frame takes the same kind of step (a fixed time step), so the
  // motion doesn't depend on how fast the computer is.
  descend(field, learningRate, minStep, maxStep) {
    let step = field.gradientAt(this.pos.x, this.pos.y);
    step.mult(-learningRate);   // minus: downhill, toward darker

    let brightness = field.brightnessAt(this.pos.x, this.pos.y);
    step.limit(lerp(minStep, maxStep, brightness));
    this.pos.add(step);

    // Stay on the canvas
    this.pos.x = constrain(this.pos.x, 0, width - 1);
    this.pos.y = constrain(this.pos.y, 0, height - 1);
  }

  // Draw the seed as a small dot
  show() {
    point(this.pos.x, this.pos.y);
  }
}
