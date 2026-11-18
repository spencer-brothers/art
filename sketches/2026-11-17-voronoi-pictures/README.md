# Voronoi Pictures

- Based on: original code, written from scratch.
- Technique (planned): seeds move toward darker parts of a picture by gradient descent on the image's brightness, possibly with a low-pass (smoothed) gradient, so the Voronoi cells are smaller where the picture is darker.

## My changes

- Started the sketch: a `Seed` class (`seed.js`) and 5,000 seeds scattered randomly over the canvas, drawn as 5-pixel dots.
- Added a generated grayscale test image (`test-image.js`): soft dark blobs on a gentle left-to-right gradient, shown faintly behind the seeds. It's smooth everywhere, so its brightness always has a slope for the seeds to follow later.

## License

My code is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/), like the rest of my code in this repo. Images and renders of this piece are all rights reserved.
