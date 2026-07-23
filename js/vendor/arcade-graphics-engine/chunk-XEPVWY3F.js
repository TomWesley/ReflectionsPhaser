import { SPEC } from './chunk-3X3HIQ7A.js';
import { lerpColor, rgbaToHsl, hslToRgba } from './chunk-KKUCTA4T.js';

// src/engine/renderer.ts
function createPixelBuffer(width, height) {
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4)
  };
}
function getPixel(buf, x, y) {
  if (x < 0 || x >= buf.width || y < 0 || y >= buf.height) return [0, 0, 0, 0];
  const i = (y * buf.width + x) * 4;
  return [buf.data[i], buf.data[i + 1], buf.data[i + 2], buf.data[i + 3] / 255];
}
function setPixel(buf, x, y, color) {
  if (x < 0 || x >= buf.width || y < 0 || y >= buf.height) return;
  const i = (y * buf.width + x) * 4;
  buf.data[i] = color[0];
  buf.data[i + 1] = color[1];
  buf.data[i + 2] = color[2];
  buf.data[i + 3] = Math.round(color[3] * 255);
}
function setPixelAdditive(buf, x, y, color) {
  if (x < 0 || x >= buf.width || y < 0 || y >= buf.height) return;
  const i = (y * buf.width + x) * 4;
  const a = color[3];
  buf.data[i] = Math.min(255, buf.data[i] + Math.round(color[0] * a));
  buf.data[i + 1] = Math.min(255, buf.data[i + 1] + Math.round(color[1] * a));
  buf.data[i + 2] = Math.min(255, buf.data[i + 2] + Math.round(color[2] * a));
  buf.data[i + 3] = Math.min(255, buf.data[i + 3] + Math.round(a * 255));
}
function setPixelBlend(buf, x, y, color) {
  if (x < 0 || x >= buf.width || y < 0 || y >= buf.height) return;
  const i = (y * buf.width + x) * 4;
  const sa = color[3];
  const da = buf.data[i + 3] / 255;
  const outA = sa + da * (1 - sa);
  if (outA < 1e-3) return;
  buf.data[i] = Math.round((color[0] * sa + buf.data[i] * da * (1 - sa)) / outA);
  buf.data[i + 1] = Math.round((color[1] * sa + buf.data[i + 1] * da * (1 - sa)) / outA);
  buf.data[i + 2] = Math.round((color[2] * sa + buf.data[i + 2] * da * (1 - sa)) / outA);
  buf.data[i + 3] = Math.round(outA * 255);
}
function clearBuffer(buf, color = [0, 0, 0, 1]) {
  for (let i = 0; i < buf.data.length; i += 4) {
    buf.data[i] = color[0];
    buf.data[i + 1] = color[1];
    buf.data[i + 2] = color[2];
    buf.data[i + 3] = Math.round(color[3] * 255);
  }
}
function copyBuffer(dst, src) {
  dst.data.set(src.data);
}
function gaussianKernel(radius) {
  const size = radius * 2 + 1;
  const kernel = new Float64Array(size);
  const sigma = radius / 3;
  const s2 = 2 * sigma * sigma;
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - radius;
    kernel[i] = Math.exp(-(x * x) / s2);
    sum += kernel[i];
  }
  for (let i = 0; i < size; i++) kernel[i] /= sum;
  return kernel;
}
function gaussianBlur(src, radius) {
  if (radius < 1) {
    const copy = createPixelBuffer(src.width, src.height);
    copy.data.set(src.data);
    return copy;
  }
  const r = Math.round(radius);
  const kernel = gaussianKernel(r);
  const w = src.width, h = src.height;
  const tmp = new Float64Array(w * h * 4);
  const out = new Float64Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rr = 0, gg = 0, bb = 0, aa = 0;
      for (let k = -r; k <= r; k++) {
        const sx = Math.max(0, Math.min(w - 1, x + k));
        const si = (y * w + sx) * 4;
        const weight = kernel[k + r];
        rr += src.data[si] * weight;
        gg += src.data[si + 1] * weight;
        bb += src.data[si + 2] * weight;
        aa += src.data[si + 3] * weight;
      }
      const di = (y * w + x) * 4;
      tmp[di] = rr;
      tmp[di + 1] = gg;
      tmp[di + 2] = bb;
      tmp[di + 3] = aa;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let rr = 0, gg = 0, bb = 0, aa = 0;
      for (let k = -r; k <= r; k++) {
        const sy = Math.max(0, Math.min(h - 1, y + k));
        const si = (sy * w + x) * 4;
        const weight = kernel[k + r];
        rr += tmp[si] * weight;
        gg += tmp[si + 1] * weight;
        bb += tmp[si + 2] * weight;
        aa += tmp[si + 3] * weight;
      }
      const di = (y * w + x) * 4;
      out[di] = rr;
      out[di + 1] = gg;
      out[di + 2] = bb;
      out[di + 3] = aa;
    }
  }
  const dst = createPixelBuffer(w, h);
  for (let i = 0; i < dst.data.length; i++) {
    dst.data[i] = Math.max(0, Math.min(255, Math.round(out[i])));
  }
  return dst;
}
function boxBlur(src, radius) {
  return gaussianBlur(src, radius);
}
function compositeAdditive(dst, src, intensity) {
  for (let i = 0; i < dst.data.length; i += 4) {
    dst.data[i] = Math.min(255, dst.data[i] + Math.round(src.data[i] * intensity));
    dst.data[i + 1] = Math.min(255, dst.data[i + 1] + Math.round(src.data[i + 1] * intensity));
    dst.data[i + 2] = Math.min(255, dst.data[i + 2] + Math.round(src.data[i + 2] * intensity));
    dst.data[i + 3] = Math.min(255, dst.data[i + 3] + Math.round(src.data[i + 3] * intensity));
  }
}
function compositeScreen(dst, src, intensity) {
  for (let i = 0; i < dst.data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const d = dst.data[i + c] / 255;
      const s = src.data[i + c] / 255 * intensity;
      dst.data[i + c] = Math.round(Math.min(1, 1 - (1 - d) * (1 - s)) * 255);
    }
    dst.data[i + 3] = Math.min(255, dst.data[i + 3] + Math.round(src.data[i + 3] * intensity));
  }
}
var DEFAULT_BLOOM = {
  innerRadius: 2,
  innerIntensity: 0.8,
  midRadius: 8,
  midIntensity: 0.4,
  outerRadius: 24,
  outerIntensity: 0.15,
  quality: 2
};
function multiLayerBloom(source, config = DEFAULT_BLOOM) {
  const result = createPixelBuffer(source.width, source.height);
  result.data.set(source.data);
  const brightSource = extractBrightPixels(source, 40);
  let innerGlow = brightSource;
  for (let i = 0; i < config.quality; i++) {
    innerGlow = gaussianBlur(innerGlow, config.innerRadius);
  }
  compositeAdditive(result, innerGlow, config.innerIntensity);
  let midGlow = gaussianBlur(brightSource, config.midRadius);
  for (let i = 1; i < config.quality; i++) {
    midGlow = gaussianBlur(midGlow, config.midRadius * 0.7);
  }
  compositeScreen(result, midGlow, config.midIntensity);
  let outerGlow = gaussianBlur(brightSource, config.outerRadius);
  compositeScreen(result, outerGlow, config.outerIntensity);
  return result;
}
function extractBrightPixels(src, threshold) {
  const dst = createPixelBuffer(src.width, src.height);
  for (let i = 0; i < src.data.length; i += 4) {
    const bright = src.data[i] * 0.299 + src.data[i + 1] * 0.587 + src.data[i + 2] * 0.114;
    if (bright > threshold) {
      dst.data[i] = src.data[i];
      dst.data[i + 1] = src.data[i + 1];
      dst.data[i + 2] = src.data[i + 2];
      dst.data[i + 3] = src.data[i + 3];
    }
  }
  return dst;
}
function generateGlow(source, config) {
  return multiLayerBloom(source, {
    innerRadius: config.innerRadius,
    innerIntensity: config.intensity * 0.8,
    midRadius: (config.innerRadius + config.outerRadius) / 2,
    midIntensity: config.intensity * 0.4,
    outerRadius: config.outerRadius,
    outerIntensity: config.intensity * 0.15,
    quality: config.passes
  });
}
function sobelEdges(src) {
  const dst = createPixelBuffer(src.width, src.height);
  const w = src.width, h = src.height;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const lum = (px, py) => {
        const i2 = (py * w + px) * 4;
        return src.data[i2] * 0.299 + src.data[i2 + 1] * 0.587 + src.data[i2 + 2] * 0.114;
      };
      const gx = -1 * lum(x - 1, y - 1) + 1 * lum(x + 1, y - 1) + -2 * lum(x - 1, y) + 2 * lum(x + 1, y) + -1 * lum(x - 1, y + 1) + 1 * lum(x + 1, y + 1);
      const gy = -1 * lum(x - 1, y - 1) - 2 * lum(x, y - 1) - 1 * lum(x + 1, y - 1) + 1 * lum(x - 1, y + 1) + 2 * lum(x, y + 1) + 1 * lum(x + 1, y + 1);
      const magnitude = Math.min(255, Math.sqrt(gx * gx + gy * gy));
      const i = (y * w + x) * 4;
      dst.data[i] = magnitude;
      dst.data[i + 1] = magnitude;
      dst.data[i + 2] = magnitude;
      dst.data[i + 3] = src.data[i + 3];
    }
  }
  return dst;
}
function distanceField(src, maxDist) {
  const w = src.width, h = src.height;
  const dist = new Float64Array(w * h);
  dist.fill(maxDist);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src.data[i + 3] > 10) {
        dist[y * w + x] = 0;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (x > 0) dist[idx] = Math.min(dist[idx], dist[idx - 1] + 1);
      if (y > 0) dist[idx] = Math.min(dist[idx], dist[(y - 1) * w + x] + 1);
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const idx = y * w + x;
      if (x < w - 1) dist[idx] = Math.min(dist[idx], dist[idx + 1] + 1);
      if (y < h - 1) dist[idx] = Math.min(dist[idx], dist[(y + 1) * w + x] + 1);
    }
  }
  return dist;
}
function nearestNeighborScale(src, scale) {
  const w = Math.round(src.width * scale);
  const h = Math.round(src.height * scale);
  const dst = createPixelBuffer(w, h);
  for (let y = 0; y < h; y++) {
    const sy = Math.floor(y / scale);
    for (let x = 0; x < w; x++) {
      const sx = Math.floor(x / scale);
      const si = (sy * src.width + sx) * 4;
      const di = (y * w + x) * 4;
      dst.data[di] = src.data[si];
      dst.data[di + 1] = src.data[si + 1];
      dst.data[di + 2] = src.data[si + 2];
      dst.data[di + 3] = src.data[si + 3];
    }
  }
  return dst;
}
function bilinearScale(src, newWidth, newHeight) {
  const dst = createPixelBuffer(newWidth, newHeight);
  const xRatio = src.width / newWidth;
  const yRatio = src.height / newHeight;
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = x * xRatio;
      const srcY = y * yRatio;
      const x0 = Math.floor(srcX);
      const y0 = Math.floor(srcY);
      const x1 = Math.min(x0 + 1, src.width - 1);
      const y1 = Math.min(y0 + 1, src.height - 1);
      const fx = srcX - x0;
      const fy = srcY - y0;
      const di = (y * newWidth + x) * 4;
      for (let c = 0; c < 4; c++) {
        const tl = src.data[(y0 * src.width + x0) * 4 + c];
        const tr = src.data[(y0 * src.width + x1) * 4 + c];
        const bl = src.data[(y1 * src.width + x0) * 4 + c];
        const br = src.data[(y1 * src.width + x1) * 4 + c];
        const top = tl + (tr - tl) * fx;
        const bot = bl + (br - bl) * fx;
        dst.data[di + c] = Math.round(top + (bot - top) * fy);
      }
    }
  }
  return dst;
}
function drawLine(buf, x0, y0, x1, y1, color) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    setPixel(buf, x0, y0, color);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
}
function drawRect(buf, x, y, w, h, color, filled = false) {
  if (filled) {
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        setPixel(buf, px, py, color);
      }
    }
  } else {
    drawLine(buf, x, y, x + w - 1, y, color);
    drawLine(buf, x + w - 1, y, x + w - 1, y + h - 1, color);
    drawLine(buf, x + w - 1, y + h - 1, x, y + h - 1, color);
    drawLine(buf, x, y + h - 1, x, y, color);
  }
}
function drawCircle(buf, cx, cy, r, color, filled = false) {
  let x = r, y = 0, err = 1 - r;
  while (x >= y) {
    if (filled) {
      drawLine(buf, cx - x, cy + y, cx + x, cy + y, color);
      drawLine(buf, cx - x, cy - y, cx + x, cy - y, color);
      drawLine(buf, cx - y, cy + x, cx + y, cy + x, color);
      drawLine(buf, cx - y, cy - x, cx + y, cy - x, color);
    } else {
      setPixel(buf, cx + x, cy + y, color);
      setPixel(buf, cx - x, cy + y, color);
      setPixel(buf, cx + x, cy - y, color);
      setPixel(buf, cx - x, cy - y, color);
      setPixel(buf, cx + y, cy + x, color);
      setPixel(buf, cx - y, cy + x, color);
      setPixel(buf, cx + y, cy - x, color);
      setPixel(buf, cx - y, cy - x, color);
    }
    y++;
    if (err < 0) {
      err += 2 * y + 1;
    } else {
      x--;
      err += 2 * (y - x) + 1;
    }
  }
}

