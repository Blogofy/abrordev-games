'use strict';
/* TOWER PALS — hayvonchalar (pals). Har birining o'z o'lchami, rangi va qiyofasi bor.
   gift — shu darajani o'tganda sovg'a sifatida ochiladi (yo'q bo'lsa, boshidan bor).
   Chizish funksiyalari kontekst (c) va vaqtni (t) oladi: o'yinda ham, kolleksiya oynasida ham ishlatiladi. */
const PALS = {
  cat: { name: 'Kitty', w: 100, h: 64, c: '#ffb04a' },
  dog: { name: 'Buddy', w: 128, h: 52, c: '#c98b5a' },
  panda: { name: 'Bamboo', w: 84, h: 76, c: '#f4f4f4' },
  frog: { name: 'Hopper', w: 98, h: 58, c: '#78d36b' },
  pig: { name: 'Oinky', w: 92, h: 66, c: '#ffadc4', gift: 2 },
  chick: { name: 'Peep', w: 72, h: 60, c: '#ffe14d', gift: 4 },
  bunny: { name: 'Bun', w: 74, h: 70, c: '#f3eefb', gift: 6 },
  bear: { name: 'Teddy', w: 96, h: 70, c: '#b07a52', gift: 8 },
  penguin: { name: 'Waddle', w: 70, h: 80, c: '#3b4766', gift: 10 },
  fox: { name: 'Rusty', w: 104, h: 58, c: '#ff8a3d', gift: 12 },
  elephant: { name: 'Jumbo', w: 140, h: 68, c: '#a9b4c8', gift: 15 },
  giraffe: { name: 'Stretch', w: 64, h: 96, c: '#ffc94d', gift: 18 },
  owl: { name: 'Hoot', w: 80, h: 70, c: '#9b7653', gift: 21 },
  unicorn: { name: 'Sparkle', w: 104, h: 66, c: '#fff4fb', gift: 25 },
};
for (const k in PALS) PALS[k].rgb = hex(PALS[k].c);
const PAL_LIST = Object.keys(PALS);
const STARTER_PALS = PAL_LIST.filter(k => !PALS[k].gift);
const giftAt = n => PAL_LIST.find(k => PALS[k].gift === n);

// Yuz sozlamalari: ex/ey — ko'z o'rni (o'lchamga nisbatan), white — oq ko'z soqqasi, nose — burun turi
const FACE = {
  cat: { nose: 'tri', noseCol: '#ff6f91', whisk: true },
  dog: { nose: 'tri', noseCol: '#2b2b33' },
  panda: { nose: 'tri', noseCol: '#2b2b33', white: true, lid: '#ffffff' },
  frog: { white: true, ey: -0.5, mouthY: 0.05, mouth: 'frog' },
  pig: { nose: 'snout' },
  chick: { nose: 'beak' },
  bunny: { nose: 'tri', noseCol: '#ff8fb1', teeth: true },
  bear: { nose: 'muzzle' },
  penguin: { nose: 'beak', white: true, ey: -0.12 },
  fox: { nose: 'tri', noseCol: '#2b2b33' },
  elephant: { nose: 'none', mouthY: 0.3 },
  giraffe: { nose: 'none', ey: -0.2, mouthY: 0.22 },
  owl: { nose: 'beak', big: true, ey: -0.1 },
  unicorn: { nose: 'none', lashes: true },
};

function pDot(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
function pEll(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); c.fill(); }
function pTri(c, x1, y1, x2, y2, x3, y3) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x3, y3); c.closePath(); c.fill(); }

function drawBase(c, w, h) {
  c.fillStyle = '#9c6b3f'; rrect(c, -w / 2, -h / 2, w, h, 8); c.fill();
  c.fillStyle = '#b98252'; rrect(c, -w / 2, -h / 2, w, h * 0.45, 8); c.fill();
  c.strokeStyle = 'rgba(70,40,20,0.5)'; c.lineWidth = 2;
  for (let x = -w / 2 + w / 5; x < w / 2; x += w / 5) { c.beginPath(); c.moveTo(x, -h / 2 + 3); c.lineTo(x, h / 2 - 3); c.stroke(); }
  c.strokeStyle = '#6e4626'; c.lineWidth = 3; rrect(c, -w / 2, -h / 2, w, h, 8); c.stroke();
}

