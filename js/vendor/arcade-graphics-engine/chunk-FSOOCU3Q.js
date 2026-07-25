import { createPixelBuffer, getPixel, setPixel, nearestNeighborScale, gaussianBlur, compositeAdditive, compositeScreen } from './chunk-XEPVWY3F.js';
import { DEFAULT_THEME } from './chunk-AFHV6OK6.js';
import { rgbaToCss, withAlpha, lerpColor } from './chunk-KKUCTA4T.js';

// src/engine/canvas-adapter.ts
var CanvasAdapter = class {
  constructor(canvas, theme = DEFAULT_THEME) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.theme = theme;
    if (theme.pixel.crispScaling) {
      this.ctx.imageSmoothingEnabled = false;
    }
  }
  // Read live from the canvas so a resize doesn't leave stale dimensions
  get width() {
    return this.canvas.width;
  }
  get height() {
    return this.canvas.height;
  }
  clear() {
    const bg = this.theme.palette.background;
    this.ctx.fillStyle = rgbaToCss(bg);
    this.ctx.fillRect(0, 0, this.width, this.height);
    const tint = this.theme.palette.backgroundTint;
    if (tint[3] > 0) {
      this.ctx.fillStyle = rgbaToCss(tint);
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }
  /** Draw a pixel-art scaled rectangle with neon glow */
  drawNeonRect(x, y, w, h, color, options) {
    const ctx = this.ctx;
    const glow = this.theme.glow;
    const intensity = options?.glowOverride ?? glow.intensity;
    ctx.save();
    if (glow.passes > 0 && intensity > 0) {
      ctx.shadowColor = rgbaToCss(withAlpha(color, intensity));
      ctx.shadowBlur = glow.outerRadius;
    }
    ctx.strokeStyle = rgbaToCss(color);
    ctx.lineWidth = this.theme.pixel.outlineThickness;
    if (options?.filled) {
      ctx.fillStyle = rgbaToCss(withAlpha(color, 0.15));
      ctx.fillRect(x, y, w, h);
    }
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }
  /** Draw a neon line with glow */
  drawNeonLine(x0, y0, x1, y1, color, lineWidth = 1) {
    const ctx = this.ctx;
    const glow = this.theme.glow;
    ctx.save();
    ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
    ctx.shadowBlur = glow.outerRadius;
    ctx.strokeStyle = rgbaToCss(color);
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  }
  /** Draw a neon circle/arc with glow */
  drawNeonCircle(cx, cy, r, color, options) {
    const ctx = this.ctx;
    const glow = this.theme.glow;
    const start = options?.startAngle ?? 0;
    const end = options?.endAngle ?? Math.PI * 2;
    ctx.save();
    ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
    ctx.shadowBlur = glow.outerRadius;
    ctx.strokeStyle = rgbaToCss(color);
    ctx.lineWidth = this.theme.pixel.outlineThickness;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, end);
    if (options?.filled) {
      ctx.fillStyle = rgbaToCss(withAlpha(color, 0.1));
      ctx.fill();
    }
    ctx.stroke();
    ctx.restore();
  }
  /** Draw text with neon glow */
  drawNeonText(text, x, y, color, options) {
    const ctx = this.ctx;
    const glow = this.theme.glow;
    const size = options?.fontSize ?? 16;
    const family = options?.fontFamily ?? '"Rajdhani", "Segoe UI", sans-serif';
    ctx.save();
    ctx.font = `${size}px ${family}`;
    ctx.textAlign = options?.align ?? "left";
    ctx.textBaseline = options?.baseline ?? "top";
    for (let pass = glow.passes; pass >= 0; pass--) {
      const blur = glow.innerRadius + (glow.outerRadius - glow.innerRadius) * (pass / glow.passes);
      const alpha = pass === 0 ? 1 : glow.intensity * (1 - pass / (glow.passes + 1));
      ctx.shadowColor = rgbaToCss(withAlpha(color, alpha));
      ctx.shadowBlur = pass === 0 ? 0 : blur;
      ctx.fillStyle = rgbaToCss(pass === 0 ? color : withAlpha(color, alpha));
      ctx.fillText(text, x, y);
    }
    ctx.restore();
  }
  /** Render a PixelBuffer to the canvas */
  drawPixelBuffer(buf, x = 0, y = 0, scale) {
    const cloned = new Uint8ClampedArray(buf.data.length);
    cloned.set(buf.data);
    const imageData = new ImageData(cloned, buf.width, buf.height);
    const s = scale ?? this.theme.pixel.pixelScale;
    if (s === 1) {
      this.ctx.putImageData(imageData, x, y);
    } else {
      const off = new OffscreenCanvas(buf.width, buf.height);
      const offCtx = off.getContext("2d");
      offCtx.putImageData(imageData, 0, 0);
      this.ctx.save();
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(off, x, y, buf.width * s, buf.height * s);
      this.ctx.restore();
    }
  }
  /** Draw a neon polygon (for crystalline terrain) */
  drawNeonPolygon(points, color, filled = false) {
    if (points.length < 2) return;
    const ctx = this.ctx;
    const glow = this.theme.glow;
    ctx.save();
    ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
    ctx.shadowBlur = glow.outerRadius;
    ctx.strokeStyle = rgbaToCss(color);
    ctx.lineWidth = this.theme.pixel.outlineThickness;
    ctx.lineJoin = "miter";
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    if (filled) {
      ctx.fillStyle = rgbaToCss(withAlpha(color, 0.08));
      ctx.fill();
    }
    ctx.stroke();
    ctx.restore();
  }
  /** Apply a full-screen glow/bloom post-process effect */
  applyBloom(intensity) {
    const ctx = this.ctx;
    const bloomIntensity = intensity ?? this.theme.glow.intensity * 0.3;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.filter = `blur(${this.theme.glow.outerRadius}px)`;
    ctx.globalAlpha = bloomIntensity;
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.restore();
  }
};