// src/engine/analysis.ts
function analyzeImage(src) {
  const w = src.width, h = src.height;
  const pixelCount = w * h;
  const foregroundMask = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const si = i * 4;
    const alpha = src.data[si + 3];
    const rgb = src.data[si] + src.data[si + 1] + src.data[si + 2];
    foregroundMask[i] = alpha > SPEC.ALPHA_EDGE_THRESHOLD && rgb > SPEC.EDGE_THRESHOLD * 3 ? 1 : 0;
  }
  const luminance = new Float64Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const si = i * 4;
    const a = src.data[si + 3] / 255;
    luminance[i] = (src.data[si] * 0.299 + src.data[si + 1] * 0.587 + src.data[si + 2] * 0.114) * a / 255;
  }
  const sobelBuf = sobelEdges(src);
  const edgeStrength = new Float64Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    edgeStrength[i] = sobelBuf.data[i * 4] / 255;
  }
  const edgeMask = createPixelBuffer(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!foregroundMask[idx]) continue;
      let isAlphaEdge = false;
      for (let dy = -1; dy <= 1 && !isAlphaEdge; dy++) {
        for (let dx = -1; dx <= 1 && !isAlphaEdge; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) {
            isAlphaEdge = true;
            continue;
          }
          if (!foregroundMask[ny * w + nx]) isAlphaEdge = true;
        }
      }
      if (isAlphaEdge || edgeStrength[idx] > SPEC.EDGE_THRESHOLD / 255) {
        setPixel(edgeMask, x, y, [255, 255, 255, 1]);
      }
    }
  }
  const rawDist = distanceField(edgeMask, Math.max(w, h));
  const edgeDistance = new Float64Array(pixelCount);
  let maxDistance = 0;
  for (let i = 0; i < pixelCount; i++) {
    edgeDistance[i] = rawDist[i];
    if (foregroundMask[i] && rawDist[i] < 9e3) {
      maxDistance = Math.max(maxDistance, rawDist[i]);
    }
  }
  maxDistance = Math.max(1, maxDistance);
  const zoneMap = new Uint8Array(pixelCount);
  const zoneBounds = SPEC.ZONE_BOUNDARIES;
  for (let i = 0; i < pixelCount; i++) {
    if (!foregroundMask[i]) {
      zoneMap[i] = 255;
      continue;
    }
    const d = edgeDistance[i];
    let zone = SPEC.ZONE_COUNT - 1;
    for (let z = 0; z < SPEC.ZONE_COUNT - 1; z++) {
      if (d <= zoneBounds[z + 1]) {
        zone = z;
        break;
      }
    }
    zoneMap[i] = zone;
  }
  const localContrast = new Float64Array(pixelCount);
  const blurred = gaussianBlur(src, 3);
  for (let i = 0; i < pixelCount; i++) {
    const si = i * 4;
    const origLum = src.data[si] * 0.299 + src.data[si + 1] * 0.587 + src.data[si + 2] * 0.114;
    const blurLum = blurred.data[si] * 0.299 + blurred.data[si + 1] * 0.587 + blurred.data[si + 2] * 0.114;
    localContrast[i] = Math.min(1, Math.abs(origLum - blurLum) / 128);
  }
  return {
    width: w,
    height: h,
    luminance,
    edgeStrength,
    edgeDistance,
    maxDistance,
    foregroundMask,
    zoneMap,
    localContrast
  };
}
function analysisConsistencyScore(a, b) {
  const aZones = new Float64Array(SPEC.ZONE_COUNT);
  const bZones = new Float64Array(SPEC.ZONE_COUNT);
  let aFg = 0, bFg = 0;
  for (let i = 0; i < a.zoneMap.length; i++) {
    if (a.zoneMap[i] < SPEC.ZONE_COUNT) {
      aZones[a.zoneMap[i]]++;
      aFg++;
    }
  }
  for (let i = 0; i < b.zoneMap.length; i++) {
    if (b.zoneMap[i] < SPEC.ZONE_COUNT) {
      bZones[b.zoneMap[i]]++;
      bFg++;
    }
  }
  if (aFg === 0 || bFg === 0) return 0;
  for (let i = 0; i < SPEC.ZONE_COUNT; i++) {
    aZones[i] /= aFg;
    bZones[i] /= bFg;
  }
  let diff = 0;
  for (let i = 0; i < SPEC.ZONE_COUNT; i++) {
    diff += Math.abs(aZones[i] - bZones[i]);
  }
  return Math.max(0, 1 - diff / SPEC.ZONE_COUNT);
}

