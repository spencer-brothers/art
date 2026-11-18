// Voronoi pictures: small cells where a picture is dark, big where it's light (settings explained in README.md)

// Picture
const PHOTO_PATH = 'private/photo.jpeg';  // photo loaded on start (private/ is never committed)
const AUTO_CONTRAST = true;               // stretch photo brightness to full black-to-white
const CONTRAST_CLIP = 0.01;               // fraction of darkest/brightest pixels ignored when stretching

// Seeds
const USE_POISSON = true;   // evenly spaced start (true) or pure random (false)
const FILL = 0.8;           // random start only: fraction of seed capacity to use
const MAX_SEEDS = 15000;    // safety limit on seed count
const DOT_RADIUS = 2.5;     // seed dot size in debug mode

// Personal bubbles
const BUBBLE_MIN = 1.5;       // bubble radius on black
const BUBBLE_MAX = 9;         // bubble radius on white
const SHOW_BUBBLES = false;   // draw bubbles as faint circles

// Gas pressure
const REPULSION_RANGE = 2;      // push reach, as a multiple of two seeds' bubble sum
const REPULSION_STRENGTH = 0.3; // push at zero distance, in pixels per frame
const DARK_PUSH = 0.1;          // fraction of push a seed on black receives

// Collisions and friction
const COLLISION_PASSES = 3;   // overlap-fixing passes per frame
const DARK_MOBILITY = 0.2;    // fraction of its move a seed on black makes

// Settling
const SETTLE_START = 120;    // frame when the slowdown starts
const SETTLE_FRAMES = 780;   // frames the slowdown lasts (then the sketch stops)

// Gradient descent
const LEARNING_RATE = 50;   // step size per unit of gradient
const MAX_STEP = 2;         // step cap on white, in pixels
const MIN_STEP = 0.2;       // step cap on black, in pixels
const MOMENTUM = 0.6;       // fraction of last frame's velocity kept
const MAX_SPEED = 4;        // speed cap, in pixels per frame
const GRADIENT_SIGMA = 20;  // gradient blur (Gaussian width), in pixels

// Display
const DEBUG_AT_START = false;    // debug mode (picture + seeds) on start; space toggles
const FILL_MODE_AT_START = 2;    // 0 lines, 1 grey fill, 2 color fill; F cycles
const IMAGE_OPACITY = 255;       // picture opacity in debug mode (0-255)
const CELL_LINE_COLOR = '#000000';                      // cell line color
const LINE_TO_BUBBLE = 2;                               // line thickness as a multiple of BUBBLE_MIN
const CELL_LINE_WEIGHT = LINE_TO_BUBBLE * BUBBLE_MIN;   // line thickness in pixels
const BACKGROUND = '#ECE4D4';    // linen
const BRICK = '#9B3A2C';         // brick red, for seed dots

let seeds = [];
let numSeeds;   // worked out from the picture
let debug = DEBUG_AT_START;        // debug mode: show the picture and seeds (space bar)
let fillMode = FILL_MODE_AT_START; // 0 lines, 1 grey fill, 2 color fill (F key)
let grid;       // spatial grid for finding nearby seeds quickly
let photo;      // the loaded photo (a p5.Image), or null to use the test image
let img;        // the picture the seeds follow, in gray (canvas-sized)
let colorImg;   // the same picture in color, for color fill mode
let gradient;   // the picture's brightness gradient (a GradientField)
let simFrame = 0;   // frames since the current picture started (for settling)

function preload() {
  // Try the private photo; if it's missing, carry on with the test image
  photo = loadImage(PHOTO_PATH, () => {}, () => {
    photo = null;
    console.log(`No ${PHOTO_PATH} found, using the test image`);
  });
}

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.drop(gotFile);   // drag a photo onto the canvas to use it
  grid = new SpatialGrid(2 * BUBBLE_MAX);   // cells as wide as the farthest two bubbles can reach
  startPicture(photo);
}

// A file was dropped on the canvas: if it's an image, start over with it
function gotFile(file) {
  if (file.type !== 'image') return;
  loadImage(file.data, dropped => startPicture(dropped));
}

// Set everything up for a picture (a p5.Image, or null for the test image):
// prepare its gray and color versions and gradient, place fresh seeds, and
// start the animation from the beginning
function startPicture(newPhoto) {
  // Free the previous picture's off-screen canvases
  if (img) img.remove();
  if (colorImg) colorImg.remove();

  // Canvas size: a photo gets a canvas in its own shape, as big as fits in the
  // window (so there are no empty bars); the test image fills the window
  if (newPhoto) {
    let s = min(windowWidth / newPhoto.width, windowHeight / newPhoto.height);
    resizeCanvas(floor(newPhoto.width * s), floor(newPhoto.height * s));
  } else {
    resizeCanvas(windowWidth, windowHeight);
  }

  let picture = preparePicture(newPhoto, AUTO_CONTRAST && newPhoto !== null, CONTRAST_CLIP);
  img = picture.gray;
  colorImg = picture.color;
  gradient = new GradientField(img, GRADIENT_SIGMA);

  seeds = [];
  placeSeeds();

  simFrame = 0;
  loop();   // restart the animation if it had stopped
}

