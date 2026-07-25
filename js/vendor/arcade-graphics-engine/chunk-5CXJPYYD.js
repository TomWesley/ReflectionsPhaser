import { createTheme } from './chunk-AFHV6OK6.js';
import { FONT_BODY, FONT_MONO, FONT_DISPLAY, injectFonts } from './chunk-SGZSDYOC.js';
import { PALETTE_SOLAR_STORM, PALETTE_TOXIC_JUNGLE, PALETTE_ELECTRIC_OCEAN, PALETTE_NEON_INFERNO, createPalette, rgbaToCss, withAlpha } from './chunk-KKUCTA4T.js';

// src/integration/theme-provider.ts
var PALETTE_MAP = {
  NEON_INFERNO: PALETTE_NEON_INFERNO,
  ELECTRIC_OCEAN: PALETTE_ELECTRIC_OCEAN,
  TOXIC_JUNGLE: PALETTE_TOXIC_JUNGLE,
  SOLAR_STORM: PALETTE_SOLAR_STORM
};
function themeOverrides(options) {
  if (!options?.lowPower) return void 0;
  return {
    glow: { passes: 1, innerRadius: 0, outerRadius: 4, intensity: 0.4 },
    animation: { glowPulseAmplitude: 0 }
  };
}
var ThemeProvider = class _ThemeProvider {
  constructor(theme) {
    this.cssInjected = false;
    this.theme = theme;
    this.palette = theme.palette;
  }
  /**
   * Create a theme provider with a built-in palette.
   * For custom colors use ThemeProvider.custom().
   *
   * options.lowPower collapses the glow system to a single cheap pass —
   * shadowBlur is the most expensive Canvas2D operation, so use this for
   * weak hardware, battery-saver modes, or scenes dense with glowing
   * components.
   */
  static create(paletteName = "NEON_INFERNO", options) {
    const palette = PALETTE_MAP[paletteName];
    if (!palette) {
      throw new Error(
        `Unknown palette "${paletteName}". Built-ins: ${Object.keys(PALETTE_MAP).join(", ")}. For custom colors use ThemeProvider.custom(name, primaryHue, secondaryHue, tertiaryHue, dangerHue).`
      );
    }
    return new _ThemeProvider(createTheme(paletteName, palette, themeOverrides(options)));
  }
  /** Create a theme provider with custom hues */
  static custom(name, primaryHue, secondaryHue, tertiaryHue, dangerHue, options) {
    const palette = createPalette(name, primaryHue, secondaryHue, tertiaryHue, dangerHue);
    return new _ThemeProvider(createTheme(name, palette, themeOverrides(options)));
  }
  /** Build the full CSS variable map — single source for injectCSS and getCSSVariables. */
  buildCSSVariables() {
    const p = this.palette;
    return {
      "--arcade-bg": rgbaToCss(p.background),
      "--arcade-bg-tint": rgbaToCss(p.backgroundTint),
      "--arcade-primary": rgbaToCss(p.primary.core),
      "--arcade-primary-glow": rgbaToCss(p.primary.glow),
      "--arcade-primary-dim": rgbaToCss(p.primary.dim),
      "--arcade-secondary": rgbaToCss(p.secondary.core),
      "--arcade-secondary-glow": rgbaToCss(p.secondary.glow),
      "--arcade-secondary-dim": rgbaToCss(p.secondary.dim),
      "--arcade-tertiary": rgbaToCss(p.tertiary.core),
      "--arcade-tertiary-glow": rgbaToCss(p.tertiary.glow),
      "--arcade-tertiary-dim": rgbaToCss(p.tertiary.dim),
      "--arcade-danger": rgbaToCss(p.danger.core),
      "--arcade-danger-glow": rgbaToCss(p.danger.glow),
      "--arcade-danger-dim": rgbaToCss(p.danger.dim),
      "--arcade-font-display": FONT_DISPLAY,
      "--arcade-font-body": FONT_BODY,
      "--arcade-font-mono": FONT_MONO,
      "--arcade-font": FONT_BODY,
      "--arcade-glow-radius": `${this.theme.glow.outerRadius}px`,
      "--arcade-glow-intensity": `${this.theme.glow.intensity}`
    };
  }
  /**
   * Inject CSS custom properties, the Google Fonts stylesheet, and base
   * component classes into the document.
   *
   * Add `class="arcade-theme"` to <body> to opt into themed background/font;
   * the component classes (.arcade-btn etc.) work on any element regardless.
   */
  injectCSS() {
    if (typeof document === "undefined") return;
    if (this.cssInjected) return;
    injectFonts();
    const vars = this.buildCSSVariables();
    const style = document.createElement("style");
    style.id = "arcade-engine-theme";
    style.textContent = `:root {
${Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join("\n")}
}
${BASE_CSS}`;
    document.getElementById("arcade-engine-theme")?.remove();
    document.head.appendChild(style);
    this.cssInjected = true;
  }
  /** Remove injected CSS */
  removeCSS() {
    if (typeof document === "undefined") return;
    document.getElementById("arcade-engine-theme")?.remove();
    this.cssInjected = false;
  }
  /** Get the full CSS variable map (for frameworks that manage their own styles) */
  getCSSVariables() {
    return this.buildCSSVariables();
  }
};
var BASE_CSS = `
/* Arcade Graphics Engine \u2014 Base Theme */
body.arcade-theme {
  background: var(--arcade-bg);
  color: var(--arcade-primary);
  font-family: var(--arcade-font-body);
}

.arcade-theme * {
  box-sizing: border-box;
}

/* \u2500\u2500 Typography kit \u2014 one class per type role \u2500\u2500 */
.arcade-display {
  font-family: var(--arcade-font-display);
  font-weight: 900; font-size: 56px; letter-spacing: 0.18em;
  line-height: 1.05; text-transform: uppercase;
}
.arcade-title {
  font-family: var(--arcade-font-display);
  font-weight: 700; font-size: 26px; letter-spacing: 0.14em;
  line-height: 1.15; text-transform: uppercase;
}
.arcade-heading {
  font-family: var(--arcade-font-display);
  font-weight: 600; font-size: 13px; letter-spacing: 0.24em;
  line-height: 1.3; text-transform: uppercase;
}
.arcade-label {
  font-family: var(--arcade-font-body);
  font-weight: 600; font-size: 14px; letter-spacing: 0.14em;
  line-height: 1.3; text-transform: uppercase;
}
.arcade-body {
  font-family: var(--arcade-font-body);
  font-weight: 400; font-size: 15px; letter-spacing: 0.02em;
  line-height: 1.5;
}
.arcade-data {
  font-family: var(--arcade-font-mono);
  font-weight: 400; font-size: 13px; letter-spacing: 0.1em;
  line-height: 1.4; text-transform: uppercase;
}
.arcade-micro {
  font-family: var(--arcade-font-mono);
  font-weight: 400; font-size: 10px; letter-spacing: 0.2em;
  line-height: 1.4; text-transform: uppercase;
}

/* Neon text glow */
.arcade-glow {
  text-shadow:
    0 0 4px currentColor,
    0 0 8px currentColor,
    0 0 16px var(--arcade-primary-glow);
}

.arcade-glow-secondary {
  color: var(--arcade-secondary);
  text-shadow:
    0 0 4px currentColor,
    0 0 8px currentColor,
    0 0 16px var(--arcade-secondary-glow);
}

/* Sleek button \u2014 gradient fill, clipped corners, edge accent, hover glow */
.arcade-btn {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.055) 0%, rgba(255, 255, 255, 0.012) 45%, rgba(0, 0, 0, 0.12) 100%);
  border: 1px solid var(--arcade-primary-dim);
  color: var(--arcade-primary);
  font-family: var(--arcade-font-body);
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 2px;
  text-transform: uppercase;
  padding: 10px 20px;
  cursor: pointer;
  position: relative;
  clip-path: polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px);
  transition: all 0.2s;
}
/* Left edge accent bar */
.arcade-btn::before {
  content: '';
  position: absolute;
  left: 0; top: 20%;
  width: 3px; height: 60%;
  background: linear-gradient(180deg, transparent, var(--arcade-primary), transparent);
  opacity: 0.55;
  transition: opacity 0.2s;
}
/* Top edge catch-light */
.arcade-btn::after {
  content: '';
  position: absolute;
  left: 12px; right: 12px; top: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--arcade-primary-glow), transparent);
  opacity: 0.5;
}
.arcade-btn:hover {
  border-color: var(--arcade-primary);
  box-shadow:
    0 0 10px var(--arcade-primary-glow),
    inset 0 0 12px var(--arcade-primary-glow);
  text-shadow: 0 0 8px currentColor;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.09) 0%, rgba(255, 255, 255, 0.02) 45%, rgba(0, 0, 0, 0.1) 100%);
}
.arcade-btn:hover::before { opacity: 1; }
.arcade-btn:active {
  transform: scale(0.97);
}
/* Keyboard focus \u2014 visible, on-brand, never removed */
.arcade-btn:focus-visible, .arcade-input:focus-visible {
  outline: 2px solid var(--arcade-secondary);
  outline-offset: 2px;
  box-shadow: 0 0 10px var(--arcade-secondary-glow);
}

/* Respect reduced-motion preferences: state changes stay, motion goes */
@media (prefers-reduced-motion: reduce) {
  .arcade-btn, .arcade-input, .arcade-btn::before, .arcade-btn::after {
    transition: none;
  }
  .arcade-btn:active {
    transform: none;
  }
}

/* Panel container */
.arcade-panel {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--arcade-primary-dim);
  padding: 16px;
  clip-path: polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px);
  box-shadow: 0 0 8px var(--arcade-primary-glow);
}

.arcade-panel-title {
  font-family: var(--arcade-font-display);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--arcade-primary);
  text-shadow: 0 0 6px var(--arcade-primary-glow);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--arcade-primary-dim);
}

/* Input fields */
.arcade-input {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--arcade-primary-dim);
  color: var(--arcade-primary);
  font-family: var(--arcade-font-mono);
  font-size: 13px;
  padding: 8px 12px;
  outline: none;
}
.arcade-input:focus {
  border-color: var(--arcade-primary);
  box-shadow: 0 0 6px var(--arcade-primary-glow);
}

/* Divider */
.arcade-divider {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--arcade-primary-dim) 20%,
    var(--arcade-primary) 50%,
    var(--arcade-primary-dim) 80%,
    transparent
  );
  box-shadow: 0 0 4px var(--arcade-primary-glow);
  margin: 12px 0;
}

/* Status colors */
.arcade-success { color: #44ff44; text-shadow: 0 0 6px rgba(68, 255, 68, 0.5); }
.arcade-warning { color: #ffaa44; text-shadow: 0 0 6px rgba(255, 170, 68, 0.5); }
.arcade-error { color: #ff4444; text-shadow: 0 0 6px rgba(255, 68, 68, 0.5); }

/* \u2500\u2500 Dialogs \u2500\u2500 */
.arcade-dialog-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(2, 3, 6, 0.72);
  backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
  animation: arcade-fade-in 0.18s ease-out;
}
.arcade-dialog {
  background: rgba(12, 13, 20, 0.97);
  border: 1px solid var(--arcade-primary-dim);
  box-shadow: 0 0 24px rgba(0, 0, 0, 0.6), 0 0 12px var(--arcade-primary-glow);
  padding: 22px 26px;
  min-width: 320px; max-width: min(480px, 88vw);
  clip-path: polygon(14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px);
  animation: arcade-rise-in 0.22s cubic-bezier(0.33, 1, 0.68, 1);
}
.arcade-dialog-title {
  font-family: var(--arcade-font-display);
  font-weight: 600; font-size: 13px; letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--arcade-primary);
  text-shadow: 0 0 6px var(--arcade-primary-glow);
  padding-bottom: 10px; margin-bottom: 12px;
  border-bottom: 1px solid var(--arcade-primary-dim);
}
.arcade-dialog-body {
  font-family: var(--arcade-font-body);
  font-size: 15px; line-height: 1.5;
  color: var(--arcade-primary);
  opacity: 0.85;
  margin-bottom: 18px;
}
.arcade-dialog-actions {
  display: flex; gap: 12px; justify-content: flex-end;
}
.arcade-btn-danger {
  border-color: var(--arcade-danger-dim);
  color: var(--arcade-danger);
}
.arcade-btn-danger::before {
  background: linear-gradient(180deg, transparent, var(--arcade-danger), transparent);
}
.arcade-btn-danger:hover {
  border-color: var(--arcade-danger);
  box-shadow: 0 0 10px var(--arcade-danger-glow), inset 0 0 12px var(--arcade-danger-glow);
}

/* \u2500\u2500 Toasts \u2500\u2500 */
#arcade-toast-container {
  position: fixed; top: 16px; right: 16px; z-index: 1100;
  display: flex; flex-direction: column; gap: 10px;
  pointer-events: none;
}
.arcade-toast {
  pointer-events: auto;
  cursor: pointer;
  background: rgba(12, 13, 20, 0.96);
  border: 1px solid var(--arcade-primary-dim);
  border-left: 3px solid var(--arcade-primary);
  padding: 10px 16px 10px 13px;
  min-width: 240px; max-width: 360px;
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
  animation: arcade-slide-in 0.22s cubic-bezier(0.33, 1, 0.68, 1);
  transition: opacity 0.22s ease-out, transform 0.22s ease-out;
}
.arcade-toast--leaving { opacity: 0; transform: translateX(14px); }
.arcade-toast-title {
  font-family: var(--arcade-font-body);
  font-weight: 600; font-size: 13px; letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--arcade-primary);
  margin-bottom: 2px;
}
.arcade-toast-body {
  font-family: var(--arcade-font-mono);
  font-size: 12px; letter-spacing: 0.06em;
  color: var(--arcade-primary);
  opacity: 0.85;
}
.arcade-toast--success { border-left-color: #44ff44; }
.arcade-toast--success .arcade-toast-body { color: #9cf59c; }
.arcade-toast--warning { border-left-color: #ffaa44; }
.arcade-toast--warning .arcade-toast-body { color: #ffd9a8; }
.arcade-toast--error { border-left-color: #ff4444; }
.arcade-toast--error .arcade-toast-body { color: #ffb0b0; }

/* \u2500\u2500 Loading \u2500\u2500 */
.arcade-loading-backdrop {
  position: fixed; inset: 0; z-index: 1200;
  background: var(--arcade-bg);
  display: flex; align-items: center; justify-content: center;
  transition: opacity 0.26s ease-out;
}
.arcade-loading--leaving { opacity: 0; }
.arcade-loading {
  display: flex; flex-direction: column; align-items: center; gap: 16px;
}
.arcade-loading-spinner { animation: arcade-spin 1.6s linear infinite; }
.arcade-loading-label {
  font-family: var(--arcade-font-mono);
  font-size: 12px; letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--arcade-primary);
  opacity: 0.8;
}
.arcade-loading-bar {
  width: 220px; height: 4px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--arcade-primary-dim);
}
.arcade-loading-bar-fill {
  height: 100%; width: 0%;
  background: linear-gradient(90deg, var(--arcade-primary-dim), var(--arcade-primary));
  box-shadow: 0 0 6px var(--arcade-primary-glow);
  transition: width 0.2s ease-out;
}

@keyframes arcade-fade-in { from { opacity: 0; } }
@keyframes arcade-rise-in { from { opacity: 0; transform: translateY(8px); } }
@keyframes arcade-slide-in { from { opacity: 0; transform: translateX(18px); } }
@keyframes arcade-spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .arcade-dialog-backdrop, .arcade-dialog, .arcade-toast { animation: none; }
  .arcade-toast, .arcade-loading-backdrop, .arcade-loading-bar-fill { transition: none; }
  /* Spinner slows rather than freezes \u2014 it is the "still working" signal */
  .arcade-loading-spinner { animation-duration: 4s; }
}
`;

