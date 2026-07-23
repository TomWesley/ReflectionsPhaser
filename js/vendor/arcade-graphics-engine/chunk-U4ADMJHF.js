import { FONT_MONO, FONT_BODY, FONT_DISPLAY } from './chunk-SGZSDYOC.js';

// src/style/typography.ts
var TYPE_SCALE = {
  /** Game title — the hero mark on a home screen */
  display: { family: FONT_DISPLAY, weight: 900, tracking: 0.18, casing: "uppercase", size: 56, lineHeight: 1.05 },
  /** Screen and section titles */
  title: { family: FONT_DISPLAY, weight: 700, tracking: 0.14, casing: "uppercase", size: 26, lineHeight: 1.15 },
  /** Panel titles, small headers */
  heading: { family: FONT_DISPLAY, weight: 600, tracking: 0.24, casing: "uppercase", size: 13, lineHeight: 1.3 },
  /** Buttons, menu items, interactive labels */
  label: { family: FONT_BODY, weight: 600, tracking: 0.14, casing: "uppercase", size: 14, lineHeight: 1.3 },
  /** Running text — the only sentence-case role */
  body: { family: FONT_BODY, weight: 400, tracking: 0.02, casing: "none", size: 15, lineHeight: 1.5 },
  /** Stats, readouts, coordinates, timestamps */
  data: { family: FONT_MONO, weight: 400, tracking: 0.1, casing: "uppercase", size: 13, lineHeight: 1.4 },
  /** Version strings, footnote readouts — smallest legible tier */
  micro: { family: FONT_MONO, weight: 400, tracking: 0.2, casing: "uppercase", size: 10, lineHeight: 1.4 }
};
function canvasFont(role, sizePx) {
  const r = TYPE_SCALE[role];
  return `${r.weight} ${sizePx ?? r.size}px ${r.family}`;
}
function applyType(ctx, role, sizePx) {
  const r = TYPE_SCALE[role];
  const size = sizePx ?? r.size;
  ctx.font = `${r.weight} ${size}px ${r.family}`;
  try {
    ctx.letterSpacing = `${(r.tracking * size).toFixed(2)}px`;
  } catch {
  }
}
function typeCase(role, text) {
  return TYPE_SCALE[role].casing === "uppercase" ? text.toUpperCase() : text;
}
function typeCSS(role) {
  const r = TYPE_SCALE[role];
  return {
    "font-family": r.family,
    "font-weight": String(r.weight),
    "font-size": `${r.size}px`,
    "letter-spacing": `${r.tracking}em`,
    "line-height": String(r.lineHeight),
    ...r.casing === "uppercase" ? { "text-transform": "uppercase" } : {}
  };
}

export { TYPE_SCALE, applyType, canvasFont, typeCSS, typeCase };
//# sourceMappingURL=chunk-U4ADMJHF.js.map
//# sourceMappingURL=chunk-U4ADMJHF.js.map