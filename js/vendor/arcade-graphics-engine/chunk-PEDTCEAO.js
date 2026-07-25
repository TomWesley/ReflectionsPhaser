// src/style/validator.ts
var DEFAULT_STYLE_GUIDE = {
  contrastRange: [0.3, 0.85],
  maxPureBlackPercent: 5,
  maxPureWhitePercent: 3,
  minHueVariety: 2,
  brightnessDistribution: [45, 35, 20],
  // dark-dominant, good mid, selective bright
  distributionTolerance: 20,
  minAvgSaturation: 15,
  maxAvgSaturation: 75,
  maxBackgroundPercent: 70,
  minEdgeSharpness: 0.3,
  maxBloomLevel: 40
};
function validateStyle(imageData, guide = DEFAULT_STYLE_GUIDE) {
  const { width: w, height: h, data: d } = imageData;
  const totalPixels = w * h;
  const checks = [];
  const suggestions = [];
  let pureBlack = 0, pureWhite = 0, transparent = 0;
  let darkPx = 0, midPx = 0, brightPx = 0;
  let satSum = 0, satCount = 0;
  const hueBuckets = new Float64Array(12);
  let lumSum = 0, lumSqSum = 0, visibleCount = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
    if (a < 10) {
      transparent++;
      continue;
    }
    visibleCount++;
    const lum = r * 0.299 + g * 0.587 + b * 0.114;
    lumSum += lum;
    lumSqSum += lum * lum;
    if (r < 10 && g < 10 && b < 10) pureBlack++;
    if (r > 245 && g > 245 && b > 245) pureWhite++;
    if (lum < 60) darkPx++;
    else if (lum < 170) midPx++;
    else brightPx++;
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const mx = Math.max(rn, gn, bn), mn = Math.min(rn, gn, bn);
    const l = (mx + mn) / 2;
    if (mx !== mn) {
      const delta = mx - mn;
      const s = l > 0.5 ? delta / (2 - mx - mn) : delta / (mx + mn);
      satSum += s * 100;
      satCount++;
      let hue = 0;
      if (mx === rn) hue = ((gn - bn) / delta + (gn < bn ? 6 : 0)) * 60;
      else if (mx === gn) hue = ((bn - rn) / delta + 2) * 60;
      else hue = ((rn - gn) / delta + 4) * 60;
      if (s > 0.08) {
        hueBuckets[Math.floor(hue / 30) % 12]++;
      }
    }
  }
  if (visibleCount < 10) {
    return {
      passed: false,
      score: 0,
      checks: [{ name: "Visibility", passed: false, score: 0, detail: "Image is nearly empty" }],
      suggestions: ["Image has almost no visible pixels"]
    };
  }
  const avgLum = lumSum / visibleCount;
  const stdLum = Math.sqrt(lumSqSum / visibleCount - avgLum * avgLum);
  const contrastRatio = stdLum / 128;
  const contrastOk = contrastRatio >= guide.contrastRange[0] && contrastRatio <= guide.contrastRange[1];
  checks.push({
    name: "Contrast",
    passed: contrastOk,
    score: contrastOk ? 100 : Math.round(Math.max(0, 100 - Math.abs(contrastRatio - 0.5) * 200)),
    detail: `Contrast ratio: ${contrastRatio.toFixed(3)} (range: ${guide.contrastRange[0]}-${guide.contrastRange[1]})`
  });
  if (!contrastOk) {
    if (contrastRatio < guide.contrastRange[0]) suggestions.push("Increase contrast \u2014 image looks flat");
    else suggestions.push("Reduce contrast \u2014 image is too harsh");
  }
  const blackPct = pureBlack / visibleCount * 100;
  const whitePct = pureWhite / visibleCount * 100;
  const blackOk = blackPct <= guide.maxPureBlackPercent;
  const whiteOk = whitePct <= guide.maxPureWhitePercent;
  checks.push({
    name: "Black levels",
    passed: blackOk,
    score: blackOk ? 100 : Math.round(Math.max(0, 100 - (blackPct - guide.maxPureBlackPercent) * 10)),
    detail: `Pure black: ${blackPct.toFixed(1)}% (max: ${guide.maxPureBlackPercent}%)`
  });
  checks.push({
    name: "White levels",
    passed: whiteOk,
    score: whiteOk ? 100 : Math.round(Math.max(0, 100 - (whitePct - guide.maxPureWhitePercent) * 10)),
    detail: `Pure white: ${whitePct.toFixed(1)}% (max: ${guide.maxPureWhitePercent}%)`
  });
  if (!blackOk) suggestions.push("Too much pure black \u2014 add colored shadows");
  if (!whiteOk) suggestions.push("Too much pure white \u2014 tone down highlights");
  const activeHues = hueBuckets.filter((v) => v > visibleCount * 5e-3).length;
  const hueOk = activeHues >= guide.minHueVariety;
  checks.push({
    name: "Color variety",
    passed: hueOk,
    score: hueOk ? Math.min(100, activeHues * 15) : Math.round(activeHues / guide.minHueVariety * 100),
    detail: `${activeHues} hue ranges active (min: ${guide.minHueVariety})`
  });
  if (!hueOk) suggestions.push("Too monochromatic \u2014 needs more color variety");
  const darkPct = darkPx / visibleCount * 100;
  const midPct = midPx / visibleCount * 100;
  const brightPct = brightPx / visibleCount * 100;
  const tol = guide.distributionTolerance;
  const [targetDark, targetMid, targetBright] = guide.brightnessDistribution;
  const distOk = Math.abs(darkPct - targetDark) <= tol && Math.abs(midPct - targetMid) <= tol && Math.abs(brightPct - targetBright) <= tol;
  const distScore = Math.round(100 - (Math.max(0, Math.abs(darkPct - targetDark) - tol / 2) + Math.max(0, Math.abs(midPct - targetMid) - tol / 2) + Math.max(0, Math.abs(brightPct - targetBright) - tol / 2)) * 2);
  checks.push({
    name: "Brightness distribution",
    passed: distOk,
    score: Math.max(0, distScore),
    detail: `Dark ${darkPct.toFixed(0)}% / Mid ${midPct.toFixed(0)}% / Bright ${brightPct.toFixed(0)}% (target: ${targetDark}/${targetMid}/${targetBright} \xB1${tol})`
  });
  if (!distOk) {
    if (darkPct > targetDark + tol) suggestions.push("Too dark overall \u2014 brighten mid-tones");
    if (brightPct > targetBright + tol) suggestions.push("Too many bright pixels \u2014 reduce bloom or highlights");
    if (midPct < targetMid - tol) suggestions.push("Not enough mid-tones \u2014 image may look too contrasty");
  }
  const avgSat = satCount > 0 ? satSum / satCount : 0;
  const satOk = avgSat >= guide.minAvgSaturation && avgSat <= guide.maxAvgSaturation;
  checks.push({
    name: "Saturation",
    passed: satOk,
    score: satOk ? 100 : Math.round(Math.max(0, 100 - Math.abs(avgSat - 45) * 2)),
    detail: `Avg saturation: ${avgSat.toFixed(1)}% (range: ${guide.minAvgSaturation}-${guide.maxAvgSaturation}%)`
  });
  if (avgSat < guide.minAvgSaturation) suggestions.push("Too desaturated \u2014 boost color vibrancy");
  if (avgSat > guide.maxAvgSaturation) suggestions.push("Oversaturated \u2014 tone down color intensity");
  const bgPct = transparent / totalPixels * 100;
  const bgOk = bgPct <= guide.maxBackgroundPercent;
  checks.push({
    name: "Background ratio",
    passed: bgOk,
    score: bgOk ? 100 : Math.round(Math.max(0, 100 - (bgPct - guide.maxBackgroundPercent) * 2)),
    detail: `Background: ${bgPct.toFixed(0)}% (max: ${guide.maxBackgroundPercent}%)`
  });
  if (!bgOk) suggestions.push("Too much empty space \u2014 asset may be too small in frame");
  const totalScore = Math.round(
    checks.reduce((sum, c) => sum + c.score, 0) / checks.length
  );
  const allPassed = checks.every((c) => c.passed);
  return {
    passed: allPassed,
    score: totalScore,
    checks,
    suggestions
  };
}
function suggestAdjustments(result) {
  const adjustments = {};
  const firstNumber = (s) => {
    const m = s.match(/-?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  };
  const parseRange = (s) => {
    const m = s.match(/range:\s*(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
    return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
  };
  for (const check of result.checks) {
    if (check.passed) continue;
    if (check.name === "Contrast") {
      const value = firstNumber(check.detail);
      const range = parseRange(check.detail);
      if (value !== null && range) {
        adjustments.contrast = value < range[0] ? 0.1 : -0.1;
      }
    }
    if (check.name === "Black levels") {
      adjustments.atmosphere = 0.1;
    }
    if (check.name === "White levels") {
      adjustments.bloom = -0.1;
    }
    if (check.name === "Brightness distribution") {
      const m = check.detail.match(/Dark\s+(\d+)%.*?Bright\s+(\d+)%.*?target:\s*(\d+)\/\d+\/(\d+)/);
      if (m) {
        const [, dark, bright, targetDark, targetBright] = m.map(Number);
        if (dark > targetDark) adjustments.contrast = (adjustments.contrast ?? 0) - 0.05;
        if (bright > targetBright) adjustments.bloom = (adjustments.bloom ?? 0) - 0.1;
      }
    }
    if (check.name === "Saturation") {
      const value = firstNumber(check.detail);
      const range = parseRange(check.detail);
      if (value !== null && range) {
        adjustments.saturation = value < range[0] ? 0.1 : -0.1;
      }
    }
  }
  return adjustments;
}

export { DEFAULT_STYLE_GUIDE, suggestAdjustments, validateStyle };
//# sourceMappingURL=chunk-PEDTCEAO.js.map
//# sourceMappingURL=chunk-PEDTCEAO.js.map