function placeSeeds() {
  let capacity = seedCapacity(gradient);

  if (USE_POISSON) {
    // Evenly spaced start: each seed's spacing is its full bubble size at that brightness
    let bubbleAt = (x, y) => lerp(BUBBLE_MIN, BUBBLE_MAX, gradient.brightnessAt(x, y));
    let points = poissonDisk(width, height, bubbleAt, BUBBLE_MIN, BUBBLE_MAX).slice(0, MAX_SEEDS);
    for (let i = 0; i < points.length; i++) {
      seeds.push(new Seed(points[i].x, points[i].y, i));
    }
    numSeeds = seeds.length;
    console.log(`Seed capacity: ${round(capacity)}, Poisson disk placed ${numSeeds} seeds`);
  } else {
    // Random start: FILL x capacity seeds at random spots
    numSeeds = min(round(FILL * capacity), MAX_SEEDS);
    for (let i = 0; i < numSeeds; i++) {
      seeds.push(new Seed(random(width), random(height), i));
    }
    console.log(`Seed capacity: ${round(capacity)}, using ${numSeeds} random seeds`);
  }
}

function draw() {
  background(BACKGROUND);

  // Debug mode: show the picture behind everything
  if (debug) {
    tint(255, IMAGE_OPACITY);
    image(img, 0, 0);
    noTint();
  }

  // Settling: how much the seeds can still move, from 1 (freely) down to 0
  // (settled), easing smoothly from SETTLE_START over SETTLE_FRAMES
  simFrame++;
  let t = constrain((simFrame - SETTLE_START) / SETTLE_FRAMES, 0, 1);
  let settle = 1 - t * t * (3 - 2 * t);
  if (settle > 0) updateSeeds(settle);

  if (SHOW_BUBBLES) {
    noFill();
    stroke(BRICK + '40');   // brick red, mostly transparent
    strokeWeight(1);
    for (let s of seeds) circle(s.pos.x, s.pos.y, 2 * s.bubble);
  }

  // Draw the Voronoi cells around the seeds
  drawVoronoi();

  // Debug mode: draw the seeds on top
  if (debug) {
    stroke(BRICK);
    strokeWeight(2 * DOT_RADIUS);   // dot diameter
    for (let s of seeds) {
      s.show();
    }
  }

  // Stop condition: once everything has settled, stop the animation loop
  if (settle === 0 && isLooping()) {
    noLoop();
    console.log(`Settled and stopped at frame ${simFrame}`);
  }
}

// One frame of movement for every seed. `settle` (1 down to 0) scales how far
// seeds may move, so they gradually come to rest.
function updateSeeds(settle) {
  // Remember where every seed started this frame (for the friction below)
  for (let s of seeds) s.prev.set(s.pos);

  // Each seed's bubble size comes from the brightness where it is
  updateBubbles();

  // Gas pressure: work out how hard each seed's neighbors push on it
  computeRepulsion();

  // Move every seed: momentum + downhill pull + neighbors' push
  for (let s of seeds) {
    s.descend(gradient, LEARNING_RATE, MIN_STEP, MAX_STEP, MOMENTUM, MAX_SPEED);
  }

  // Update bubbles for the new positions before checking for overlaps
  updateBubbles();

  // Then push apart any seeds whose bubbles overlap
  resolveCollisions();

  // Friction: darker spots let seeds move only part of the way this frame,
  // and everything moves less as the picture settles
  for (let s of seeds) {
    let mobility = settle * lerp(DARK_MOBILITY, 1, gradient.brightnessAt(s.prev.x, s.prev.y));
    s.pos.set(lerp(s.prev.x, s.pos.x, mobility), lerp(s.prev.y, s.pos.y, mobility));

    // Velocity = how far the seed actually moved this frame, so speed lost to
    // collisions and friction is lost from its momentum too
    s.vel.set(s.pos.x - s.prev.x, s.pos.y - s.prev.y);
  }
}

