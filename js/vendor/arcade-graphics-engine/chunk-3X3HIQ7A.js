// src/style/spec.ts
var SPEC = {
  // ── CANVAS ──
  /** Default background (muted colored, not black) */
  BACKGROUND: [55, 48, 82, 255],
  /** Alternative dark background for high-contrast scenes */
  BACKGROUND_DARK: [18, 15, 28, 255],
  /** Pure black for glow-heavy scenes (tactical use) */
  BACKGROUND_BLACK: [0, 0, 0, 255],
  // ── RESOLUTION ──
  /** Pixel density: smaller pixels = more detail. Characters are 100-200px tall. */
  SPRITE_SMALL: 64,
  SPRITE_MEDIUM: 128,
  SPRITE_LARGE: 200,
  DISPLAY_SCALE: 2,
  PIXEL_SCALING: "nearest",
  // ── OUTLINE ──
  /** Outlines are DARK, not bright. Near-black or very dark version of the fill color. */
  OUTLINE_COLOR_MODE: "dark",
  /** Outline darkness: how much darker than the darkest fill shade (0-1, 1=pure black) */
  OUTLINE_DARKNESS: 0.85,
  /** Outline thickness at art resolution */
  OUTLINE_WEIGHT: 1,
  /** Inner detail outlines (separating materials/regions within a sprite) */
  INNER_OUTLINE_WEIGHT: 1,
  INNER_OUTLINE_DARKNESS: 0.7,
  // ── COLOR SYSTEM ──
  /**
   * Each element uses a RICH palette with multiple hues, not a single neon color.
   * A typical character has:
   * - 2-3 primary hues (e.g. pink/purple for hair, orange for armor, gray for metal)
   * - 4-8 brightness levels per hue
   * - Total: 15-30+ distinct colors per element
   */
  MIN_COLORS_PER_ELEMENT: 12,
  MAX_COLORS_PER_ELEMENT: 40,
  /** Shading levels per material (e.g., metal gets 6 levels, fabric gets 5) */
  SHADING_LEVELS_METAL: 6,
  SHADING_LEVELS_FABRIC: 5,
  SHADING_LEVELS_SKIN: 5,
  SHADING_LEVELS_BONE: 4,
  SHADING_LEVELS_ENERGY: 4,
  // ── SHADING ──
  /** Light direction (angle in degrees, 0 = top, clockwise) */
  LIGHT_ANGLE: 315,
  // top-left
  /** Warm highlights: shift toward yellow/white */
  HIGHLIGHT_WARMTH: 15,
  // hue shift toward yellow
  HIGHLIGHT_SATURATION_DROP: 20,
  // less saturated at brightest
  /** Cool shadows: shift toward blue/purple */
  SHADOW_COOLNESS: 25,
  // hue shift toward blue
  SHADOW_SATURATION_BOOST: 10,
  // slightly more saturated in shadows
  /** The darkest shadow is not pure black — it has color */
  SHADOW_MIN_LIGHTNESS: 8,
  // ── MATERIAL PROPERTIES ──
  /** Specular highlight intensity for metallic surfaces */
  METAL_SPECULAR: 0.9,
  /** Diffuse softness for fabric */
  FABRIC_SOFTNESS: 0.7,
  /** How much color variation exists within a single material zone */
  MATERIAL_COLOR_NOISE: 0.08,
  // ── TACTICAL GLOW (for lasers, magic, energy — NOT base style) ──
  GLOW_INNER_RADIUS: 3,
  GLOW_INNER_INTENSITY: 0.6,
  GLOW_MID_RADIUS: 10,
  GLOW_MID_INTENSITY: 0.25,
  GLOW_OUTER_RADIUS: 25,
  GLOW_OUTER_INTENSITY: 0.08,
  GLOW_QUALITY: 2,
  /** Bloom threshold: only pixels this bright or above get glow treatment */
  GLOW_THRESHOLD: 180,
  // ── LEGACY COMPAT (used by analysis.ts and sprites.ts during transition) ──
  EDGE_THRESHOLD: 30,
  ALPHA_EDGE_THRESHOLD: 20,
  EDGE_INFLUENCE_RADIUS: 4,
  ZONE_COUNT: 5,
  ZONE_BOUNDARIES: [0, 1, 3, 8, 999],
  ZONE_BRIGHTNESS: [1, 0.65, 0.4, 0.22, 0.08],
  GRADIENT_STOPS: [0, 0.15, 0.35, 0.6, 0.85, 1],
  HUE_VARIATION_AMOUNT: 0.12,
  HUE_VARIATION_RANGE: [0.2, 0.7],
  OUTLINE_BRIGHTNESS: 1,
  BLOOM_INNER_RADIUS: 3,
  BLOOM_INNER_INTENSITY: 0.6,
  BLOOM_MID_RADIUS: 10,
  BLOOM_MID_INTENSITY: 0.25,
  BLOOM_OUTER_RADIUS: 25,
  BLOOM_OUTER_INTENSITY: 0.08,
  BLOOM_QUALITY: 2,
  BLOOM_THRESHOLD: 40,
  // ── POST-PROCESSING ──
  /** Subtle canvas bloom for energy effects only */
  CANVAS_BLOOM_RADIUS: 12,
  CANVAS_BLOOM_INTENSITY: 0.03,
  /** Scanlines: off by default (can be enabled per-game) */
  SCANLINE_OPACITY: 0,
  /** Vignette */
  VIGNETTE_STRENGTH: 0.1,
  // ── PARTICLES (kept for energy/magic effects) ──
  PARTICLE_SIZE: [0.5, 3],
  PARTICLE_GLOW_MULT: 3,
  PARTICLE_TRAIL: 6,
  PARTICLE_FADE: "ease-out",
  // ── TERRAIN / ENVIRONMENT ──
  TERRAIN_EDGE_STYLE: "organic",
  TERRAIN_DETAIL_DENSITY: "high"
};
function generateMaterialShading(baseHue, baseSat, baseLit, levels = 6) {
  const shades = [];
  for (let i = 0; i < levels; i++) {
    const t = levels > 1 ? i / (levels - 1) : 0.5;
    const hueShift = t < 0.5 ? -SPEC.SHADOW_COOLNESS * (1 - t * 2) : SPEC.HIGHLIGHT_WARMTH * (t - 0.5) * 2;
    const h = (baseHue + hueShift + 360) % 360;
    const satBoost = t < 0.3 ? SPEC.SHADOW_SATURATION_BOOST * (1 - t / 0.3) : t > 0.8 ? -SPEC.HIGHLIGHT_SATURATION_DROP * ((t - 0.8) / 0.2) : 0;
    const s = Math.max(0, Math.min(100, baseSat + satBoost));
    const l = Math.min(95, SPEC.SHADOW_MIN_LIGHTNESS + t * (baseLit + 15 - SPEC.SHADOW_MIN_LIGHTNESS));
    shades.push({ h, s, l });
  }
  return shades;
}
function validateStyleCompliance(rendered) {
  const violations = [];
  rendered.width; rendered.height;
  const hueSet = /* @__PURE__ */ new Set();
  let totalVisible = 0;
  for (let i = 0; i < rendered.data.length; i += 4) {
    if (rendered.data[i + 3] < 10) continue;
    totalVisible++;
    const r = rendered.data[i], g = rendered.data[i + 1], b = rendered.data[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max - min > 20) {
      let hue = 0;
      if (max === r) hue = (g - b) / (max - min) * 60;
      else if (max === g) hue = ((b - r) / (max - min) + 2) * 60;
      else hue = ((r - g) / (max - min) + 4) * 60;
      hueSet.add(Math.floor((hue + 360) % 360 / 30));
    }
  }
  if (totalVisible > 500 && hueSet.size < 2) {
    violations.push(`Low color variety: only ${hueSet.size} hue ranges. Style requires rich multi-hue palettes.`);
  }
  let midCount = 0;
  for (let i = 0; i < rendered.data.length; i += 4) {
    if (rendered.data[i + 3] < 10) continue;
    const lum = rendered.data[i] * 0.299 + rendered.data[i + 1] * 0.587 + rendered.data[i + 2] * 0.114;
    if (lum < 60) ;
    else if (lum < 180) midCount++;
    else ;
  }
  if (totalVisible > 500) {
    if (midCount / totalVisible < 0.1) {
      violations.push(`Insufficient mid-tones: ${(midCount / totalVisible * 100).toFixed(0)}%. Rich pixel art needs strong mid-tone presence.`);
    }
  }
  return violations;
}

export { SPEC, generateMaterialShading, validateStyleCompliance };
//# sourceMappingURL=chunk-3X3HIQ7A.js.map
//# sourceMappingURL=chunk-3X3HIQ7A.js.map