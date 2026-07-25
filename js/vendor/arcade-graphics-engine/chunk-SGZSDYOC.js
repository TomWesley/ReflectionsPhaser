// src/style/fonts.ts
var FONT_DISPLAY = '"Orbitron", "Rajdhani", sans-serif';
var FONT_BODY = '"Rajdhani", "Segoe UI", sans-serif';
var FONT_MONO = '"Share Tech Mono", "Courier New", monospace';
var FONT_STYLESHEET_URL = "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono&display=swap";
function injectFonts(doc) {
  if (!doc && typeof document === "undefined") return;
  doc = doc ?? document;
  const ID = "arcade-engine-fonts";
  if (doc.getElementById(ID)) return;
  const link = doc.createElement("link");
  link.id = ID;
  link.rel = "stylesheet";
  link.href = FONT_STYLESHEET_URL;
  doc.head.appendChild(link);
}

export { FONT_BODY, FONT_DISPLAY, FONT_MONO, FONT_STYLESHEET_URL, injectFonts };
//# sourceMappingURL=chunk-SGZSDYOC.js.map
//# sourceMappingURL=chunk-SGZSDYOC.js.map