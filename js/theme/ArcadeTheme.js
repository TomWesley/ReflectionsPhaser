// ArcadeTheme.js — installs the Arcade Graphics Engine into REFLECTIONS.
//
// This is the DOM/browser side of the reskin: it builds the engine ThemeProvider
// from the game's blue + amber "cockpit HUD" hues, injects the engine's fonts,
// CSS custom properties, and component classes, and re-exports the canvas draw
// helpers the renderers use. On-canvas colors themselves live in palette.js
// (node-safe); this module keeps those hues in sync for the DOM side.
//
// The engine is vendored as a self-contained ESM bundle (js/vendor/...), imported
// via native browser modules — no bundler, and it survives the /reflections/ deploy.
import {
    ThemeProvider,
    drawAmbientParticles,
    drawScanLines,
    drawIcon,
    drawPanel,
    drawRadarDisplay,
    FONT_DISPLAY,
} from '../vendor/arcade-graphics-engine/index.js';

// Hues for the amber/red/black/gray scheme: amber primary (~38°), amber
// secondary/tertiary (energy), and red danger (~348°) for zones/breach/Start.
export const provider = ThemeProvider.custom('REFLECTIONS', 38, 40, 45, 348);
export const palette = provider.palette;
export const theme = provider.theme;

let _injected = false;

/**
 * Inject the engine's fonts + CSS. Browser-only and idempotent; a no-op under
 * Node (tests) since there is no document. Does NOT force any visual change on
 * existing elements — it only makes the engine's fonts, CSS vars, and .arcade-*
 * classes available for the reskin to apply.
 */
export function initArcadeTheme() {
    if (_injected || typeof document === 'undefined') return;
    provider.injectCSS();
    _injected = true;
}

export { drawAmbientParticles, drawScanLines, drawIcon, drawPanel, drawRadarDisplay, FONT_DISPLAY };
