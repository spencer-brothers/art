// Drawing: the Voronoi cells, plus the debug views (picture, seeds, bubbles).

// The Voronoi cells around the seeds. Each seed's cell is every point closer
// to that seed than to any other. d3-delaunay works the cells out from the
// seeds' Delaunay triangulation, clipped to the canvas.
//   fillMode 0: black lines (render() traces every edge once)
//   fillMode 1: each cell filled with the picture's grey at its seed
//   fillMode 2: each cell filled with the picture's color at its seed
function drawCells(seeds, field, colorImg, fillMode) {
  let delaunay = d3.Delaunay.from(seeds, s => s.pos.x, s => s.pos.y);
  let voronoi = delaunay.voronoi([0, 0, width, height]);

  if (fillMode === 0) {
    stroke(SETTINGS.display.lineColor);
    strokeWeight(SETTINGS.display.lineToBubble * SETTINGS.bubbles.min);   // line thickness in pixels
    noFill();
    drawingContext.beginPath();
    voronoi.render(drawingContext);
    drawingContext.stroke();
    return;
  }

  for (let i = 0; i < seeds.length; i++) {
    let cell = voronoi.cellPolygon(i);   // the cell's corners, as [x, y] pairs
    if (!cell) continue;

    let { x, y } = seeds[i].pos;
    drawingContext.fillStyle = fillMode === 1 ? greyAt(field, x, y) : colorAt(colorImg, x, y);
    drawingContext.beginPath();
    drawingContext.moveTo(cell[0][0], cell[0][1]);
    for (let j = 1; j < cell.length; j++) drawingContext.lineTo(cell[j][0], cell[j][1]);
    drawingContext.fill();
  }
}

// The picture's grey at (x, y), as a CSS color
function greyAt(field, x, y) {
  let g = round(255 * field.brightnessAt(x, y));
  return `rgb(${g}, ${g}, ${g})`;
}

// The color of the nearest pixel in the color picture, as a CSS color
function colorAt(colorImg, x, y) {
  let i = 4 * (constrain(round(y), 0, height - 1) * width + constrain(round(x), 0, width - 1));
  let px = colorImg.pixels;
  return `rgb(${px[i]}, ${px[i + 1]}, ${px[i + 2]})`;
}

// Debug: the gray picture behind everything
function drawPicture(img) {
  tint(255, SETTINGS.display.imageOpacity);
  image(img, 0, 0);
  noTint();
}

// Debug: a dot at every seed
function drawSeeds(seeds) {
  stroke(SETTINGS.display.seedColor);
  strokeWeight(2 * SETTINGS.seeds.dotRadius);
  for (let s of seeds) s.show();
}

// Tuning: each seed's bubble as a faint circle
function drawBubbles(seeds) {
  noFill();
  stroke(SETTINGS.display.seedColor + '40');   // mostly transparent
  strokeWeight(1);
  for (let s of seeds) circle(s.pos.x, s.pos.y, 2 * s.bubble);
}
