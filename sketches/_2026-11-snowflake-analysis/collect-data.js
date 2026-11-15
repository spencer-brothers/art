// Snowflake data collection: grows a 10 x 10 grid of snowflakes over and over with
// different random seeds, and records how many particles and steps each one
// takes and how long it takes to grow. Nothing here is published (the folder
// starts with "_"). Uses the real Snowflake code from the art sketch.
//
// Columns: particle scale, from big particles (left) to small (right)
// Rows:    jitter, from lots of jiggle (top) to little (bottom)

// ---- Settings ----

const SEEDS = 10;    // how many batches (each batch grows all 100 snowflakes)
const GRID = 10;     // 10 x 10 grid of setting combinations

const SCALE_LEFT = 0.1;     // particle scale, first column
const SCALE_RIGHT = 0.01;   // particle scale, last column (spaced evenly on a log scale)
const JITTER_TOP = 2.0;     // jitter, first row
const JITTER_BOTTOM = 0.5;  // jitter, last row

const FRAME_BUDGET_MS = 20;   // how long to grow snowflakes each frame before letting the page update
const SIM_RADIUS = 100;       // snowflakes are grown at this size, then scaled to fit their cell

const CARD = '#FFFEFB';         // figure card color (the plot has no background of its own)
const FLAKE_COLOR = '#52603F';  // deep moss
const INK = '#1C1B19';

// Space around the grid for axis labels, in pixels
const MARGIN = { left: 68, right: 4, top: 4, bottom: 58 };

// ---- State ----

let runsTable, batchesTable;
let cellSize, gridSize;

let batch = 0;        // which batch we're on (1 to SEEDS)
let runIndex = 0;     // which snowflake in the batch (0 to 99)
let current = null;   // the snowflake being grown right now
let currentMs = 0;    // time spent growing the current snowflake

let batchStart = 0;       // when this batch started (for wall-clock time)
let batchComputeMs = 0;   // time spent actually growing snowflakes this batch
let batchParticles = 0;
let allStart = 0;
let allComputeMs = 0;
let finished = false;

let ui = {};   // the page's progress bar, table, and message
let sessionStamp;   // date and time this session started, for file names

// ---- Setup ----

function setup() {
  // Make the figure as wide as the text column (and no taller than the window)
  let holder = select('#canvas-holder');
  let available = min(holder.elt.clientWidth, windowHeight - 40);   // card padding is already outside the holder
  gridSize = floor(available - MARGIN.left - MARGIN.right);
  cellSize = gridSize / GRID;
  createCanvas(MARGIN.left + gridSize + MARGIN.right,
               MARGIN.top + gridSize + MARGIN.bottom).parent(holder);
  textFont('Source Serif 4');   // same typeface as the page text

  // The web font may still be loading when the figure is first drawn.
  // Once it's ready, redraw the axis labels so they use it.
  document.fonts.load('14px "Source Serif 4"').then(drawAxisLabels);

  ui.bar = select('#progress-bar');
  ui.batch = select('#stat-batch');
  ui.run = select('#stat-run');
  ui.done = select('#stat-done');
  ui.elapsed = select('#stat-elapsed');
  ui.message = select('#status-message');
  createButton('Download CSV').parent('buttons').mousePressed(saveTables);

  fillDesignTable();

  runsTable = new p5.Table();
  for (let c of ['batch', 'seed', 'col', 'row', 'particle_scale', 'jitter',
                 'particles', 'steps', 'dropped', 'updates', 'grow_ms']) {
    runsTable.addColumn(c);
  }

  batchesTable = new p5.Table();
  for (let c of ['batch', 'snowflakes', 'total_particles', 'wall_seconds', 'compute_seconds']) {
    batchesTable.addColumn(c);
  }

  sessionStamp = `${year()}-${nf(month(), 2)}-${nf(day(), 2)}-${nf(hour(), 2)}${nf(minute(), 2)}`;
  allStart = performance.now();
  startBatch(1);
}

// The settings for one grid cell
function scaleForCol(col) {
  // Even spacing on a log scale between SCALE_LEFT and SCALE_RIGHT
  return exp(lerp(log(SCALE_LEFT), log(SCALE_RIGHT), col / (GRID - 1)));
}

function jitterForRow(row) {
  return lerp(JITTER_TOP, JITTER_BOTTOM, row / (GRID - 1));
}

// ---- Running the batches ----

function startBatch(b) {
  batch = b;
  runIndex = 0;
  batchStart = performance.now();
  batchComputeMs = 0;
  batchParticles = 0;
  drawFigureFrame();   // clear the figure for the new batch
}

function startRun() {
  let col = runIndex % GRID;
  let row = floor(runIndex / GRID);

  // Every snowflake gets its own seed (batch x 1000 + position), recorded in
  // the CSV. The same seeds are used every session, so the whole dataset can
  // be reproduced exactly, and any single run can be replayed.
  // Snowflakes grow one at a time, so nothing else uses random() meanwhile.
  let seed = batch * 1000 + runIndex;
  randomSeed(seed);

  current = new Snowflake(0, 0, SIM_RADIUS, FLAKE_COLOR, scaleForCol(col), jitterForRow(row));
  current.col = col;
  current.row = row;
  current.seed = seed;
  currentMs = 0;
}

function draw() {
  if (finished) return;

  let frameStart = performance.now();
  while (performance.now() - frameStart < FRAME_BUDGET_MS) {
    if (!current) startRun();

    let t0 = performance.now();
    current.update();
    currentMs += performance.now() - t0;

    if (current.done) {
      finishRun();
      if (finished) break;
    }
  }

  updateStatus();
}

