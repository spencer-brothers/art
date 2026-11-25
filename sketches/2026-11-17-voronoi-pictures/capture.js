// Recording the animation: V saves an MP4 video.
// It restarts the current picture and captures one frame at a time, so the
// video plays smoothly however slowly the sketch runs. Files download to the
// browser's download folder (move them into output/).

let recording = false;   // true while a recording is in progress
let stepsPerFrame = 1;   // simulation steps per drawn frame (the simulation is built for 60 per second)

// Set up a recording: normal pixel density (so files aren't 4x bigger on
// Retina screens), restart from the first frame, and keep the animation's
// timing at the recording's frame rate
function startRecording(fps) {
  recording = true;
  pixelDensity(1);
  startPicture(currentPhoto);
  stepsPerFrame = max(1, round(60 / fps));
}

function stopRecording() {
  stepsPerFrame = 1;
  pixelDensity(displayDensity());
  loop();
  recording = false;
}

// A file name with the date and time, like voronoi-2026-11-18-1530
function recordingName() {
  return `voronoi-${year()}-${nf(month(), 2)}-${nf(day(), 2)}-${nf(hour(), 2)}${nf(minute(), 2)}`;
}

// MP4 (H.264), using the browser's built-in video encoder (WebCodecs) and the
// mp4-muxer library to package the frames into an .mp4 file
async function recordMp4() {
  if (recording) return;
  if (!('VideoEncoder' in window)) {
    console.log("This browser can't encode video (no WebCodecs). Try Chrome, Edge, or Safari.");
    return;
  }

  let { seconds, mp4Fps, mp4Bitrate } = SETTINGS.capture;
  startRecording(mp4Fps);
  noLoop();   // frames are drawn one at a time below

  // H.264 needs an even width and height: trim the last pixel if needed
  let w = width - (width % 2), h = height - (height % 2);

  let codec = await findH264Codec(w, h, mp4Fps, mp4Bitrate);
  if (!codec) {
    console.log("This browser can't encode H.264 video at this size.");
    stopRecording();
    return;
  }

  let muxer = new Mp4Muxer.Muxer({
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: { codec: 'avc', width: w, height: h, frameRate: mp4Fps },
    fastStart: 'in-memory',   // puts the index at the start, so the video plays right away
  });
  let encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: e => console.error(e),
  });
  encoder.configure({ codec, width: w, height: h, bitrate: mp4Bitrate, framerate: mp4Fps });

  let total = seconds * mp4Fps;
  let frameLength = 1e6 / mp4Fps;   // in microseconds
  for (let i = 0; i < total; i++) {
    redraw();   // draw the next frame now

    let frame = new VideoFrame(drawingContext.canvas, {
      timestamp: i * frameLength,
      duration: frameLength,
      visibleRect: { x: 0, y: 0, width: w, height: h },
    });
    encoder.encode(frame, { keyFrame: i % (2 * mp4Fps) === 0 });   // a full keyframe every 2 seconds
    frame.close();

    // Let the encoder catch up, and let the page update
    while (encoder.encodeQueueSize > 4) await new Promise(r => setTimeout(r, 1));
    if (i % mp4Fps === 0) {
      console.log(`Recording MP4: ${i / mp4Fps} of ${seconds} seconds`);
      await new Promise(r => setTimeout(r, 0));
    }
  }

  await encoder.flush();
  muxer.finalize();
  downloadFile(new Blob([muxer.target.buffer], { type: 'video/mp4' }), `${recordingName()}.mp4`);
  console.log('MP4 saved');
  stopRecording();
}

// The first H.264 profile this browser can encode at this size
// (High, then Main, then Baseline, all at level 5.2 for big frames)
async function findH264Codec(w, h, fps, bitrate) {
  for (let codec of ['avc1.640034', 'avc1.4d0034', 'avc1.420034']) {
    let { supported } = await VideoEncoder.isConfigSupported({ codec, width: w, height: h, bitrate, framerate: fps });
    if (supported) return codec;
  }
  return null;
}

// Download a Blob as a file
function downloadFile(blob, name) {
  let link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
