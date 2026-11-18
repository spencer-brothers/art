// Voronoi pictures: a Voronoi diagram with small cells where a picture is
// dark and large cells where it's light. So far: a test image and random seeds.

const NUM_SEEDS = 5000;   // how many seeds to place

const IMAGE_OPACITY = 90;   // how strongly the picture shows behind the dots (0 = hidden, 255 = full)

const BACKGROUND = '#ECE4D4';   // linen
const INK = '#1C1B19';          // near-black

let seeds = [];
let img;   // the picture the seeds will follow (a generated test image for now)

function setup() {
  createCanvas(windowWidth, windowHeight);

  img = makeTestImage(width, height);

  // Place every seed at a random spot on the canvas
  for (let i = 0; i < NUM_SEEDS; i++) {
    seeds.push(new Seed(random(width), random(height)));
  }

  noLoop();   // nothing moves yet, so draw once
}

function draw() {
  background(BACKGROUND);

  // Show the picture faintly behind the seeds
  tint(255, IMAGE_OPACITY);
  image(img, 0, 0);
  noTint();

  stroke(INK);
  strokeWeight(5);   // dot size
  for (let s of seeds) {
    s.show();
  }
}