function finishRun() {
  let s = current;

  let row = runsTable.addRow();
  row.setNum('batch', batch);
  row.setNum('seed', s.seed);
  row.setNum('col', s.col);
  row.setNum('row', s.row);
  row.setNum('particle_scale', scaleForCol(s.col));
  row.setNum('jitter', jitterForRow(s.row));
  row.setNum('particles', s.particles.length);
  row.setNum('steps', s.steps);
  row.setNum('dropped', s.dropped);
  row.setNum('updates', s.updates);
  row.setNum('grow_ms', round(currentMs, 2));

  batchComputeMs += currentMs;
  allComputeMs += currentMs;
  batchParticles += s.particles.length;

  drawFinished(s);
  current = null;
  runIndex++;

  if (runIndex == GRID * GRID) finishBatch();
}

function finishBatch() {
  let row = batchesTable.addRow();
  row.setNum('batch', batch);
  row.setNum('snowflakes', GRID * GRID);
  row.setNum('total_particles', batchParticles);
  row.setNum('wall_seconds', round((performance.now() - batchStart) / 1000, 2));
  row.setNum('compute_seconds', round(batchComputeMs / 1000, 2));

  if (batch < SEEDS) {
    startBatch(batch + 1);
  } else {
    finished = true;
    updateStatus();   // CSVs are only saved when the button is clicked
  }
}

// ---- Drawing and status ----

// Fill the design table on the page from the settings above, so it's always accurate
function fillDesignTable() {
  select('#meta-runs').html((SEEDS * GRID * GRID).toLocaleString());
  select('#p-s-from').html(nf(SCALE_LEFT, 1, 3));
  select('#p-s-to').html(nf(SCALE_RIGHT, 1, 3));
  select('#p-s-levels').html(GRID);
  select('#p-j-from').html(nf(JITTER_TOP, 1, 2));
  select('#p-j-to').html(nf(JITTER_BOTTOM, 1, 2));
  select('#p-j-levels').html(GRID);
  select('#p-b-to').html(SEEDS);
  select('#p-b-levels').html(SEEDS);
}

// Clear the figure and draw the axis labels (no background or grid lines,
// so the snowflakes sit directly on the card)
function drawFigureFrame() {
  background(CARD);
  drawAxisLabels();
}

// Draw the tick labels and axis titles in the margins around the grid
function drawAxisLabels() {
  // Clear just the margins (not the snowflakes), in case labels are redrawn
  noStroke();
  fill(CARD);
  rect(0, 0, MARGIN.left, height);
  rect(0, MARGIN.top + gridSize, width, MARGIN.bottom);

  fill(INK);
  textStyle(NORMAL);

  // Tick labels
  textSize(13);
  textAlign(CENTER, TOP);
  for (let col = 0; col < GRID; col++) {
    let x = MARGIN.left + col * cellSize + cellSize / 2;
    text(nf(-Math.log10(scaleForCol(col)), 1, 2), x, MARGIN.top + gridSize + 8);   // −log10(s)
  }
  textAlign(RIGHT, CENTER);
  for (let row = 0; row < GRID; row++) {
    let y = MARGIN.top + row * cellSize + cellSize / 2;
    text(nf(jitterForRow(row), 1, 2), MARGIN.left - 10, y);
  }

  // Axis titles
  textSize(15);
  textAlign(CENTER, TOP);
  text('−log₁₀ s  (particle scale)', MARGIN.left + gridSize / 2, MARGIN.top + gridSize + 32);
  push();
  translate(16, MARGIN.top + gridSize / 2);
  rotate(-HALF_PI);
  textAlign(CENTER, CENTER);
  text('jitter j', 0, 0);
  pop();
}

// Draw a finished snowflake once, in its cell (drawing every frame would slow things down)
function drawFinished(s) {
  let cx = MARGIN.left + s.col * cellSize + cellSize / 2;
  let cy = MARGIN.top + s.row * cellSize + cellSize / 2;
  push();
  translate(cx, cy);
  scale((cellSize * 0.45) / SIM_RADIUS);
  noStroke();
  s.show();
  pop();
}

function updateStatus() {
  let total = SEEDS * GRID * GRID;
  let doneCount = finished ? total : (batch - 1) * GRID * GRID + runIndex;
  let elapsed = (performance.now() - allStart) / 1000;

  ui.bar.style('width', `${(doneCount / total) * 100}%`);
  if (finished) ui.bar.addClass('done');
  ui.batch.html(`${batch}/${SEEDS}`);
  ui.run.html(`${min(runIndex + 1, GRID * GRID)}/${GRID * GRID}`);
  ui.done.html(`${doneCount}/${total} (${nf((doneCount / total) * 100, 1, 1)}%)`);
  ui.elapsed.html(formatTime(elapsed));

  if (finished) {
    ui.message.html(`Complete. ${total} runs in ${formatTime(elapsed)} wall-clock, ` +
                    `${formatTime(allComputeMs / 1000)} compute. Click <strong>Download CSV</strong> ` +
                    `to save the data, then move it into <code>output/</code> or <code>results/</code>.`);
  } else {
    ui.message.html('Running. Figure 1 shows the current batch as runs complete.');
  }
}

// 75.3 -> "1:15", 4.2 -> "0:04"
function formatTime(seconds) {
  let m = floor(seconds / 60);
  let s = floor(seconds % 60);
  return `${m}:${nf(s, 2)}`;
}

// Saves both tables as CSV downloads (only when the Download CSV button is clicked). The file names include the date and
// time the session started (like snowflake-runs-2026-11-14-1530.csv), so
// files from different sessions don't overwrite each other.
// Move them into this folder's output/ folder (ignored by git). Copy any
// worth keeping into results/ (saved to GitHub).
function saveTables() {
  saveTable(runsTable, `snowflake-runs-${sessionStamp}.csv`);
  saveTable(batchesTable, `snowflake-batches-${sessionStamp}.csv`);
}
