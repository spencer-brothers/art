# Brownian Snowflakes

- Based on: Coding Challenge 127: Brownian Motion Snowflake by Daniel Shiffman (The Coding Train), https://thecodingtrain.com/CodingChallenges/127-brownian-snowflake.html
- My p5.js editor copy: https://editor.p5js.org/sabrothers01/sketches/FFaQ1wwkH

## My changes

- Updated `index.html` to use p5.js 1.11.1 (the original used 0.7.2), and removed the unused `p5.dom` and `p5.sound` add-ons.
- Moved the snowflake's growing and drawing code out of `sketch.js` into a new `Snowflake` class in `snowflake.js`, so the sketch can make more than one snowflake.
- Drew a grid of twelve snowflakes (3 rows by 4 columns) instead of one, each centered in its own cell.
- When a wandering particle touches the snowflake, it now snaps into place with its center on the edge of the particle it hit, at a multiple of 60°, so neighboring particles overlap. Every particle sits on a hexagonal (isometric) grid, which gives the snowflakes a fuller, crystal-like look.
- New color palette: a light linen/oat background, with each snowflake drawn in one solid color picked at random from muted sage and moss greens (mid to dark), brick red, and black. Particles are now fully opaque with no outline.

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
