// A generated grayscale test image, so we know exactly where the dark parts
// are. It's smooth everywhere (soft blobs on a gentle gradient), so its
// brightness always slopes somewhere: useful for gradient descent later.

// Each blob: center (as a fraction of width/height), size (fraction of the
// shorter side), and how dark its center is (0 = no effect, 1 = black)
const TEST_BLOBS = [
  { x: 0.30, y: 0.40, size: 0.18, darkness: 0.85 },
  { x: 0.70, y: 0.60, size: 0.12, darkness: 0.70 },
  { x: 0.55, y: 0.25, size: 0.07, darkness: 0.60 },
];

const TEST_GRADIENT = 0.25;   // extra darkness at the right edge (0 at the left)

// An empty square with a thick black outline (hard edges, unlike the blobs).
// Position is its center as a fraction of width/height; size and outline
// thickness are fractions of the shorter side.
const TEST_SQUARE = { x: 0.18, y: 0.72, size: 0.22, thickness: 0.03 };

// An empty equilateral triangle (pointing up) with a thinner outline.
// Same units as the square; size is the length of each side.
const TEST_TRIANGLE = { x: 0.84, y: 0.28, size: 0.24, thickness: 0.012 };

// Returns a p5.Graphics (an off-screen canvas) of size w x h
function makeTestImage(w, h) {
  let g = createGraphics(w, h);
  g.pixelDensity(1);   // one pixel per canvas unit, so pixel math stays simple
  g.loadPixels();

  let shortSide = min(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Start with the left-to-right gradient
      let dark = TEST_GRADIENT * (x / w);

      // Add each blob: darkest at its center, fading out smoothly (a Gaussian)
      for (let b of TEST_BLOBS) {
        let dx = x - b.x * w;
        let dy = y - b.y * h;
        let sigma = b.size * shortSide;
        dark += b.darkness * exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      }

      let v = 255 * (1 - constrain(dark, 0, 1));   // brightness, 0 (black) to 255 (white)
      let i = 4 * (y * w + x);
      g.pixels[i] = v;       // red
      g.pixels[i + 1] = v;   // green
      g.pixels[i + 2] = v;   // blue
      g.pixels[i + 3] = 255; // alpha (fully opaque)
    }
  }

  g.updatePixels();

  // Draw the empty square on top
  let sq = TEST_SQUARE;
  g.noFill();
  g.stroke(0);
  g.strokeWeight(sq.thickness * shortSide);
  g.rectMode(CENTER);
  g.rect(sq.x * w, sq.y * h, sq.size * shortSide, sq.size * shortSide);

  // Draw the empty triangle. Its corners are all the same distance from the
  // center: side / sqrt(3). Starting straight up (-90 degrees) and stepping
  // 120 degrees makes it point up.
  let tr = TEST_TRIANGLE;
  let cx = tr.x * w, cy = tr.y * h;
  let r = (tr.size * shortSide) / sqrt(3);
  g.strokeWeight(tr.thickness * shortSide);
  g.strokeJoin(MITER);
  g.beginShape();
  for (let k = 0; k < 3; k++) {
    let a = -HALF_PI + k * TWO_PI / 3;
    g.vertex(cx + r * cos(a), cy + r * sin(a));
  }
  g.endShape(CLOSE);

  return g;
}
