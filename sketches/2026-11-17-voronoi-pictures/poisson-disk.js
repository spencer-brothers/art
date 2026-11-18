// Variable-radius Poisson disk sampling: random points that are evenly spaced
// but still natural-looking. Each point's personal space depends on the
// picture's brightness where it lands (small in dark areas, big in light ones),
// and no two points are closer than the sum of their radii. That's the same
// rule the seeds' bubbles follow, so the seeds start out already spread the way
// the picture wants, with no overlaps.
//
// Based on Robert Bridson's algorithm ("Fast Poisson Disk Sampling in
// Arbitrary Dimensions", 2007), adapted so the spacing varies:
//   1. Start with one random point and mark it "active".
//   2. Pick a random active point. Try up to `tries` random spots in a ring
//      around it, just outside its personal space.
//   3. Keep the first spot whose personal space doesn't overlap any existing
//      point's. If none of the tries work, that point is done ("inactive").
//   4. Repeat until no active points are left: the picture is full.
//
// radiusAt(x, y): returns the personal-space radius at a spot
// minRadius, maxRadius: the smallest and biggest radius radiusAt can return
// Returns an array of p5.Vectors.

function poissonDisk(w, h, radiusAt, minRadius, maxRadius, tries = 30) {
  let points = [];    // { pos, r }
  let active = [];
  let grid = new SpatialGrid(2 * maxRadius);   // cells as wide as the farthest two radii can reach

  function addPoint(x, y) {
    let p = { pos: createVector(x, y), r: radiusAt(x, y) };
    points.push(p);
    active.push(p);
    grid.add(p);
  }

  addPoint(random(w), random(h));

  while (active.length > 0) {
    let i = floor(random(active.length));
    let p = active[i];
    let placed = false;

    for (let t = 0; t < tries; t++) {
      // A random spot in a tight ring around p: from the closest a neighbor
      // could ever sit (p's radius + the smallest radius) to just past the
      // farthest one would need to be (p's radius + the biggest radius).
      // Keeping the ring tight packs seeds as closely as the bubbles allow,
      // so no big empty gaps are left behind.
      let angle = random(TWO_PI);
      let d = random(p.r + minRadius, (p.r + maxRadius) * 1.1);
      let x = p.pos.x + d * cos(angle);
      let y = p.pos.y + d * sin(angle);
      if (x < 0 || x >= w || y < 0 || y >= h) continue;   // off the canvas

      // Does its personal space overlap anyone's?
      let r = radiusAt(x, y);
      let fits = true;
      for (let q of grid.near(createVector(x, y))) {
        let dx = q.pos.x - x, dy = q.pos.y - y;
        let minDist = q.r + r;
        if (dx * dx + dy * dy < minDist * minDist) {
          fits = false;
          break;
        }
      }

      if (fits) {
        addPoint(x, y);
        placed = true;
        break;
      }
    }

    // No room around p: remove it from the active list
    if (!placed) {
      active[i] = active[active.length - 1];
      active.pop();
    }
  }

  return points.map(p => p.pos);
}
