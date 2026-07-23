import { typeCase } from './chunk-U4ADMJHF.js';
import { rgbaToCss, withAlpha, lerpColor } from './chunk-KKUCTA4T.js';

// src/components/gauges.ts
function sane01(v) {
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
}
function drawBarGauge(ctx, theme, opts) {
  const { x, y, width, height } = opts;
  const value = sane01(opts.value);
  const color = opts.color ?? theme.palette.primary.core;
  const glow = theme.glow;
  ctx.save();
  ctx.fillStyle = rgbaToCss(withAlpha(color, 0.05));
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.05));
  ctx.lineWidth = 1;
  for (let hx = x + 6; hx < x + width; hx += 6) {
    ctx.beginPath();
    ctx.moveTo(hx, y + height - 2);
    ctx.lineTo(hx + 3, y + 2);
    ctx.stroke();
  }
  ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity * 0.3));
  ctx.shadowBlur = glow.innerRadius;
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.3));
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.55));
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 2, y - 2);
  ctx.lineTo(x - 2, y + height + 2);
  ctx.moveTo(x + width + 2, y - 2);
  ctx.lineTo(x + width + 2, y + height + 2);
  ctx.stroke();
  const fillWidth = width * value;
  if (fillWidth > 0) {
    ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
    ctx.shadowBlur = glow.outerRadius;
    const grad = ctx.createLinearGradient(x, y, x + fillWidth, y);
    grad.addColorStop(0, rgbaToCss(withAlpha(color, 0.6)));
    grad.addColorStop(0.5, rgbaToCss(color));
    grad.addColorStop(1, rgbaToCss(withAlpha(color, 0.8)));
    ctx.fillStyle = grad;
    ctx.fillRect(x + 1, y + 1, fillWidth - 2, height - 2);
    const sheen = ctx.createLinearGradient(0, y, 0, y + height);
    sheen.addColorStop(0, "rgba(255, 255, 255, 0.22)");
    sheen.addColorStop(0.35, "rgba(255, 255, 255, 0)");
    sheen.addColorStop(1, "rgba(0, 0, 0, 0.18)");
    ctx.fillStyle = sheen;
    ctx.fillRect(x + 1, y + 1, fillWidth - 2, height - 2);
    ctx.shadowBlur = 0;
    const segCount = Math.max(6, Math.round(width / 34));
    const segW = width / segCount;
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    for (let i = 1; i < segCount; i++) {
      const sx = x + i * segW;
      if (sx < x + fillWidth - 2) ctx.fillRect(sx, y + 1, 1.5, height - 2);
    }
    ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
    ctx.shadowBlur = glow.innerRadius;
    ctx.fillStyle = rgbaToCss(lerpColor(color, [255, 255, 255, 1], 0.5));
    ctx.fillRect(x + fillWidth - 2, y + 1, 2, height - 2);
    ctx.shadowBlur = 0;
  }
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.3));
  ctx.lineWidth = 1;
  for (const f of [0.25, 0.5, 0.75]) {
    const tx = x + width * f;
    ctx.beginPath();
    ctx.moveTo(tx, y + height + 1);
    ctx.lineTo(tx, y + height + 4);
    ctx.stroke();
  }
  const textColor = lerpColor(color, [255, 255, 255, 1], 0.7);
  if (opts.label) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 3;
    ctx.fillStyle = rgbaToCss(textColor);
    ctx.font = `${Math.max(8, height * 0.5)}px "Share Tech Mono", "Courier New", monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(opts.label, x + 4, y + height / 2);
  }
  if (opts.showValue) {
    const formatted = opts.valueFormat ? opts.valueFormat(value) : `${Math.round(value * 100)}%`;
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 3;
    ctx.fillStyle = rgbaToCss(textColor);
    ctx.font = `${Math.max(8, height * 0.5)}px "Share Tech Mono", "Courier New", monospace`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(formatted, x + width - 4, y + height / 2);
  }
  ctx.restore();
}
function drawRadialGauge(ctx, theme, opts) {
  const { cx, cy, radius } = opts;
  const value = sane01(opts.value);
  const color = opts.color ?? theme.palette.primary.core;
  const glow = theme.glow;
  const startAngle = opts.startAngle ?? -Math.PI * 0.75;
  const endAngle = opts.endAngle ?? Math.PI * 0.75;
  const thickness = opts.thickness ?? radius * 0.15;
  const totalAngle = endAngle - startAngle;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.1));
  ctx.lineWidth = thickness;
  ctx.lineCap = "round";
  ctx.stroke();
  const valueAngle = startAngle + totalAngle * value;
  ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
  ctx.shadowBlur = glow.outerRadius;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, valueAngle);
  ctx.strokeStyle = rgbaToCss(color);
  ctx.lineWidth = thickness;
  ctx.lineCap = "round";
  ctx.stroke();
  const tickCount = 10;
  for (let i = 0; i <= tickCount; i++) {
    const tickAngle = startAngle + totalAngle * i / tickCount;
    const inner = radius - thickness * 1.2;
    const outer = radius - thickness * 0.3;
    const isActive = i / tickCount <= value;
    const isMajor = i % 5 === 0;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(tickAngle) * inner, cy + Math.sin(tickAngle) * inner);
    ctx.lineTo(cx + Math.cos(tickAngle) * outer, cy + Math.sin(tickAngle) * outer);
    ctx.strokeStyle = rgbaToCss(isActive ? withAlpha(color, 0.8) : withAlpha(color, 0.15));
    ctx.lineWidth = isMajor ? 2 : 1;
    ctx.shadowBlur = isActive ? 4 : 0;
    ctx.stroke();
    if (isMajor) {
      ctx.shadowBlur = 0;
      ctx.font = `${Math.max(7, radius * 0.14)}px "Share Tech Mono", "Courier New", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = rgbaToCss(withAlpha(color, isActive ? 0.6 : 0.25));
      const nr = radius - thickness * 2.1;
      ctx.fillText(String(i * 10), cx + Math.cos(tickAngle) * nr, cy + Math.sin(tickAngle) * nr);
    }
  }
  ctx.beginPath();
  ctx.arc(cx, cy, radius + thickness * 0.75, startAngle + totalAngle * 0.85, endAngle);
  ctx.strokeStyle = rgbaToCss(withAlpha(theme.palette.danger.core, 0.45));
  ctx.lineWidth = 2;
  ctx.stroke();
  const needleAngle = startAngle + totalAngle * value;
  const needleLen = radius * 0.7;
  const nx = cx + Math.cos(needleAngle) * needleLen;
  const ny = cy + Math.sin(needleAngle) * needleLen;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(nx, ny);
  ctx.strokeStyle = rgbaToCss(lerpColor(color, [255, 255, 255, 1], 0.35));
  ctx.lineWidth = 2;
  ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
  ctx.shadowBlur = glow.outerRadius;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(nx, ny, 2, 0, Math.PI * 2);
  ctx.fillStyle = rgbaToCss(lerpColor(color, [255, 255, 255, 1], 0.6));
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = rgbaToCss(color);
  ctx.fill();
  if (opts.label) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 3;
    ctx.fillStyle = rgbaToCss(lerpColor(color, [255, 255, 255, 1], 0.55));
    ctx.font = `${Math.max(10, radius * 0.2)}px "Share Tech Mono", "Courier New", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(opts.label, cx, cy + radius * 0.34);
  }
  if (opts.showValue) {
    const formatted = opts.valueFormat ? opts.valueFormat(value) : `${Math.round(value * 100)}`;
    ctx.font = `${Math.max(14, radius * 0.34)}px "Share Tech Mono", "Courier New", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = rgbaToCss(lerpColor(color, [255, 255, 255, 1], 0.7));
    ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
    ctx.shadowBlur = glow.outerRadius * 0.6;
    ctx.fillText(formatted, cx, cy - radius * 0.12);
  }
  ctx.restore();
}
function drawLineChart(ctx, theme, opts) {
  const { x, y, width, height, data } = opts;
  const color = opts.color ?? theme.palette.secondary.core;
  const glow = theme.glow;
  if (data.length < 2) return;
  ctx.save();
  if (opts.gridLines !== false) {
    ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.06));
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const gy = y + height * i / 4;
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + width, gy);
      ctx.stroke();
    }
    for (let i = 0; i <= 6; i++) {
      const gx = x + width * i / 6;
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + height);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.2));
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
  const step = width / (data.length - 1);
  if (opts.filled !== false) {
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    for (let i = 0; i < data.length; i++) {
      const px = x + i * step;
      const py = y + height - data[i] * height;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
    const grad = ctx.createLinearGradient(x, y, x, y + height);
    grad.addColorStop(0, rgbaToCss(withAlpha(color, 0.15)));
    grad.addColorStop(1, rgbaToCss(withAlpha(color, 0)));
    ctx.fillStyle = grad;
    ctx.fill();
  }
  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const px = x + i * step;
    const py = y + height - data[i] * height;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = rgbaToCss(color);
  ctx.lineWidth = 2;
  ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
  ctx.shadowBlur = glow.outerRadius;
  ctx.stroke();
  ctx.shadowBlur = glow.innerRadius;
  for (let i = 0; i < data.length; i++) {
    const px = x + i * step;
    const py = y + height - data[i] * height;
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fillStyle = rgbaToCss(color);
    ctx.fill();
  }
  if (opts.label) {
    ctx.shadowBlur = 4;
    ctx.fillStyle = rgbaToCss(withAlpha(color, 0.8));
    ctx.font = `${Math.max(8, height * 0.06)}px "Share Tech Mono", "Courier New", monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(opts.label, x + 4, y + 4);
  }
  ctx.restore();
}
function drawRadarDisplay(ctx, theme, opts) {
  const { x, y, size, blips } = opts;
  const color = opts.color ?? theme.palette.secondary.core;
  const glow = theme.glow;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2;
  const rings = opts.rings ?? 3;
  const markings = opts.markings ?? true;
  const TAU = Math.PI * 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.clip();
  const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  bgGrad.addColorStop(0, rgbaToCss(withAlpha(color, 0.05)));
  bgGrad.addColorStop(0.7, rgbaToCss(withAlpha(color, 0.02)));
  bgGrad.addColorStop(1, rgbaToCss(withAlpha(color, 5e-3)));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(x, y, size, size);
  ctx.lineWidth = 1;
  for (let d = 0; d < 360; d += 30) {
    const a = d * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.strokeStyle = rgbaToCss(withAlpha(color, d % 90 === 0 ? 0.09 : 0.04));
    ctx.stroke();
  }
  for (let i = 1; i <= rings; i++) {
    const rr = r * i / rings;
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, TAU);
    ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.12));
    ctx.setLineDash([]);
    ctx.stroke();
    if (i < rings) {
      ctx.beginPath();
      ctx.arc(cx, cy, rr + r / rings * 0.5, 0, TAU);
      ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.05));
      ctx.setLineDash([3, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  if (opts.sweepAngle !== void 0) {
    if (typeof ctx.createConicGradient === "function") {
      const sweepGrad = ctx.createConicGradient(opts.sweepAngle - TAU, cx, cy);
      sweepGrad.addColorStop(0, rgbaToCss(withAlpha(color, 0)));
      sweepGrad.addColorStop(0.55, rgbaToCss(withAlpha(color, 0.015)));
      sweepGrad.addColorStop(0.85, rgbaToCss(withAlpha(color, 0.06)));
      sweepGrad.addColorStop(0.985, rgbaToCss(withAlpha(color, 0.16)));
      sweepGrad.addColorStop(1, rgbaToCss(withAlpha(color, 0.3)));
      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.fill();
    } else {
      for (let i = 0; i < 4; i++) {
        const span = Math.PI * (0.08 + i * 0.09);
        ctx.fillStyle = rgbaToCss(withAlpha(color, 0.16 / (i + 1)));
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, opts.sweepAngle - span, opts.sweepAngle);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(opts.sweepAngle) * r, cy + Math.sin(opts.sweepAngle) * r);
    ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.55));
    ctx.lineWidth = 1.5;
    ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity * 0.6));
    ctx.shadowBlur = glow.outerRadius * 0.6;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  for (const blip of blips) {
    const bx = cx + blip.x * r;
    const by = cy + blip.y * r;
    const bs = blip.size ?? 3;
    let reveal = 1;
    if (opts.sweepAngle !== void 0) {
      const blipAngle = Math.atan2(by - cy, bx - cx);
      const behind = ((opts.sweepAngle - blipAngle) % TAU + TAU) % TAU;
      reveal = Math.max(0.06, 1 - behind / TAU);
    }
    ctx.shadowColor = rgbaToCss(withAlpha(blip.color, glow.intensity * reveal));
    ctx.shadowBlur = glow.outerRadius * reveal;
    ctx.fillStyle = rgbaToCss(withAlpha(blip.color, reveal));
    ctx.beginPath();
    ctx.arc(bx, by, bs, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (reveal > 0.7) {
      const ringT = (1 - reveal) / 0.3;
      ctx.beginPath();
      ctx.arc(bx, by, bs + 3 + ringT * 7, 0, TAU);
      ctx.strokeStyle = rgbaToCss(withAlpha(blip.color, 0.6 * (1 - ringT)));
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.restore();
  if (markings) {
    ctx.save();
    for (let d = 0; d < 360; d += 15) {
      const a = d * Math.PI / 180;
      const major = d % 45 === 0;
      const inner = r + 2;
      const outer = r + (major ? 8 : 4);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
      ctx.strokeStyle = rgbaToCss(withAlpha(color, major ? 0.5 : 0.22));
      ctx.lineWidth = major ? 1.5 : 1;
      ctx.stroke();
    }
    ctx.font = `${Math.max(8, size * 0.035)}px "Share Tech Mono", "Courier New", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = rgbaToCss(withAlpha(color, 0.55));
    const lr = r + Math.max(14, size * 0.05);
    ctx.fillText("000", cx, cy - lr);
    ctx.fillText("090", cx + lr, cy);
    ctx.fillText("180", cx, cy + lr);
    ctx.fillText("270", cx - lr, cy);
    ctx.restore();
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.5));
  ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity * 0.5));
  ctx.shadowBlur = glow.outerRadius;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 3, 0, TAU);
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.12));
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  if (opts.label) {
    ctx.save();
    ctx.shadowColor = rgbaToCss(withAlpha(color, 0.5));
    ctx.shadowBlur = 4;
    ctx.fillStyle = rgbaToCss(withAlpha(color, 0.8));
    ctx.font = `${Math.max(8, size * 0.06)}px "Share Tech Mono", "Courier New", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(opts.label, cx, y - 4);
    ctx.restore();
  }
}
function drawSegmentDisplay(ctx, theme, opts) {
  const { x, y, width, height, value } = opts;
  const color = opts.color ?? theme.palette.tertiary.core;
  const glow = theme.glow;
  ctx.save();
  ctx.fillStyle = rgbaToCss(withAlpha(color, 0.03));
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.2));
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
  const fontSize = Math.max(12, height * 0.5);
  ctx.font = `${fontSize}px "Share Tech Mono", "Courier New", monospace`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
  ctx.shadowBlur = glow.outerRadius;
  ctx.fillStyle = rgbaToCss(color);
  ctx.fillText(value, x + width - 8, y + height / 2);
  if (opts.label) {
    ctx.font = `${Math.max(6, height * 0.2)}px "Share Tech Mono", "Courier New", monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.shadowBlur = 2;
    ctx.fillStyle = rgbaToCss(withAlpha(color, 0.6));
    ctx.fillText(opts.label, x + 4, y + 4);
  }
  ctx.restore();
}

