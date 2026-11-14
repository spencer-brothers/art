# Brownian Snowflakes

- Based on: Coding Challenge 127: Brownian Motion Snowflake by Daniel Shiffman (The Coding Train), https://thecodingtrain.com/CodingChallenges/127-brownian-snowflake.html
- My p5.js editor copy: https://editor.p5js.org/sabrothers01/sketches/FFaQ1wwkH

## My changes

- Updated `index.html` to use p5.js 1.11.1 (the original used 0.7.2), and removed the unused `p5.dom` and `p5.sound` add-ons.
- Moved the snowflake's growing and drawing code out of `sketch.js` into a new `Snowflake` class in `snowflake.js`, so the sketch can make more than one snowflake.
- Drew a grid of snowflakes instead of one. The canvas's shorter side fits 6 of them (set by `GRID_COUNT` in `sketch.js`), and the grid keeps going to fill the longer side.
- When a wandering particle touches the snowflake, it now snaps into place next to the particle it hit, at a multiple of 60°, with their centers √3 (about 1.73) particle radii apart, so neighboring particles overlap a little. Every particle sits on a hexagonal (isometric) grid, which gives the snowflakes a fuller, crystal-like look.
- New color palette: a light linen/oat background, with each snowflake drawn in one solid color picked at random from muted sage and moss greens (mid to dark), brick red, and black. Particles are now fully opaque with no outline.
- Gave each palette color a weight so some show up more than others: brick red is now the most common color (30%), each green is 20%, and black is the rarest (10%).
- Made the particle size a fraction of the snowflake's size, so snowflakes keep the same look and amount of detail when the grid has more or fewer of them. The particles' wandering steps scale with their size too.
- Made the snowflakes change across the grid: particles get smaller relative to their snowflake from left to right (`PARTICLE_SCALE_LEFT` and `PARTICLE_SCALE_RIGHT`), and the sideways jiggle of the wandering particles gets smaller from top to bottom (`JITTER_TOP` and `JITTER_BOTTOM`). Snowflakes go from chunky to detailed left to right, and from fuzzy to spiky top to bottom.
- Arranged the snowflakes on an isometric (hexagonal) grid instead of a square one: every other row shifts over by half a space, so each snowflake sits evenly between its neighbors, like a honeycomb.
- Made the grid run past the edges of the canvas, so the snowflakes along the edges are cut off and the pattern looks like it repeats forever. The number of rows now fills the canvas automatically.

## License

My changes are licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/), like the rest of my code in this repo. Images and renders of this piece are all rights reserved.

The original code is from [CodingTrain/website-archive](https://github.com/CodingTrain/website-archive) and is used under the MIT License:

```
MIT License

Copyright (c) 2019 Coding Train

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