// src/engine/sprites.ts
var DEFAULT_NEONIFY = {
  neonColor: {
    name: "default",
    core: [255, 0, 255, 1],
    glow: [255, 0, 255, 0.6],
    dim: [80, 0, 80, 1]
  },
  backgroundThreshold: SPEC.EDGE_THRESHOLD,
  glowEdges: true,
  preserveHueVariation: true,
  detailPreservation: 0.6,
  outlineBrightness: SPEC.OUTLINE_BRIGHTNESS,
  interiorBrightness: SPEC.ZONE_BRIGHTNESS[3],
  edgeGlowRadius: SPEC.EDGE_INFLUENCE_RADIUS,
  innerRim: true,
  shadingZones: SPEC.ZONE_COUNT
};
function neonGradient(t, neon, accent) {
  const stops = SPEC.GRADIENT_STOPS;
  if (t < stops[1]) {
    const s = t / stops[1];
    return lerpColor([2, 2, 5, 1], neon.dim, s * 0.3);
  } else if (t < stops[2]) {
    const s = (t - stops[1]) / (stops[2] - stops[1]);
    const dimDarker = [
      Math.round(neon.dim[0] * 0.4),
      Math.round(neon.dim[1] * 0.4),
      Math.round(neon.dim[2] * 0.4),
      1
    ];
    return lerpColor(dimDarker, neon.dim, s);
  } else if (t < stops[3]) {
    const s = (t - stops[2]) / (stops[3] - stops[2]);
    const mid = accent ? lerpColor(neon.dim, accent.dim, 0.3) : neon.dim;
    return lerpColor(neon.dim, mid, s);
  } else if (t < stops[4]) {
    const s = (t - stops[3]) / (stops[4] - stops[3]);
    return lerpColor(neon.dim, neon.core, s);
  } else {
    const s = (t - stops[4]) / (stops[5] - stops[4]);
    const hot = [
      Math.min(255, neon.core[0] + 80),
      Math.min(255, neon.core[1] + 80),
      Math.min(255, neon.core[2] + 80),
      1
    ];
    return lerpColor(neon.core, hot, s);
  }
}
function neonifySprite(src, options) {
  const opts = { ...DEFAULT_NEONIFY, ...options };
  const w = src.width, h = src.height;
  const dst = createPixelBuffer(w, h);
  const neon = opts.neonColor;
  const analysis = opts.analysis ?? analyzeImage(src);
  const zoneBrightness = SPEC.ZONE_BRIGHTNESS;
  const hueVarAmount = SPEC.HUE_VARIATION_AMOUNT;
  const hueVarRange = SPEC.HUE_VARIATION_RANGE;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!analysis.foregroundMask[idx]) continue;
      const original = getPixel(src, x, y);
      const zone = analysis.zoneMap[idx];
      const pixelLum = analysis.luminance[idx];
      const edgeStr = analysis.edgeStrength[idx];
      const localContrast = analysis.localContrast[idx];
      let t = zoneBrightness[Math.min(zone, zoneBrightness.length - 1)];
      t = t * (0.5 + pixelLum * opts.detailPreservation);
      if (edgeStr > 0.15) {
        t = Math.min(1, t + edgeStr * opts.outlineBrightness * 0.5);
      }
      t = Math.min(1, t + localContrast * 0.15);
      t = Math.max(0, Math.min(1, t));
      let color = neonGradient(t, neon, opts.accentColor);
      if (opts.preserveHueVariation && t > hueVarRange[0] && t < hueVarRange[1]) {
        const origHsl = rgbaToHsl(original);
        const neonHsl = rgbaToHsl(color);
        const blendedH = neonHsl[0] + (origHsl[0] - neonHsl[0]) * hueVarAmount;
        const inf = hslToRgba(
          (blendedH + 360) % 360,
          neonHsl[1],
          neonHsl[2],
          color[3]
        );
        color = lerpColor(color, inf, 0.15);
      }
      setPixel(dst, x, y, [color[0], color[1], color[2], original[3]]);
    }
  }
  return dst;
}
function createNeonSprite(src, theme, colorRole = "primary", options) {
  const neonColor = theme.palette[colorRole];
  const accentRoles = {
    primary: "secondary",
    secondary: "tertiary",
    tertiary: "primary",
    danger: "tertiary"
  };
  const accentColor = theme.palette[accentRoles[colorRole]];
  const analysis = analyzeImage(src);
  const neonified = neonifySprite(src, {
    neonColor,
    accentColor,
    analysis,
    ...options
  });
  const bloom = {
    innerRadius: SPEC.BLOOM_INNER_RADIUS,
    innerIntensity: SPEC.BLOOM_INNER_INTENSITY,
    midRadius: SPEC.BLOOM_MID_RADIUS,
    midIntensity: SPEC.BLOOM_MID_INTENSITY,
    outerRadius: SPEC.BLOOM_OUTER_RADIUS,
    outerIntensity: SPEC.BLOOM_OUTER_INTENSITY,
    quality: SPEC.BLOOM_QUALITY
  };
  return multiLayerBloom(neonified, bloom);
}
function spriteFromGrid(grid, neonColor) {
  const height = grid.length;
  const width = grid[0].length / 2;
  const buf = createPixelBuffer(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const hex = grid[y].substring(x * 2, x * 2 + 2);
      if (hex === "00" || hex === ".." || hex === "  ") continue;
      const val = parseInt(hex, 16);
      const t = val / 255;
      const color = neonGradient(t, neonColor);
      setPixel(buf, x, y, color);
    }
  }
  return buf;
}
function recolorSprite(src, fromColor, toColor) {
  const dst = createPixelBuffer(src.width, src.height);
  const fromHsl = rgbaToHsl(fromColor.core);
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const pixel = getPixel(src, x, y);
      if (pixel[3] < 0.01) continue;
      const pixelHsl = rgbaToHsl(pixel);
      const toHsl = rgbaToHsl(toColor.core);
      const hueDiff = toHsl[0] - fromHsl[0];
      const newHue = (pixelHsl[0] + hueDiff + 360) % 360;
      const recolored = hslToRgba(newHue, pixelHsl[1], pixelHsl[2], pixel[3]);
      setPixel(dst, x, y, recolored);
    }
  }
  return dst;
}

export { DEFAULT_BLOOM, analysisConsistencyScore, analyzeImage, bilinearScale, boxBlur, clearBuffer, compositeAdditive, compositeScreen, copyBuffer, createNeonSprite, createPixelBuffer, distanceField, drawCircle, drawLine, drawRect, gaussianBlur, generateGlow, getPixel, multiLayerBloom, nearestNeighborScale, neonGradient, neonifySprite, recolorSprite, setPixel, setPixelAdditive, setPixelBlend, sobelEdges, spriteFromGrid };
//# sourceMappingURL=chunk-XEPVWY3F.js.map
//# sourceMappingURL=chunk-XEPVWY3F.js.map