// src/components/panels.ts
function drawPanel(ctx, theme, opts) {
  const { x, y, width, height } = opts;
  const color = opts.color ?? theme.palette.primary.core;
  const glow = theme.glow;
  const cornerStyle = opts.cornerStyle ?? "clipped";
  const cs = opts.cornerSize ?? 12;
  const bgOpacity = opts.bgOpacity ?? 0.04;
  ctx.save();
  ctx.beginPath();
  if (cornerStyle === "clipped") {
    ctx.moveTo(x + cs, y);
    ctx.lineTo(x + width - cs, y);
    ctx.lineTo(x + width, y + cs);
    ctx.lineTo(x + width, y + height - cs);
    ctx.lineTo(x + width - cs, y + height);
    ctx.lineTo(x + cs, y + height);
    ctx.lineTo(x, y + height - cs);
    ctx.lineTo(x, y + cs);
    ctx.closePath();
  } else if (cornerStyle === "rounded") {
    ctx.roundRect(x, y, width, height, cs);
  } else {
    ctx.rect(x, y, width, height);
  }
  ctx.fillStyle = rgbaToCss(withAlpha(color, bgOpacity));
  ctx.fill();
  ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity * 0.5));
  ctx.shadowBlur = glow.outerRadius;
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.5));
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.1));
  ctx.lineWidth = 1;
  if (cornerStyle === "clipped") {
    const inset = 3;
    ctx.beginPath();
    ctx.moveTo(x + cs + inset, y + inset);
    ctx.lineTo(x + width - cs - inset, y + inset);
    ctx.lineTo(x + width - inset, y + cs + inset);
    ctx.lineTo(x + width - inset, y + height - cs - inset);
    ctx.lineTo(x + width - cs - inset, y + height - inset);
    ctx.lineTo(x + cs + inset, y + height - inset);
    ctx.lineTo(x + inset, y + height - cs - inset);
    ctx.lineTo(x + inset, y + cs + inset);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.8));
  ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
  ctx.shadowBlur = glow.innerRadius;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + cs);
  ctx.lineTo(x + cs, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + width - cs, y);
  ctx.lineTo(x + width, y + cs);
  ctx.stroke();
  if (opts.scanLines) {
    ctx.globalAlpha = 0.03;
    for (let sy = y; sy < y + height; sy += 3) {
      ctx.fillStyle = rgbaToCss(color);
      ctx.fillRect(x, sy, width, 1);
    }
    ctx.globalAlpha = 1;
  }
  if (opts.title) {
    const titleHeight = 24;
    ctx.fillStyle = rgbaToCss(withAlpha(color, 0.08));
    ctx.fillRect(x + 1, y + 1, width - 2, titleHeight);
    ctx.beginPath();
    ctx.moveTo(x, y + titleHeight);
    ctx.lineTo(x + width, y + titleHeight);
    ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.3));
    ctx.lineWidth = 1;
    ctx.shadowBlur = 2;
    ctx.stroke();
    ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity));
    ctx.shadowBlur = glow.innerRadius;
    ctx.fillStyle = rgbaToCss(withAlpha(color, 0.9));
    ctx.font = `10px "Share Tech Mono", "Courier New", monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(opts.title.toUpperCase(), x + cs + 4, y + titleHeight / 2);
    ctx.beginPath();
    ctx.arc(x + width - 12, y + titleHeight / 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = rgbaToCss(theme.palette.tertiary.core);
    ctx.shadowColor = rgbaToCss(withAlpha(theme.palette.tertiary.core, 0.8));
    ctx.shadowBlur = 6;
    ctx.fill();
  }
  ctx.restore();
}
function drawDivider(ctx, theme, x, y, width, color) {
  const c = color ?? theme.palette.primary.core;
  ctx.save();
  const grad = ctx.createLinearGradient(x, y, x + width, y);
  grad.addColorStop(0, rgbaToCss(withAlpha(c, 0)));
  grad.addColorStop(0.2, rgbaToCss(withAlpha(c, 0.4)));
  grad.addColorStop(0.5, rgbaToCss(withAlpha(c, 0.6)));
  grad.addColorStop(0.8, rgbaToCss(withAlpha(c, 0.4)));
  grad.addColorStop(1, rgbaToCss(withAlpha(c, 0)));
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1;
  ctx.shadowColor = rgbaToCss(withAlpha(c, theme.glow.intensity * 0.3));
  ctx.shadowBlur = theme.glow.innerRadius;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.stroke();
  ctx.restore();
}
function drawGrid(ctx, theme, x, y, width, height, cellSize = 40, color) {
  const c = color ?? theme.palette.primary.core;
  ctx.save();
  ctx.strokeStyle = rgbaToCss(withAlpha(c, 0.04));
  ctx.lineWidth = 1;
  for (let gx = x; gx <= x + width; gx += cellSize) {
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + height);
    ctx.stroke();
  }
  for (let gy = y; gy <= y + height; gy += cellSize) {
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + width, gy);
    ctx.stroke();
  }
  ctx.restore();
}

// src/components/menu.ts
var LAYOUT = {
  titleFontSize: 28,
  subtitleFontSize: 10,
  itemFontSize: 12,
  footerFontSize: 8,
  itemHeight: 40,
  titleMarginBottom: 20,
  subtitleMarginBottom: 30,
  itemGap: 6,
  cornerClipSize: 8,
  minWidth: 280,
  sideMargin: 60
};
function neonText(ctx, text, x, y, color, fontSize, options) {
  const glow = options?.glow ?? 0.7;
  const font = options?.font ?? '"Orbitron", "Rajdhani", sans-serif';
  ctx.save();
  ctx.font = `${fontSize}px ${font}`;
  ctx.textAlign = options?.align ?? "center";
  ctx.textBaseline = "middle";
  const passes = [
    { blur: 20, alpha: glow * 0.15 },
    { blur: 10, alpha: glow * 0.3 },
    { blur: 4, alpha: glow * 0.5 },
    { blur: 0, alpha: 1 }
  ];
  for (const pass of passes) {
    ctx.shadowColor = rgbaToCss(withAlpha(color, pass.alpha));
    ctx.shadowBlur = pass.blur;
    ctx.fillStyle = rgbaToCss(pass.blur === 0 ? color : withAlpha(color, pass.alpha));
    ctx.fillText(text, x, y);
  }
  ctx.restore();
}
function clippedRect(ctx, x, y, w, h, clip) {
  ctx.beginPath();
  ctx.moveTo(x + clip, y);
  ctx.lineTo(x + w - clip, y);
  ctx.lineTo(x + w, y + clip);
  ctx.lineTo(x + w, y + h - clip);
  ctx.lineTo(x + w - clip, y + h);
  ctx.lineTo(x + clip, y + h);
  ctx.lineTo(x, y + h - clip);
  ctx.lineTo(x, y + clip);
  ctx.closePath();
}
function drawMenuButton(ctx, x, y, w, h, label, color, isSelected, time) {
  const clip = LAYOUT.cornerClipSize;
  const pulse = isSelected ? 0.5 + Math.sin(time * 4) * 0.15 : 0;
  ctx.save();
  clippedRect(ctx, x, y, w, h, clip);
  if (isSelected) {
    const bgAlpha = 0.08 + pulse * 0.04;
    ctx.fillStyle = rgbaToCss(withAlpha(color, bgAlpha));
    ctx.fill();
  }
  clippedRect(ctx, x, y, w, h, clip);
  ctx.shadowColor = rgbaToCss(withAlpha(color, isSelected ? 0.6 + pulse : 0.15));
  ctx.shadowBlur = isSelected ? 12 : 4;
  ctx.strokeStyle = rgbaToCss(withAlpha(color, isSelected ? 0.8 + pulse * 0.2 : 0.2));
  ctx.lineWidth = isSelected ? 1.5 : 0.5;
  ctx.stroke();
  if (isSelected) {
    ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.9));
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(x, y + clip);
    ctx.lineTo(x + clip, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w - clip, y);
    ctx.lineTo(x + w, y + clip);
    ctx.stroke();
    ctx.shadowBlur = 10;
    ctx.fillStyle = rgbaToCss(color);
    ctx.beginPath();
    ctx.moveTo(x + 12, y + h / 2);
    ctx.lineTo(x + 18, y + h / 2 - 4);
    ctx.lineTo(x + 18, y + h / 2 + 4);
    ctx.closePath();
    ctx.fill();
  }
  const textColor = isSelected ? color : withAlpha(color, 0.4);
  const textGlow = isSelected ? 0.8 + pulse * 0.2 : 0.1;
  neonText(ctx, label, x + w / 2, y + h / 2, textColor, LAYOUT.itemFontSize, {
    glow: textGlow
  });
  if (isSelected) {
    ctx.globalAlpha = 0.03;
    for (let sy = y; sy < y + h; sy += 2) {
      ctx.fillStyle = rgbaToCss(color);
      ctx.fillRect(x, sy, w, 1);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
function drawGridBackground(ctx, w, h, color) {
  ctx.save();
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.03));
  ctx.lineWidth = 0.5;
  const cellSize = 30;
  for (let x = 0; x <= w; x += cellSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += cellSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}
function drawVignette(ctx, w, h, strength = 0.4) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}
function drawDecoLines(ctx, w, h, color, y) {
  ctx.save();
  const grad = ctx.createLinearGradient(0, y, w, y);
  grad.addColorStop(0, rgbaToCss(withAlpha(color, 0)));
  grad.addColorStop(0.15, rgbaToCss(withAlpha(color, 0.3)));
  grad.addColorStop(0.5, rgbaToCss(withAlpha(color, 0.5)));
  grad.addColorStop(0.85, rgbaToCss(withAlpha(color, 0.3)));
  grad.addColorStop(1, rgbaToCss(withAlpha(color, 0)));
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1;
  ctx.shadowColor = rgbaToCss(withAlpha(color, 0.3));
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(w, y);
  ctx.stroke();
  const cx = w / 2;
  ctx.fillStyle = rgbaToCss(withAlpha(color, 0.6));
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(cx, y - 4);
  ctx.lineTo(cx + 4, y);
  ctx.lineTo(cx, y + 4);
  ctx.lineTo(cx - 4, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function renderMenu(ctx, config, palette, canvasWidth, canvasHeight) {
  const {
    title,
    subtitle,
    items,
    footer,
    selectedIndex = 0,
    layout = "center",
    decorations = true,
    animated = true,
    time = 0,
    background = "vignette"
  } = config;
  const primary = palette.primary;
  const secondary = palette.secondary;
  const tertiary = palette.tertiary;
  ctx.fillStyle = rgbaToCss(palette.background);
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = rgbaToCss(palette.backgroundTint);
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  if (background === "grid") {
    drawGridBackground(ctx, canvasWidth, canvasHeight, primary.core);
  }
  if (background === "vignette" || background === "grid") {
    drawVignette(ctx, canvasWidth, canvasHeight, 0.5);
  }
  const menuWidth = config.width ?? Math.max(LAYOUT.minWidth, canvasWidth * 0.4);
  let centerX;
  if (layout === "left") centerX = LAYOUT.sideMargin + menuWidth / 2;
  else if (layout === "right") centerX = canvasWidth - LAYOUT.sideMargin - menuWidth / 2;
  else centerX = canvasWidth / 2;
  let curY = canvasHeight * 0.12;
  if (title) {
    neonText(ctx, title, centerX, curY, primary.core, LAYOUT.titleFontSize, { glow: 0.9 });
    curY += LAYOUT.titleFontSize + LAYOUT.titleMarginBottom;
    if (decorations) {
      drawDecoLines(ctx, canvasWidth, canvasHeight, primary.core, curY - LAYOUT.titleMarginBottom / 2);
    }
  }
  if (subtitle) {
    neonText(ctx, subtitle, centerX, curY, withAlpha(secondary.core, 0.6), LAYOUT.subtitleFontSize, { glow: 0.3 });
    curY += LAYOUT.subtitleFontSize + LAYOUT.subtitleMarginBottom;
  }
  const itemX = centerX - menuWidth / 2;
  for (let i = 0; i < items.length; i++) {
    const isSelected = i === selectedIndex;
    const itemColor = isSelected ? primary.core : secondary.core;
    drawMenuButton(
      ctx,
      itemX,
      curY,
      menuWidth,
      LAYOUT.itemHeight,
      items[i],
      itemColor,
      isSelected,
      time
    );
    curY += LAYOUT.itemHeight + LAYOUT.itemGap;
  }
  if (footer) {
    const footerY = canvasHeight - 40;
    const footerPulse = animated ? 0.4 + Math.sin(time * 2) * 0.2 : 0.5;
    neonText(ctx, footer, centerX, footerY, withAlpha(tertiary.core, footerPulse), LAYOUT.footerFontSize, { glow: 0.3 });
  }
  if (decorations) {
    const bracketColor = withAlpha(primary.core, 0.15);
    const bracketSize = 30;
    const margin = 20;
    ctx.save();
    ctx.strokeStyle = rgbaToCss(bracketColor);
    ctx.shadowColor = rgbaToCss(withAlpha(primary.core, 0.1));
    ctx.shadowBlur = 6;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, margin + bracketSize);
    ctx.lineTo(margin, margin);
    ctx.lineTo(margin + bracketSize, margin);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(canvasWidth - margin - bracketSize, margin);
    ctx.lineTo(canvasWidth - margin, margin);
    ctx.lineTo(canvasWidth - margin, margin + bracketSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(margin, canvasHeight - margin - bracketSize);
    ctx.lineTo(margin, canvasHeight - margin);
    ctx.lineTo(margin + bracketSize, canvasHeight - margin);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(canvasWidth - margin - bracketSize, canvasHeight - margin);
    ctx.lineTo(canvasWidth - margin, canvasHeight - margin);
    ctx.lineTo(canvasWidth - margin, canvasHeight - margin - bracketSize);
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.filter = "blur(12px)";
  ctx.globalAlpha = 0.05;
  ctx.drawImage(ctx.canvas, 0, 0);
  ctx.restore();
}

// src/components/effects.ts
function drawAmbientParticles(ctx, w, h, color, time, count = 25, seed = 0) {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const hash = (i * 7919 + seed * 104729) % 1e5;
    const baseX = hash % 1e3 / 1e3;
    const baseY = hash * 3 % 1e3 / 1e3;
    const speed = 0.3 + hash % 100 / 200;
    const size = 0.5 + hash % 50 / 30;
    const phase = hash % 628 / 100;
    const x = ((baseX * w + Math.sin(time * speed + phase) * 20 + time * 3) % w + w) % w;
    const y = ((baseY * h + Math.cos(time * speed * 0.7 + phase) * 15 - time * 2) % h + h) % h;
    const alpha = 0.15 + Math.sin(time * 1.5 + phase) * 0.1;
    ctx.shadowColor = rgbaToCss(withAlpha(color, alpha * 0.8));
    ctx.shadowBlur = size * 4;
    ctx.fillStyle = rgbaToCss(withAlpha(color, alpha));
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function drawScanLines(ctx, w, h, opacity = 0.03, spacing = 2) {
  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
  for (let y = 0; y < h; y += spacing * 2) {
    ctx.fillRect(0, y, w, spacing);
  }
  ctx.restore();
}
function drawDotGrid(ctx, w, h, color, spacing = 16, dotSize = 0.5) {
  ctx.save();
  ctx.fillStyle = rgbaToCss(withAlpha(color, 0.06));
  for (let y = spacing; y < h; y += spacing) {
    for (let x = spacing; x < w; x += spacing) {
      ctx.fillRect(x, y, dotSize, dotSize);
    }
  }
  ctx.restore();
}
function drawAccentBar(ctx, w, y, color, options) {
  const thickness = options?.thickness ?? 1;
  const fadeEdges = options?.fadeEdges ?? true;
  const glow = options?.glow ?? true;
  ctx.save();
  if (fadeEdges) {
    const grad = ctx.createLinearGradient(0, y, w, y);
    grad.addColorStop(0, rgbaToCss(withAlpha(color, 0)));
    grad.addColorStop(0.1, rgbaToCss(withAlpha(color, 0.4)));
    grad.addColorStop(0.5, rgbaToCss(withAlpha(color, 0.6)));
    grad.addColorStop(0.9, rgbaToCss(withAlpha(color, 0.4)));
    grad.addColorStop(1, rgbaToCss(withAlpha(color, 0)));
    ctx.strokeStyle = grad;
  } else {
    ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.4));
  }
  if (glow) {
    ctx.shadowColor = rgbaToCss(withAlpha(color, 0.3));
    ctx.shadowBlur = 6;
  }
  ctx.lineWidth = thickness;
  if (options?.dashPattern) ctx.setLineDash(options.dashPattern);
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(w, y);
  ctx.stroke();
  ctx.restore();
}
function drawCornerFlourish(ctx, w, h, color, options) {
  const margin = options?.margin ?? 20;
  const size = options?.size ?? 30;
  const style = options?.style ?? "ornate";
  ctx.save();
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.2));
  ctx.shadowColor = rgbaToCss(withAlpha(color, 0.15));
  ctx.shadowBlur = 6;
  ctx.lineWidth = 1;
  const corners = [
    { x: margin, y: margin, dx: 1, dy: 1 },
    { x: w - margin, y: margin, dx: -1, dy: 1 },
    { x: margin, y: h - margin, dx: 1, dy: -1 },
    { x: w - margin, y: h - margin, dx: -1, dy: -1 }
  ];
  for (const c of corners) {
    if (style === "bracket" || style === "ornate") {
      ctx.beginPath();
      ctx.moveTo(c.x, c.y + c.dy * size);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(c.x + c.dx * size, c.y);
      ctx.stroke();
    }
    if (style === "ornate") {
      ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.12));
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(c.x + c.dx * 3, c.y + c.dy * 3);
      ctx.lineTo(c.x + c.dx * 10, c.y + c.dy * 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(c.x + c.dx * size * 0.4, c.y);
      ctx.lineTo(c.x + c.dx * size * 0.4, c.y + c.dy * 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(c.x, c.y + c.dy * size * 0.4);
      ctx.lineTo(c.x + c.dx * 4, c.y + c.dy * size * 0.4);
      ctx.stroke();
      ctx.fillStyle = rgbaToCss(withAlpha(color, 0.3));
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(c.x + c.dx * 2, c.y + c.dy * 2, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    if (style === "crosshair") {
      const cs = size * 0.6;
      ctx.beginPath();
      ctx.moveTo(c.x - cs * c.dx * 0.3, c.y);
      ctx.lineTo(c.x + c.dx * cs, c.y);
      ctx.moveTo(c.x, c.y - cs * c.dy * 0.3);
      ctx.lineTo(c.x, c.y + c.dy * cs);
      ctx.stroke();
    }
    ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.2));
    ctx.lineWidth = 1;
  }
  ctx.restore();
}
function drawSideRails(ctx, w, h, color, options) {
  const margin = options?.margin ?? 15;
  const tickSpacing = options?.tickSpacing ?? 20;
  const tickLength = options?.tickLength ?? 4;
  ctx.save();
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.06));
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(margin, 0);
  ctx.lineTo(margin, h);
  ctx.moveTo(w - margin, 0);
  ctx.lineTo(w - margin, h);
  ctx.stroke();
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.08));
  for (let y = tickSpacing; y < h; y += tickSpacing) {
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(margin + tickLength, y);
    ctx.moveTo(w - margin, y);
    ctx.lineTo(w - margin - tickLength, y);
    ctx.stroke();
  }
  ctx.restore();
}
function canvasBloom(ctx, passes) {
  const defaultPasses = [
    { radius: 16, intensity: 0.05 },
    { radius: 6, intensity: 0.06 }
  ];
  for (const pass of passes ?? defaultPasses) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.filter = `blur(${pass.radius}px)`;
    ctx.globalAlpha = pass.intensity;
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.restore();
  }
}

// src/components/icons.ts
var ALIASES = {
  gear: "settings",
  // gear → interconnected node network
  lightning: "energy",
  // lightning → progress arc with bolt
  trophy: "leaderboard"
  // trophy → rank bars
};
function makePen(x, size, color) {
  const k = size / 48;
  const r = Math.round(color[0]), g = Math.round(color[1]), b = Math.round(color[2]);
  const u = (n) => n * k;
  const pc = (a) => `rgba(${r},${g},${b},${a})`;
  const G = (blur, a = 0.5) => {
    x.shadowColor = pc(a);
    x.shadowBlur = blur * k;
  };
  const N = () => {
    x.shadowColor = "transparent";
    x.shadowBlur = 0;
  };
  const bold = (a = 0.85, w = 2) => {
    G(6, 0.35);
    x.strokeStyle = pc(a);
    x.lineWidth = u(w);
    x.lineCap = "round";
    x.lineJoin = "round";
  };
  const solid = (a = 0.7) => {
    x.fillStyle = pc(a);
  };
  const fill = (a = 0.5) => {
    x.fillStyle = pc(a);
  };
  const thin = (a = 0.3, w = 0.8) => {
    N();
    x.strokeStyle = pc(a);
    x.lineWidth = u(w);
    x.lineCap = "round";
  };
  const det = (a = 0.35, w = 1) => {
    N();
    x.strokeStyle = `rgba(15,12,22,${a})`;
    x.lineWidth = u(w);
    x.lineCap = "round";
    x.lineJoin = "round";
  };
  const hi = (a = 0.95, w = 0.7) => {
    N();
    x.strokeStyle = pc(a);
    x.lineWidth = u(w);
    x.lineCap = "round";
  };
  const grad = (x0, y0, x1, y1, stops) => {
    const gr = x.createLinearGradient(x0, y0, x1, y1);
    for (const [t, a] of stops) gr.addColorStop(t, pc(a));
    return gr;
  };
  return { x, u, pc, G, N, bold, solid, fill, thin, det, hi, grad };
}
var ICONS = {
  // ── PLAYBACK ──
  play: (d, cx, cy) => {
    const { x, u, pc, bold, hi, N } = d;
    const g = x.createLinearGradient(cx - u(10), cy - u(14), cx + u(14), cy + u(10));
    g.addColorStop(0, pc(0.55));
    g.addColorStop(0.5, pc(0.2));
    g.addColorStop(1, pc(0.45));
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(cx - u(10), cy - u(14));
    x.lineTo(cx + u(14), cy);
    x.lineTo(cx - u(10), cy + u(14));
    x.closePath();
    x.fill();
    bold(0.9, 2);
    x.stroke();
    N();
    hi(0.65, 0.6);
    x.beginPath();
    x.moveTo(cx - u(8), cy - u(11));
    x.lineTo(cx + u(9), cy);
    x.stroke();
  },
  pause: (d, cx, cy) => {
    const { x, u, pc, bold, hi, N } = d;
    for (const xo of [-u(7), u(3)]) {
      const g = x.createLinearGradient(cx + xo, cy - u(14), cx + xo + u(6), cy + u(14));
      g.addColorStop(0, pc(0.5));
      g.addColorStop(0.4, pc(0.18));
      g.addColorStop(1, pc(0.42));
      x.fillStyle = g;
      x.fillRect(cx + xo, cy - u(14), u(6), u(28));
      bold(0.85, 1.8);
      x.strokeRect(cx + xo, cy - u(14), u(6), u(28));
      N();
      hi(0.55, 0.5);
      x.beginPath();
      x.moveTo(cx + xo + u(1.5), cy - u(12));
      x.lineTo(cx + xo + u(1.5), cy + u(12));
      x.stroke();
    }
  },
  stop: (d, cx, cy) => {
    const { x, u, pc, bold, hi, N } = d;
    const g = x.createLinearGradient(cx - u(13), cy - u(13), cx + u(13), cy + u(13));
    g.addColorStop(0, pc(0.5));
    g.addColorStop(0.4, pc(0.18));
    g.addColorStop(1, pc(0.42));
    x.fillStyle = g;
    x.fillRect(cx - u(13), cy - u(13), u(26), u(26));
    bold(0.85, 1.8);
    x.strokeRect(cx - u(13), cy - u(13), u(26), u(26));
    N();
    hi(0.45, 0.5);
    x.beginPath();
    x.moveTo(cx - u(11), cy - u(13));
    x.lineTo(cx - u(13), cy - u(11));
    x.stroke();
  },
  forward: (d, cx, cy) => {
    const { x, u, pc, solid, G, N } = d;
    solid(0.75);
    x.beginPath();
    x.moveTo(cx - u(16), cy - u(16));
    x.lineTo(cx - u(2), cy);
    x.lineTo(cx - u(16), cy + u(16));
    x.lineTo(cx - u(8), cy + u(16));
    x.lineTo(cx + u(6), cy);
    x.lineTo(cx - u(8), cy - u(16));
    x.closePath();
    x.fill();
    x.beginPath();
    x.moveTo(cx - u(4), cy - u(16));
    x.lineTo(cx + u(10), cy);
    x.lineTo(cx - u(4), cy + u(16));
    x.lineTo(cx + u(4), cy + u(16));
    x.lineTo(cx + u(18), cy);
    x.lineTo(cx + u(4), cy - u(16));
    x.closePath();
    x.fill();
    G(4, 0.2);
    x.strokeStyle = pc(0.85);
    x.lineWidth = u(0.8);
    x.beginPath();
    x.moveTo(cx - u(16), cy - u(16));
    x.lineTo(cx - u(2), cy);
    x.lineTo(cx - u(16), cy + u(16));
    x.lineTo(cx - u(8), cy + u(16));
    x.lineTo(cx + u(6), cy);
    x.lineTo(cx - u(8), cy - u(16));
    x.closePath();
    x.stroke();
    x.beginPath();
    x.moveTo(cx - u(4), cy - u(16));
    x.lineTo(cx + u(10), cy);
    x.lineTo(cx - u(4), cy + u(16));
    x.lineTo(cx + u(4), cy + u(16));
    x.lineTo(cx + u(18), cy);
    x.lineTo(cx + u(4), cy - u(16));
    x.closePath();
    x.stroke();
    N();
  },
  back: (d, cx, cy) => {
    const { x, u, pc, solid, G, N } = d;
    solid(0.75);
    x.beginPath();
    x.moveTo(cx + u(16), cy - u(16));
    x.lineTo(cx + u(2), cy);
    x.lineTo(cx + u(16), cy + u(16));
    x.lineTo(cx + u(8), cy + u(16));
    x.lineTo(cx - u(6), cy);
    x.lineTo(cx + u(8), cy - u(16));
    x.closePath();
    x.fill();
    x.beginPath();
    x.moveTo(cx + u(4), cy - u(16));
    x.lineTo(cx - u(10), cy);
    x.lineTo(cx + u(4), cy + u(16));
    x.lineTo(cx - u(4), cy + u(16));
    x.lineTo(cx - u(18), cy);
    x.lineTo(cx - u(4), cy - u(16));
    x.closePath();
    x.fill();
    G(4, 0.2);
    x.strokeStyle = pc(0.85);
    x.lineWidth = u(0.8);
    x.beginPath();
    x.moveTo(cx + u(16), cy - u(16));
    x.lineTo(cx + u(2), cy);
    x.lineTo(cx + u(16), cy + u(16));
    x.lineTo(cx + u(8), cy + u(16));
    x.lineTo(cx - u(6), cy);
    x.lineTo(cx + u(8), cy - u(16));
    x.closePath();
    x.stroke();
    x.beginPath();
    x.moveTo(cx + u(4), cy - u(16));
    x.lineTo(cx - u(10), cy);
    x.lineTo(cx + u(4), cy + u(16));
    x.lineTo(cx - u(4), cy + u(16));
    x.lineTo(cx - u(18), cy);
    x.lineTo(cx - u(4), cy - u(16));
    x.closePath();
    x.stroke();
    N();
  },
  // ── ARROWS — single solid filled chevrons ──
  "arrow-up": (d, cx, cy) => {
    const { x, u, solid, bold, N } = d;
    solid(0.65);
    x.beginPath();
    x.moveTo(cx - u(16), cy + u(8));
    x.lineTo(cx, cy - u(8));
    x.lineTo(cx + u(16), cy + u(8));
    x.lineTo(cx + u(8), cy + u(8));
    x.lineTo(cx, cy - u(1));
    x.lineTo(cx - u(8), cy + u(8));
    x.closePath();
    x.fill();
    bold(0.8, 1.5);
    x.stroke();
    N();
  },
  "arrow-down": (d, cx, cy) => {
    const { x, u, solid, bold, N } = d;
    solid(0.65);
    x.beginPath();
    x.moveTo(cx - u(16), cy - u(8));
    x.lineTo(cx, cy + u(8));
    x.lineTo(cx + u(16), cy - u(8));
    x.lineTo(cx + u(8), cy - u(8));
    x.lineTo(cx, cy + u(1));
    x.lineTo(cx - u(8), cy - u(8));
    x.closePath();
    x.fill();
    bold(0.8, 1.5);
    x.stroke();
    N();
  },
  "arrow-left": (d, cx, cy) => {
    const { x, u, solid, bold, N } = d;
    solid(0.65);
    x.beginPath();
    x.moveTo(cx + u(8), cy - u(16));
    x.lineTo(cx - u(8), cy);
    x.lineTo(cx + u(8), cy + u(16));
    x.lineTo(cx + u(8), cy + u(8));
    x.lineTo(cx - u(1), cy);
    x.lineTo(cx + u(8), cy - u(8));
    x.closePath();
    x.fill();
    bold(0.8, 1.5);
    x.stroke();
    N();
  },
  "arrow-right": (d, cx, cy) => {
    const { x, u, solid, bold, N } = d;
    solid(0.65);
    x.beginPath();
    x.moveTo(cx - u(8), cy - u(16));
    x.lineTo(cx + u(8), cy);
    x.lineTo(cx - u(8), cy + u(16));
    x.lineTo(cx - u(8), cy + u(8));
    x.lineTo(cx + u(1), cy);
    x.lineTo(cx - u(8), cy - u(8));
    x.closePath();
    x.fill();
    bold(0.8, 1.5);
    x.stroke();
    N();
  },
  // ── UI / SYSTEM ──
  fullscreen: (d, cx, cy) => {
    const { x, u, bold, N } = d;
    bold(0.8, 2.5);
    const s = u(14), g = u(5);
    for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      x.beginPath();
      x.moveTo(cx + dx * g, cy + dy * s);
      x.lineTo(cx + dx * s, cy + dy * s);
      x.lineTo(cx + dx * s, cy + dy * g);
      x.stroke();
    }
    N();
  },
  info: (d, cx, cy) => {
    const { x, u, bold, solid, N } = d;
    bold(0.45, 1.5);
    x.beginPath();
    x.arc(cx, cy, u(18), 0, Math.PI * 2);
    x.stroke();
    N();
    solid(0.92);
    x.fillRect(cx - u(2.5), cy - u(9), u(5), u(3.4));
    bold(0.92, 2.5);
    x.beginPath();
    x.moveTo(cx, cy - u(1));
    x.lineTo(cx, cy + u(10));
    x.stroke();
    x.beginPath();
    x.moveTo(cx - u(4), cy + u(10));
    x.lineTo(cx + u(4), cy + u(10));
    x.stroke();
    N();
  },
  warning: (d, cx, cy) => {
    const { x, u, bold, fill, N } = d;
    fill(0.15);
    x.beginPath();
    x.moveTo(cx, cy - u(18));
    x.lineTo(cx + u(18), cy + u(14));
    x.lineTo(cx - u(18), cy + u(14));
    x.closePath();
    x.fill();
    bold(0.85, 2.2);
    x.stroke();
    N();
    fill(0.8);
    x.beginPath();
    x.arc(cx, cy + u(7), u(2.5), 0, Math.PI * 2);
    x.fill();
    bold(0.8, 2.5);
    x.beginPath();
    x.moveTo(cx, cy - u(6));
    x.lineTo(cx, cy + u(2));
    x.stroke();
    N();
  },
  error: (d, cx, cy) => {
    const { x, u, bold, fill, N } = d;
    fill(0.12);
    x.beginPath();
    x.arc(cx, cy, u(18), 0, Math.PI * 2);
    x.fill();
    bold(0.55, 1.5);
    x.stroke();
    bold(0.85, 2.5);
    x.beginPath();
    x.moveTo(cx - u(9), cy - u(9));
    x.lineTo(cx + u(9), cy + u(9));
    x.moveTo(cx + u(9), cy - u(9));
    x.lineTo(cx - u(9), cy + u(9));
    x.stroke();
    N();
  },
  search: (d, cx, cy) => {
    const { x, u, bold, thin, fill, pc, G, N, grad } = d;
    const lx = cx - u(4), ly = cy - u(4);
    x.fillStyle = grad(lx - u(10), ly - u(10), lx + u(10), ly + u(10), [[0, 0.3], [0.5, 0.08], [1, 0.25]]);
    x.beginPath();
    x.arc(lx, ly, u(10.5), 0, Math.PI * 2);
    x.fill();
    bold(0.85, 2);
    x.beginPath();
    x.arc(lx, ly, u(10.5), 0, Math.PI * 2);
    x.stroke();
    N();
    thin(0.5, 1);
    x.beginPath();
    x.moveTo(lx, ly - u(8));
    x.lineTo(lx, ly - u(4.5));
    x.stroke();
    x.beginPath();
    x.moveTo(lx, ly + u(4.5));
    x.lineTo(lx, ly + u(8));
    x.stroke();
    x.beginPath();
    x.moveTo(lx - u(8), ly);
    x.lineTo(lx - u(4.5), ly);
    x.stroke();
    x.beginPath();
    x.moveTo(lx + u(4.5), ly);
    x.lineTo(lx + u(8), ly);
    x.stroke();
    x.strokeStyle = pc(0.75);
    x.lineWidth = u(1);
    x.shadowColor = pc(0.4);
    x.shadowBlur = u(4);
    x.beginPath();
    x.moveTo(lx - u(9), ly - u(2.5));
    x.lineTo(lx + u(9), ly - u(2.5));
    x.stroke();
    N();
    G(5, 0.65);
    fill(0.95);
    x.beginPath();
    x.arc(lx + u(2.5), ly + u(2.5), u(1.8), 0, Math.PI * 2);
    x.fill();
    N();
    bold(0.85, 2.6);
    x.beginPath();
    x.moveTo(lx + Math.cos(Math.PI / 4) * u(10.5), ly + Math.sin(Math.PI / 4) * u(10.5));
    x.lineTo(cx + u(14), cy + u(14));
    x.stroke();
    N();
    bold(0.7, 2.2);
    x.beginPath();
    x.moveTo(cx + u(11.8), cy + u(16.2));
    x.lineTo(cx + u(16.2), cy + u(11.8));
    x.stroke();
    N();
  },
  settings: (d, cx, cy) => {
    const { x, u, bold, thin, G, N, grad } = d;
    const rails = [
      { ry: -9, hx: -5, bright: false },
      { ry: 0, hx: 7, bright: true },
      { ry: 9, hx: -1, bright: false }
    ];
    for (const { ry, hx, bright } of rails) {
      thin(0.4, 1.4);
      x.beginPath();
      x.moveTo(cx - u(16), cy + u(ry));
      x.lineTo(cx + u(16), cy + u(ry));
      x.stroke();
      thin(0.55, 1.2);
      x.beginPath();
      x.moveTo(cx - u(16), cy + u(ry - 2));
      x.lineTo(cx - u(16), cy + u(ry + 2));
      x.stroke();
      x.beginPath();
      x.moveTo(cx + u(16), cy + u(ry - 2));
      x.lineTo(cx + u(16), cy + u(ry + 2));
      x.stroke();
      thin(0.8, 1.8);
      x.beginPath();
      x.moveTo(cx - u(16), cy + u(ry));
      x.lineTo(cx + u(hx), cy + u(ry));
      x.stroke();
      x.fillStyle = grad(cx + u(hx), cy + u(ry - 5), cx + u(hx), cy + u(ry + 5), [[0, 0.85], [1, 0.4]]);
      x.beginPath();
      x.moveTo(cx + u(hx - 2.6), cy + u(ry - 4));
      x.lineTo(cx + u(hx + 2.6), cy + u(ry - 4));
      x.lineTo(cx + u(hx + 2.6), cy + u(ry + 4));
      x.lineTo(cx + u(hx - 2.6), cy + u(ry + 4));
      x.closePath();
      if (bright) {
        G(6, 0.6);
      }
      x.fill();
      bold(bright ? 0.95 : 0.6, 1.2);
      x.stroke();
      N();
    }
  },
  refresh: (d, cx, cy) => {
    const { x, u, bold, fill, thin, G, N } = d;
    bold(0.85, 2.2);
    x.beginPath();
    x.arc(cx, cy, u(13), -Math.PI * 0.85, -Math.PI * 0.15);
    x.stroke();
    N();
    bold(0.85, 2.2);
    x.beginPath();
    x.arc(cx, cy, u(13), Math.PI * 0.15, Math.PI * 0.85);
    x.stroke();
    N();
    const head = (ang, rot) => {
      const hx = cx + Math.cos(ang) * u(13), hy = cy + Math.sin(ang) * u(13);
      x.save();
      x.translate(hx, hy);
      x.rotate(rot);
      x.beginPath();
      x.moveTo(0, -u(4.5));
      x.lineTo(u(3.6), u(1.5));
      x.lineTo(-u(3.6), u(1.5));
      x.closePath();
      x.fill();
      x.restore();
    };
    G(5, 0.5);
    fill(0.9);
    head(-Math.PI * 0.15, Math.PI * 0.42);
    head(Math.PI * 0.85, Math.PI * 1.42);
    N();
    thin(0.3, 1);
    x.beginPath();
    x.arc(cx, cy, u(8), 0, Math.PI * 2);
    x.stroke();
    G(5, 0.6);
    fill(0.95);
    x.beginPath();
    x.arc(cx, cy, u(2), 0, Math.PI * 2);
    x.fill();
    N();
  },
  plus: (d, cx, cy) => {
    const { x, u, bold, thin, N } = d;
    bold(0.85, 3);
    x.beginPath();
    x.moveTo(cx, cy - u(14));
    x.lineTo(cx, cy + u(14));
    x.moveTo(cx - u(14), cy);
    x.lineTo(cx + u(14), cy);
    x.stroke();
    N();
    thin(0.25, 1);
    x.beginPath();
    x.arc(cx, cy, u(20), 0, Math.PI * 2);
    x.stroke();
  },
  minus: (d, cx, cy) => {
    const { x, u, bold, thin, N } = d;
    bold(0.85, 3);
    x.beginPath();
    x.moveTo(cx - u(14), cy);
    x.lineTo(cx + u(14), cy);
    x.stroke();
    N();
    thin(0.25, 1);
    x.beginPath();
    x.arc(cx, cy, u(20), 0, Math.PI * 2);
    x.stroke();
  },
  download: (d, cx, cy) => {
    const { x, u, bold, N } = d;
    bold(0.45, 1.5);
    x.beginPath();
    x.moveTo(cx - u(16), cy + u(8));
    x.lineTo(cx - u(16), cy + u(16));
    x.lineTo(cx + u(16), cy + u(16));
    x.lineTo(cx + u(16), cy + u(8));
    x.stroke();
    N();
    bold(0.85, 2.5);
    x.beginPath();
    x.moveTo(cx, cy - u(14));
    x.lineTo(cx, cy + u(6));
    x.stroke();
    x.beginPath();
    x.moveTo(cx - u(7), cy + u(1));
    x.lineTo(cx, cy + u(8));
    x.lineTo(cx + u(7), cy + u(1));
    x.stroke();
    N();
  },
  upload: (d, cx, cy) => {
    const { x, u, bold, N } = d;
    bold(0.45, 1.5);
    x.beginPath();
    x.moveTo(cx - u(16), cy + u(8));
    x.lineTo(cx - u(16), cy + u(16));
    x.lineTo(cx + u(16), cy + u(16));
    x.lineTo(cx + u(16), cy + u(8));
    x.stroke();
    N();
    bold(0.85, 2.5);
    x.beginPath();
    x.moveTo(cx, cy + u(8));
    x.lineTo(cx, cy - u(10));
    x.stroke();
    x.beginPath();
    x.moveTo(cx - u(7), cy - u(4));
    x.lineTo(cx, cy - u(12));
    x.lineTo(cx + u(7), cy - u(4));
    x.stroke();
    N();
  },
  // ── GAME SYSTEMS ──
  quest: (d, cx, cy) => {
    const { x, u, bold, fill, N } = d;
    bold(0.45, 1.5);
    x.beginPath();
    x.arc(cx, cy, u(18), 0, Math.PI * 2);
    x.stroke();
    N();
    fill(0.75);
    x.font = `bold ${u(26)}px 'Orbitron', sans-serif`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText("!", cx, cy + u(1));
  },
  energy: (d, cx, cy) => {
    const { x, u, bold, fill, thin, G, N } = d;
    thin(0.2, 1.5);
    x.beginPath();
    x.arc(cx, cy, u(18), 0, Math.PI * 2);
    x.stroke();
    bold(0.85, 3);
    x.beginPath();
    x.arc(cx, cy, u(18), -Math.PI / 2, -Math.PI / 2 + Math.PI * 1.4);
    x.stroke();
    N();
    const ea = -Math.PI / 2 + Math.PI * 1.4;
    G(6, 0.6);
    fill(0.8);
    x.beginPath();
    x.arc(cx + Math.cos(ea) * u(18), cy + Math.sin(ea) * u(18), u(3), 0, Math.PI * 2);
    x.fill();
    N();
    fill(0.3);
    x.beginPath();
    x.moveTo(cx + u(2), cy - u(6));
    x.lineTo(cx - u(2), cy + u(1));
    x.lineTo(cx + u(1), cy + u(1));
    x.lineTo(cx - u(2), cy + u(6));
    x.lineTo(cx + u(2), cy - u(1));
    x.lineTo(cx - u(1), cy - u(1));
    x.closePath();
    x.fill();
    bold(0.5, 0.8);
    x.stroke();
    N();
  },
  target: (d, cx, cy) => {
    const { x, u, bold, fill, thin, G, N } = d;
    bold(0.75, 2);
    x.beginPath();
    x.moveTo(cx - u(10), cy - u(20));
    x.lineTo(cx, cy - u(14));
    x.lineTo(cx + u(10), cy - u(20));
    x.stroke();
    x.beginPath();
    x.moveTo(cx - u(10), cy + u(20));
    x.lineTo(cx, cy + u(14));
    x.lineTo(cx + u(10), cy + u(20));
    x.stroke();
    x.beginPath();
    x.moveTo(cx - u(20), cy - u(10));
    x.lineTo(cx - u(14), cy);
    x.lineTo(cx - u(20), cy + u(10));
    x.stroke();
    x.beginPath();
    x.moveTo(cx + u(20), cy - u(10));
    x.lineTo(cx + u(14), cy);
    x.lineTo(cx + u(20), cy + u(10));
    x.stroke();
    N();
    bold(0.55, 1.5);
    x.beginPath();
    x.moveTo(cx, cy - u(8));
    x.lineTo(cx + u(8), cy);
    x.lineTo(cx, cy + u(8));
    x.lineTo(cx - u(8), cy);
    x.closePath();
    x.stroke();
    N();
    G(6, 0.6);
    fill(0.85);
    x.beginPath();
    x.arc(cx, cy, u(2.5), 0, Math.PI * 2);
    x.fill();
    N();
    thin(0.3, 0.8);
    x.beginPath();
    x.moveTo(cx - u(3), cy - u(11));
    x.lineTo(cx + u(3), cy - u(11));
    x.stroke();
    x.beginPath();
    x.moveTo(cx - u(3), cy + u(11));
    x.lineTo(cx + u(3), cy + u(11));
    x.stroke();
    x.beginPath();
    x.moveTo(cx - u(11), cy - u(3));
    x.lineTo(cx - u(11), cy + u(3));
    x.stroke();
    x.beginPath();
    x.moveTo(cx + u(11), cy - u(3));
    x.lineTo(cx + u(11), cy + u(3));
    x.stroke();
  },
  inventory: (d, cx, cy) => {
    const { x, u, bold, det, fill, thin, G, N, grad } = d;
    x.fillStyle = grad(cx - u(15), cy - u(15), cx + u(15), cy + u(15), [[0, 0.28], [0.5, 0.08], [1, 0.24]]);
    x.fillRect(cx - u(15), cy - u(15), u(30), u(30));
    bold(0.8, 1.7);
    x.strokeRect(cx - u(15), cy - u(15), u(30), u(30));
    N();
    det(0.5, 1.1);
    for (const o of [-5, 5]) {
      x.beginPath();
      x.moveTo(cx + u(o), cy - u(15));
      x.lineTo(cx + u(o), cy + u(15));
      x.stroke();
      x.beginPath();
      x.moveTo(cx - u(15), cy + u(o));
      x.lineTo(cx + u(15), cy + u(o));
      x.stroke();
    }
    fill(0.55);
    x.fillRect(cx - u(14), cy - u(14), u(8), u(8));
    fill(0.4);
    x.fillRect(cx - u(4), cy - u(14), u(8), u(8));
    fill(0.3);
    x.fillRect(cx - u(14), cy - u(4), u(8), u(8));
    fill(0.45);
    x.fillRect(cx + u(6), cy + u(6), u(8), u(8));
    G(6, 0.65);
    fill(0.95);
    x.beginPath();
    x.arc(cx + u(10), cy, u(2.2), 0, Math.PI * 2);
    x.fill();
    N();
    thin(0.65, 1.5);
    const B = 15, L = 5;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      x.beginPath();
      x.moveTo(cx + sx * u(B + 3), cy + sy * u(B + 3 - L));
      x.lineTo(cx + sx * u(B + 3), cy + sy * u(B + 3));
      x.lineTo(cx + sx * u(B + 3 - L), cy + sy * u(B + 3));
      x.stroke();
    }
  },
  craft: (d, cx, cy) => {
    const { x, u, bold, fill, thin, G, N } = d;
    thin(0.25, 0.8);
    x.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 - Math.PI / 2, r = u(20);
      if (i === 0) x.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      else x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    x.closePath();
    x.stroke();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 - Math.PI / 2;
      thin(0.15, 0.5);
      x.beginPath();
      x.moveTo(cx, cy);
      x.lineTo(cx + Math.cos(a) * u(18), cy + Math.sin(a) * u(18));
      x.stroke();
    }
    bold(0.65, 1.5);
    x.beginPath();
    x.arc(cx, cy, u(8), 0, Math.PI * 2);
    x.stroke();
    N();
    G(5, 0.4);
    fill(0.7);
    x.beginPath();
    x.arc(cx, cy, u(3), 0, Math.PI * 2);
    x.fill();
    N();
    fill(0.5);
    for (let i = 0; i < 6; i += 2) {
      const a = i / 6 * Math.PI * 2 - Math.PI / 2;
      x.beginPath();
      x.arc(cx + Math.cos(a) * u(18), cy + Math.sin(a) * u(18), u(2), 0, Math.PI * 2);
      x.fill();
    }
  },
  diamond: (d, cx, cy) => {
    const { x, u, bold, thin, det, fill, hi, G, N, grad } = d;
    thin(0.3, 1.3);
    x.beginPath();
    x.ellipse(cx, cy, u(17.5), u(5.5), 0, Math.PI, Math.PI * 2);
    x.stroke();
    x.fillStyle = grad(cx - u(11), cy - u(13), cx + u(11), cy + u(13), [[0, 0.7], [0.5, 0.3], [1, 0.6]]);
    x.beginPath();
    x.moveTo(cx, cy - u(13));
    x.lineTo(cx + u(11), cy);
    x.lineTo(cx, cy + u(13));
    x.lineTo(cx - u(11), cy);
    x.closePath();
    x.fill();
    bold(0.85, 1.7);
    x.stroke();
    N();
    det(0.55, 1.1);
    x.beginPath();
    x.moveTo(cx - u(5.5), cy - u(6.5));
    x.lineTo(cx + u(5.5), cy + u(6.5));
    x.stroke();
    x.beginPath();
    x.moveTo(cx + u(5.5), cy - u(6.5));
    x.lineTo(cx - u(5.5), cy + u(6.5));
    x.stroke();
    thin(0.7, 1.4);
    x.beginPath();
    x.ellipse(cx, cy, u(17.5), u(5.5), 0, 0, Math.PI);
    x.stroke();
    G(6, 0.7);
    fill(0.95);
    x.beginPath();
    x.arc(cx + u(15.5), cy + u(2.8), u(1.9), 0, Math.PI * 2);
    x.fill();
    N();
    hi(0.85, 1);
    x.beginPath();
    x.moveTo(cx - u(2.2), cy - u(9.5));
    x.lineTo(cx + u(0.5), cy - u(9.5));
    x.stroke();
  },
  star: (d, cx, cy) => {
    const { x, u, bold, thin, fill, G, N, grad } = d;
    const starPath = (long, short) => {
      x.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = Math.PI / 4 * i - Math.PI / 2;
        const r = i % 2 === 0 ? long : short;
        const px = cx + Math.cos(a) * u(r), py = cy + Math.sin(a) * u(r);
        i === 0 ? x.moveTo(px, py) : x.lineTo(px, py);
      }
      x.closePath();
    };
    x.fillStyle = grad(cx - u(17), cy - u(17), cx + u(17), cy + u(17), [[0, 0.6], [0.5, 0.22], [1, 0.5]]);
    starPath(18, 5.5);
    x.fill();
    bold(0.85, 1.6);
    starPath(18, 5.5);
    x.stroke();
    N();
    thin(0.45, 1);
    x.beginPath();
    x.moveTo(cx, cy - u(12));
    x.lineTo(cx, cy + u(12));
    x.stroke();
    x.beginPath();
    x.moveTo(cx - u(12), cy);
    x.lineTo(cx + u(12), cy);
    x.stroke();
    thin(0.3, 0.9);
    x.beginPath();
    x.arc(cx, cy, u(10), 0, Math.PI * 2);
    x.stroke();
  },
  heart: (d, cx, cy) => {
    const { x, u, pc, thin, G, N } = d;
    thin(0.25, 1);
    x.beginPath();
    x.moveTo(cx - u(24), cy + u(2));
    x.lineTo(cx + u(24), cy + u(2));
    x.stroke();
    G(6, 0.35);
    x.strokeStyle = pc(0.9);
    x.lineWidth = u(2.5);
    x.lineJoin = "miter";
    x.lineCap = "square";
    x.beginPath();
    x.moveTo(cx - u(24), cy + u(2));
    x.lineTo(cx - u(16), cy + u(2));
    x.lineTo(cx - u(13), cy - u(4));
    x.lineTo(cx - u(10), cy + u(6));
    x.lineTo(cx - u(6), cy - u(6));
    x.lineTo(cx - u(3), cy - u(18));
    x.lineTo(cx + u(1), cy + u(12));
    x.lineTo(cx + u(4), cy - u(10));
    x.lineTo(cx + u(7), cy + u(2));
    x.lineTo(cx + u(10), cy - u(3));
    x.lineTo(cx + u(13), cy + u(2));
    x.lineTo(cx + u(24), cy + u(2));
    x.stroke();
    N();
    thin(0.35, 0.8);
    x.beginPath();
    x.moveTo(cx + u(14), cy + u(10));
    x.lineTo(cx + u(22), cy + u(10));
    x.stroke();
    x.beginPath();
    x.moveTo(cx + u(14), cy + u(14));
    x.lineTo(cx + u(20), cy + u(14));
    x.stroke();
  },
  skull: (d, cx, cy) => {
    const { x, u, bold, fill, solid, G, N } = d;
    bold(0.7, 2);
    x.beginPath();
    x.arc(cx, cy, u(22), 0, Math.PI * 2);
    x.stroke();
    N();
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2 - Math.PI / 2;
      const a1 = a - 0.45, a2 = a + 0.45;
      solid(0.6);
      x.beginPath();
      x.moveTo(cx + Math.cos(a1) * u(7), cy + Math.sin(a1) * u(7));
      x.lineTo(cx + Math.cos(a1) * u(19), cy + Math.sin(a1) * u(19));
      x.arc(cx, cy, u(19), a1, a2);
      x.lineTo(cx + Math.cos(a2) * u(7), cy + Math.sin(a2) * u(7));
      x.arc(cx, cy, u(7), a2, a1, true);
      x.closePath();
      x.fill();
      bold(0.75, 1);
      x.stroke();
      N();
    }
    x.fillStyle = "rgba(12,11,20,0.9)";
    x.beginPath();
    x.arc(cx, cy, u(7), 0, Math.PI * 2);
    x.fill();
    bold(0.7, 1.5);
    x.beginPath();
    x.arc(cx, cy, u(7), 0, Math.PI * 2);
    x.stroke();
    N();
    G(5, 0.5);
    fill(0.85);
    x.beginPath();
    x.arc(cx, cy, u(2.5), 0, Math.PI * 2);
    x.fill();
    N();
  },
  // ── LEGACY NAMES, REDESIGNED IN THE APPROVED VOCABULARY ──
  leaderboard: (d, cx, cy) => {
    const { x, u, bold, thin, det, fill, hi, G, N, grad } = d;
    const rows = [
      { ry: -11, w: 26, a: 0.8, lead: true },
      { ry: 0, w: 19, a: 0.45, lead: false },
      { ry: 11, w: 13, a: 0.28, lead: false }
    ];
    for (const { ry, w, a, lead } of rows) {
      if (lead) hi(0.95, 1.6);
      else thin(0.55, 1.6);
      x.beginPath();
      x.moveTo(cx - u(20), cy + u(ry - 3));
      x.lineTo(cx - u(17), cy + u(ry));
      x.lineTo(cx - u(20), cy + u(ry + 3));
      x.stroke();
      x.fillStyle = grad(cx - u(14), cy + u(ry), cx - u(14) + u(w), cy + u(ry), [[0, a], [1, a * 0.45]]);
      x.beginPath();
      x.moveTo(cx - u(14), cy + u(ry - 3.2));
      x.lineTo(cx - u(14) + u(w) - u(2), cy + u(ry - 3.2));
      x.lineTo(cx - u(14) + u(w), cy + u(ry - 1.2));
      x.lineTo(cx - u(14) + u(w), cy + u(ry + 3.2));
      x.lineTo(cx - u(14), cy + u(ry + 3.2));
      x.closePath();
      x.fill();
      if (lead) {
        bold(0.85, 1.3);
        x.stroke();
        N();
      } else {
        thin(0.4, 1);
        x.stroke();
      }
      det(0.4, 1);
      x.beginPath();
      x.moveTo(cx - u(14), cy + u(ry + 5.5));
      x.lineTo(cx + u(14), cy + u(ry + 5.5));
      x.stroke();
    }
  },
  shield: (d, cx, cy) => {
    const { x, u, bold, fill, solid, thin, G, N } = d;
    solid(0.2);
    x.beginPath();
    x.moveTo(cx, cy - u(22));
    x.lineTo(cx + u(18), cy - u(10));
    x.lineTo(cx + u(16), cy + u(6));
    x.lineTo(cx, cy + u(22));
    x.lineTo(cx - u(16), cy + u(6));
    x.lineTo(cx - u(18), cy - u(10));
    x.closePath();
    x.fill();
    bold(0.8, 2);
    x.stroke();
    N();
    thin(0.35, 1);
    x.beginPath();
    x.moveTo(cx, cy - u(16));
    x.lineTo(cx + u(13), cy - u(7));
    x.lineTo(cx + u(11), cy + u(4));
    x.lineTo(cx, cy + u(16));
    x.lineTo(cx - u(11), cy + u(4));
    x.lineTo(cx - u(13), cy - u(7));
    x.closePath();
    x.stroke();
    thin(0.2, 0.6);
    x.beginPath();
    x.moveTo(cx, cy - u(22));
    x.lineTo(cx, cy + u(22));
    x.stroke();
    x.beginPath();
    x.moveTo(cx - u(18), cy - u(2));
    x.lineTo(cx + u(18), cy - u(2));
    x.stroke();
    G(4, 0.3);
    solid(0.15);
    x.beginPath();
    x.moveTo(cx, cy - u(16));
    x.lineTo(cx + u(13), cy - u(7));
    x.lineTo(cx + u(7), cy - u(2));
    x.lineTo(cx, cy - u(2));
    x.closePath();
    x.fill();
    N();
  },
  sword: (d, cx, cy) => {
    const { x, u, bold, det, fill, hi, G, N, grad } = d;
    x.save();
    x.translate(cx, cy);
    x.rotate(Math.PI / 4);
    x.fillStyle = grad(0, -u(19), 0, u(5), [[0, 0.9], [0.45, 0.5], [1, 0.3]]);
    x.beginPath();
    x.moveTo(0, -u(19));
    x.lineTo(u(3.2), -u(13));
    x.lineTo(u(2.6), u(5));
    x.lineTo(-u(2.6), u(5));
    x.lineTo(-u(3.2), -u(13));
    x.closePath();
    x.fill();
    bold(0.8, 1.6);
    x.stroke();
    N();
    det(0.5, 1.1);
    x.beginPath();
    x.moveTo(0, -u(15));
    x.lineTo(0, u(3));
    x.stroke();
    bold(0.85, 2.2);
    x.beginPath();
    x.moveTo(-u(8), u(7.5));
    x.lineTo(-u(5), u(5.5));
    x.lineTo(u(5), u(5.5));
    x.lineTo(u(8), u(7.5));
    x.stroke();
    N();
    bold(0.7, 2);
    x.beginPath();
    x.moveTo(0, u(7.5));
    x.lineTo(0, u(14));
    x.stroke();
    N();
    G(5, 0.6);
    fill(0.9);
    x.beginPath();
    x.arc(0, u(16), u(2), 0, Math.PI * 2);
    x.fill();
    N();
    hi(0.95, 0.9);
    x.beginPath();
    x.moveTo(-u(1.6), -u(16));
    x.lineTo(-u(1.6), -u(4));
    x.stroke();
    x.restore();
  },
  home: (d, cx, cy) => {
    const { x, u, pc, bold, fill, solid, det, N } = d;
    const hg = x.createLinearGradient(cx - u(14), cy - u(8), cx + u(10), cy + u(16));
    hg.addColorStop(0, pc(0.45));
    hg.addColorStop(0.5, pc(0.15));
    hg.addColorStop(1, pc(0.35));
    x.fillStyle = hg;
    x.beginPath();
    x.moveTo(cx, cy - u(12));
    x.lineTo(cx + u(16), cy + u(4));
    x.lineTo(cx + u(12), cy + u(4));
    x.lineTo(cx + u(12), cy + u(16));
    x.lineTo(cx - u(12), cy + u(16));
    x.lineTo(cx - u(12), cy + u(4));
    x.lineTo(cx - u(16), cy + u(4));
    x.closePath();
    x.fill();
    bold(0.75, 1.5);
    x.stroke();
    N();
    solid(0.25);
    x.fillRect(cx - u(4), cy + u(4), u(8), u(12));
    det(0.3, 0.6);
    x.strokeRect(cx - u(4), cy + u(4), u(8), u(12));
    bold(0.6, 1.5);
    x.beginPath();
    x.moveTo(cx + u(6), cy - u(6));
    x.lineTo(cx + u(6), cy - u(20));
    x.stroke();
    N();
    bold(0.4, 1);
    x.beginPath();
    x.arc(cx + u(6), cy - u(20), u(4), -Math.PI * 0.8, -Math.PI * 0.2);
    x.stroke();
    x.beginPath();
    x.arc(cx + u(6), cy - u(20), u(7), -Math.PI * 0.75, -Math.PI * 0.25);
    x.stroke();
    x.beginPath();
    x.arc(cx + u(6), cy - u(20), u(10), -Math.PI * 0.7, -Math.PI * 0.3);
    x.stroke();
    N();
    fill(0.35);
    x.fillRect(cx + u(4), cy + u(5), u(5), u(4));
    bold(0.35, 0.6);
    x.strokeRect(cx + u(4), cy + u(5), u(5), u(4));
    N();
  },
  potion: (d, cx, cy) => {
    const { x, u, bold, det, fill, hi, grad } = d;
    const body = () => {
      x.beginPath();
      x.moveTo(cx - u(3.5), cy - u(16));
      x.lineTo(cx - u(3.5), cy - u(6));
      x.lineTo(cx - u(10), cy + u(1));
      x.lineTo(cx - u(10), cy + u(13));
      x.lineTo(cx - u(6), cy + u(17));
      x.lineTo(cx + u(6), cy + u(17));
      x.lineTo(cx + u(10), cy + u(13));
      x.lineTo(cx + u(10), cy + u(1));
      x.lineTo(cx + u(3.5), cy - u(6));
      x.lineTo(cx + u(3.5), cy - u(16));
      x.closePath();
    };
    x.fillStyle = grad(cx - u(10), cy - u(16), cx + u(10), cy + u(17), [[0, 0.18], [1, 0.08]]);
    body();
    x.fill();
    x.save();
    body();
    x.clip();
    x.fillStyle = grad(cx, cy + u(2), cx, cy + u(17), [[0, 0.75], [1, 0.45]]);
    x.fillRect(cx - u(10), cy + u(2), u(20), u(15));
    x.restore();
    bold(0.8, 1.7);
    body();
    x.stroke();
    d.N();
    bold(0.75, 2);
    x.beginPath();
    x.moveTo(cx - u(5), cy - u(17));
    x.lineTo(cx + u(5), cy - u(17));
    x.stroke();
    d.N();
    hi(0.9, 1);
    x.beginPath();
    x.moveTo(cx - u(9), cy + u(2));
    x.lineTo(cx + u(9), cy + u(2));
    x.stroke();
    fill(0.85);
    x.beginPath();
    x.arc(cx + u(3), cy + u(7), u(1.3), 0, Math.PI * 2);
    x.fill();
    x.beginPath();
    x.arc(cx - u(2.5), cy + u(11), u(1), 0, Math.PI * 2);
    x.fill();
    det(0.5, 1.1);
    x.beginPath();
    x.moveTo(cx - u(10), cy + u(7));
    x.lineTo(cx - u(7.5), cy + u(7));
    x.stroke();
  },
  coin: (d, cx, cy) => {
    const { x, u, bold, fill, solid, thin, det, G, N } = d;
    solid(0.2);
    x.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 - Math.PI / 2, r = u(20);
      if (i === 0) x.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      else x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    x.closePath();
    x.fill();
    bold(0.75, 1.8);
    x.stroke();
    N();
    thin(0.35, 1);
    x.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 - Math.PI / 2, r = u(12);
      if (i === 0) x.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      else x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    x.closePath();
    x.stroke();
    thin(0.2, 0.5);
    for (let i = 0; i < 6; i += 2) {
      const a = i / 6 * Math.PI * 2 - Math.PI / 2;
      x.beginPath();
      x.moveTo(cx + Math.cos(a) * u(6), cy + Math.sin(a) * u(6));
      x.lineTo(cx + Math.cos(a) * u(18), cy + Math.sin(a) * u(18));
      x.stroke();
    }
    G(5, 0.4);
    fill(0.7);
    x.beginPath();
    x.arc(cx, cy, u(4), 0, Math.PI * 2);
    x.fill();
    N();
    det(0.3, 0.5);
    x.beginPath();
    x.arc(cx, cy, u(4), 0, Math.PI * 2);
    x.stroke();
  },
  crown: (d, cx, cy) => {
    const { x, u, bold, thin, fill, G, N, grad } = d;
    x.fillStyle = grad(cx - u(4.5), cy - u(6), cx + u(4.5), cy + u(6), [[0, 0.85], [1, 0.4]]);
    x.beginPath();
    x.moveTo(cx, cy - u(7));
    x.lineTo(cx + u(4.5), cy);
    x.lineTo(cx, cy + u(7));
    x.lineTo(cx - u(4.5), cy);
    x.closePath();
    x.fill();
    bold(0.9, 1.5);
    x.stroke();
    N();
    const wing = (s) => {
      bold(0.8, 2);
      x.beginPath();
      x.moveTo(cx + s * u(6), cy - u(1));
      x.lineTo(cx + s * u(20), cy - u(9));
      x.stroke();
      N();
      bold(0.6, 1.7);
      x.beginPath();
      x.moveTo(cx + s * u(6.5), cy + u(2.5));
      x.lineTo(cx + s * u(17), cy - u(3));
      x.stroke();
      N();
      bold(0.4, 1.4);
      x.beginPath();
      x.moveTo(cx + s * u(7), cy + u(6));
      x.lineTo(cx + s * u(14), cy + u(2.5));
      x.stroke();
      N();
    };
    wing(1);
    wing(-1);
    bold(0.7, 1.8);
    x.beginPath();
    x.moveTo(cx - u(9), cy + u(12));
    x.lineTo(cx + u(9), cy + u(12));
    x.stroke();
    N();
    thin(0.4, 1);
    x.beginPath();
    x.moveTo(cx - u(6.5), cy + u(15));
    x.lineTo(cx + u(6.5), cy + u(15));
    x.stroke();
    d.hi(0.95, 1);
    x.beginPath();
    x.moveTo(cx - u(3), cy - u(2.2));
    x.lineTo(cx - u(0.5), cy - u(5.2));
    x.stroke();
  },
  // ── COMMS / SYSTEMS (approved 2026-07-03) ──
  comms: (d, cx, cy) => {
    const { x, u, bold, thin, fill, G, N } = d;
    bold(0.85, 2);
    x.beginPath();
    x.moveTo(cx, cy + u(18));
    x.lineTo(cx, cy - u(2));
    x.stroke();
    N();
    bold(0.7, 1.8);
    x.beginPath();
    x.moveTo(cx - u(9), cy + u(18));
    x.lineTo(cx + u(9), cy + u(18));
    x.stroke();
    N();
    thin(0.5, 1.2);
    x.beginPath();
    x.moveTo(cx - u(6), cy + u(18));
    x.lineTo(cx, cy + u(8));
    x.stroke();
    x.beginPath();
    x.moveTo(cx + u(6), cy + u(18));
    x.lineTo(cx, cy + u(8));
    x.stroke();
    thin(0.75, 1.6);
    x.beginPath();
    x.arc(cx, cy - u(6), u(5), -Math.PI * 0.78, -Math.PI * 0.22);
    x.stroke();
    thin(0.5, 1.4);
    x.beginPath();
    x.arc(cx, cy - u(6), u(10), -Math.PI * 0.75, -Math.PI * 0.25);
    x.stroke();
    thin(0.3, 1.2);
    x.beginPath();
    x.arc(cx, cy - u(6), u(15), -Math.PI * 0.72, -Math.PI * 0.28);
    x.stroke();
    G(7, 0.7);
    fill(0.95);
    x.beginPath();
    x.arc(cx, cy - u(5), u(2.6), 0, Math.PI * 2);
    x.fill();
    N();
  },
  timer: (d, cx, cy) => {
    const { x, u, bold, thin, fill, pc, G, N } = d;
    bold(0.8, 1.8);
    x.beginPath();
    x.arc(cx, cy + u(1), u(15), 0, Math.PI * 2);
    x.stroke();
    N();
    bold(0.7, 1.6);
    x.beginPath();
    x.moveTo(cx - u(4), cy - u(17));
    x.lineTo(cx + u(4), cy - u(17));
    x.stroke();
    x.beginPath();
    x.moveTo(cx, cy - u(17));
    x.lineTo(cx, cy - u(14));
    x.stroke();
    N();
    x.strokeStyle = pc(0.85);
    x.lineWidth = u(3);
    x.lineCap = "butt";
    x.shadowColor = pc(0.4);
    x.shadowBlur = u(5);
    x.beginPath();
    x.arc(cx, cy + u(1), u(11.5), -Math.PI / 2, Math.PI * 0.25);
    x.stroke();
    N();
    thin(0.2, 3);
    x.beginPath();
    x.arc(cx, cy + u(1), u(11.5), Math.PI * 0.25, Math.PI * 1.5);
    x.stroke();
    thin(0.45, 1);
    for (let i = 0; i < 12; i++) {
      const a = Math.PI / 6 * i;
      x.beginPath();
      x.moveTo(cx + Math.cos(a) * u(13.2), cy + u(1) + Math.sin(a) * u(13.2));
      x.lineTo(cx + Math.cos(a) * u(15), cy + u(1) + Math.sin(a) * u(15));
      x.stroke();
    }
    thin(0.9, 1.4);
    x.beginPath();
    x.moveTo(cx, cy + u(1));
    x.lineTo(cx + Math.cos(Math.PI * 0.25) * u(9), cy + u(1) + Math.sin(Math.PI * 0.25) * u(9));
    x.stroke();
    G(5, 0.6);
    fill(0.95);
    x.beginPath();
    x.arc(cx, cy + u(1), u(1.8), 0, Math.PI * 2);
    x.fill();
    N();
  },
  map: (d, cx, cy) => {
    const { x, u, bold, thin, det, fill, G, N, grad } = d;
    thin(0.4, 1);
    x.beginPath();
    x.moveTo(cx - u(17), cy + u(7));
    x.lineTo(cx + u(17), cy + u(7));
    x.stroke();
    thin(0.3, 1);
    x.beginPath();
    x.moveTo(cx - u(19), cy + u(12));
    x.lineTo(cx + u(19), cy + u(12));
    x.stroke();
    thin(0.22, 1);
    x.beginPath();
    x.moveTo(cx - u(21), cy + u(17));
    x.lineTo(cx + u(21), cy + u(17));
    x.stroke();
    thin(0.3, 1);
    for (const [x1, x2] of [[-14, -19], [-5, -6.5], [4, 5.5], [13, 18]]) {
      x.beginPath();
      x.moveTo(cx + u(x1), cy + u(7));
      x.lineTo(cx + u(x2), cy + u(17));
      x.stroke();
    }
    thin(0.6, 1.2);
    x.beginPath();
    x.ellipse(cx, cy + u(7), u(6.5), u(2.2), 0, 0, Math.PI * 2);
    x.stroke();
    x.fillStyle = grad(cx - u(6.5), cy - u(15), cx + u(6.5), cy - u(2), [[0, 0.85], [1, 0.4]]);
    x.beginPath();
    x.moveTo(cx, cy - u(16));
    x.lineTo(cx + u(6.5), cy - u(9));
    x.lineTo(cx, cy - u(2));
    x.lineTo(cx - u(6.5), cy - u(9));
    x.closePath();
    x.fill();
    bold(0.85, 1.7);
    x.stroke();
    N();
    bold(0.8, 1.8);
    x.beginPath();
    x.moveTo(cx, cy - u(2));
    x.lineTo(cx, cy + u(7));
    x.stroke();
    N();
    det(0.55, 1.3);
    x.beginPath();
    x.arc(cx, cy - u(9), u(2.2), 0, Math.PI * 2);
    x.stroke();
    G(6, 0.7);
    fill(0.95);
    x.beginPath();
    x.arc(cx, cy + u(7), u(1.9), 0, Math.PI * 2);
    x.fill();
    N();
  },
  scan: (d, cx, cy) => {
    const { x, u, thin, det, hi, pc, N } = d;
    thin(0.55, 1.3);
    x.setLineDash([u(2.2), u(2.6)]);
    x.beginPath();
    x.arc(cx + u(1), cy + u(2), u(10.5), 0, Math.PI * 2);
    x.stroke();
    x.beginPath();
    x.ellipse(cx + u(1), cy + u(2), u(10.5), u(3.6), 0, 0, Math.PI * 2);
    x.stroke();
    x.setLineDash([]);
    thin(0.4, 1.1);
    x.beginPath();
    x.moveTo(cx - u(15), cy - u(16));
    x.lineTo(cx + u(15), cy - u(16));
    x.stroke();
    hi(0.8, 1.6);
    x.beginPath();
    x.moveTo(cx - u(15), cy - u(16));
    x.lineTo(cx - u(3), cy - u(16));
    x.stroke();
    const bx = cx - u(3);
    const tg = x.createLinearGradient(bx - u(9), 0, bx, 0);
    tg.addColorStop(0, pc(0));
    tg.addColorStop(1, pc(0.22));
    x.fillStyle = tg;
    x.fillRect(bx - u(9), cy - u(12), u(9), u(28));
    x.strokeStyle = pc(0.9);
    x.lineWidth = u(1.4);
    x.shadowColor = pc(0.5);
    x.shadowBlur = u(5);
    x.beginPath();
    x.moveTo(bx, cy - u(12));
    x.lineTo(bx, cy + u(16));
    x.stroke();
    N();
    det(0.6, 1.2);
    x.beginPath();
    x.moveTo(bx - u(2.5), cy + u(2));
    x.lineTo(bx + u(2.5), cy + u(2));
    x.stroke();
  }
};
var warnedUnknown = /* @__PURE__ */ new Set();
function drawIcon(ctx, name, cx, cy, size, color) {
  const resolved = ALIASES[name] ?? name;
  const fn = ICONS[resolved];
  if (!fn) {
    if (!warnedUnknown.has(name)) {
      warnedUnknown.add(name);
      console.warn(`[arcade-graphics-engine] drawIcon: unknown icon name "${name}"`);
    }
    return;
  }
  ctx.save();
  fn(makePen(ctx, size, color), cx, cy);
  ctx.restore();
}
function getIconNames() {
  return [...Object.keys(ICONS), ...Object.keys(ALIASES)];
}
function drawFramedIcon(ctx, name, cx, cy, size, color, options) {
  const style = options?.frameStyle ?? "square";
  const opacity = options?.frameOpacity ?? 0.95;
  const p = makePen(ctx, size, color);
  const r = size * 0.6;
  ctx.save();
  ctx.fillStyle = `rgba(12,11,20,${opacity})`;
  ctx.strokeStyle = p.pc(0.25);
  ctx.lineWidth = Math.max(1, size / 60);
  if (style === "square") {
    const cs = size * 0.12;
    ctx.beginPath();
    ctx.moveTo(cx - r + cs, cy - r);
    ctx.lineTo(cx + r - cs, cy - r);
    ctx.lineTo(cx + r, cy - r + cs);
    ctx.lineTo(cx + r, cy + r - cs);
    ctx.lineTo(cx + r - cs, cy + r);
    ctx.lineTo(cx - r + cs, cy + r);
    ctx.lineTo(cx - r, cy + r - cs);
    ctx.lineTo(cx - r, cy - r + cs);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = p.pc(0.5);
    const dotR = Math.max(1, size * 0.022);
    const inset = r - dotR;
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ctx.beginPath();
      ctx.arc(cx + dx * inset, cy + dy * inset, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style === "circle") {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  drawIcon(ctx, name, cx, cy, size * 0.7, color);
}

// src/components/canvas-button.ts
function drawCanvasButton(ctx, theme, opts) {
  const { x, y, width, height, label } = opts;
  const state = opts.state ?? "idle";
  const color = opts.color ?? theme.palette.primary.core;
  const glow = theme.glow;
  const disabled = state === "disabled";
  const hover = state === "hover";
  const active = state === "active";
  const cs = Math.min(8, height * 0.25);
  ctx.save();
  if (disabled) ctx.globalAlpha = 0.35;
  if (active) ctx.translate(0, 1);
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(x + cs, y);
    ctx.lineTo(x + width - cs, y);
    ctx.lineTo(x + width, y + cs);
    ctx.lineTo(x + width, y + height - cs);
    ctx.lineTo(x + width - cs, y + height);
    ctx.lineTo(x + cs, y + height);
    ctx.lineTo(x, y + height - cs);
    ctx.lineTo(x, y + cs);
    ctx.closePath();
  };
  const lift = hover || active ? 0.09 : 0.05;
  const grad = ctx.createLinearGradient(x, y, x, y + height);
  grad.addColorStop(0, `rgba(255,255,255,${lift})`);
  grad.addColorStop(0.45, "rgba(255,255,255,0.012)");
  grad.addColorStop(1, "rgba(0,0,0,0.14)");
  ctx.fillStyle = `rgba(10, 10, 16, 0.5)`;
  body();
  ctx.fill();
  ctx.fillStyle = grad;
  body();
  ctx.fill();
  const borderAlpha = hover || active || opts.accent ? 0.9 : 0.4;
  if (hover || active || opts.accent) {
    ctx.shadowColor = rgbaToCss(withAlpha(color, glow.intensity * (hover ? 1 : 0.5)));
    ctx.shadowBlur = glow.outerRadius * (hover ? 1 : 0.6);
  }
  ctx.strokeStyle = rgbaToCss(withAlpha(color, borderAlpha));
  ctx.lineWidth = 1.5;
  body();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = rgbaToCss(withAlpha(color, hover || active ? 0.95 : 0.5));
  ctx.fillRect(x, y + height * 0.22, 2.5, height * 0.56);
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.28));
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + cs + 4, y + 0.5);
  ctx.lineTo(x + width - cs - 4, y + 0.5);
  ctx.stroke();
  const size = Math.max(11, Math.min(16, height * 0.36));
  ctx.font = `600 ${size}px "Rajdhani", "Segoe UI", sans-serif`;
  try {
    ctx.letterSpacing = `${(0.14 * size).toFixed(2)}px`;
  } catch {
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const textColor = hover || active ? lerpColor(color, [255, 255, 255, 1], 0.35) : color;
  if (hover) {
    ctx.shadowColor = rgbaToCss(withAlpha(color, 0.5));
    ctx.shadowBlur = 6;
  }
  ctx.fillStyle = rgbaToCss(textColor);
  ctx.fillText(typeCase("label", label), x + width / 2, y + height / 2 + 1);
  ctx.restore();
}
function isPointInButton(rect, px, py) {
  return px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height;
}

export { canvasBloom, drawAccentBar, drawAmbientParticles, drawBarGauge, drawCanvasButton, drawCornerFlourish, drawDivider, drawDotGrid, drawFramedIcon, drawGrid, drawIcon, drawLineChart, drawPanel, drawRadarDisplay, drawRadialGauge, drawScanLines, drawSegmentDisplay, drawSideRails, getIconNames, isPointInButton, renderMenu };
//# sourceMappingURL=chunk-UVE2ZLTM.js.map
//# sourceMappingURL=chunk-UVE2ZLTM.js.map