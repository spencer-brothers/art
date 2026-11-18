// All the settings for Voronoi Pictures, in one place (each one is explained in README.md).
// Object.freeze makes them read-only, so the sketch can't change one by accident.

const SETTINGS = deepFreeze({

  picture: {
    photoPath: 'private/photo.jpeg',  // photo loaded on start (private/ is never committed)
    autoContrast: true,               // stretch photo brightness to full black-to-white
    contrastClip: 0.01,               // fraction of darkest/brightest pixels ignored when stretching
  },

  seeds: {
    max: 15000,         // safety limit on seed count
    startFraction: 0.2, // fraction of seeds placed at the start; the rest are added gradually
    addStart: 0,        // frame when the held-back seeds start being added
    addEnd: 510,        // frame when all seeds have been added
    dotRadius: 2.5,     // seed dot size in debug mode
  },

  bubbles: {
    min: 0.75,      // bubble radius where seeds pack tightest (dark, or beside edges)
    max: 9,         // bubble radius where seeds spread out most (light, or flat)
    show: false,    // draw bubbles as faint circles
  },

  gas: {
    range: 2,         // push reach, as a multiple of two seeds' bubble sum
    strength: 0.3,    // push at zero distance, in pixels per frame
    tightPush: 0.1,   // fraction of push a seed receives where seeds pack tightest
  },

  collisions: {
    passes: 3,          // overlap-fixing passes per frame
    tightMobility: 0.2, // fraction of its move a seed makes where seeds pack tightest
  },

  settle: {
    start: 120,    // frame when the slowdown starts
    frames: 780,   // frames the slowdown lasts
    floor: 0.5,    // how much seeds can still move after the slowdown (0 = stop completely, and the sketch stops)
  },

  descent: {
    learningRate: 50,   // step size per unit of gradient
    maxStep: 2,         // step cap where seeds spread out most, in pixels
    minStep: 0.2,       // step cap where seeds pack tightest, in pixels
    momentum: 0.6,      // fraction of last frame's velocity kept
    maxSpeed: 4,        // speed cap, in pixels per frame
    sigma: 20,          // gradient blur (Gaussian width), in pixels
  },

  edges: {
    attractTo: 'edges', // what seeds are drawn to: 'edges' or 'dark'
    sigma: 2,           // blur for finding edges, in pixels
    color: true,        // find edges from color (true) or brightness only (false)
    offset: 3,          // about how far beside an edge seeds settle, in pixels
    repel: 1,           // how strongly seeds are pushed off the edge line (0 = off)
    curve: 3,           // how much medium edges count (1 = straight line; higher = medium edges pull and pack more)
  },

  colorNoise: {
    amount: 10,     // max lighten/darken of fill colors, out of 255 (0 = off)
    scale: 0.01,    // patch size: smaller = bigger, smoother patches
    speed: 0.01,    // how fast the patches drift, per frame
  },

  capture: {
    seconds: 15,          // recording length (G = GIF, V = MP4)
    gifFps: 30,           // GIF frames per second (the simulation takes 60/fps steps per frame)
    mp4Fps: 60,           // MP4 frames per second
    mp4Bitrate: 6000000,  // MP4 quality, in bits per second (6,000,000 is about 11 MB for 15 seconds)
  },

  display: {
    debugAtStart: false,     // debug mode (picture + seeds) on start; space toggles
    fillModeAtStart: 2,      // 0 lines, 1 grey fill, 2 color fill; F cycles
    imageOpacity: 255,       // picture opacity in debug mode (0-255)
    lineColor: '#000000',    // cell line color
    lineToBubble: 2,         // line thickness as a multiple of bubbles.min
    background: '#ECE4D4',   // linen
    seedColor: '#9B3A2C',    // brick red, for seed dots
  },
});

// Freeze an object and every object inside it
function deepFreeze(obj) {
  for (let value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) deepFreeze(value);
  }
  return Object.freeze(obj);
}
