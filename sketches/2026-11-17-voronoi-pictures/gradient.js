// The brightness gradient of an image: at every pixel, which way (and how
// steeply) the picture gets brighter. Its opposite, -gradient, points toward
// darker areas.
//
// Brightness runs from 0 (black) to 1 (white). The gradient is measured in
// brightness per pixel, using central differences:
//   gx = (brightness to the right - brightness to the left) / 2
//   gy = (brightness below - brightness above) / 2
// (p5's y axis points down, so a positive gy means "brighter below".)

class GradientField {

  // img: a p5.Image or p5.Graphics with pixelDensity(1)
  constructor(img) {
    this.w = img.width;
    this.h = img.height;
    let n = this.w * this.h;

    // Brightness of every pixel, from the red channel (the image is grayscale)
    this.brightness = new Float32Array(n);
    img.loadPixels();
    for (let i = 0; i < n; i++) {
      this.brightness[i] = img.pixels[4 * i] / 255;
    }

    // Gradient of every pixel
    this.gx = new Float32Array(n);
    this.gy = new Float32Array(n);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        let i = y * this.w + x;
        this.gx[i] = (this.b(x + 1, y) - this.b(x - 1, y)) / 2;
        this.gy[i] = (this.b(x, y + 1) - this.b(x, y - 1)) / 2;
      }
    }

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
