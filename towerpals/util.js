'use strict';
/* TOWER PALS — umumiy yordamchilar. Boshqa skriptlardan oldin yuklanadi (index.html tartibi muhim). */
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const easeOutBack = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const pickOne = a => a[(Math.random() * a.length) | 0];
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }; // n -> doimiy 0..1
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", Arial, sans-serif';

function rrect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

// Yumshoq yorug'lik dog'i (oldindan chizilgan sprite — har kadrda gradient yaratmaslik uchun)
function makeGlow(r, g, b) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${r},${g},${b},0.9)`); gr.addColorStop(0.35, `rgba(${r},${g},${b},0.35)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return c;
}
const GLOW = { y: makeGlow(255, 210, 90), w: makeGlow(255, 255, 255), r: makeGlow(170, 60, 140), p: makeGlow(255, 110, 200), c: makeGlow(110, 220, 255), o: makeGlow(255, 130, 50), g: makeGlow(120, 255, 170) };

function starPath(c, ro, ri) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? ri : ro, a = -Math.PI / 2 + (i * Math.PI) / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  c.closePath();
}
function drawStarIcon(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  starPath(c, 14, 6); c.fillStyle = '#ffd23f'; c.fill();
  c.lineWidth = 2.5; c.strokeStyle = '#ff9f1c'; c.lineJoin = 'round'; c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(-3, -4, 2.5, 0, TAU); c.fill();
  c.restore();
}
// Doimiy tasodifiy sonlar (bir xil daraja har doim bir xil sozlamaga ega bo'lsin)
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