// src/integration/css-check.ts
var warned = false;
function warnIfThemeCSSMissing(component) {
  if (warned || typeof document === "undefined") return;
  if (document.getElementById("arcade-engine-theme")) return;
  warned = true;
  console.warn(
    `[arcade-gfx] ${component} was called before ThemeProvider.injectCSS() \u2014 overlays will render unstyled. Call ThemeProvider.injectCSS() during game setup.`
  );
}

// src/integration/dialog.ts
function showDialog(options = {}) {
  if (typeof document === "undefined") {
    return Promise.reject(new Error("showDialog requires a browser environment"));
  }
  warnIfThemeCSSMissing("showDialog");
  return new Promise((resolve) => {
    const previousFocus = document.activeElement;
    const backdrop = document.createElement("div");
    backdrop.className = "arcade-dialog-backdrop";
    const dialog = document.createElement("div");
    dialog.className = "arcade-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    if (options.title) {
      const title = document.createElement("div");
      title.className = "arcade-dialog-title";
      title.textContent = options.title;
      dialog.appendChild(title);
    }
    if (options.body) {
      const body = document.createElement("div");
      body.className = "arcade-dialog-body";
      body.textContent = options.body;
      dialog.appendChild(body);
    }
    const actions = document.createElement("div");
    actions.className = "arcade-dialog-actions";
    const close = (result) => {
      document.removeEventListener("keydown", onKey, true);
      backdrop.remove();
      previousFocus?.focus?.();
      resolve(result);
    };
    if (options.cancelLabel !== null) {
      const cancel = document.createElement("button");
      cancel.className = "arcade-btn";
      cancel.textContent = options.cancelLabel ?? "CANCEL";
      cancel.addEventListener("click", () => close(false));
      actions.appendChild(cancel);
    }
    const confirm = document.createElement("button");
    confirm.className = "arcade-btn" + (options.danger ? " arcade-btn-danger" : "");
    confirm.textContent = options.confirmLabel ?? "CONFIRM";
    confirm.addEventListener("click", () => close(true));
    actions.appendChild(confirm);
    dialog.appendChild(actions);
    backdrop.appendChild(dialog);
    backdrop.addEventListener("mousedown", (e) => {
      if (e.target === backdrop) close(false);
    });
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close(false);
      }
      if (e.key === "Enter") {
        e.stopPropagation();
        close(true);
      }
    };
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(backdrop);
    confirm.focus();
  });
}
async function showAlert(body, title) {
  await showDialog({ title, body, confirmLabel: "OK", cancelLabel: null });
}

