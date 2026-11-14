// Coding Challenge 127: Brownian Motion Snowflake
// Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/127-brownian-snowflake.html
// https://youtu.be/XUA8UREROYE

const COLS = 10;
const ROWS = 6;

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

  // Split the canvas into equal cells, one snowflake per cell
  let cellW = width / COLS;
  let cellH = height / ROWS;

  // Make each snowflake a bit smaller than its cell so they don't touch
  let radius = min(cellW, cellH) * 0.45;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      let x = col * cellW + cellW / 2;   // center of this cell
      let y = row * cellH + cellH / 2;
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
