// REFLECTIONS canvas palette — single source of truth for ON-CANVAS colors.
//
// Plain data only (no DOM, no engine import) so it is safe to pull into any
// module, including the headless simulation/test code. The page-chrome theme
// (fonts, CSS classes, DOM vars) lives in ArcadeTheme.js, which drives the DOM
// off these same hues via the Arcade Graphics Engine's ThemeProvider.
//
// Strict "amber / red / black / light-gray" identity:
//   primary   = amber      — the hero colour: UI accents, spawners, timer, core, glows
//   secondary = amber      — energy: lasers (same family; amber-dominant scheme)
//   danger    = red        — forbidden zones, breach, the Start (engage) action
//   gray      = light gray — utility only (gridlines, neutral chrome); not thematic
//   daily     = mint       — kept distinct for the Daily Challenge
export const PALETTE = {
    primary:   [255, 176, 32],   // #FFB020 amber
    secondary: [255, 176, 32],   // #FFB020 amber
    danger:    [232, 78, 106],   // #E84E6A red
    gray:      [150, 156, 172],  // #969CAC utility neutral
    daily:     [50, 255, 180],   // #32FFB4 mint
    ghost:     [212, 212, 232],  // #D4D4E8 readouts / text
};

/** `[r,g,b]` -> `rgba(r,g,b,a)` css string. */
export function rgba(rgb, a = 1) {
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
}

/** `[r,g,b]` -> `#rrggbb`. */
export function hex(rgb) {
    return '#' + rgb.map(n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');
}