// src/integration/toast.ts
var MAX_STACK = 5;
function showToast(message, options = {}) {
  if (typeof document === "undefined") return () => {
  };
  warnIfThemeCSSMissing("showToast");
  const kind = options.kind ?? "info";
  const duration = options.duration ?? 3500;
  let container = document.getElementById("arcade-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "arcade-toast-container";
    document.body.appendChild(container);
  }
  while (container.children.length >= MAX_STACK) {
    container.firstElementChild?.remove();
  }
  const toast = document.createElement("div");
  toast.className = `arcade-toast arcade-toast--${kind}`;
  toast.setAttribute("role", kind === "error" || kind === "warning" ? "alert" : "status");
  if (options.title) {
    const title = document.createElement("div");
    title.className = "arcade-toast-title";
    title.textContent = options.title;
    toast.appendChild(title);
  }
  const body = document.createElement("div");
  body.className = "arcade-toast-body";
  body.textContent = message;
  toast.appendChild(body);
  container.appendChild(toast);
  let timer;
  const dismiss = () => {
    if (timer) clearTimeout(timer);
    if (!toast.isConnected) return;
    toast.classList.add("arcade-toast--leaving");
    setTimeout(() => toast.remove(), 240);
  };
  toast.addEventListener("click", dismiss);
  if (duration > 0) timer = setTimeout(dismiss, duration);
  return dismiss;
}

