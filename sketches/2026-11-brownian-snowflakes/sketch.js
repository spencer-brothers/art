// Coding Challenge 127: Brownian Motion Snowflake
// Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/127-brownian-snowflake.html
// https://youtu.be/XUA8UREROYE

const COLS = 4;
const ROWS = 3;

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
      snowflakes.push(new Snowflake(x, y, radius));
    }
  }
}

function draw() {
  background(0);

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