// Tananing orqasida chiziladigan qismlar: quloqlar, qanotlar, dum, shox...
function petBack(c, kind, w, h, col, dark, t, seed, legs) {
  switch (kind) {
    case 'cat':
      for (const s of [-1, 1]) {
        c.fillStyle = rgb(col); pTri(c, s * w * 0.44, -h * 0.25, s * w * 0.36, -h * 0.82, s * w * 0.1, -h * 0.42);
        c.fillStyle = '#ff9ab8'; pTri(c, s * w * 0.38, -h * 0.4, s * w * 0.34, -h * 0.68, s * w * 0.2, -h * 0.46);
      }
      break;
    case 'panda': c.fillStyle = '#2b2b33'; for (const s of [-1, 1]) pDot(c, s * w * 0.36, -h * 0.44, h * 0.19); break;
    case 'pig': c.fillStyle = rgb(mix(col, [200, 60, 100], 0.25)); for (const s of [-1, 1]) pTri(c, s * w * 0.42, -h * 0.3, s * w * 0.38, -h * 0.72, s * w * 0.16, -h * 0.44); break;
    case 'chick': {
      c.strokeStyle = rgb(col); c.lineWidth = 4; c.lineCap = 'round';
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 5, -h * 0.45); c.quadraticCurveTo(i * 9, -h * 0.75, i * 3 + 4, -h * 0.72); c.stroke(); }
      const flap = legs ? Math.sin(t * 22 + seed) * 0.6 : 0.15;
      c.fillStyle = rgb(mix(col, [230, 150, 0], 0.3));
      for (const s of [-1, 1]) { c.save(); c.translate(s * w * 0.46, -h * 0.02); c.rotate(s * (0.4 + flap)); pEll(c, s * 8, 0, 12, 7); c.restore(); }
      break;
    }
    case 'bunny':
      for (const s of [-1, 1]) {
        c.save(); c.translate(s * w * 0.2, -h * 0.4); c.rotate(s * 0.14 + Math.sin(t * 3 + seed + s) * 0.06);
        c.fillStyle = rgb(col); pEll(c, 0, -h * 0.34, w * 0.13, h * 0.38);
        c.lineWidth = 3; c.strokeStyle = dark; c.stroke();
        c.fillStyle = '#ffb3cc'; pEll(c, 0, -h * 0.32, w * 0.06, h * 0.28);
        c.restore();
      }
      break;
    case 'bear':
      for (const s of [-1, 1]) { c.fillStyle = rgb(col); pDot(c, s * w * 0.36, -h * 0.42, h * 0.17); c.lineWidth = 3; c.strokeStyle = dark; c.stroke(); c.fillStyle = rgb(mix(col, [255, 230, 200], 0.5)); pDot(c, s * w * 0.36, -h * 0.42, h * 0.09); }
      break;
    case 'penguin': {
      const flap = legs ? Math.sin(t * 18 + seed) * 0.5 : 0;
      c.fillStyle = rgb(mix(col, [0, 0, 0], 0.2));
      for (const s of [-1, 1]) { c.save(); c.translate(s * w * 0.46, -h * 0.05); c.rotate(s * (0.35 + flap)); pEll(c, 0, h * 0.18, w * 0.12, h * 0.3); c.restore(); }
      break;
    }
    case 'fox': {
      c.save(); c.translate(w * 0.42, h * 0.1); c.rotate(-0.5 + Math.sin(t * 4 + seed) * 0.15);
      c.fillStyle = rgb(col); pEll(c, w * 0.18, 0, w * 0.24, h * 0.26); c.lineWidth = 3; c.strokeStyle = dark; c.stroke();
      c.fillStyle = '#ffffff'; pEll(c, w * 0.34, 0, w * 0.09, h * 0.14);
      c.restore();
      for (const s of [-1, 1]) {
        c.fillStyle = rgb(col); pTri(c, s * w * 0.42, -h * 0.25, s * w * 0.34, -h * 0.95, s * w * 0.1, -h * 0.42);
        c.fillStyle = '#3a2a2a'; pTri(c, s * w * 0.37, -h * 0.72, s * w * 0.34, -h * 0.95, s * w * 0.28, -h * 0.74);
      }
      break;
    }
    case 'elephant':
      for (const s of [-1, 1]) {
        c.save(); c.translate(s * w * 0.42, -h * 0.02); c.rotate(s * Math.sin(t * 2.5 + seed) * 0.12);
        c.fillStyle = rgb(mix(col, [90, 100, 130], 0.2)); pEll(c, s * w * 0.05, 0, w * 0.17, h * 0.44); c.lineWidth = 3; c.strokeStyle = dark; c.stroke();
        c.fillStyle = '#f5b8c8'; pEll(c, s * w * 0.06, 0, w * 0.1, h * 0.28);
        c.restore();
      }
      break;
    case 'giraffe':
      c.strokeStyle = rgb(mix(col, [140, 80, 20], 0.5)); c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); for (const s of [-1, 1]) { c.moveTo(s * w * 0.18, -h * 0.45); c.lineTo(s * w * 0.2, -h * 0.66); } c.stroke();
      c.fillStyle = '#8a5a2b'; for (const s of [-1, 1]) pDot(c, s * w * 0.2, -h * 0.68, 5);
      c.fillStyle = rgb(col); for (const s of [-1, 1]) pEll(c, s * w * 0.5, -h * 0.32, w * 0.14, h * 0.06, s * 0.4);
      break;
    case 'owl':
      c.fillStyle = rgb(mix(col, [40, 20, 10], 0.25));
      for (const s of [-1, 1]) { pTri(c, s * w * 0.46, -h * 0.3, s * w * 0.42, -h * 0.72, s * w * 0.16, -h * 0.42); c.save(); c.translate(s * w * 0.48, h * 0.05); c.rotate(s * (0.25 + (legs ? Math.sin(t * 16) * 0.5 : 0))); pEll(c, 0, 0, w * 0.1, h * 0.32); c.restore(); }
      break;
    case 'unicorn': {
      const RB = ['#ff6b9d', '#ffb347', '#ffe66d', '#7ae582', '#6ec6ff', '#b388ff'];
      RB.forEach((cl, i) => { c.fillStyle = cl; pEll(c, -w * 0.36 + i * 4, -h * 0.36 + i * 7, w * 0.13, h * 0.16, -0.6); });
      c.save(); c.translate(w * 0.1, -h * 0.45);
      c.fillStyle = '#ffd166'; pTri(c, -8, 0, 0, -h * 0.55, 8, 0);
      c.strokeStyle = '#e09a00'; c.lineWidth = 2; c.beginPath(); for (let i = 1; i < 4; i++) { const y = -i * h * 0.12, hw = 8 * (1 - (i * 0.12 * h) / (h * 0.55)); c.moveTo(-hw, y + 4); c.lineTo(hw, y - 2); } c.stroke();
      c.restore();
      break;
    }
  }
}

