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

const SCALE_LEFT = 0.035;   // particle scale, first column
const SCALE_RIGHT = 0.008;  // particle scale, last column (spaced evenly on a log scale)
const JITTER_TOP = 1.5;     // jitter, first row
const JITTER_BOTTOM = 0.5;  // jitter, last row

const FRAME_BUDGET_MS = 20;   // how long to grow snowflakes each frame before letting the page update
const SIM_RADIUS = 100;       // snowflakes are grown at this size, then scaled to fit their cell

const BACKGROUND = '#ECE4D4';   // linen / oat
const FLAKE_COLOR = '#52603F';  // deep moss

// ---- State ----

let runsTable, batchesTable;
let cellSize;

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

let statusDiv;
let sessionStamp;   // date and time this session started, for file names

// ---- Setup ----

function setup() {
  let size = min(windowWidth - 32, windowHeight - 100);
  createCanvas(size, size);
  cellSize = width / GRID;
  background(BACKGROUND);

  statusDiv = select('#status');
  let buttons = select('#buttons');
  createButton('Download CSVs now').parent(buttons).mousePressed(saveTables);

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
  background(BACKGROUND);   // clear the grid for the new batch
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
    updateStatus();
    saveTables();
  }
}

// ---- Drawing and status ----

// Draw a finished snowflake once, in its cell (drawing every frame would slow things down)
function drawFinished(s) {
  let cx = s.col * cellSize + cellSize / 2;
  let cy = s.row * cellSize + cellSize / 2;
  push();
  translate(cx, cy);
  scale((cellSize * 0.45) / SIM_RADIUS);
  noStroke();
  s.show();
  pop();
}

function updateStatus() {
  let elapsed = (performance.now() - allStart) / 1000;
  let text;
  if (finished) {
    text = `Done! ${SEEDS} batches, ${SEEDS * GRID * GRID} snowflakes in ${elapsed.toFixed(1)} s ` +
           `(${(allComputeMs / 1000).toFixed(1)} s spent growing). CSVs downloaded.`;
  } else {
    text = `Batch ${batch} of ${SEEDS} · snowflake ${runIndex + 1} of ${GRID * GRID} · ` +
           `${elapsed.toFixed(1)} s so far`;
    if (current) text += ` · current: ${current.particles.length} particles`;
  }
  text += '\nColumns: particle scale (big → small) · Rows: jitter (high → low)';
  statusDiv.html(text);
}

// Saves both tables as CSV downloads. The file names include the date and
// time the session started (like snowflake-runs-2026-11-14-1530.csv), so
// files from different sessions don't overwrite each other.
// Move them into this folder's output/ folder (ignored by git). Copy any
// worth keeping into results/ (saved to GitHub).
function saveTables() {
  saveTable(runsTable, `snowflake-runs-${sessionStamp}.csv`);
  saveTable(batchesTable, `snowflake-batches-${sessionStamp}.csv`);
}
