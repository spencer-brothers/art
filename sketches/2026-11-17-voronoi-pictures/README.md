# Voronoi Pictures

A Voronoi diagram that turns a picture into cells. Seeds are drawn toward the picture's edges (or its dark areas), push on each other like a gas, and settle, so the cells are small along outlines and big in flat areas.

- Based on: original code, written from scratch. Libraries, papers, and standards it uses are listed under [Credits](#credits).

## Controls

- **Drag a photo onto the canvas** to use it. It stays in your browser and isn't uploaded.
- **Space:** debug mode, showing the gray picture and the seed dots.
- **F:** cycle the cell style: color fill, black lines, grey fill.
- **V:** record an MP4 video of the whole animation (small, smooth, full color, and plays inline on iMessage). It restarts the current picture, records frame by frame, and downloads the video when done; move it into the `output/` folder. Recording a big window takes longer, so a smaller browser window helps.

## Settings

All settings are in `settings.js`, in one read-only `SETTINGS` object grouped like the sections below (for example, `bubbles.min` is `SETTINGS.bubbles.min`). "Brightness" below means the picture's unblurred brightness at a spot, from 0 (black) to 1 (white). "Where seeds pack tightest" means dark areas in dark mode and strong edges in edges mode.

### Picture
- **`picture.photoPath`**: the photo loaded on start, from the `private/` folder. That folder is ignored by git, so personal photos never go online. If the file isn't there (as on the website), the sketch uses a generated test image.
- **`picture.autoContrast`**: stretch the photo's brightness so its darkest part becomes black and its brightest becomes white. Many photos are mostly mid-grey, and this makes their features read much better.
- **`picture.contrastClip`**: when stretching, ignore this fraction of the darkest and brightest pixels, so a few stray pixels don't decide the range.

### Seeds
Seeds start evenly spaced with variable-radius Poisson disk sampling: no overlapping bubbles, each spaced by its bubble size where it lands, so they begin close to where they'll settle. It places as many as fit.
- **`seeds.max`**: a safety limit, so a very dark picture can't create so many seeds that the sketch slows to a crawl.
- **`seeds.extra`**: how many seeds beyond what fits with full-size bubbles (0.1 = 10% extra). The starting layout uses bubbles shrunk by 1 / √(1 + extra), which fits that many more, since the number that fits goes with 1 / bubble². Once their bubbles are full size, the extra seeds keep everything gently squeezed: packed a little tighter, with fewer gaps. 0 = exactly as many as fit.
- **`seeds.startFraction`**, **`seeds.addStart`**, **`seeds.addEnd`**: the full evenly spaced set of seeds is laid out at the start, shuffled, and only `startFraction` of them are put in play. The rest are held back and released at their original spots a few at a time, so the count rises steadily from frame `addStart` to frame `addEnd`. The fast early phase has fewer seeds to push around, and the extra seeds fill in detail once the layout has taken shape. Keep `addEnd` well before the end of the settle so the last seeds have time to settle too. 1 = all seeds from the start.
- **`seeds.dotRadius`**: size of the seed dots in debug mode.

### Personal bubbles
- **`bubbles.min`**, **`bubbles.max`**: each seed keeps other seeds out of a circle around it. Two seeds stay at least the sum of their radii apart. In dark mode, the radius runs from `bubbles.min` on black up to `bubbles.max` on white, so seeds pack tightly (small cells) in dark areas. In edges mode, it runs from `bubbles.min` on the strongest edges up to `bubbles.max` in flat areas (light or dark), so seeds pack tightly along outlines. The Poisson start and the seed count follow the bubble sizes. Smaller bubbles mean more seeds and finer detail.
- **`bubbles.show`**: draw each bubble as a faint circle, for tuning.

### Gas pressure
- **`gas.range`**: seeds gently push on neighbors that are near but not touching, like gas pressure, so they spread out to fill empty space. Two seeds push each other when they're closer than this many times the sum of their bubbles.
- **`gas.strength`**: the push when two seeds are right on top of each other, in pixels per frame. It fades in a straight line to zero at the edge of the range. Bigger bubbles (light areas) reach farther, so light areas push harder.
- **`gas.tightPush`**: seeds resist being pushed where they pack tightest (dark areas in dark mode, strong edges in edges mode). The push a seed receives is scaled from 1 where seeds spread out down to this where they pack tightest, so seeds on thin dark lines or edges stay on them instead of being shoved off by neighbors with bigger bubbles.

### Collisions and friction
- **`collisions.passes`**: after moving, seeds whose bubbles overlap are pushed apart until they just touch. Fixing one pair can push a seed into another, so this runs a few passes per frame. More passes untangle crowded spots better but cost more.
- **`collisions.tightMobility`**: friction where seeds pack tightest. After moving and colliding, a seed only goes part of the way to its new spot: all the way where seeds spread out, this fraction where they pack tightest. It calms jitter in tight clusters and holds seeds on edges.

### Settling
- **`settle.start`**, **`settle.frames`**, **`settle.floor`**: after `settle.start` frames, friction gradually increases everywhere over `settle.frames` more frames (with a smooth ease), until seeds can only move `settle.floor` as much as at the start (0.5 = half). After that it stays there, so seeds keep gently moving and adjusting. With `settle.floor = 0`, seeds stop completely and the sketch stops at frame `settle.start + settle.frames`, a clean end point for recordings; either way, that frame (1800 at the current settings, 30 seconds at 60 frames per second) is when the slowdown ends. Timing is counted in frames, so a frame-by-frame recording always plays the same.

### Gradient descent
- **`descent.learningRate`**: each frame, a seed steps downhill (toward darker areas) by the gradient times this many pixels.
- **`descent.maxStep`**, **`descent.minStep`**: the downhill step is capped from `descent.maxStep` pixels where seeds spread out down to `descent.minStep` where they pack tightest, so seeds slow down as they arrive and steep edges don't fling them.
- **`descent.momentum`**: each frame a seed keeps this fraction of its last velocity, so it builds speed down long slopes (0 = none; near 1 = slides and overshoots). Its velocity is the distance it actually moved, so speed lost to collisions and friction is lost from its momentum too.
- **`descent.maxSpeed`**: speed cap, in pixels per frame.
- **`descent.sigma`**: how much the gradient is blurred (the width of the Gaussian, in pixels). The gradient is computed with a derivative-of-Gaussian kernel, which blurs and takes the slope in one step. Bigger values let seeds sense dark features from farther away (about 3 × sigma) and soften hard edges, but take longer to compute when a picture loads.

### Edges
- **`edges.attractTo`**: what seeds are drawn to. `'dark'`: seeds slide downhill on brightness, toward dark areas. `'edges'`: seeds climb toward edges, where brightness changes quickly (outlines, borders between light and dark). The sketch finds edge strength (the gradient magnitude of brightness, scaled so the strongest edge is 1) and seeds follow the slope of that, blurred by `descent.sigma`. In edges mode, bubble sizes, friction, push resistance, and the step cap all follow edge strength too, so seeds pack tightly on edges and are held there.
- **`edges.sigma`**: edges mode only. How much the picture is blurred when finding edges, in pixels. Small values keep edges sharp and thin; bigger values merge nearby edges and ignore fine texture.
- **`edges.color`**: edges mode only. `true` finds edges from **color**, not just brightness, so a boundary between two colors of the same brightness (a red shirt against a green wall) still counts as an edge. The photo's colors are converted to CIELAB, where equal distances look about equally different to the eye, and edge strength is Di Zenzo's multi-channel gradient: each pixel's color is treated as a vector (L\*, a\*, b\*), and edge strength is how fast that vector changes in the direction where it changes fastest. `false` uses brightness only. The test image has no color, so this only makes a difference with photos.
- **`edges.offset`**, **`edges.repel`**: edges mode only. A Voronoi cell border always runs halfway between two seeds, so seeds sitting *on* an edge make the cells zigzag across it. Instead, seeds are pushed off the edge line itself (a short-range push from the edge-strength map blurred by `edges.offset`, scaled to match the long-range pull, times `edges.repel`) while still being pulled toward edges from far away. The two balance about `edges.offset` pixels to each side, so seeds settle in two rows with the edge between them, and the Voronoi borders between the rows fall along the edge. The tight-packing zone (small bubbles, friction, push resistance) becomes that band beside the edge. `EDGE_REPEL = 0` puts seeds back on the edges. Works best when `edges.sigma` is small (about 2–3), so edges are thin.
- **`edges.curve`**: edges mode only. How much medium edges count, compared with the strongest ones. Edge strength is boosted to 1 − (1 − strength) raised to this power: flat areas stay 0 and the strongest edges stay 1, but medium edges rise toward 1 (at 3, an edge at 30% strength counts as about 66%). Everything in edges mode uses the boosted strength: the pull toward edges, the two-row push, bubble sizes, friction, and push resistance. So medium edges attract seeds, get small cells, and hold their seeds almost like strong edges. 1 = straight line (only strong edges stand out).

### Skin
Pixels are scored by how skin-colored they are, from 0 to 1, so faces, hands, and other human details get more seeds. Human skin of every tone has a similar hue (between red and yellow); people differ mostly in lightness. So the score looks at hue and chroma (how colorful) in CIELAB, **not** lightness, and light and dark skin count the same. Tested on skin tones from very light to very dark, they all score 0.76–0.99, while grey, blue, green, and neon orange score 0. It's color-based, not face detection, so skin-colored things (wood, sand, warm walls, warm lighting) can count too.
- **`skin.edgeBoost`**: edges mode only. Edges on skin count (1 + this × skin) times as much, so facial features pull more seeds and get smaller cells. 0 = off; 1 = twice as much.
- **`skin.density`**: smooth skin gets smaller bubbles, so faces get more cells overall. 0 = off; 1 = all the way down to `bubbles.min`.
- **`skin.hueCenter`**, **`skin.hueWidth`**: the skin hue (an angle around CIELAB's a\*/b\* plane, about 55°) and how far from it still counts (35°). Pixels also need some color, but not neon (chroma between about 5 and 65), and near-black pixels don't count.
- **`skin.blur`**: softens the skin map so it's smooth, not speckly.
- **`skin.whiteBalance`**: corrects for the light's color before looking for skin, so skin is still found under warm light (lamps, sunset) or cool light (shade, overcast, screens). In neutral light, the photo's nearly neutral pixels (greys, whites, darks with little color) average out to equal red, green, and blue; under colored light they don't. The sketch measures that on those pixels (leaving out skin-colored ones, since very light skin has little color and would otherwise be mistaken for a neutral surface) and multiplies each color channel to even them out again, the way a camera's white balance works (a "gray world" white balance). Because light multiplies colors, dividing it back out treats dark and light skin alike. (An earlier version shifted colors by a fixed amount instead, which over-corrected very dark skin under warm light; in testing, the multiplying version keeps every skin tone at 0.80 or higher in neutral, warm, and cool light.) Only skin detection is corrected; the colors you see and the color edges are unchanged. 1 = full correction; 0.8 is safer for photos dominated by one color. 0 = off.
- **`skin.show`**: in debug mode (Space), seeds on skin (skin score 0.5 or more) are drawn red and all other seeds black, to check what counts as skin. When off, all seed dots are red.

### Color noise
- **`colorNoise.amount`**, **`colorNoise.scale`**, **`colorNoise.speed`**: in the fill modes, each cell's color is gently lightened or darkened by Perlin noise at its seed's position, drifting over time, so soft patches of light and shade move slowly across the picture. The noise is 3D (two dimensions for position, one for time), so nearby cells change together and nothing flickers. `amount` is the biggest change, out of 255 (0 = off); a smaller `scale` makes bigger, smoother patches; `speed` is how fast they drift. The shift is the same for red, green, and blue, so colors get lighter or darker without changing hue. Line mode isn't affected.

### Capture
- **`capture.seconds`**: how long videos are. Press V to record. The sketch restarts the current picture from the first frame and captures one frame at a time, so the recording plays smoothly however slowly the sketch runs. It records at normal pixel density, so files aren't four times bigger on Retina screens. Browsers can only download files, so videos land in your downloads folder; move them into `output/` (ignored by git).
- **`capture.mp4Fps`**, **`capture.mp4Bitrate`**: MP4 frames per second and quality. MP4s are encoded as H.264 with the browser's built-in video encoder (WebCodecs) and packaged with the mp4-muxer library. At 6,000,000 bits per second, 30 seconds is about 22 MB. H.264 needs an even width and height, so an odd-sized canvas loses its last row or column of pixels. Works in Chrome, Edge, and Safari; if the browser can't encode H.264, the console says so.

### Display
- **`display.debugAtStart`**: start in debug mode (gray picture plus seed dots). Space toggles it.
- **`display.fillModeAtStart`**: starting cell style. 0 = black lines; 1 = each cell filled with the picture's grey at its seed; 2 = filled with the picture's color (no lines in the fill modes). F cycles through them.
- **`display.keepDrawing`**: keep drawing after the seeds have stopped (`settle.floor = 0`), so the color noise keeps drifting while the cells stay still. Only the drawing continues, not the simulation, so it's light. `false` stops the sketch completely once the seeds stop.
- **`display.imageOpacity`**: how strongly the picture shows in debug mode (0 = hidden, 255 = full).
- **`display.lineColor`**: color of the cell lines.
- **`display.lineToBubble`**: cell line thickness as a multiple of `bubbles.min`, so lines scale with the smallest cells .
- **`display.background`**, **`display.seedColor`**: the linen background and the brick red of the seed dots.

## My changes

- Started the sketch: a `Seed` class (`seed.js`) and 5,000 seeds scattered randomly over the canvas, drawn as 5-pixel dots.
- Added a generated grayscale test image (`test-image.js`): soft dark blobs on a gentle left-to-right gradient, plus an empty square with a thick black outline near the bottom left and an empty equilateral triangle with a thinner outline near the top right, shown in full black and white behind the seeds. It's smooth everywhere, so its brightness always has a slope for the seeds to follow later.
- Computed the image's brightness gradient (`gradient.js`) with a derivative-of-Gaussian kernel (a Gaussian low-pass and the slope in one step, done as separate horizontal and vertical passes for speed), with smooth lookups between pixels (bilinear interpolation). `GRADIENT_SIGMA` sets how much smoothing. Brick-red arrows show the downhill direction (toward darker areas) on a grid; turn them off with `SHOW_GRADIENT`.
- Seeds now move by gradient descent: each frame, every seed steps downhill on the brightness (toward darker areas) by the gradient times `LEARNING_RATE`, capped so the hard edges of the square and triangle don't fling seeds across the canvas. The cap depends on brightness: up to `MAX_STEP` pixels on white, down to `MIN_STEP` on black, so seeds slow down as they reach dark areas. Seeds are now brick red so they show on both black and white, and the arrows are moss green.
- Seeds can't overlap: after each move, any two seeds that are too close are pushed apart until they just touch (a few passes per frame, `COLLISION_PASSES`). A spatial grid (`spatial-grid.js`, adapted from my Brownian Snowflakes sketch) finds nearby seeds quickly. Seeds now pack together in dark areas instead of piling onto one point.
- Each seed has a personal bubble whose size depends on the brightness where it is: `BUBBLE_MIN` on black up to `BUBBLE_MAX` on white. Two seeds stay at least the sum of their bubble radii apart, so they pack tightly in dark areas and spread out in light ones. The drawn dot size is separate (`DOT_RADIUS`), and `SHOW_BUBBLES` draws the bubbles for tuning.
- Added friction in dark areas: after moving and colliding, each seed only goes part of the way to its new spot, all the way on white down to `DARK_MOBILITY` (20%) on black. This calms the jitter in dark clusters, where the gradient pulls seeds in and collisions push them back out every frame.
- Seeds settle down: after `SETTLE_START` frames, friction gradually increases everywhere over `SETTLE_FRAMES` frames until the seeds stop moving and the picture holds still. Once settled, the sketch stops its animation loop (a clean end frame for recordings); the key toggles still redraw the final frame.
- Added photos (`picture.js`): on start, the sketch loads `private/photo.jpeg` if it exists (the `private/` folder is ignored by git, so personal photos never go online), and otherwise uses the test image. Drag any photo onto the canvas to use it instead; it stays in the browser and isn't uploaded. The canvas takes the photo's shape, as big as fits in the window, centered on a linen page (the test image fills the window). Photos are never cropped. They're converted to brightness with Rec. 709 luminance weights (green counts most, blue least), and auto-contrasted so the darkest 1% becomes black and the brightest 1% white. Each new picture restarts the seeds and the settle.
- Added momentum: each seed keeps `MOMENTUM` (60%) of its velocity from frame to frame, so it builds speed down long slopes and gets into dark areas quicker, capped at `MAX_SPEED`. Its velocity is the distance it actually moved, so speed lost to collisions and dark-area friction is lost from its momentum too.
- The number of seeds is now worked out from the picture: each pixel can hold 1 / (2 x sqrt(3) x r²) of a seed, where r is the bubble size at that pixel's brightness (honeycomb packing), scaled by 0.92 for looser natural packing. The sketch uses `FILL` (80%) of that capacity, up to `MAX_SEEDS`, so darker pictures automatically get more seeds and changing the bubble sizes doesn't cause jamming.
- Added a gas model: seeds gently push on neighbors that are near but not touching, like gas pressure, so they spread out to fill empty space instead of leaving bare white patches. The push reaches `REPULSION_RANGE` x the sum of two seeds' bubbles and fades from `REPULSION_STRENGTH` to zero across that range, so light areas (bigger bubbles) push harder. It's added to the gradient pull each frame, and the two balance out: the gradient squeezes seeds toward dark areas and the pressure resists.
- Dark seeds resist being pushed: the push a seed receives is scaled by its brightness, from full on white down to `DARK_PUSH` (10%) on black. Seeds on thin dark lines, like the triangle's outline, stay on them instead of being shoved off by light-area neighbors, whose bigger bubbles reach farther.
- Added a Poisson disk starting layout (`poisson-disk.js`, adapted from Robert Bridson's "Fast Poisson Disk Sampling in Arbitrary Dimensions", 2007): seeds start evenly spaced with no overlapping bubbles, each spaced by its bubble size at that brightness, so they begin close to where they'd settle. New spots are tried in a tight ring around existing seeds, so it packs them as closely as the bubbles allow and fills the whole canvas. It places as many seeds as fit. `USE_POISSON` switches between this and a purely random start.
- Drew the Voronoi diagram: each seed's cell is outlined in black (`CELL_LINE_COLOR`, `CELL_LINE_WEIGHT`), rebuilt every frame from the seeds' current positions using the [d3-delaunay](https://github.com/d3/d3-delaunay) library (ISC license, loaded from jsDelivr). Removed the gradient arrows from the sketch.
- Cell line thickness is `LINE_TO_BUBBLE` x `BUBBLE_MIN` (3 px at the current settings), so it scales with the smallest cells. Added a debug mode, off by default (`DEBUG_AT_START`): press the space bar to show the test image and the seed dots under the cells, and again to hide them.
- Added fill modes: press F to cycle the cell style between black lines, cells filled with the picture's grey at their seed, and cells filled with the picture's color (no lines in the fill modes). Color fill is the default (`FILL_MODE_AT_START`).
- Added an edges mode (`ATTRACT_TO`): seeds can be drawn to edges, where the picture's brightness changes quickly, instead of to dark areas. Edge strength is the gradient magnitude of brightness (found with a small blur, `EDGE_SIGMA`), and seeds climb its blurred slope. It's the new default.
- In edges mode, bubble sizes now follow edge strength too: small bubbles on strong edges and big ones in flat areas, so seeds (and small cells) gather along outlines. The Poisson start and seed count follow along.
- Friction, push resistance, and the step cap now follow the same spacing as the bubbles, so in edges mode seeds are held firmly on edges (and in dark mode, in dark areas, as before). Renamed `DARK_PUSH` and `DARK_MOBILITY` to `TIGHT_PUSH` and `TIGHT_MOBILITY`.
- Edges can now come from color (`EDGE_COLOR`): the photo is converted to CIELAB, and edge strength uses Di Zenzo's multi-channel gradient, so edges between different colors of the same brightness count too. Bubbles, friction, and push resistance follow these color edges.
- Seeds now settle beside edges instead of on them (`EDGE_OFFSET`, `EDGE_REPEL`): a short-range push off the edge line balances the long-range pull toward edges, so seeds line up in two rows and the Voronoi cell borders between them follow the edge, instead of cells zigzagging across it. The cells are still strict Voronoi polygons.
- Moved every setting into `settings.js`: one read-only `SETTINGS` object, grouped (picture, seeds, bubbles, gas, collisions, settle, descent, edges, display). Settings were renamed to match, for example `BUBBLE_MIN` is now `SETTINGS.bubbles.min`; earlier bullets above use the old names.
- Cleaned up the code: `sketch.js` is now just the overview (load, set up, each frame step and draw, keys and dropped photos). The seed simulation moved to a `Simulation` class (`simulation.js`), and all drawing to `render.js`. Removed unused code: the gradient arrows, the pure-random start (`seeds.usePoisson`, `seeds.fill`), and the seed-capacity estimate. The sketch looks and behaves the same.
- Added `edges.curve`, so medium edges get smaller bubbles too (spacing is (1 − edge strength) raised to the curve's power), not just the strongest edges.
- Seeds are added gradually: the sketch starts with a fraction of them (`seeds.startFraction`, now 1/100) and releases the rest at their original evenly spaced spots between frames `seeds.addStart` and `seeds.addEnd`.
- Seeds no longer have to stop completely: the slowdown now eases down to `settle.floor` (half speed) and stays there, so the cells keep gently moving. The sketch only stops its loop when `settle.floor` is 0.
- `edges.curve` now also boosts the pull toward edges, not just the bubble sizes, so seeds are drawn to medium edges almost as strongly as to strong ones.
- Added color noise (`colorNoise`): in the fill modes, cells are gently lightened or darkened by Perlin noise that depends on the seed's position and drifts over time.
- Added GIF recording: press G to record the whole animation from the start, frame by frame, as a 15-second GIF at 30 fps (`capture`).
- Added MP4 recording: press V to record the whole animation as a 15-second, 60 fps H.264 video (about 11 MB), frame by frame. Moved the recording code into `capture.js`.
- Added `seeds.extra`: the sketch now ends up with 10% more seeds than fit with full-size bubbles, so they stay gently squeezed together.
- Slowed the whole process to about 30 seconds: seeds are added until frame 1020, the slowdown runs from frame 240 to 1800, and recordings are 30 seconds long.
- Removed GIF recording (G); MP4 (V) is smaller, smoother, and keeps full color.
- Added skin weighting (`skin`): pixels are scored by how skin-colored they are, using hue and chroma but not lightness, so all skin tones count the same. Edges on skin count more and smooth skin gets smaller bubbles, so faces and hands get more detail. `skin.show` colors the seeds on skin in debug mode.
- The seeds stop completely again at the end of the slowdown (`settle.floor = 0`), but the sketch keeps drawing (`display.keepDrawing`), so the color noise keeps drifting over the still cells.
- Skin detection now works under warm and cool light (`skin.whiteBalance`): it estimates the light's color cast from the photo's nearly neutral pixels and corrects for it before scoring skin.
- Debug mode now shows skin detection on the seed dots: seeds on skin are red and the rest black (replacing a red overlay that the filled cells were covering).
- Skin-colored pixels are now left out when estimating the light's color, so very light skin isn't mistaken for a neutral surface. In testing (skin tones from very light to very dark, neutral, warm, and cool light, plain and colorful backgrounds), every skin tone now scores 0.76 or higher. A whole-picture estimate was also tested and rejected: big colored backgrounds (foliage, painted walls) were mistaken for the light's color.

## Credits

**Libraries** (loaded from the jsDelivr CDN, not copied into this repo):
- [p5.js](https://p5js.org) v1.11.1, by the Processing Foundation and contributors. LGPL-2.1 license.
- [d3-delaunay](https://github.com/d3/d3-delaunay) v6.0.4, © 2018–2021 Observable, Inc. ISC license. Computes the Delaunay triangulation and Voronoi diagram. It includes [Delaunator](https://github.com/mapbox/delaunator), © 2021 Mapbox, ISC license.
- [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) v5.2.2, by Vanilagy. MIT license. Packages the encoded video frames into an MP4 file.

**Algorithms and papers** (implemented from their descriptions; the code is my own):
- Poisson disk sampling, adapted for variable spacing: Robert Bridson, "Fast Poisson Disk Sampling in Arbitrary Dimensions," ACM SIGGRAPH 2007 Sketches.
- Color gradient (structure tensor): Silvano Di Zenzo, "A note on the gradient of a multi-image," *Computer Vision, Graphics, and Image Processing* 33(1), 116–125, 1986.
- Voronoi diagrams: Georgy Voronoi, 1908.
- Perlin noise (through p5.js's `noise()`): Ken Perlin, "An Image Synthesizer," SIGGRAPH 1985.

**Color standards and techniques:**
- Brightness from color uses the Rec. 709 luminance weights (ITU-R Recommendation BT.709).
- Color edges use CIELAB (CIE 1976 L\*a\*b\*), converted from sRGB (IEC 61966-2-1) through CIE XYZ with the D65 white point.
- Skin detection's light correction is a "gray world" white balance (G. Buchsbaum, "A spatial processor model for object colour perception," *Journal of the Franklin Institute* 310(1), 1–26, 1980), applied as per-channel gains in linear RGB, measured on nearly neutral pixels only.

**From my other work:**
- The spatial grid (`spatial-grid.js`) is adapted from my [Brownian Snowflakes](../2026-11-brownian-snowflakes/) sketch.

## License

My code is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/), like the rest of my code in this repo. Images and renders of this piece are all rights reserved.
