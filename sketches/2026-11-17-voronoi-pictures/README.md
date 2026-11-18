# Voronoi Pictures

- Based on: original code, written from scratch.
- Library: [d3-delaunay](https://github.com/d3/d3-delaunay) v6.0.4 (ISC license, © Observable, Inc. and Mapbox) computes the Voronoi diagram.
- Technique: seeds move toward darker parts of a picture by gradient descent on its (smoothed) brightness and push on each other like a gas, so the Voronoi cells are smaller where the picture is darker.

## Controls

- **Drag a photo onto the canvas** to use it. It stays in your browser and isn't uploaded.
- **Space:** debug mode, showing the gray picture and the seed dots.
- **F:** cycle the cell style: color fill, black lines, grey fill.

## Settings

All settings are at the top of `sketch.js`. "Brightness" below means the picture's unblurred brightness at a spot, from 0 (black) to 1 (white).

### Picture
- **`PHOTO_PATH`**: the photo loaded on start, from the `private/` folder. That folder is ignored by git, so personal photos never go online. If the file isn't there (as on the website), the sketch uses a generated test image.
- **`AUTO_CONTRAST`**: stretch the photo's brightness so its darkest part becomes black and its brightest becomes white. Many photos are mostly mid-grey, and this makes their features read much better.
- **`CONTRAST_CLIP`**: when stretching, ignore this fraction of the darkest and brightest pixels, so a few stray pixels don't decide the range.

### Seeds
- **`USE_POISSON`**: `true` places the starting seeds with variable-radius Poisson disk sampling: evenly spaced, no overlapping bubbles, already dense in dark areas and spread out in light ones. It places as many as fit. `false` places them at pure random spots.
- **`FILL`**: random start only. The sketch estimates how many seeds the picture can hold (each pixel holds 1 / (2√3 · r²) of a seed, where r is its bubble size, scaled by 0.92 for natural packing) and uses this fraction of that.
- **`MAX_SEEDS`**: a safety limit, so a very dark picture can't create so many seeds that the sketch slows to a crawl.
- **`DOT_RADIUS`**: size of the seed dots in debug mode.

### Personal bubbles
- **`BUBBLE_MIN`**, **`BUBBLE_MAX`**: each seed keeps other seeds out of a circle around it, with a radius from `BUBBLE_MIN` on black up to `BUBBLE_MAX` on white. Two seeds stay at least the sum of their radii apart, so seeds pack tightly (small cells) in dark areas and spread out (big cells) in light ones. Smaller bubbles mean more seeds and finer detail.
- **`SHOW_BUBBLES`**: draw each bubble as a faint circle, for tuning.

### Gas pressure
- **`REPULSION_RANGE`**: seeds gently push on neighbors that are near but not touching, like gas pressure, so they spread out to fill empty space. Two seeds push each other when they're closer than this many times the sum of their bubbles.
- **`REPULSION_STRENGTH`**: the push when two seeds are right on top of each other, in pixels per frame. It fades in a straight line to zero at the edge of the range. Bigger bubbles (light areas) reach farther, so light areas push harder.
- **`DARK_PUSH`**: dark seeds resist being pushed. The push a seed receives is scaled from 1 on white down to this on black, so seeds on thin dark lines stay on them instead of being shoved off by light-area neighbors.

### Collisions and friction
- **`COLLISION_PASSES`**: after moving, seeds whose bubbles overlap are pushed apart until they just touch. Fixing one pair can push a seed into another, so this runs a few passes per frame. More passes untangle crowded spots better but cost more.
- **`DARK_MOBILITY`**: friction in dark areas. After moving and colliding, a seed only goes part of the way to its new spot: all the way on white, this fraction on black. It calms the jitter in dark clusters, where the gradient pulls seeds in and collisions push them back out.

### Settling
- **`SETTLE_START`**, **`SETTLE_FRAMES`**: after `SETTLE_START` frames, friction gradually increases everywhere over `SETTLE_FRAMES` more frames (with a smooth ease) until the seeds stop. The sketch then stops at frame `SETTLE_START + SETTLE_FRAMES`, a clean end point for recordings. At 60 frames per second, 900 frames is 15 seconds. Timing is counted in frames, so a frame-by-frame recording always plays the same.

### Gradient descent
- **`LEARNING_RATE`**: each frame, a seed steps downhill (toward darker areas) by the gradient times this many pixels.
- **`MAX_STEP`**, **`MIN_STEP`**: the downhill step is capped by brightness, from `MAX_STEP` pixels on white down to `MIN_STEP` on black, so seeds slow down as they reach dark areas and steep edges don't fling them.
- **`MOMENTUM`**: each frame a seed keeps this fraction of its last velocity, so it builds speed down long slopes (0 = none; near 1 = slides and overshoots). Its velocity is the distance it actually moved, so speed lost to collisions and friction is lost from its momentum too.
- **`MAX_SPEED`**: speed cap, in pixels per frame.
- **`GRADIENT_SIGMA`**: how much the gradient is blurred (the width of the Gaussian, in pixels). The gradient is computed with a derivative-of-Gaussian kernel, which blurs and takes the slope in one step. Bigger values let seeds sense dark features from farther away (about 3 × sigma) and soften hard edges, but take longer to compute when a picture loads.

### Display
- **`DEBUG_AT_START`**: start in debug mode (gray picture plus seed dots). Space toggles it.
- **`FILL_MODE_AT_START`**: starting cell style. 0 = black lines; 1 = each cell filled with the picture's grey at its seed; 2 = filled with the picture's color (no lines in the fill modes). F cycles through them.
- **`IMAGE_OPACITY`**: how strongly the picture shows in debug mode (0 = hidden, 255 = full).
- **`CELL_LINE_COLOR`**: color of the cell lines.
- **`LINE_TO_BUBBLE`**: cell line thickness as a multiple of `BUBBLE_MIN`, so lines scale with the smallest cells (`CELL_LINE_WEIGHT` is the result in pixels).
- **`BACKGROUND`**, **`BRICK`**: the linen background and the brick red of the seed dots.

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

## License

My code is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/), like the rest of my code in this repo. Images and renders of this piece are all rights reserved.
