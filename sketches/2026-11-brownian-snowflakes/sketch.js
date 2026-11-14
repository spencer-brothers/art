// Coding Challenge 127: Brownian Motion Snowflake
// Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/127-brownian-snowflake.html
// https://youtu.be/XUA8UREROYE

// How many snowflakes fit across the canvas. The number of rows is
// worked out from this so the grid fills the whole canvas.
const COLS = 10;

// Colors (hex codes, like in CSS)
const BACKGROUND = '#ECE4D4';   // linen / oat

const PALETTE = [
  '#94A27F',   // dusty sage
  '#71815B',   // moss
  '#52603F',   // deep moss
  '#9B3A2C',   // brick red
  '#1C1B19',   // black
];

let snowflakes = [];

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Isometric (hexagonal) grid: every other row shifts right by half a
  // space, and rows sit closer together (sqrt(3)/2 of the spacing), so
  // each snowflake is the same distance from all six of its neighbors.
  let spacing = width / COLS;
  let rowGap = spacing * sqrt(3) / 2;

  // Make each snowflake a bit smaller than the spacing so they don't touch
  let radius = spacing * 0.45;

  // Start one row and one column off the canvas and keep going until we're
  // past the far edges. Snowflakes along the edges get cut off, so the
  // pattern looks like it keeps going forever.
  for (let row = -1; row * rowGap - radius < height; row++) {
    let y = row * rowGap;   // row 0 sits right on the top edge
    let shift = (abs(row) % 2 == 1) ? spacing / 2 : 0;   // odd rows shift right

    for (let col = -1; col <= COLS; col++) {
      let x = col * spacing + spacing / 2 + shift;

      // Skip snowflakes that would be completely off the canvas
      if (x + radius < 0 || x - radius > width) continue;
      if (y + radius < 0 || y - radius > height) continue;

      snowflakes.push(new Snowflake(x, y, radius, random(PALETTE)));
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
