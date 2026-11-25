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
//
// Two modes, for what seeds are drawn to (seeds always move toward -gradient):
//   'dark':  the gradient of brightness, so seeds slide toward dark areas.
//   'edges': first find edge strength (how fast the picture changes, with a
//            small edgeSigma so edges stay sharp, scaled so the strongest edge
//            is 1), then take the gradient of that with sigma and flip it, so
//            seeds climb toward strong edges.
//
// Edge strength comes from brightness alone, or (if CIELAB channels are
// given) from color using Di Zenzo's multi-channel gradient: each pixel's
// color is treated as a vector (L*, a*, b*), and edge strength is how fast
// that vector changes in the direction where it changes fastest. So an edge
// between two colors of the same brightness still counts.

class GradientField {

  // img: a p5.Image or p5.Graphics with pixelDensity(1)
  // options:
  //   sigma:      width of the Gaussian, in pixels (how far seeds sense features)
  //   mode:       'dark' or 'edges' (see above)
  //   edgeSigma:  edges mode: blur for finding edges
  //   lab:        edges mode: CIELAB channels { L, a, b } for color edges, or null
  //   edgeOffset: edges mode: about how far beside an edge seeds settle (0 = on it)
  //   edgeRepel:  edges mode: how strongly seeds are pushed off the edge line
  //   edgeCurve:  edges mode: edge strength becomes 1 - (1 - strength) ^ edgeCurve,
  //               so values above 1 make medium edges pull seeds and get small
  //               bubbles almost like strong ones
  //   skin:       how skin-colored each pixel is (0 to 1), or null
  //   skinEdgeBoost: edges mode: edges count (1 + this x skin) times as much
  //   skinDensity:   spacing shrinks by (this x skin), so smooth skin gets smaller bubbles
  constructor(img, { sigma, mode = 'dark', edgeSigma = 2, lab = null, edgeOffset = 0, edgeRepel = 0, edgeCurve = 1,
                     skin = null, skinEdgeBoost = 0, skinDensity = 0 }) {
    this.w = img.width;
    this.h = img.height;
    let n = this.w * this.h;

    // Brightness of every pixel, from the red channel (the image is grayscale)
    this.brightness = new Float32Array(n);
    img.loadPixels();
    for (let i = 0; i < n; i++) {
      this.brightness[i] = img.pixels[4 * i] / 255;
    }

    if (mode === 'edges') {
      // Edge strength: how fast the picture changes at each pixel, from 0 to 1
      this.edgeStrength = lab
        ? colorEdgeStrength(lab, this.w, this.h, edgeSigma)
        : brightnessEdgeStrength(this.brightness, this.w, this.h, edgeSigma);

      // Skin: edges on skin count more, so facial features pull more seeds
      if (skin && skinEdgeBoost > 0) {
        for (let i = 0; i < n; i++) this.edgeStrength[i] *= 1 + skinEdgeBoost * skin[i];
      }

      let strongest = 0;
      for (let i = 0; i < n; i++) strongest = Math.max(strongest, this.edgeStrength[i]);
      if (strongest > 0) {
        for (let i = 0; i < n; i++) this.edgeStrength[i] /= strongest;
      }

      // Boost medium edges: 1 - (1 - strength) ^ edgeCurve. Flat stays 0 and
      // the strongest edge stays 1, but medium edges rise toward 1 (at a curve
      // of 3, an edge at 0.3 becomes about 0.66), so they pull seeds and get
      // small bubbles almost like strong ones. Everything below uses this.
      if (edgeCurve !== 1) {
        for (let i = 0; i < n; i++) this.edgeStrength[i] = 1 - Math.pow(1 - this.edgeStrength[i], edgeCurve);
      }

      // Far pull: slope of edge strength (blurred by sigma), flipped. Seeds move
      // toward -gradient, so this sends them toward edges from far away.
      let far = gaussianGradient(this.edgeStrength, this.w, this.h, sigma);
      this.gx = far.gx.map(v => -v);
      this.gy = far.gy.map(v => -v);

      // Near push: slope of edge strength with a small blur (edgeOffset), NOT
      // flipped, so it pushes seeds off the edge line itself. Scaled to match
      // the far pull's strength, times edgeRepel. The two balance about
      // edgeOffset to each side of an edge, so seeds settle in two rows with
      // the edge between them, and the Voronoi borders between the rows fall
      // along the edge.
      if (edgeOffset > 0 && edgeRepel > 0) {
        let near = gaussianGradient(this.edgeStrength, this.w, this.h, edgeOffset);
        let scale = edgeRepel * maxLength(far) / Math.max(maxLength(near), 1e-12);
        for (let i = 0; i < n; i++) {
          this.gx[i] += scale * near.gx[i];
          this.gy[i] += scale * near.gy[i];
        }
      }
    } else {
      // Slope of brightness: seeds move toward -gradient, so toward dark areas
      let g = gaussianGradient(this.brightness, this.w, this.h, sigma);
      this.gx = g.gx;
      this.gy = g.gy;
    }

    // Spacing: 0 where seeds should pack tightly, 1 where they should spread
    // out (bubble sizes come from this). Dark mode: brightness, so dark areas
    // pack tightly. Edges mode: 1 - edge strength, so edges pack tightly; with
    // an edge offset, the edge strength is blurred by it first, so the whole
    // band beside each edge (where the seeds settle) packs tightly.
    if (mode === 'edges') {
      let band = edgeOffset > 0 ? gaussianBlur(this.edgeStrength, this.w, this.h, edgeOffset) : this.edgeStrength;
      let strongest = 0;
      for (let i = 0; i < n; i++) strongest = Math.max(strongest, band[i]);
      this.spacing = band.map(e => 1 - e / Math.max(strongest, 1e-12));   // (the curve is already in edgeStrength)
    } else {
      this.spacing = Float32Array.from(this.brightness);
    }

    // Skin: smooth skin gets smaller bubbles too, so faces get more cells
    if (skin && skinDensity > 0) {
      for (let i = 0; i < n; i++) this.spacing[i] *= 1 - skinDensity * skin[i];
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

  // Spacing at any point (x, y), from 0 (pack tightly) to 1 (spread out),
  // blending the 4 nearest pixels (bilinear interpolation)
  spacingAt(x, y) {
    x = constrain(x, 0, this.w - 1);
    y = constrain(y, 0, this.h - 1);
    let x0 = Math.floor(x), y0 = Math.floor(y);
    let x1 = Math.min(x0 + 1, this.w - 1), y1 = Math.min(y0 + 1, this.h - 1);
    let fx = x - x0, fy = y - y0;
    let s = this.spacing, w = this.w;
    return lerp(lerp(s[y0 * w + x0], s[y0 * w + x1], fx),
                lerp(s[y1 * w + x0], s[y1 * w + x1], fx), fy);
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

}

// The longest gradient vector in { gx, gy }
function maxLength(g) {
  let longest = 0;
  for (let i = 0; i < g.gx.length; i++) longest = Math.max(longest, Math.hypot(g.gx[i], g.gy[i]));
  return longest;
}

// Gaussian blur of a w x h image (a flat array): a horizontal pass and a
// vertical pass with the bell-curve kernel
function gaussianBlur(src, w, h, sigma) {
  let { blur } = gaussianKernels(sigma);
  return convolve(convolve(src, w, h, blur, true), w, h, blur, false);
}

// Edge strength from brightness: the length of the brightness gradient
function brightnessEdgeStrength(brightness, w, h, sigma) {
  let g = gaussianGradient(brightness, w, h, sigma);
  let out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = Math.hypot(g.gx[i], g.gy[i]);
  return out;
}

// Edge strength from color (Di Zenzo, "A note on the gradient of a
// multi-image", 1986). Each channel (L*, a*, b*) has its own gradient. They're
// combined into a 2x2 "structure tensor" per pixel:
//   [ Jxx  Jxy ]    Jxx = sum of gx^2, Jyy = sum of gy^2, Jxy = sum of gx*gy
//   [ Jxy  Jyy ]
// Its largest eigenvalue is the squared rate of change of the color vector in
// the direction where it changes fastest; its square root is the edge strength.
// (Unlike adding the channels' slopes, this accounts for channels changing in
// different directions.)
function colorEdgeStrength(lab, w, h, sigma) {
  let n = w * h;
  let jxx = new Float32Array(n), jyy = new Float32Array(n), jxy = new Float32Array(n);
  for (let channel of [lab.L, lab.a, lab.b]) {
    let g = gaussianGradient(channel, w, h, sigma);
    for (let i = 0; i < n; i++) {
      jxx[i] += g.gx[i] * g.gx[i];
      jyy[i] += g.gy[i] * g.gy[i];
      jxy[i] += g.gx[i] * g.gy[i];
    }
  }

  let out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let half = (jxx[i] - jyy[i]) / 2;
    let biggest = (jxx[i] + jyy[i]) / 2 + Math.sqrt(half * half + jxy[i] * jxy[i]);
    out[i] = Math.sqrt(biggest);
  }
  return out;
}

// The derivative-of-Gaussian gradient of a w x h image (a flat array):
// blur with a Gaussian of width sigma and take the slope, in one step.
// Returns { gx, gy }.
function gaussianGradient(src, w, h, sigma) {
  let { blur, slope } = gaussianKernels(sigma);

  // Horizontal passes: slope across, and blur across
  let slopeX = convolve(src, w, h, slope, true);
  let blurX = convolve(src, w, h, blur, true);

  // Vertical passes finish the 2D kernels
  return {
    gx: convolve(slopeX, w, h, blur, false),   // slope across, blurred down
    gy: convolve(blurX, w, h, slope, false),   // blurred across, slope down
  };
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
