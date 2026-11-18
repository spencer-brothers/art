# Voronoi Pictures

- Based on: original code, written from scratch.
- Technique (planned): seeds move toward darker parts of a picture by gradient descent on the image's brightness, possibly with a low-pass (smoothed) gradient, so the Voronoi cells are smaller where the picture is darker.

## My changes

- Started the sketch: a `Seed` class (`seed.js`) and 5,000 seeds scattered randomly over the canvas, drawn as 5-pixel dots.
- Added a generated grayscale test image (`test-image.js`): soft dark blobs on a gentle left-to-right gradient, plus an empty square with a thick black outline near the bottom left and an empty equilateral triangle with a thinner outline near the top right, shown in full black and white behind the seeds. It's smooth everywhere, so its brightness always has a slope for the seeds to follow later.
- Computed the image's brightness gradient (`gradient.js`) with central differences, with smooth lookups between pixels (bilinear interpolation). Brick-red arrows show the downhill direction (toward darker areas) on a grid; turn them off with `SHOW_GRADIENT`.
- Seeds now move by gradient descent: each frame, every seed steps downhill on the brightness (toward darker areas) by the gradient times `LEARNING_RATE`, capped so the hard edges of the square and triangle don't fling seeds across the canvas. The cap depends on brightness: up to `MAX_STEP` pixels on white, down to `MIN_STEP` on black, so seeds slow down as they reach dark areas. Seeds are now brick red so they show on both black and white, and the arrows are moss green.

## License

My code is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/), like the rest of my code in this repo. Images and renders of this piece are all rights reserved.
