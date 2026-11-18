// Voronoi pictures: a Voronoi diagram with small cells where a picture is
// dark and large cells where it's light. So far: a test image, its brightness
// gradient, and seeds that move downhill on it (gradient descent) without
// overlapping each other.

const NUM_SEEDS = 5000;   // how many seeds to place
const DOT_RADIUS = 2.5;   // size of the dot drawn for each seed

// Personal bubble: each seed keeps other seeds out of a circle around it.
// Its radius depends on the brightness where the seed is: BUBBLE_MIN on
// black, up to BUBBLE_MAX on white. Two seeds stay at least the sum of their
// bubble radii apart, so seeds pack tightly in dark areas and spread out in
// light ones.
const BUBBLE_MIN = 2.5;
const BUBBLE_MAX = 12;
const SHOW_BUBBLES = false;   // draw each bubble as a faint circle (for tuning)

// Collisions: after moving, overlapping seeds are pushed apart this many times
// per frame (more passes untangle crowded spots better, but cost more)
const COLLISION_PASSES = 3;

// Friction in dark areas: after moving and colliding, each seed only goes part
// of the way to its new spot. On white it goes all the way (1); on black only
// DARK_MOBILITY of the way. This calms the jitter in dark clusters, where the
// gradient pulls seeds in and collisions push them back out every frame.
const DARK_MOBILITY = 0.2;

// Gradient descent: each frame, every seed steps downhill (toward darker areas)
// by gradient x LEARNING_RATE pixels. The step is capped by how bright the spot
// is: up to MAX_STEP pixels on white, down to MIN_STEP pixels on black, so
// seeds slow down as they reach dark areas.
const LEARNING_RATE = 100;
const MAX_STEP = 2;
const MIN_STEP = 0.2;

const IMAGE_OPACITY = 255;  // how strongly the picture shows behind the dots (0 = hidden, 255 = full)

// Gradient smoothing: width of the Gaussian, in pixels. Bigger = more low-pass,
// so seeds sense features from farther away (about 3 x this many pixels).
const GRADIENT_SIGMA = 6;

// Gradient arrows (for checking the gradient; they point toward darker areas)
const SHOW_GRADIENT = true;
const ARROW_SPACING = 40;      // pixels between arrows
const ARROW_MAX_LENGTH = 30;   // length of the arrow at the steepest slope

const BACKGROUND = '#ECE4D4';   // linen
const BRICK = '#9B3A2C';        // brick red, for the seeds (shows on both black and white)
const MOSS = '#52603F';         // deep moss, for the arrows

let seeds = [];
let grid;       // spatial grid for finding nearby seeds quickly
let img;        // the picture the seeds will follow (a generated test image for now)
let gradient;   // the picture's brightness gradient (a GradientField)

function setup() {
  createCanvas(windowWidth, windowHeight);

  img = makeTestImage(width, height);
  gradient = new GradientField(img, GRADIENT_SIGMA);
  grid = new SpatialGrid(2 * BUBBLE_MAX);   // cells as wide as the farthest two bubbles can reach

  // Place every seed at a random spot on the canvas
  for (let i = 0; i < NUM_SEEDS; i++) {
    seeds.push(new Seed(random(width), random(height), i));
  }
}

function draw() {
  background(BACKGROUND);

  // Show the picture faintly behind the seeds
  tint(255, IMAGE_OPACITY);
  image(img, 0, 0);
  noTint();

  if (SHOW_GRADIENT) {
    stroke(MOSS);
    strokeWeight(1.5);
    gradient.show(ARROW_SPACING, ARROW_MAX_LENGTH);
  }

  // Remember where every seed started this frame (for the friction below)
  for (let s of seeds) s.prev.set(s.pos);

  // Move every seed one step downhill
  for (let s of seeds) {
    s.descend(gradient, LEARNING_RATE, MIN_STEP, MAX_STEP);
  }

  // Each seed's bubble size comes from the brightness where it is now
  for (let s of seeds) {
    s.bubble = lerp(BUBBLE_MIN, BUBBLE_MAX, gradient.brightnessAt(s.pos.x, s.pos.y));
  }

  // Then push apart any seeds whose bubbles overlap
  resolveCollisions();

  // Friction: darker spots let seeds move only part of the way this frame
  for (let s of seeds) {
    let mobility = lerp(DARK_MOBILITY, 1, gradient.brightnessAt(s.prev.x, s.prev.y));
    s.pos.set(lerp(s.prev.x, s.pos.x, mobility), lerp(s.prev.y, s.pos.y, mobility));
  }

  if (SHOW_BUBBLES) {
    noFill();
    stroke(BRICK + '40');   // brick red, mostly transparent
    strokeWeight(1);
    for (let s of seeds) circle(s.pos.x, s.pos.y, 2 * s.bubble);
  }

  // Draw the seeds
  stroke(BRICK);
  strokeWeight(2 * DOT_RADIUS);   // dot diameter
  for (let s of seeds) {
    s.show();
  }
}

// Keep seeds' bubbles from overlapping: two seeds' centers must be at least the
// sum of their bubble radii apart. For every pair that's too close, move each
// seed half the overlap away from the other, so their bubbles end up just
// touching. Fixing one pair can push a seed into another, so this runs a
// few passes.
function resolveCollisions() {
  for (let pass = 0; pass < COLLISION_PASSES; pass++) {
    // Refill the grid with where every seed is now
    grid.clear();
    for (let s of seeds) grid.add(s);

    for (let a of seeds) {
      for (let b of grid.near(a.pos)) {
        if (b.id <= a.id) continue;   // handle each pair once (and skip a itself)

        let dx = b.pos.x - a.pos.x;
        let dy = b.pos.y - a.pos.y;
        let d = Math.hypot(dx, dy);
        let minDist = a.bubble + b.bubble;
        if (d >= minDist) continue;   // bubbles not overlapping

        // Exactly on top of each other: pick a random direction to separate
        if (d === 0) {
          let angle = random(TWO_PI);
          dx = cos(angle);
          dy = sin(angle);
          d = 1;
        }

        // Push each seed half the overlap, along the line between them
        let push = (minDist - d) / 2;
        let ux = dx / d, uy = dy / d;
        a.pos.x -= ux * push;
        a.pos.y -= uy * push;
        b.pos.x += ux * push;
        b.pos.y += uy * push;
      }
    }

    // Keep everyone on the canvas
    for (let s of seeds) s.stayOnCanvas();
  }
}