// Tana ustidagi naqshlar (dog'lar, tumshuq, xartum ...)
function petFront(c, kind, w, h, col, dark, t, seed, ex, ey, er) {
  switch (kind) {
    case 'panda': c.fillStyle = '#2b2b33'; for (const s of [-1, 1]) pEll(c, s * ex, ey + 1, er * 1.5, er * 1.9, s * 0.5); break;
    case 'dog':
      c.fillStyle = rgb(mix(col, [60, 30, 10], 0.45));
      pEll(c, w * 0.3, h * 0.05, w * 0.1, h * 0.18, 0.3);
      for (const s of [-1, 1]) { c.save(); c.translate(s * w * 0.4, -h * 0.25); c.rotate(s * (0.25 + Math.sin(t * 6 + seed) * 0.15)); pEll(c, 0, h * 0.25, w * 0.07, h * 0.32); c.restore(); }
      break;
    case 'cat':
      c.fillStyle = rgb(mix(col, [180, 80, 0], 0.35));
      for (let i = -1; i <= 1; i++) pTri(c, i * 9 - 3, -h / 2 + 2, i * 9 + 3, -h / 2 + 2, i * 9, -h / 2 + 12);
      break;
    case 'frog':
      for (const s of [-1, 1]) { c.fillStyle = rgb(col); pDot(c, s * w * 0.24, -h * 0.48, h * 0.24); c.lineWidth = 3; c.strokeStyle = dark; c.stroke(); }
      break;
    case 'penguin': c.fillStyle = '#ffffff'; pEll(c, 0, h * 0.08, w * 0.36, h * 0.4); break;
    case 'fox': c.fillStyle = '#ffffff'; pEll(c, 0, h * 0.24, w * 0.3, h * 0.22); break;
    case 'bear': c.fillStyle = rgb(mix(col, [255, 230, 200], 0.55)); pEll(c, 0, ey + er * 2, er * 2.3, er * 1.5); c.fillStyle = '#3a2420'; pEll(c, 0, ey + er * 1.5, er * 0.8, er * 0.55); break;
    case 'giraffe': {
      c.fillStyle = rgb(mix(col, [160, 90, 20], 0.55));
      for (const [x, y, r] of [[-0.32, -0.32, 0.1], [0.3, -0.36, 0.08], [-0.34, 0.25, 0.09], [0.33, 0.2, 0.11], [0.05, 0.4, 0.07], [-0.1, -0.42, 0.06]]) pEll(c, x * w, y * h, r * w, r * w * 0.8, x);
      c.fillStyle = rgb(mix(col, [255, 240, 200], 0.5)); pEll(c, 0, h * 0.08, w * 0.3, h * 0.14);
      c.fillStyle = '#6b3f1f'; pDot(c, -w * 0.09, h * 0.06, 2.5); pDot(c, w * 0.09, h * 0.06, 2.5);
      break;
    }
    case 'elephant': {
      c.strokeStyle = rgb(col); c.lineCap = 'round'; c.lineWidth = 14;
      const sw = Math.sin(t * 2 + seed) * 4;
      c.beginPath(); c.moveTo(0, ey + er * 1.2); c.quadraticCurveTo(sw, h * 0.38, w * 0.07 + sw, h * 0.42); c.stroke();
      c.strokeStyle = dark; c.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const y = ey + er * 2 + i * 6; c.beginPath(); c.moveTo(-5 + sw * 0.4, y); c.lineTo(5 + sw * 0.4, y); c.stroke(); }
      c.fillStyle = '#ffffff'; for (const s of [-1, 1]) pTri(c, s * 10, ey + er * 1.6, s * 18, ey + er * 1.8, s * 14, ey + er * 3.2);
      break;
    }
    case 'owl':
      c.strokeStyle = rgb(mix(col, [255, 240, 220], 0.5)); c.lineWidth = 2;
      for (let r = 0; r < 2; r++) for (let i = -1; i <= 1; i++) { const x = i * 12 + (r % 2) * 6 - 3, y = h * 0.22 + r * 8; c.beginPath(); c.moveTo(x - 4, y - 2); c.lineTo(x, y + 2); c.lineTo(x + 4, y - 2); c.stroke(); }
      break;
    case 'unicorn': {
      const tw = 0.6 + 0.4 * Math.sin(t * 5 + seed);
      c.save(); c.translate(w * 0.34, -h * 0.18); c.scale(tw, tw); c.fillStyle = '#ffd166'; starPath(c, 7, 3); c.fill(); c.restore();
      break;
    }
  }
}

