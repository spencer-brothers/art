// Coding Challenge 127: Brownian Motion Snowflake
// Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/127-brownian-snowflake.html
// https://youtu.be/XUA8UREROYE

// How many snowflakes fit along the canvas's shorter side: columns
// across the width if it's a tall canvas, rows down the height if it's
// a wide one. The grid then keeps going to fill the longer side.
const GRID_COUNT = 6;

// Particle radius as a fraction of the snowflake's radius. Because it's a
// fraction, snowflakes keep the same look and detail when GRID_COUNT changes.
// It shrinks from left to right, so snowflakes on the right have smaller
// particles and more detail.
const PARTICLE_SCALE_LEFT = 0.035;
const PARTICLE_SCALE_RIGHT = 0.008;

// How far particles jiggle sideways each step, in particle radii
// (the original was 1.5). It shrinks from top to bottom, so snowflakes
// near the bottom wander less and grow straighter, spikier arms.
const JITTER_TOP = 1.5;
const JITTER_BOTTOM = 0.5;

// Colors (hex codes, like in CSS)
const BACKGROUND = '#ECE4D4';   // linen / oat

// Each color has a weight: how many "tickets" it gets in the random draw.
// A color with weight 3 is picked three times as often as one with weight 1.
const PALETTE = [
  { color: '#94A27F', weight: 2 },   // dusty sage  (20%)
  { color: '#71815B', weight: 2 },   // moss        (20%)
  { color: '#52603F', weight: 2 },   // deep moss   (20%)
  { color: '#9B3A2C', weight: 3 },   // brick red   (30%)
  { color: '#1C1B19', weight: 1 },   // black       (10%)
];

// Pick a random color from PALETTE, using the weights
function pickColor() {
  let total = 0;
  for (let p of PALETTE) total += p.weight;

  let ticket = random(total);
  for (let p of PALETTE) {
    if (ticket < p.weight) return p.color;
    ticket -= p.weight;
  }
  return PALETTE[0].color;   // only reached if there's a rounding hiccup
}

let snowflakes = [];

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Isometric (hexagonal) grid: every other row shifts right by half a
  // space, and rows sit closer together (sqrt(3)/2 of the spacing), so
  // each snowflake is the same distance from all six of its neighbors.
  let rowRatio = sqrt(3) / 2;
  let spacing, rowGap;
  if (width <= height) {
    // Tall (or square) canvas: fit GRID_COUNT columns across the width
    spacing = width / GRID_COUNT;
    rowGap = spacing * rowRatio;
  } else {
    // Wide canvas: fit GRID_COUNT rows down the height
    rowGap = height / GRID_COUNT;
    spacing = rowGap / rowRatio;
  }

  // Make each snowflake a bit smaller than the spacing so they don't touch
  let radius = spacing * 0.45;

  // Start one row and one column off the canvas and keep going until we're
  // past the far edges. Snowflakes along the edges get cut off, so the
  // pattern looks like it keeps going forever.
  for (let row = -1; row * rowGap - radius < height; row++) {
    let y = row * rowGap;   // row 0 sits right on the top edge
    let shift = (abs(row) % 2 == 1) ? spacing / 2 : 0;   // odd rows shift right

    for (let col = -1; col * spacing - radius < width; col++) {
      let x = col * spacing + spacing / 2 + shift;

      // Skip snowflakes that would be completely off the canvas
      if (x + radius < 0 || x - radius > width) continue;
      if (y + radius < 0 || y - radius > height) continue;

      // Blend the settings based on where this snowflake is on the canvas.
      // constrain() keeps the cut-off edge snowflakes within the range.
      let across = constrain(x / width, 0, 1);   // 0 = left edge, 1 = right edge
      let down = constrain(y / height, 0, 1);    // 0 = top edge, 1 = bottom edge
      let particleScale = lerp(PARTICLE_SCALE_LEFT, PARTICLE_SCALE_RIGHT, across);
      let jitter = lerp(JITTER_TOP, JITTER_BOTTOM, down);

      snowflakes.push(new Snowflake(x, y, radius, pickColor(), particleScale, jitter));
    }
  }
}

function draw() {
  background(BACKGROUND);

  let allDone = true;
  for (let s of snowflakes) {
    s.update();
    s.show();
    if (!s.done) allDone = false;
  }

  if (allDone) {
    noLoop();
    console.log('all snowflakes completed');
  }
}