// src/integration/loading.ts
function showLoading(options = {}) {
  if (typeof document === "undefined") {
    return { setProgress: () => {
    }, setLabel: () => {
    }, done: () => {
    } };
  }
  warnIfThemeCSSMissing("showLoading");
  const backdrop = document.createElement("div");
  backdrop.className = "arcade-loading-backdrop";
  const box = document.createElement("div");
  box.className = "arcade-loading";
  box.innerHTML = `
    <svg class="arcade-loading-spinner" viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
      <circle cx="24" cy="24" r="19" fill="none" stroke="var(--arcade-primary-dim)" stroke-width="2" opacity="0.4"/>
      <circle cx="24" cy="24" r="19" fill="none" stroke="var(--arcade-primary)" stroke-width="2.5"
              stroke-dasharray="34 86" stroke-linecap="butt"/>
      <circle cx="24" cy="24" r="2.2" fill="var(--arcade-primary)"/>
    </svg>`;
  const label = document.createElement("div");
  label.className = "arcade-loading-label";
  label.textContent = options.label ?? "LOADING";
  box.appendChild(label);
  let fill = null;
  if (options.progress) {
    const bar = document.createElement("div");
    bar.className = "arcade-loading-bar";
    fill = document.createElement("div");
    fill.className = "arcade-loading-bar-fill";
    bar.appendChild(fill);
    box.appendChild(bar);
  }
  backdrop.appendChild(box);
  document.body.appendChild(backdrop);
  return {
    setProgress(p) {
      if (fill) fill.style.width = `${Math.max(0, Math.min(1, p)) * 100}%`;
    },
    setLabel(text) {
      label.textContent = text;
    },
    done() {
      backdrop.classList.add("arcade-loading--leaving");
      setTimeout(() => backdrop.remove(), 260);
    }
  };
}
function drawLoadingArc(ctx, theme, opts) {
  const { cx, cy, radius, t } = opts;
  const color = opts.color ?? theme.palette.primary.core;
  const angle = t * 2.4;
  ctx.save();
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.18));
  ctx.lineWidth = Math.max(1.5, radius * 0.1);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = rgbaToCss(withAlpha(color, 0.9));
  ctx.lineWidth = Math.max(2, radius * 0.12);
  ctx.shadowColor = rgbaToCss(withAlpha(color, theme.glow.intensity * 0.6));
  ctx.shadowBlur = theme.glow.outerRadius * 0.6;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, angle, angle + Math.PI * 0.6);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = rgbaToCss(withAlpha(color, 0.8));
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(1.5, radius * 0.11), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export { ThemeProvider, drawLoadingArc, showAlert, showDialog, showLoading, showToast };
//# sourceMappingURL=chunk-5CXJPYYD.js.map
//# sourceMappingURL=chunk-5CXJPYYD.js.map