function petFace(c, kind, w, h, mood, seed, t, ex, ey, er) {
  const F = FACE[kind] || {}, ink = '#2b2033', lid = F.lid || ink;
  const blink = mood === 'idle' && (t + seed) % 3.6 < 0.13;
  c.lineCap = 'round';
  if (F.big) for (const s of [-1, 1]) { c.fillStyle = '#fff3c4'; pDot(c, s * ex, ey, er * 1.75); c.strokeStyle = '#e8a33a'; c.lineWidth = 3; c.stroke(); }
  if (mood === 'happy') {
    c.strokeStyle = lid; c.lineWidth = 3;
    for (const s of [-1, 1]) { c.beginPath(); c.arc(s * ex, ey + 2, er * 0.8, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); }
  } else if (mood === 'scared') {
    for (const s of [-1, 1]) { c.fillStyle = '#ffffff'; pDot(c, s * ex, ey, er * 1.15); c.fillStyle = ink; pDot(c, s * ex, ey, er * 0.45); }
  } else if (blink) {
    c.strokeStyle = lid; c.lineWidth = 3;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * ex - er * 0.8, ey); c.lineTo(s * ex + er * 0.8, ey); c.stroke(); }
  } else {
    const lookY = mood === 'look' ? er * 0.35 : 0;
    for (const s of [-1, 1]) {
      if (F.white) { c.fillStyle = '#ffffff'; pDot(c, s * ex, ey, er * 1.05); }
      c.fillStyle = ink; pEll(c, s * ex, ey + lookY, er * 0.7, er * 0.85);
      c.fillStyle = '#ffffff'; pDot(c, s * ex + er * 0.25, ey + lookY - er * 0.35, er * 0.28);
    }
  }
  if (F.lashes && mood !== 'scared') {
    c.strokeStyle = ink; c.lineWidth = 2;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * (ex + er * 0.7), ey - er * 0.6); c.lineTo(s * (ex + er * 1.3), ey - er * 1.1); c.stroke(); }
  }
  const my = F.mouthY != null ? F.mouthY * h : ey + er * 2.2;
  if (F.nose === 'snout') {
    c.fillStyle = rgb(mix(PALS.pig.rgb, [200, 60, 100], 0.3)); pEll(c, 0, ey + er * 1.9, er * 1.5, er * 1.05);
    c.fillStyle = ink; for (const s of [-1, 1]) pEll(c, s * er * 0.55, ey + er * 1.9, er * 0.25, er * 0.4);
    return petCheeks(c, ex, ey, er);
  }
  if (F.nose === 'beak') {
    c.fillStyle = '#ff9f1c'; pTri(c, -er, ey + er * 1.3, er, ey + er * 1.3, 0, ey + er * (mood === 'scared' ? 3.2 : 2.5));
    return petCheeks(c, ex, ey, er);
  }
  if (F.nose === 'tri') { c.fillStyle = F.noseCol; pTri(c, -er * 0.5, ey + er * 1.2, er * 0.5, ey + er * 1.2, 0, ey + er * 1.75); }
  c.strokeStyle = ink; c.lineWidth = 2.5; c.fillStyle = ink;
  if (mood === 'scared') pEll(c, 0, my + 2, er * 0.55, er * 0.75);
  else if (mood === 'happy') {
    c.beginPath(); c.arc(0, my - 1, er * 0.9, 0, Math.PI); c.closePath(); c.fill();
    c.fillStyle = '#ff6f91'; c.beginPath(); c.arc(0, my + er * 0.45, er * 0.4, 0, Math.PI); c.fill();
  } else if (mood === 'nervous') {
    c.beginPath(); c.moveTo(-er, my); for (let i = 1; i <= 4; i++) c.lineTo(-er + i * er * 0.5, my + (i % 2 ? -2 : 2)); c.stroke();
  } else if (F.mouth === 'frog') {
    c.beginPath(); c.arc(0, my - er, er * 1.8, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
  } else {
    c.beginPath(); c.arc(-er * 0.45, my, er * 0.45, 0, Math.PI); c.arc(er * 0.45, my, er * 0.45, 0, Math.PI); c.stroke();
  }
  if (F.teeth && mood !== 'scared') { c.fillStyle = '#ffffff'; c.fillRect(-er * 0.5, my + er * 0.35, er * 0.45, er * 0.55); c.fillRect(er * 0.05, my + er * 0.35, er * 0.45, er * 0.55); }
  if (F.whisk) {
    c.strokeStyle = 'rgba(60,30,20,0.5)'; c.lineWidth = 1.5;
    for (const s of [-1, 1]) for (const k of [-1, 1]) { c.beginPath(); c.moveTo(s * ex * 1.4, ey + er * 1.6 + k * 3); c.lineTo(s * ex * 2.3, ey + er * 1.4 + k * 6); c.stroke(); }
  }
  petCheeks(c, ex, ey, er);
  if (mood === 'nervous') {
    const sx = ex + er * 2.2, sy = ey - er + Math.sin(t * 4 + seed) * 2;
    c.fillStyle = '#7fd4ff'; c.beginPath(); c.moveTo(sx, sy - 7); c.quadraticCurveTo(sx + 5, sy + 1, sx, sy + 4); c.quadraticCurveTo(sx - 5, sy + 1, sx, sy - 7); c.fill();
  }
}
function petCheeks(c, ex, ey, er) {
  c.fillStyle = 'rgba(255,110,150,0.45)';
  for (const s of [-1, 1]) pEll(c, s * (ex + er * 1.3), ey + er * 1.4, er * 0.75, er * 0.5);
}

