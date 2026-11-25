// Voronoi pictures: cells small along a picture's edges (or dark areas), big in flat areas.
// Settings: settings.js (explained in README.md). Simulation: simulation.js. Drawing: render.js. Recording: capture.js.

let photo;      // the photo loaded on start (a p5.Image), or null to use the test image
let picture;    // the current picture: { gray, color, lab } (see picture.js)
let field;      // its gradient, brightness, and spacing maps (a GradientField)
let sim;        // the seed simulation (a Simulation)
let currentPhoto = null;   // the photo now in use (so recording can restart it), or null for the test image
let debug = SETTINGS.display.debugAtStart;         // show the picture and seeds (space bar)
let fillMode = SETTINGS.display.fillModeAtStart;   // 0 lines, 1 grey fill, 2 color fill (F key)

function preload() {
  // Try the private photo; if it's missing, carry on with the test image
  photo = loadImage(SETTINGS.picture.photoPath, () => {}, () => {
    photo = null;
    console.log(`No ${SETTINGS.picture.photoPath} found, using the test image`);
  });
}

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  canvas.drop(gotFile);   // drag a photo onto the canvas to use it
  startPicture(photo);
}

function draw() {
  for (let i = 0; i < stepsPerFrame; i++) sim.step();

  background(SETTINGS.display.background);
  if (debug) drawPicture(picture.gray);   // (only visible in line mode; fills cover it)
  if (SETTINGS.bubbles.show) drawBubbles(sim.seeds);
  drawCells(sim.seeds, field, picture.color, fillMode, sim.frame);
  if (debug) drawSeeds(sim.seeds, SETTINGS.skin.show ? picture.skin : null);   // skin seeds red, the rest black

  // Once the seeds have stopped, stop drawing too (unless display.keepDrawing,
  // which keeps redrawing so the color noise keeps drifting)
  if (sim.settled && !SETTINGS.display.keepDrawing && isLooping()) {
    noLoop();
    console.log(`Settled and stopped at frame ${sim.frame}`);
  }
}

// Start over with a picture (a p5.Image, or null for the test image)
function startPicture(newPhoto) {
  currentPhoto = newPhoto;

  // Free the previous picture's off-screen canvases
  if (picture) {
    picture.gray.remove();
    picture.color.remove();
  }

  // A photo gets a canvas in its own shape, as big as fits in the window;
  // the test image fills the window
  if (newPhoto) {
    let s = min(windowWidth / newPhoto.width, windowHeight / newPhoto.height);
    resizeCanvas(floor(newPhoto.width * s), floor(newPhoto.height * s));
  } else {
    resizeCanvas(windowWidth, windowHeight);
  }

  let p = SETTINGS.picture, e = SETTINGS.edges;
  picture = preparePicture(newPhoto, p.autoContrast && newPhoto !== null, p.contrastClip);
  field = new GradientField(picture.gray, {
    sigma: SETTINGS.descent.sigma,
    mode: e.attractTo,
    edgeSigma: e.sigma,
    lab: e.color ? picture.lab : null,
    edgeOffset: e.offset,
    edgeRepel: e.repel,
    edgeCurve: e.curve,
    skin: picture.skin,
    skinEdgeBoost: SETTINGS.skin.edgeBoost,
    skinDensity: SETTINGS.skin.density,
  });
  sim = new Simulation(field);
  loop();   // restart the animation if it had stopped
}

// A file was dropped on the canvas: if it's an image, start over with it
function gotFile(file) {
  if (file.type !== 'image') return;
  loadImage(file.data, dropped => startPicture(dropped));
}

// Space: debug mode on/off. F: cycle the cell style (lines, grey fill, color fill).
// V: record an MP4 video.
function keyPressed() {
  if (recording) return;
  if (key === ' ') debug = !debug;
  else if (key === 'f' || key === 'F') fillMode = (fillMode + 1) % 3;
  else if (key === 'v' || key === 'V') { recordMp4(); return false; }
  else return;

  if (!isLooping()) redraw();   // after the sketch has stopped, redraw to show the change
  return false;                 // stop the browser from scrolling the page on space
}
