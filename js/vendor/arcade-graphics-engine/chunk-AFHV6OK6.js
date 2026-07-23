import { PALETTE_NEON_INFERNO } from './chunk-KKUCTA4T.js';

// src/style/theme.ts
var DEFAULT_GLOW = {
  passes: 3,
  innerRadius: 2,
  outerRadius: 12,
  intensity: 0.7,
  additive: true
};
var DEFAULT_PIXEL = {
  pixelScale: 3,
  crispScaling: true,
  outlineThickness: 1,
  glowOutlines: true,
  subPixelGlow: true
};
var DEFAULT_PARTICLES = {
  shape: "spark",
  size: 2,
  sizeVariance: 0.5,
  glow: true,
  trailLength: 6,
  fadeCurve: "ease-out"
};
var DEFAULT_EDGES = {
  type: "crystalline",
  sharpness: 0.85,
  innerHighlight: true,
  edgeGlow: true,
  detailLevel: 8
};
var DEFAULT_ANIMATION = {
  glowPulseSpeed: 1.5,
  glowPulseAmplitude: 0.15,
  particleRate: 1,
  spriteAnimFps: 12
};
function createTheme(name, palette, overrides) {
  return {
    name,
    palette,
    glow: { ...DEFAULT_GLOW, ...overrides?.glow },
    pixel: { ...DEFAULT_PIXEL, ...overrides?.pixel },
    particles: { ...DEFAULT_PARTICLES, ...overrides?.particles },
    edges: { ...DEFAULT_EDGES, ...overrides?.edges },
    animation: { ...DEFAULT_ANIMATION, ...overrides?.animation }
  };
}
var DEFAULT_THEME = createTheme("Neon Arcade", PALETTE_NEON_INFERNO);
var LITE_THEME = createTheme("Neon Arcade Lite", PALETTE_NEON_INFERNO, {
  glow: { passes: 1, outerRadius: 6, intensity: 0.5 },
  pixel: { pixelScale: 2, subPixelGlow: false },
  particles: { trailLength: 3 }
});

export { DEFAULT_ANIMATION, DEFAULT_EDGES, DEFAULT_GLOW, DEFAULT_PARTICLES, DEFAULT_PIXEL, DEFAULT_THEME, LITE_THEME, createTheme };
//# sourceMappingURL=chunk-AFHV6OK6.js.map
//# sourceMappingURL=chunk-AFHV6OK6.js.map