// mood: idle | happy | look | scared | nervous;  legs — osilib/qulab turganda oyoqchalar qimirlaydi
function drawPet(c, kind, w, h, mood, seed, legs, t) {
  if (kind === 'base') { drawBase(c, w, h); return; }
  const K = PALS[kind], col = K.rgb, dark = rgb(mix(col, [50, 25, 40], 0.35)), light = rgb(mix(col, [255, 255, 255], 0.5));
  const F = FACE[kind] || {}, ex = Math.min(w * 0.17, 18) * (F.big ? 1.15 : 1), ey = (F.ey != null ? F.ey : -0.08) * h, er = clamp(h * 0.095, 5, 7.5);
  petBack(c, kind, w, h, col, dark, t, seed, legs);
  if (legs) {
    const sw = Math.sin(t * 10 + seed) * 0.45;
    c.fillStyle = kind === 'penguin' || kind === 'chick' || kind === 'owl' ? '#ff9f1c' : dark;
    for (const s of [-1, 1]) { c.save(); c.translate(s * w * 0.24, h / 2 - 6); c.rotate(sw * s); rrect(c, -6, 0, 12, 16, 6); c.fill(); c.restore(); }
  }
  c.fillStyle = rgb(col); rrect(c, -w / 2, -h / 2, w, h, Math.min(w, h) * 0.32); c.fill();
  c.lineWidth = 3; c.strokeStyle = dark; c.stroke();
  if (kind !== 'penguin' && kind !== 'giraffe') { c.fillStyle = light; pEll(c, 0, h * 0.24, w * 0.26, h * 0.18); }
  c.fillStyle = 'rgba(255,255,255,0.4)'; rrect(c, -w / 2 + 8, -h / 2 + 5, w * 0.36, 6, 3); c.fill();
  petFront(c, kind, w, h, col, dark, t, seed, ex, ey, er);
  petFace(c, kind, w, h, mood, seed, t, ex, ey, er);
}

// Kolleksiya va "keyingi" belgisi uchun: hayvonchani (x, y) markazda, berilgan o'lchamga sig'dirib chizadi
function drawPetIcon(c, kind, x, y, size, mood, t, legs = false) {
  const K = PALS[kind], sc = size / Math.max(K.w, K.h * 1.35);
  c.save(); c.translate(x, y + K.h * sc * 0.12); c.scale(sc, sc);
  drawPet(c, kind, K.w, K.h, mood, 0, legs, t);
  c.restore();
}
