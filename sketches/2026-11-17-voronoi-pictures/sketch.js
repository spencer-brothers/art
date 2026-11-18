// Voronoi pictures: a Voronoi diagram with small cells where a picture is
// dark and large cells where it's light. So far: a test image, its brightness
// gradient, and seeds that move downhill on it (gradient descent).

const NUM_SEEDS = 5000;   // how many seeds to place

// Gradient descent: each frame, every seed steps downhill (toward darker areas)
// by gradient x LEARNING_RATE pixels. The step is capped by how bright the spot
// is: up to MAX_STEP pixels on white, down to MIN_STEP pixels on black, so
// seeds slow down as they reach dark areas.
const LEARNING_RATE = 100;
const MAX_STEP = 2;
const MIN_STEP = 0.2;

const IMAGE_OPACITY = 255;  // how strongly the picture shows behind the dots (0 = hidden, 255 = full)

// Gradient arrows (for checking the gradient; they point toward darker areas)
const SHOW_GRADIENT = true;
const ARROW_SPACING = 40;      // pixels between arrows
const ARROW_MAX_LENGTH = 30;   // length of the arrow at the steepest slope

const BACKGROUND = '#ECE4D4';   // linen
const BRICK = '#9B3A2C';        // brick red, for the seeds (shows on both black and white)
const MOSS = '#52603F';         // deep moss, for the arrows

let seeds = [];
let img;        // the picture the seeds will follow (a generated test image for now)
let gradient;   // the picture's brightness gradient (a GradientField)

function setup() {
  createCanvas(windowWidth, windowHeight);

  img = makeTestImage(width, height);
  gradient = new GradientField(img);

  // Place every seed at a random spot on the canvas
  for (let i = 0; i < NUM_SEEDS; i++) {
    seeds.push(new Seed(random(width), random(height)));
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

  // Move every seed one step downhill, then draw it
  stroke(BRICK);
  strokeWeight(5);   // dot size
  for (let s of seeds) {
    s.descend(gradient, LEARNING_RATE, MIN_STEP, MAX_STEP);
    s.show();
  }
}
