// The brightness gradient of an image: at every pixel, which way (and how
// steeply) the picture gets brighter. Its opposite, -gradient, points toward
// darker areas.
//
// Brightness runs from 0 (black) to 1 (white). The gradient is measured in
// brightness per pixel, using a derivative-of-Gaussian kernel: it's the same
// as blurring the image with a Gaussian of width sigma and then taking the
// slope, done in one step. Small sigma (about 1) is sharp and local, like a
// Sobel filter; larger sigma is a low-pass that lets seeds sense features
// from about 3 x sigma pixels away and softens hard edges into gentle ramps.
// (p5's y axis points down, so a positive gy means "brighter below".)
//
// The 2D kernel is "separable": one horizontal pass and one vertical pass
// with 1D kernels give the same result as the full 2D kernel, much faster.
//   gx = vertical Gaussian blur of (horizontal derivative kernel)
//   gy = vertical derivative kernel of (horizontal Gaussian blur)

class GradientField {

  // img: a p5.Image or p5.Graphics with pixelDensity(1)
  // sigma: width of the Gaussian, in pixels (how much low-pass smoothing)
  constructor(img, sigma) {
    this.w = img.width;
    this.h = img.height;
    let n = this.w * this.h;

    // Brightness of every pixel, from the red channel (the image is grayscale)
    this.brightness = new Float32Array(n);
    img.loadPixels();
    for (let i = 0; i < n; i++) {
      this.brightness[i] = img.pixels[4 * i] / 255;
    }

    // The two 1D kernels
    let { blur, slope } = gaussianKernels(sigma);

    // Horizontal passes: slope across, and blur across
    let slopeX = convolve(this.brightness, this.w, this.h, slope, true);
    let blurX = convolve(this.brightness, this.w, this.h, blur, true);

    // Vertical passes finish the 2D kernels
    this.gx = convolve(slopeX, this.w, this.h, blur, false);   // slope across, blurred down
    this.gy = convolve(blurX, this.w, this.h, slope, false);   // blurred across, slope down

    // The steepest slope anywhere, handy for scaling arrows
    this.maxMagnitude = 0;
    for (let i = 0; i < n; i++) {
      let m = Math.hypot(this.gx[i], this.gy[i]);
      if (m > this.maxMagnitude) this.maxMagnitude = m;
    }
  }

  // Brightness at a whole pixel. Pixels past the edge use the nearest edge pixel.
  b(x, y) {
    x = constrain(x, 0, this.w - 1);
    y = constrain(y, 0, this.h - 1);
    return this.brightness[y * this.w + x];
  }

  // Brightness at any point (x, y), from 0 (black) to 1 (white), blending
  // the 4 nearest pixels (bilinear interpolation)
  brightnessAt(x, y) {
    x = constrain(x, 0, this.w - 1);
    y = constrain(y, 0, this.h - 1);
    let x0 = Math.floor(x), y0 = Math.floor(y);
    let x1 = Math.min(x0 + 1, this.w - 1), y1 = Math.min(y0 + 1, this.h - 1);
    let fx = x - x0, fy = y - y0;
    return lerp(lerp(this.b(x0, y0), this.b(x1, y0), fx),
                lerp(this.b(x0, y1), this.b(x1, y1), fx), fy);
  }

  // Gradient at any point (x, y), blending the 4 nearest pixels (bilinear
  // interpolation), so it changes smoothly as a seed moves between pixels.
  // Returns a p5.Vector pointing toward brighter areas.
  gradientAt(x, y) {
    x = constrain(x, 0, this.w - 1);
    y = constrain(y, 0, this.h - 1);
    let x0 = Math.floor(x), y0 = Math.floor(y);
    let x1 = Math.min(x0 + 1, this.w - 1), y1 = Math.min(y0 + 1, this.h - 1);
    let fx = x - x0, fy = y - y0;

    let i00 = y0 * this.w + x0, i10 = y0 * this.w + x1;
    let i01 = y1 * this.w + x0, i11 = y1 * this.w + x1;

    let gx = lerp(lerp(this.gx[i00], this.gx[i10], fx), lerp(this.gx[i01], this.gx[i11], fx), fy);
    let gy = lerp(lerp(this.gy[i00], this.gy[i10], fx), lerp(this.gy[i01], this.gy[i11], fx), fy);
    return createVector(gx, gy);
  }

  // Draw arrows on a grid showing -gradient (the downhill direction, toward
  // darker areas). Longer arrows mean a steeper slope.
  show(spacing, maxLength) {
    for (let y = spacing / 2; y < this.h; y += spacing) {
      for (let x = spacing / 2; x < this.w; x += spacing) {
        let g = this.gradientAt(x, y);
        let len = (g.mag() / this.maxMagnitude) * maxLength;
        if (len < 1) continue;   // too flat to bother drawing

        let dir = g.copy().mult(-1).setMag(len);   // downhill
        let tipX = x + dir.x, tipY = y + dir.y;
        line(x, y, tipX, tipY);

        // Arrowhead
        let a = dir.heading();
        let head = min(4, len / 2);
        line(tipX, tipY, tipX - head * cos(a - 0.5), tipY - head * sin(a - 0.5));
        line(tipX, tipY, tipX - head * cos(a + 0.5), tipY - head * sin(a + 0.5));
      }
    }
  }
}

// Build the two 1D kernels for a Gaussian of width sigma, reaching out
// 3 x sigma pixels on each side (past that the weights are tiny).
// Index k of each array is the weight for the pixel (k - radius) away.
function gaussianKernels(sigma) {
  let radius = Math.max(1, Math.ceil(3 * sigma));
  let size = 2 * radius + 1;
  let blur = new Float32Array(size);
  let slope = new Float32Array(size);

  // Blur: a bell curve, scaled so the weights add up to 1 (keeps brightness the same)
  let total = 0;
  for (let k = -radius; k <= radius; k++) {
    blur[k + radius] = Math.exp(-(k * k) / (2 * sigma * sigma));
    total += blur[k + radius];
  }
  for (let i = 0; i < size; i++) blur[i] /= total;

  // Slope: the derivative of the bell curve (weight proportional to k x bell).
  // Negative on the left, positive on the right, so "brighter to the right"
  // gives a positive slope. Scaled so a steady ramp of 1 brightness per pixel
  // comes out as exactly 1.
  let scale = 0;
  for (let k = -radius; k <= radius; k++) {
    slope[k + radius] = k * blur[k + radius];
    scale += k * slope[k + radius];
  }
  for (let i = 0; i < size; i++) slope[i] /= scale;

  return { blur, slope };
}

// Slide a 1D kernel across every row (horizontal = true) or down every
// column (horizontal = false) of a w x h image stored as a flat array.
// Pixels past the edge use the nearest edge pixel.
function convolve(src, w, h, kernel, horizontal) {
  let out = new Float32Array(w * h);
  let radius = (kernel.length - 1) / 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        let sx = x, sy = y;
        if (horizontal) sx = Math.min(w - 1, Math.max(0, x + k));
        else            sy = Math.min(h - 1, Math.max(0, y + k));
        sum += src[sy * w + sx] * kernel[k + radius];
      }
      out[y * w + x] = sum;
    }
  }
  return out;
}
