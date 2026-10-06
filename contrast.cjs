const fs = require('fs');

const d = require('./src/data/luminance.json');

function hexToL(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(x => x+x).join('');
  let r = parseInt(hex.substring(0,2), 16) / 255;
  let g = parseInt(hex.substring(2,4), 16) / 255;
  let b = parseInt(hex.substring(4,6), 16) / 255;
  
  const map = c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
  return 0.2126 * map(r) + 0.7152 * map(g) + 0.0722 * map(b);
}

const colorsL = {
  ink: hexToL('0A0A0A'), // text on light
  ice: hexToL('BFE0DD'), // teal-ice text on dark (wait, chapter-text uses ice, maybe ice-dim?)
  cobaltText: hexToL('1F5A9E'),
  orange: hexToL('FF8A3D'),
};

function contrast(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function analyze(clip, textL, eyebrowL) {
  let minText = 100, minEyebrow = 100;
  for (const f of clip) {
    const bgL = f.luminance;
    const cText = contrast(bgL, textL);
    const cEyebrow = contrast(bgL, eyebrowL);
    if (cText < minText) minText = cText;
    if (cEyebrow < minEyebrow) minEyebrow = cEyebrow;
  }
  return { minText, minEyebrow };
}

console.log('clips01 (Light):', analyze(d.clips01, colorsL.ink, colorsL.cobaltText));
console.log('clips02 (Light):', analyze(d.clips02, colorsL.ink, colorsL.cobaltText));
console.log('clips03 (Dark):', analyze(d.clips03, colorsL.ice, colorsL.orange));
console.log('clips04 (Dark):', analyze(d.clips04, colorsL.ice, colorsL.orange));
