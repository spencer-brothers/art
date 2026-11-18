// Voronoi pictures: a Voronoi diagram with small cells where a picture is
// dark and large cells where it's light. Seeds move downhill on the picture's
// brightness (gradient descent), push on each other like a gas, and settle.

// The picture. On start, the sketch tries to load PHOTO_PATH from the private/
// folder (ignored by git, so it never goes online). If it isn't there, as on
// the website, it uses the generated test image. Drag any photo onto the
// canvas to use it instead: it stays in the browser and isn't uploaded.
const PHOTO_PATH = 'private/photo.jpeg';
const AUTO_CONTRAST = true;     // stretch the photo's brightness to the full black-to-white range
const CONTRAST_CLIP = 0.01;     // ignore the darkest and brightest 1% of pixels when stretching

// How many seeds: worked out from the picture (see seedCapacity below).
// FILL is how full to make it: 1 = as many seeds as the bubbles can fit,
// 0.8 = 80% of that, leaving a little room so seeds can settle without jamming.
// MAX_SEEDS is a safety limit for very dark pictures, to keep things fast.
const FILL = 0.8;
const MAX_SEEDS = 15000;

// Starting layout. true: Poisson disk sampling (poisson-disk.js), which places
// seeds evenly with no overlapping bubbles, already dense in dark areas and
// spread out in light ones; it places as many as fit (FILL isn't used).
// false: pure random positions, FILL x capacity of them.
const USE_POISSON = true;
const DOT_RADIUS = 2.5;   // size of the dot drawn for each seed

// Personal bubble: each seed keeps other seeds out of a circle around it.
// Its radius depends on the brightness where the seed is: BUBBLE_MIN on
// black, up to BUBBLE_MAX on white. Two seeds stay at least the sum of their
// bubble radii apart, so seeds pack tightly in dark areas and spread out in
// light ones.
const BUBBLE_MIN = 1.5;
const BUBBLE_MAX = 9;
const SHOW_BUBBLES = false;   // draw each bubble as a faint circle (for tuning)

// Gas model: seeds gently push on neighbors that are near but not touching,
// like gas pressure, so they spread out to fill empty space. Two seeds push
// each other when they're closer than REPULSION_RANGE x the sum of their
// bubbles; the push is REPULSION_STRENGTH pixels per frame when they're right
// on top of each other and fades to zero at the edge of the range. Bigger
// bubbles (light areas) reach farther, so light areas push seeds apart more.
const REPULSION_RANGE = 2;
const REPULSION_STRENGTH = 0.3;

// Dark seeds resist being pushed: the push a seed receives is scaled by the
// brightness where it is, from 1 on white down to DARK_PUSH on black. Seeds
// that find a dark line stay on it instead of being shoved off by neighbors in
// the light (whose bigger bubbles reach farther). Light seeds still get pushed
// away from dark ones as usual.
const DARK_PUSH = 0.1;

// Collisions: after moving, overlapping seeds are pushed apart this many times
// per frame (more passes untangle crowded spots better, but cost more)
const COLLISION_PASSES = 3;

// Friction in dark areas: after moving and colliding, each seed only goes part
// of the way to its new spot. On white it goes all the way (1); on black only
// DARK_MOBILITY of the way. This calms the jitter in dark clusters, where the
// gradient pulls seeds in and collisions push them back out every frame.
const DARK_MOBILITY = 0.2;

// Settling: after SETTLE_START frames, friction gradually increases everywhere
// over SETTLE_FRAMES more frames (with a smooth ease), until the seeds stop
// moving and the picture holds still. At 60 frames per second, 300 frames is
// 5 seconds. Once everything has settled, the sketch stops: the last frame is
// frame SETTLE_START + SETTLE_FRAMES, a clean end point for recordings. (The
// key toggles still work after it stops; they redraw that last frame.)
const SETTLE_START = 120;
const SETTLE_FRAMES = 780;

// Gradient descent: each frame, every seed steps downhill (toward darker areas)
// by gradient x LEARNING_RATE pixels. The step is capped by how bright the spot
// is: up to MAX_STEP pixels on white, down to MIN_STEP pixels on black, so
// seeds slow down as they reach dark areas.
const LEARNING_RATE = 50;
const MAX_STEP = 2;
const MIN_STEP = 0.2;

// Momentum: each frame a seed keeps this fraction of its last velocity, so it
// builds speed going down long slopes (0 = none; near 1 = slides and overshoots).
// Its speed is capped at MAX_SPEED pixels per frame.
const MOMENTUM = 0.6;
const MAX_SPEED = 4;

const IMAGE_OPACITY = 255;  // how strongly the picture shows in debug mode (0 = hidden, 255 = full)

// Debug mode shows the picture (in gray) and the seed dots. Press the space bar
// to turn it on and off.
const DEBUG_AT_START = false;

// How cells are drawn. Press F to cycle: 0 = black lines, 1 = each cell filled
// with the picture's grey at its seed, 2 = filled with the picture's color.
const FILL_MODE_AT_START = 2;

// Gradient smoothing: width of the Gaussian, in pixels. Bigger = more low-pass,
// so seeds sense features from farther away (about 3 x this many pixels).
const GRADIENT_SIGMA = 20;

// Voronoi cells: drawn as lines around each seed's cell
const CELL_LINE_COLOR = '#000000';   // black
const LINE_TO_BUBBLE = 2;   // line thickness as a fraction of the smallest bubble (BUBBLE_MIN)
const CELL_LINE_WEIGHT = LINE_TO_BUBBLE * BUBBLE_MIN;   // line thickness in pixels

const BACKGROUND = '#ECE4D4';   // linen
const BRICK = '#9B3A2C';        // brick red, for the seeds (shows on both black and white)

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
