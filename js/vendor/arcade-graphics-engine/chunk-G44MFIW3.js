import { createNeonSprite, createPixelBuffer, setPixel, getPixel, neonifySprite } from './chunk-XEPVWY3F.js';

// src/pipeline/image-loader.ts
function pixelBufferFromImage(img) {
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  return {
    width: img.width,
    height: img.height,
    data: new Uint8ClampedArray(imageData.data)
  };
}
function pixelBufferFromImageData(imageData) {
  return {
    width: imageData.width,
    height: imageData.height,
    data: new Uint8ClampedArray(imageData.data)
  };
}
async function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(pixelBufferFromImage(img));
    img.onerror = reject;
    img.src = url;
  });
}
async function convertToArcadeStyle(source, theme, options) {
  let buf;
  if (typeof source === "string") {
    buf = await loadImage(source);
  } else if ("width" in source && "data" in source) {
    buf = source;
  } else {
    buf = pixelBufferFromImage(source);
  }
  if (options?.targetWidth || options?.targetHeight) {
    buf = downscalePixelArt(
      buf,
      options.targetWidth ?? buf.width,
      options.targetHeight ?? buf.height
    );
  }
  return createNeonSprite(buf, theme, options?.colorRole ?? "primary");
}
function downscalePixelArt(src, targetW, targetH) {
  const dst = createPixelBuffer(targetW, targetH);
  const xRatio = src.width / targetW;
  const yRatio = src.height / targetH;
  for (let ty = 0; ty < targetH; ty++) {
    for (let tx = 0; tx < targetW; tx++) {
      const sx0 = Math.floor(tx * xRatio);
      const sy0 = Math.floor(ty * yRatio);
      const sx1 = Math.floor((tx + 1) * xRatio);
      const sy1 = Math.floor((ty + 1) * yRatio);
      const count = Math.max(1, (sx1 - sx0) * (sy1 - sy0));
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const si = (sy * src.width + sx) * 4;
          r += src.data[si];
          g += src.data[si + 1];
          b += src.data[si + 2];
          a += src.data[si + 3];
        }
      }
      setPixel(dst, tx, ty, [
        Math.round(r / count),
        Math.round(g / count),
        Math.round(b / count),
        Math.round(a / count) / 255
      ]);
    }
  }
  return dst;
}
function pixelBufferFromRaw(width, height, data) {
  const buf = createPixelBuffer(width, height);
  for (let i = 0; i < data.length && i < buf.data.length; i++) {
    buf.data[i] = data[i];
  }
  return buf;
}

// src/pipeline/sprite-sheet.ts
function sliceSpriteSheet(sheet, frameWidth, frameHeight) {
  const cols = Math.floor(sheet.width / frameWidth);
  const rows = Math.floor(sheet.height / frameHeight);
  const frames = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const frame = createPixelBuffer(frameWidth, frameHeight);
      for (let y = 0; y < frameHeight; y++) {
        for (let x = 0; x < frameWidth; x++) {
          const sx = col * frameWidth + x;
          const sy = row * frameHeight + y;
          setPixel(frame, x, y, getPixel(sheet, sx, sy));
        }
      }
      frames.push(frame);
    }
  }
  return frames;
}
function assembleSpriteSheet(frames, columns) {
  if (frames.length === 0) throw new Error("No frames to assemble");
  const fw = frames[0].width;
  const fh = frames[0].height;
  const rows = Math.ceil(frames.length / columns);
  const sheet = createPixelBuffer(fw * columns, fh * rows);
  for (let i = 0; i < frames.length; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const frame = frames[i];
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        setPixel(sheet, col * fw + x, row * fh + y, getPixel(frame, x, y));
      }
    }
  }
  return sheet;
}
function neonifySpriteSheet(sheet, frameWidth, frameHeight, neonColor) {
  const frames = sliceSpriteSheet(sheet, frameWidth, frameHeight);
  const neonFrames = frames.map(
    (frame) => neonifySprite(frame, { neonColor })
  );
  return assembleSpriteSheet(neonFrames, Math.floor(sheet.width / frameWidth));
}
function generateManifest(name, frames, frameWidth, frameHeight, animationFps = 12) {
  return {
    name,
    frameWidth,
    frameHeight,
    columns: Math.ceil(Math.sqrt(frames.length)),
    rows: Math.ceil(frames.length / Math.ceil(Math.sqrt(frames.length))),
    frames,
    animationFps
  };
}

export { assembleSpriteSheet, convertToArcadeStyle, downscalePixelArt, generateManifest, loadImage, neonifySpriteSheet, pixelBufferFromImage, pixelBufferFromImageData, pixelBufferFromRaw, sliceSpriteSheet };
//# sourceMappingURL=chunk-G44MFIW3.js.map
//# sourceMappingURL=chunk-G44MFIW3.js.map