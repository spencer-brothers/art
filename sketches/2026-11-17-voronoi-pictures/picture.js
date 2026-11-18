// Turning a photo (or the test image) into the pictures the sketch uses:
//   color: the photo scaled to fit the canvas, for color fill mode
//   gray:  its brightness, for everything that moves the seeds
//   lab:   its colors in CIELAB (L*, a*, b* arrays), for color edges
// Both are canvas-sized, with pixelDensity(1) so one pixel = one canvas unit.

// photo: a p5.Image, or null to use the generated test image
// autoContrast: stretch the brightness so the darkest part becomes black and
//   the brightest becomes white (ignoring the extreme `clip` fraction at each
//   end, so a few stray pixels don't decide it)
function preparePicture(photo, autoContrast, clip) {
  let w = width, h = height;

  // Color version: white background, photo scaled to fit and centered, so the
  // whole photo shows and nothing is cropped. (The sketch sizes the canvas to
  // the photo's shape, so it fills the canvas exactly.) Transparent areas end
  // up white.
  let colorImg = createGraphics(w, h);
  colorImg.pixelDensity(1);
  colorImg.background(255);
  if (photo) {
    let s = min(w / photo.width, h / photo.height);
    let pw = photo.width * s, ph = photo.height * s;
    colorImg.image(photo, (w - pw) / 2, (h - ph) / 2, pw, ph);
  } else {
    let test = makeTestImage(w, h);
    colorImg.image(test, 0, 0);
    test.remove();
  }
  colorImg.loadPixels();

  // Brightness of every pixel (0 to 255). The eye is most sensitive to green
  // and least to blue, so the colors are weighted (Rec. 709 luminance).
  let n = w * h;
  let lum = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let r = colorImg.pixels[4 * i];
    let g = colorImg.pixels[4 * i + 1];
    let b = colorImg.pixels[4 * i + 2];
    lum[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  // Auto-contrast: find the brightness levels with `clip` of the pixels below
  // (low) and above (high), then stretch low..high to 0..255
  if (autoContrast) {
    let histogram = new Array(256).fill(0);
    for (let i = 0; i < n; i++) histogram[Math.round(lum[i])]++;

    let low = 0, high = 255, count = 0;
    for (let v = 0; v < 256; v++) {
      count += histogram[v];
      if (count >= clip * n) { low = v; break; }
    }
    count = 0;
    for (let v = 255; v >= 0; v--) {
      count += histogram[v];
      if (count >= clip * n) { high = v; break; }
    }

    if (high > low) {
      for (let i = 0; i < n; i++) {
        lum[i] = constrain((lum[i] - low) / (high - low) * 255, 0, 255);
      }
    }
  }

  // Gray version
  let grayImg = createGraphics(w, h);
  grayImg.pixelDensity(1);
  grayImg.loadPixels();
  for (let i = 0; i < n; i++) {
    grayImg.pixels[4 * i] = lum[i];
    grayImg.pixels[4 * i + 1] = lum[i];
    grayImg.pixels[4 * i + 2] = lum[i];
    grayImg.pixels[4 * i + 3] = 255;
  }
  grayImg.updatePixels();

  return { color: colorImg, gray: grayImg, lab: toLab(colorImg.pixels, n) };
}

// Convert sRGB pixels to CIELAB, a color space arranged so equal distances
// look about equally different to the eye. L* is lightness (0 to 100), a* runs
// green to red, b* runs blue to yellow. Steps: undo sRGB's gamma curve, convert
// to CIE XYZ, then to L*a*b* relative to the D65 white point (standard daylight).
// Uses the photo's original colors (auto-contrast only changes the gray picture).
function toLab(pixels, n) {
  // sRGB gamma curve undone, for every possible channel value (a lookup table)
  let linear = new Float32Array(256);
  for (let v = 0; v < 256; v++) {
    let c = v / 255;
    linear[v] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  // CIELAB's f(t): a cube root, with a straight-line piece near black
  const D = 6 / 29;
  let f = t => t > D * D * D ? Math.cbrt(t) : t / (3 * D * D) + 4 / 29;

  let L = new Float32Array(n), A = new Float32Array(n), B = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let r = linear[pixels[4 * i]], g = linear[pixels[4 * i + 1]], b = linear[pixels[4 * i + 2]];

    // sRGB (linear) to XYZ, divided by the D65 white point
    let x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
    let y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b) / 1.00000;
    let z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883;

    let fx = f(x), fy = f(y), fz = f(z);
    L[i] = 116 * fy - 16;
    A[i] = 500 * (fx - fy);
    B[i] = 200 * (fy - fz);
  }
  return { L, a: A, b: B };
}