// Build the Voronoi diagram from where the seeds are now and draw its edges.
// Each seed's cell is every point closer to that seed than to any other.
// d3-delaunay works it out from the seeds' Delaunay triangulation, clipped to
// the canvas, and render() traces every cell edge (shared edges only once)
// onto p5's canvas, using the stroke color and weight set just before.
// In fill modes, each cell is filled instead, with no lines: with the
// picture's grey at its seed (mode 1) or its color (mode 2).
function drawVoronoi() {
  let delaunay = d3.Delaunay.from(seeds, s => s.pos.x, s => s.pos.y);
  let voronoi = delaunay.voronoi([0, 0, width, height]);

  if (fillMode > 0) {
    for (let i = 0; i < seeds.length; i++) {
      let cell = voronoi.cellPolygon(i);   // the cell's corners, as [x, y] pairs
      if (!cell) continue;

      let x = seeds[i].pos.x, y = seeds[i].pos.y;
      if (fillMode === 1) {
        let grey = round(255 * gradient.brightnessAt(x, y));
        drawingContext.fillStyle = `rgb(${grey}, ${grey}, ${grey})`;
      } else {
        // Color of the nearest pixel in the color picture
        let i4 = 4 * (constrain(round(y), 0, height - 1) * width + constrain(round(x), 0, width - 1));
        let px = colorImg.pixels;
        drawingContext.fillStyle = `rgb(${px[i4]}, ${px[i4 + 1]}, ${px[i4 + 2]})`;
      }
      drawingContext.beginPath();
      drawingContext.moveTo(cell[0][0], cell[0][1]);
      for (let j = 1; j < cell.length; j++) drawingContext.lineTo(cell[j][0], cell[j][1]);
      drawingContext.fill();
    }
    return;   // fill mode has no cell lines
  }

  stroke(CELL_LINE_COLOR);
  strokeWeight(CELL_LINE_WEIGHT);
  noFill();
  drawingContext.beginPath();
  voronoi.render(drawingContext);
  drawingContext.stroke();
}

function updateBubbles() {
  for (let s of seeds) {
    s.bubble = lerp(BUBBLE_MIN, BUBBLE_MAX, gradient.brightnessAt(s.pos.x, s.pos.y));
  }
}

// Gas pressure. For every pair of seeds closer than REPULSION_RANGE x the sum
// of their bubbles, push them apart: REPULSION_STRENGTH when they're on top of
// each other, fading in a straight line to zero at the edge of the range. Each
// pair pushes equally and oppositely, so the forces always balance.
function computeRepulsion() {
  grid.clear();
  for (let s of seeds) {
    grid.add(s);
    s.push.set(0, 0);
  }

  for (let a of seeds) {
    // Far enough to reach any neighbor, even one with the biggest bubble
    let searchRadius = REPULSION_RANGE * (a.bubble + BUBBLE_MAX);

    for (let b of grid.near(a.pos, searchRadius)) {
      if (b.id <= a.id) continue;   // handle each pair once (and skip a itself)

      let dx = b.pos.x - a.pos.x;
      let dy = b.pos.y - a.pos.y;
      let d = Math.hypot(dx, dy);
      let range = REPULSION_RANGE * (a.bubble + b.bubble);
      if (d >= range || d === 0) continue;   // out of range (exact overlaps are left to the collisions)

      let strength = REPULSION_STRENGTH * (1 - d / range);
      let ux = dx / d, uy = dy / d;
      a.push.x -= ux * strength;
      a.push.y -= uy * strength;
      b.push.x += ux * strength;
      b.push.y += uy * strength;
    }
  }

  // Dark seeds resist: scale each seed's push by the brightness where it is
  for (let s of seeds) {
    s.push.mult(lerp(DARK_PUSH, 1, gradient.brightnessAt(s.pos.x, s.pos.y)));
  }
}

// Estimate how many seeds fit in the picture without their bubbles
// overlapping. A seed with bubble radius r, packed in a honeycomb with its
// neighbors 2r away, takes up a hexagon of area 2 x sqrt(3) x r^2. Each pixel
// can hold 1 / (that area) of a seed, at that pixel's bubble size, so adding
// that up over every pixel gives the total. Seeds that settle on their own pack
// a bit looser than a perfect honeycomb (about 84% coverage instead of 91%),
// so the total is scaled by 0.92.
function seedCapacity(field) {
  const RANDOM_PACKING = 0.92;
  let total = 0;
  for (let b of field.brightness) {
    let r = lerp(BUBBLE_MIN, BUBBLE_MAX, b);
    total += 1 / (2 * Math.sqrt(3) * r * r);
  }
  return total * RANDOM_PACKING;
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

// Space bar: turn debug mode (picture + seeds) on and off.
// F: cycle the cell style (lines, grey fill, color fill).
function keyPressed() {
  if (key === ' ') {
    debug = !debug;
    if (!isLooping()) redraw();   // after the sketch has stopped, redraw to show the change
    return false;   // stop the browser from scrolling the page
  }
  if (key === 'f' || key === 'F') {
    fillMode = (fillMode + 1) % 3;
    if (!isLooping()) redraw();
  }
}
