// Coding Challenge 127: Brownian Motion Snowflake
// Daniel Shiffman
// https://thecodingtrain.com/CodingChallenges/127-brownian-snowflake.html
// https://youtu.be/XUA8UREROYE

class Particle {

  // radius, angle: where the particle starts
  // r: the particle's own radius
  // jitter: how far it jiggles sideways each step, in particle radii
  constructor(radius, angle, r, jitter) {
    this.pos = p5.Vector.fromAngle(angle);
    this.pos.mult(radius);
    this.r = r;
    this.jitter = jitter;
  }

  update() {
    // Step sizes are based on the particle's size (the original used 1 and 3
    // pixels with a radius of 2), so the wandering looks the same at any scale.
    this.pos.x -= this.r / 2;
    let side = this.jitter * this.r;
    this.pos.y += random(-side, side);

    let angle = this.pos.heading();
    angle = constrain(angle, 0, PI/6);
    let magnitude = this.pos.mag();
    this.pos = p5.Vector.fromAngle(angle);
    this.pos.setMag(magnitude);
  }

  show(col) {
    fill(col);       // solid color, no transparency
    noStroke();
    ellipse(this.pos.x, this.pos.y, this.r * 2);
  }

  // Returns the closest particle this one is touching, or null if none.
  // (null counts as "false" in an if or while, so this still works as a yes/no check.)
  intersects(snowflake) {
    let closest = null;
    let closestDist = this.r * 2;
    for (let s of snowflake) {
      let d = dist(s.pos.x, s.pos.y, this.pos.x, this.pos.y);
      if (d < closestDist) {
        closest = s;
        closestDist = d;
      }
    }
    return closest;
  }

  // Snap this particle so its center is sqrt(3) radii from the center of `other`, at an angle that is
  // a multiple of PI/3 (0, 60, 120, ... degrees). That puts every particle on
  // a hexagonal (isometric) grid. Tries the angle closest to where the particle
  // actually hit first. Returns false if no spot works.
  snapTo(other, snowflake) {
    let gap = this.r * sqrt(3);   // center-to-center distance (about 1.73 radii), so the circles overlap a little
    let hitAngle = atan2(this.pos.y - other.pos.y, this.pos.x - other.pos.x);

    // The 6 possible spots around `other`
    let spots = [];
    for (let k = 0; k < 6; k++) {
      let a = k * PI / 3;
      spots.push({
        pos: createVector(other.pos.x + gap * cos(a), other.pos.y + gap * sin(a)),
        // how far this angle is from the hit angle, wrapped to 0..PI
        off: abs(atan2(sin(a - hitAngle), cos(a - hitAngle)))
      });
    }
    spots.sort((s1, s2) => s1.off - s2.off);

    for (let spot of spots) {
      if (inWedge(spot.pos) && !isTaken(spot.pos, snowflake, gap)) {
        this.pos = spot.pos;
        return true;
      }
    }
    return false;
  }

  finished() {
    return (this.pos.x < this.r / 2);
  }
}

// True if `pos` is inside the 0 to PI/6 slice the particles grow in.
// The snowflake draws this slice 12 times, so spots outside it would
// land on top of a mirrored copy. (The small 0.001 allows for rounding.)
function inWedge(pos) {
  let a = pos.heading();
  return a >= -0.001 && a <= PI / 6 + 0.001;
}

// True if a particle in the snowflake is already sitting at `pos`.
// `gap` is the grid spacing; anything closer than half of it counts as the same spot.
function isTaken(pos, snowflake, gap) {
  for (let s of snowflake) {
    if (dist(s.pos.x, s.pos.y, pos.x, pos.y) < gap / 2) return true;
  }
  return false;
}