// src/engine/particles.ts
var ParticleSystem = class {
  constructor(emitter, style) {
    this.emitter = emitter;
    this.particles = [];
    this.accumulator = 0;
    this.style = style ?? {
      shape: "spark",
      size: 2,
      sizeVariance: 0.5,
      glow: true,
      trailLength: 6,
      fadeCurve: "ease-out"
    };
  }
  spawn() {
    const e = this.emitter;
    const angle = e.angle + (Math.random() - 0.5) * e.spread;
    const speed = e.speed * (1 + (Math.random() - 0.5) * e.speedVariance * 2);
    const lifetime = e.lifetime * (1 + (Math.random() - 0.5) * e.lifetimeVariance * 2);
    const sizeVar = 1 + (Math.random() - 0.5) * this.style.sizeVariance * 2;
    return {
      x: e.x,
      y: e.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: lifetime,
      color: [...e.colorStart],
      size: this.style.size * sizeVar,
      trail: []
    };
  }
  update(dt) {
    const e = this.emitter;
    if (e.rate > 0) {
      this.accumulator += dt;
      const spawnInterval = 1 / e.rate;
      while (this.accumulator >= spawnInterval && this.particles.length < e.maxParticles) {
        this.particles.push(this.spawn());
        this.accumulator -= spawnInterval;
      }
      this.accumulator = Math.min(this.accumulator, spawnInterval);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (this.style.trailLength > 0) {
        p.trail.push([p.x, p.y]);
        if (p.trail.length > this.style.trailLength) {
          p.trail.shift();
        }
      }
      p.vy += e.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt / p.maxLife;
      const t = 1 - p.life;
      p.color = lerpColor(e.colorStart, e.colorEnd, t);
      let alpha;
      switch (this.style.fadeCurve) {
        case "ease-out":
          alpha = p.life * p.life;
          break;
        case "ease-in":
          alpha = 1 - (1 - p.life) * (1 - p.life);
          break;
        default:
          alpha = p.life;
      }
      p.color = withAlpha(p.color, alpha);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }
  /** Burst emit a fixed number of particles at once */
  burst(count) {
    for (let i = 0; i < count && this.particles.length < this.emitter.maxParticles; i++) {
      this.particles.push(this.spawn());
    }
  }
};
function createFireEmitter(x, y, color) {
  return {
    x,
    y,
    rate: 30,
    spread: Math.PI * 0.4,
    angle: -Math.PI / 2,
    speed: 80,
    speedVariance: 0.6,
    lifetime: 1.2,
    lifetimeVariance: 0.4,
    gravity: -20,
    colorStart: color,
    colorEnd: withAlpha(color, 0),
    maxParticles: 100
  };
}
function createIceEmitter(x, y, color) {
  return {
    x,
    y,
    rate: 15,
    spread: Math.PI * 0.2,
    angle: Math.PI / 2,
    speed: 120,
    speedVariance: 0.3,
    lifetime: 0.8,
    lifetimeVariance: 0.3,
    gravity: 50,
    colorStart: color,
    colorEnd: withAlpha(color, 0),
    maxParticles: 60
  };
}
function createAmbientEmitter(x, y, color) {
  return {
    x,
    y,
    rate: 5,
    spread: Math.PI * 2,
    angle: 0,
    speed: 15,
    speedVariance: 0.8,
    lifetime: 3,
    lifetimeVariance: 0.5,
    gravity: -5,
    colorStart: withAlpha(color, 0.6),
    colorEnd: withAlpha(color, 0),
    maxParticles: 40
  };
}

// src/engine/pixelart.ts
function generateNeonShades(neon, count = 5) {
  const shades = [];
  for (let i = 0; i < count; i++) {
    const t = count > 1 ? i / (count - 1) : 0.5;
    if (t < 0.1) {
      shades.push([
        Math.round(neon.dim[0] * 0.08),
        Math.round(neon.dim[1] * 0.08),
        Math.round(neon.dim[2] * 0.08),
        1
      ]);
    } else if (t < 0.3) {
      const s = (t - 0.1) / 0.2;
      shades.push([
        Math.round(neon.dim[0] * (0.15 + s * 0.35)),
        Math.round(neon.dim[1] * (0.15 + s * 0.35)),
        Math.round(neon.dim[2] * (0.15 + s * 0.35)),
        1
      ]);
    } else if (t < 0.65) {
      const s = (t - 0.3) / 0.35;
      shades.push(lerpColor(neon.dim, neon.core, s * 0.5));
    } else if (t < 0.9) {
      const s = (t - 0.65) / 0.25;
      shades.push(lerpColor(neon.dim, neon.core, 0.5 + s * 0.5));
    } else {
      shades.push([
        Math.min(255, neon.core[0] + 90),
        Math.min(255, neon.core[1] + 90),
        Math.min(255, neon.core[2] + 90),
        1
      ]);
    }
  }
  return shades;
}
var BAYER_4X4 = [
  [0 / 16, 8 / 16, 2 / 16, 10 / 16],
  [12 / 16, 4 / 16, 14 / 16, 6 / 16],
  [3 / 16, 11 / 16, 1 / 16, 9 / 16],
  [15 / 16, 7 / 16, 13 / 16, 5 / 16]
];
(() => {
  const m = [];
  for (let y = 0; y < 8; y++) {
    m[y] = [];
    for (let x = 0; x < 8; x++) {
      const v4 = BAYER_4X4[y % 4][x % 4];
      const offset = ((y >= 4 ? 1 : 0) * 2 + (x >= 4 ? 1 : 0)) / 4;
      m[y][x] = (v4 + offset) / 4;
    }
  }
  let max = 0;
  for (const row of m) for (const v of row) max = Math.max(max, v);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) m[y][x] /= max;
  return m;
})();
function ditherQuantize(brightness, x, y, levels, ditherStrength = 0.5) {
  const threshold = BAYER_4X4[y % 4][x % 4];
  const adjusted = brightness + (threshold - 0.5) * ditherStrength / levels;
  const index = Math.max(0, Math.min(levels - 1, Math.round(adjusted * (levels - 1))));
  return index;
}
function quantizeToShades(src, shades, ditherStrength = 0.4, backgroundThreshold = 25) {
  const dst = createPixelBuffer(src.width, src.height);
  const n = shades.length;
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const px = getPixel(src, x, y);
      if (px[3] < 0.1) continue;
      const brightness = (px[0] * 0.299 + px[1] * 0.587 + px[2] * 0.114) / 255;
      if (brightness < backgroundThreshold / 255 && px[3] < 0.5) continue;
      const shadeIdx = ditherQuantize(brightness * px[3], x, y, n, ditherStrength);
      const color = shades[shadeIdx];
      setPixel(dst, x, y, [color[0], color[1], color[2], px[3]]);
    }
  }
  return dst;
}
function extractOutline(src, threshold = 10) {
  const dst = createPixelBuffer(src.width, src.height);
  const w = src.width, h = src.height;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src.data[i + 3] < threshold) continue;
      let isEdge = false;
      const neighbors = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      for (const [dx, dy] of neighbors) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) {
          isEdge = true;
          break;
        }
        const ni = (ny * w + nx) * 4;
        if (src.data[ni + 3] < threshold) {
          isEdge = true;
          break;
        }
      }
      if (isEdge) {
        dst.data[i] = 255;
        dst.data[i + 1] = 255;
        dst.data[i + 2] = 255;
        dst.data[i + 3] = 255;
      }
    }
  }
  return dst;
}
function extractInnerLines(src, sensitivity = 50) {
  const dst = createPixelBuffer(src.width, src.height);
  const w = src.width, h = src.height;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      if (src.data[i + 3] < 10) continue;
      const lum = src.data[i] * 0.299 + src.data[i + 1] * 0.587 + src.data[i + 2] * 0.114;
      let maxDiff = 0;
      const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dx, dy] of neighbors) {
        const ni = ((y + dy) * w + (x + dx)) * 4;
        if (src.data[ni + 3] < 10) continue;
        const nLum = src.data[ni] * 0.299 + src.data[ni + 1] * 0.587 + src.data[ni + 2] * 0.114;
        maxDiff = Math.max(maxDiff, Math.abs(lum - nLum));
      }
      if (maxDiff > sensitivity) {
        const strength = Math.min(255, maxDiff);
        dst.data[i] = strength;
        dst.data[i + 1] = strength;
        dst.data[i + 2] = strength;
        dst.data[i + 3] = 255;
      }
    }
  }
  return dst;
}
var DEFAULT_PIPELINE = {
  shadeCount: 5,
  ditherStrength: 0.4,
  displayScale: 4,
  innerLineSensitivity: 50,
  innerLineBrightness: 0.55,
  backgroundThreshold: 25
};
function pixelArtPipeline(source, neonColor, accentColor, options) {
  const opts = { ...DEFAULT_PIPELINE, ...options };
  const shades = generateNeonShades(neonColor, opts.shadeCount);
  const w = source.width, h = source.height;
  const outline = extractOutline(source, opts.backgroundThreshold);
  const innerLines = extractInnerLines(source, opts.innerLineSensitivity);
  const quantized = quantizeToShades(source, shades, opts.ditherStrength, opts.backgroundThreshold);
  const artBuffer = createPixelBuffer(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (source.data[i + 3] < opts.backgroundThreshold) continue;
      const isOutline = outline.data[i] > 128;
      const innerStr = innerLines.data[i] / 255;
      if (isOutline) {
        const core = shades[shades.length - 2];
        artBuffer.data[i] = core[0];
        artBuffer.data[i + 1] = core[1];
        artBuffer.data[i + 2] = core[2];
        artBuffer.data[i + 3] = 255;
      } else if (innerStr > 0.3) {
        const lineShade = Math.max(1, Math.min(
          shades.length - 2,
          Math.round((shades.length - 1) * opts.innerLineBrightness)
        ));
        const c = shades[lineShade];
        artBuffer.data[i] = c[0];
        artBuffer.data[i + 1] = c[1];
        artBuffer.data[i + 2] = c[2];
        artBuffer.data[i + 3] = 255;
      } else {
        artBuffer.data[i] = quantized.data[i];
        artBuffer.data[i + 1] = quantized.data[i + 1];
        artBuffer.data[i + 2] = quantized.data[i + 2];
        artBuffer.data[i + 3] = quantized.data[i + 3];
      }
    }
  }
  const scaled = nearestNeighborScale(artBuffer, opts.displayScale);
  return applyDisplayGlow(scaled);
}
function applyDisplayGlow(src) {
  const result = createPixelBuffer(src.width, src.height);
  result.data.set(src.data);
  const bright = createPixelBuffer(src.width, src.height);
  for (let i = 0; i < src.data.length; i += 4) {
    const lum = src.data[i] * 0.299 + src.data[i + 1] * 0.587 + src.data[i + 2] * 0.114;
    if (lum > 50) {
      bright.data[i] = src.data[i];
      bright.data[i + 1] = src.data[i + 1];
      bright.data[i + 2] = src.data[i + 2];
      bright.data[i + 3] = src.data[i + 3];
    }
  }
  const inner = gaussianBlur(gaussianBlur(bright, 3), 2);
  compositeAdditive(result, inner, 0.5);
  const mid = gaussianBlur(bright, 10);
  compositeScreen(result, mid, 0.25);
  const outer = gaussianBlur(bright, 25);
  compositeScreen(result, outer, 0.08);
  return result;
}
function convertToPixelArt(source, targetWidth, targetHeight, neonColor, accentColor, options) {
  const downscaled = downscaleForPixelArt(source, targetWidth, targetHeight);
  return pixelArtPipeline(downscaled, neonColor, accentColor, options);
}
function downscaleForPixelArt(src, tw, th) {
  const dst = createPixelBuffer(tw, th);
  const xr = src.width / tw, yr = src.height / th;
  for (let ty = 0; ty < th; ty++) {
    for (let tx = 0; tx < tw; tx++) {
      const sx0 = Math.floor(tx * xr), sy0 = Math.floor(ty * yr);
      const sx1 = Math.floor((tx + 1) * xr), sy1 = Math.floor((ty + 1) * yr);
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

// src/engine/canvas-utils.ts
function setupHiDPICanvas(canvas, cssWidth, cssHeight, dpr) {
  const ratio = dpr ?? (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
  const width = cssWidth ?? (canvas.clientWidth || canvas.width);
  const height = cssHeight ?? (canvas.clientHeight || canvas.height);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("setupHiDPICanvas: could not get 2d context");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, dpr: ratio, width, height };
}

// src/engine/motion.ts
var EASE = {
  /** Constant rate — sweeps, conveyor motion */
  linear: (t) => t,
  /** Fast start, gentle arrival — the default for state changes */
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  /** Stronger deceleration — panels sliding in, dialogs appearing */
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  /** Near-instant start, long settle — glow swells, needle arrivals */
  outExpo: (t) => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  /** Symmetric — camera pans, back-and-forth ambient drift */
  inOutQuad: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  /** Symmetric, stronger — screen transitions */
  inOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
};
var MOTION = {
  /** Button/hover/selection state changes */
  state: 180,
  /** Dialogs, toasts, overlays entering */
  overlay: 220,
  /** Screen-to-screen transitions */
  screen: 350,
  /** Radar sweep angular velocity (rad/s) */
  sweepSpeed: 1.1,
  /** Glow pulse frequency (Hz) — matches theme.animation defaults */
  pulseHz: 0.24
};
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function clamp01(t) {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}
function animate(options) {
  const from = options.from ?? 0;
  const to = options.to ?? 1;
  const duration = options.duration ?? MOTION.state;
  const ease = options.ease ?? EASE.outCubic;
  const raf = typeof requestAnimationFrame !== "undefined" ? requestAnimationFrame : (cb) => setTimeout(() => cb(Date.now()), 16);
  let cancelled = false;
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const step = (now) => {
    if (cancelled) return;
    const t = clamp01((now - start) / duration);
    options.onUpdate(lerp(from, to, ease(t)), t);
    if (t < 1) raf(step);
    else options.onDone?.();
  };
  raf(step);
  return () => {
    cancelled = true;
  };
}
function approach(current, target, dtMs, halfLifeMs = 90) {
  const k = Math.pow(0.5, dtMs / halfLifeMs);
  return target + (current - target) * k;
}

export { CanvasAdapter, EASE, MOTION, ParticleSystem, animate, approach, clamp01, convertToPixelArt, createAmbientEmitter, createFireEmitter, createIceEmitter, ditherQuantize, extractInnerLines, extractOutline, generateNeonShades, lerp, pixelArtPipeline, quantizeToShades, setupHiDPICanvas };
//# sourceMappingURL=chunk-FSOOCU3Q.js.map
//# sourceMappingURL=chunk-FSOOCU3Q.js.map