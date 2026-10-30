'use strict';
/* KITE — varraklar to'plami. Har birining o'z shakli (BODY), dumi (TAIL) va ranglari bor.
   Chizish funksiyalari o'yin holatiga bog'liq emas: kontekst (c) va vaqt (t) beriladi,
   shuning uchun do'kondagi rasmlar ham aynan shular bilan chiziladi.
   att — dum boshlanadigan nuqta (varrakning o'z koordinatalarida, burilishdan oldin). */
const KITES = [
  { id: 'classic', name: 'Classic', price: 0, tail: 'bows', n: 14, seg: 9, att: [0, 30], cols: ['#ef476f', '#ffd166', '#118ab2', '#06d6a0'] },
  { id: 'swift', name: 'Swift', price: 100, tail: 'ribbons', n: 15, seg: 10, att: [0, 4], cols: ['#00b4d8', '#ffffff', '#ff5d73', '#0077b6'] },
  { id: 'flutter', name: 'Flutter', price: 250, tail: 'twin', n: 12, seg: 9, att: [0, 26], cols: ['#ff5fa2', '#ffb347', '#5b2a86', '#fff275'] },
  { id: 'koi', name: 'Koi', price: 400, tail: 'streamers', n: 13, seg: 9, att: [-40, 22], cols: ['#ffffff', '#ff5a36', '#1d1d3b', '#ffd23f'] },
  { id: 'boxy', name: 'Boxy', price: 600, tail: 'bows', n: 14, seg: 9, att: [0, 30], cols: ['#ffcf3a', '#3a86ff', '#ff006e', '#8338ec'] },
  { id: 'octo', name: 'Octo', price: 900, tail: 'tentacles', n: 12, seg: 8, att: [0, 12], cols: ['#b5179e', '#f72585', '#ffd6ff', '#4cc9f0'] },
  { id: 'dragon', name: 'Dragon', price: 1400, tail: 'dragon', n: 20, seg: 10, att: [0, 10], cols: ['#e63946', '#ffd23f', '#2a9d8f', '#1d1d3b'] },
  { id: 'phoenix', name: 'Phoenix', price: 2000, tail: 'flame', n: 15, seg: 10, att: [0, 24], cols: ['#ff7b00', '#ffd000', '#ff2e63', '#fff3b0'], glow: 'o' },
];
const kiteById = id => KITES.find(k => k.id === id) || KITES[0];

// ---------- Umumiy bo'laklar ----------
function kTri(c, a, b, d, col) { c.fillStyle = col; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.closePath(); c.fill(); }
function kPoly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
function kRim(c, pts) { c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 2.2; c.lineJoin = 'round'; kPoly(c, pts); c.stroke(); }
function kDot(c, x, y, r) { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); }

// Yuz: hamma varraklarda bir xil "xarakter" — ko'zlar tezlikka qarab qaraydi, qo'rqqanda og'zi ochiladi
function kiteFace(c, x, y, s, f) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineCap = 'round';
  if (f.dead) {
    c.strokeStyle = '#1b1530'; c.lineWidth = 2.4; c.beginPath();
    for (const ex of [-7, 7]) { c.moveTo(ex - 4, -6); c.lineTo(ex + 4, 2); c.moveTo(ex + 4, -6); c.lineTo(ex - 4, 2); }
    c.moveTo(-5, 11); c.quadraticCurveTo(-2, 8, 0, 11); c.quadraticCurveTo(2, 14, 5, 11); c.stroke();
  } else {
    const ly = clamp((f.vy || 0) / 500, -1, 1) * 1.8;
    for (const ex of [-7, 7]) {
      c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(ex, -2, 5.5, f.blink ? 0.8 : 6, 0, 0, TAU); c.fill();
      if (!f.blink) {
        c.fillStyle = '#1b1530'; c.beginPath(); c.arc(ex + 1.6, -2 + ly, 3, 0, TAU); c.fill();
        c.fillStyle = '#ffffff'; c.beginPath(); c.arc(ex + 2.6, -3.5 + ly, 1, 0, TAU); c.fill();
      }
    }
    if (f.surprise > 0) { c.fillStyle = '#1b1530'; c.beginPath(); c.ellipse(0, 11, 3.5, 4.5, 0, 0, TAU); c.fill(); }
    else { c.strokeStyle = '#1b1530'; c.lineWidth = 2.2; c.beginPath(); c.arc(0, 8, 5, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); }
    c.fillStyle = 'rgba(255,120,150,0.55)'; c.beginPath(); kDot(c, -12, 7, 3); kDot(c, 12, 7, 3); c.fill();
  }
  c.restore();
}

// ---------- Varrak tanalari ----------
const BODY = {
  classic(c, k, t, f) {
    const C = k.cols, tp = [0, -34], rp = [24, -8], bp = [0, 30], lp = [-24, -8], cp = [0, -8];
    c.save(); c.scale(1 + Math.sin(t * 15) * 0.04, 1); // yelkan shamolda egiladi
    kTri(c, tp, lp, cp, C[0]); kTri(c, tp, rp, cp, C[1]); kTri(c, lp, bp, cp, C[2]); kTri(c, rp, bp, cp, C[3]);
    kTri(c, tp, rp, cp, 'rgba(0,0,0,0.1)'); kTri(c, rp, bp, cp, 'rgba(0,0,0,0.1)');
    c.strokeStyle = '#6b3e26'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -34); c.lineTo(0, 30); c.moveTo(-24, -8); c.lineTo(24, -8); c.stroke();
    kRim(c, [tp, rp, bp, lp]);
    c.restore();
    kiteFace(c, 0, -8, 1, f);
  },
  swift(c, k, t, f) {
    // Delta (uchburchak) varrak: qanot uchlari shamolda titraydi
    const C = k.cols, fl = Math.sin(t * 14) * 1.6, n = [0, -34], l = [-40, 14 + fl], r = [40, 14 - fl], m = [0, 4];
    kTri(c, n, l, m, C[0]); kTri(c, n, r, m, C[3]);
    c.save(); kPoly(c, [n, r, m, l]); c.clip();
    c.fillStyle = C[1]; c.fillRect(-44, -7, 88, 6); c.fillRect(-44, 6, 88, 3);
    c.fillStyle = C[2]; c.fillRect(-44, 0, 88, 5);
    c.restore();
    c.strokeStyle = '#4a2c1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -34); c.lineTo(0, 4); c.moveTo(-28, 6); c.lineTo(28, 6); c.stroke();
    kRim(c, [n, r, m, l]);
    kiteFace(c, 0, -13, 0.85, f);
  },
  flutter(c, k, t, f) {
    // Kapalak: qanotlari qoqiladi
    const C = k.cols, fl = 0.68 + 0.32 * Math.abs(Math.sin(t * 9));
    for (const sx of [-1, 1]) {
      c.save(); c.scale(sx * fl, 1);
      const g = c.createLinearGradient(0, -34, 38, 10); g.addColorStop(0, C[1]); g.addColorStop(1, C[0]);
      c.fillStyle = g;
      c.beginPath(); c.moveTo(2, -6); c.bezierCurveTo(8, -42, 46, -38, 38, -10); c.bezierCurveTo(34, 2, 16, 2, 2, 0); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2; c.stroke();
      c.fillStyle = C[0]; c.beginPath(); c.moveTo(2, 2); c.bezierCurveTo(28, 2, 32, 26, 18, 30); c.bezierCurveTo(8, 32, 3, 18, 2, 6); c.fill(); c.stroke();
      c.fillStyle = C[3]; c.beginPath(); kDot(c, 24, -18, 6); kDot(c, 15, 16, 4); c.fill();
      c.fillStyle = C[2]; c.beginPath(); kDot(c, 32, -12, 3); kDot(c, 24, -18, 2.5); c.fill();
      c.restore();
    }
    c.fillStyle = C[2]; c.beginPath(); c.ellipse(0, 8, 5, 20, 0, 0, TAU); c.fill();
    c.strokeStyle = C[2]; c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-4, -24); c.quadraticCurveTo(-8, -40, -16, -42); c.moveTo(4, -24); c.quadraticCurveTo(8, -40, 16, -42); c.stroke();
    c.fillStyle = C[3]; c.beginPath(); kDot(c, -16, -42, 3); kDot(c, 16, -42, 3); c.fill();
    c.fillStyle = C[2]; c.beginPath(); c.arc(0, -16, 12, 0, TAU); c.fill();
    kiteFace(c, 0, -17, 0.62, f);
  },
  koi(c, k, t, f) {
    // Koi baliq (shamol xalta): oldinga qarab suzadi, dumi to'lg'anadi
    const C = k.cols, w = Math.sin(t * 8);
    c.save(); c.rotate(-0.5);
    c.fillStyle = C[1];
    c.beginPath(); c.moveTo(-26, 0); c.quadraticCurveTo(-38, -14 + w * 3, -50, -18 + w * 6); c.quadraticCurveTo(-44, 0, -50, 18 + w * 6); c.quadraticCurveTo(-38, 14 + w * 3, -26, 0); c.fill();
    c.beginPath(); c.moveTo(-10, -13); c.quadraticCurveTo(0, -30, 14, -14); c.fill();
    c.beginPath(); c.ellipse(4, 15, 9, 4, 0.5 + w * 0.15, 0, TAU); c.fill();
    const g = c.createLinearGradient(0, -16, 0, 16); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#ffe1d2');
    c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 32, 16, 0, 0, TAU); c.fill();
    c.save(); c.clip();
    c.fillStyle = C[1];
    c.beginPath(); c.ellipse(-8, -9, 13, 9, 0.2, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(16, -11, 8, 7, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(-20, 7, 9, 6, 0, 0, TAU); c.fill();
    c.fillStyle = C[2]; c.beginPath(); c.ellipse(2, -13, 4, 3, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.1)'; c.lineWidth = 1.2; c.beginPath();
    for (let x = -22; x < 14; x += 7) for (let y = -9; y <= 9; y += 6) { c.moveTo(x + 2.2, y - 2.7); c.arc(x, y, 3.5, -0.9, 0.9); }
    c.stroke();
    c.restore();
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, 32, 16, 0, 0, TAU); c.stroke();
    c.strokeStyle = C[1]; c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(30, 5); c.quadraticCurveTo(38, 9 + w * 2, 35, 15); c.stroke();
    kiteFace(c, 15, -3, 0.7, f);
    c.restore();
  },
  boxy(c, k, t, f) {
    // Quti varrak: ikki katak, yonidan hajm ko'rinadi
    const C = k.cols, d = 9, e = -7, cells = [[-34, 28, C[0], C[2], 2], [8, 22, C[1], C[3], 9]];
    for (const [y0, h, col] of cells) {
      c.fillStyle = col; c.beginPath(); c.moveTo(18, y0); c.lineTo(18 + d, y0 + e); c.lineTo(18 + d, y0 + h + e); c.lineTo(18, y0 + h); c.closePath(); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fill();
    }
    c.strokeStyle = '#6b3e26'; c.lineWidth = 2.2; c.beginPath();
    c.moveTo(-18, -34); c.lineTo(-18, 30); c.moveTo(18, -34); c.lineTo(18, 30); c.moveTo(18 + d, -34 + e); c.lineTo(18 + d, 30 + e); c.stroke();
    for (const [y0, h, col, st, sy] of cells) {
      c.fillStyle = col; c.fillRect(-18, y0, 36, h);
      c.fillStyle = st; c.fillRect(-18, y0 + sy, 36, 4);
      c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2; c.strokeRect(-18, y0, 36, h);
    }
    kiteFace(c, 0, -18, 0.68, f);
  },
  octo(c, k, t, f) {
    // Sakkizoyoq: gumbaz bosh, paypaslagichlari dumda
    const C = k.cols;
    const g = c.createRadialGradient(-8, -16, 3, 0, -4, 32); g.addColorStop(0, C[2]); g.addColorStop(0.35, C[1]); g.addColorStop(1, C[0]);
    c.fillStyle = g; c.beginPath(); c.moveTo(-26, 12); c.bezierCurveTo(-32, -36, 32, -36, 26, 12); c.quadraticCurveTo(0, 20, -26, 12); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); kDot(c, -13, -14, 4); kDot(c, 11, -18, 3); kDot(c, 16, -5, 2.5); c.fill();
    kiteFace(c, 0, -2, 1, f);
  },
  dragon(c, k, t, f) {
    // Ajdaho boshi: tikanli yoqa, shoxlar, mo'ylovlar
    const C = k.cols;
    c.fillStyle = C[2]; c.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, r = i % 2 ? 24 : 34 + Math.sin(t * 6 + i) * 2; c.lineTo(Math.cos(a) * r, -4 + Math.sin(a) * r); }
    c.closePath(); c.fill();
    c.strokeStyle = C[1]; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-10, -22); c.quadraticCurveTo(-22, -38, -12, -48); c.moveTo(10, -22); c.quadraticCurveTo(22, -38, 12, -48); c.stroke();
    const g = c.createRadialGradient(-8, -14, 3, 0, -4, 28); g.addColorStop(0, '#ff7b7b'); g.addColorStop(1, C[0]);
    c.fillStyle = g; c.beginPath(); c.ellipse(0, -4, 24, 22, 0, 0, TAU); c.fill();
    c.fillStyle = C[1]; c.beginPath(); c.ellipse(0, 12, 15, 9, 0, 0, TAU); c.fill();
    c.fillStyle = C[3]; c.beginPath(); kDot(c, -5, 10, 2); kDot(c, 5, 10, 2); c.fill();
    c.strokeStyle = C[1]; c.lineWidth = 2.2; c.beginPath();
    for (const sx of [-1, 1]) { c.moveTo(sx * 12, 14); c.quadraticCurveTo(sx * 30, 18 + Math.sin(t * 5) * 5, sx * 40, 6 + Math.sin(t * 5 + 1) * 6); }
    c.stroke();
    kiteFace(c, 0, -12, 0.9, f);
  },
  phoenix(c, k, t, f) {
    // Feniks: olovli patlardan qanotlar
    const C = k.cols, fl = Math.sin(t * 10);
    for (const sx of [-1, 1]) {
      c.save(); c.scale(sx, 1); c.rotate(-0.15 + fl * 0.18);
      for (let i = 4; i >= 0; i--) {
        const a = -0.95 + i * 0.3, len = 46 - i * 4;
        c.save(); c.rotate(a);
        const g = c.createLinearGradient(6, 0, len, 0); g.addColorStop(0, C[0]); g.addColorStop(0.6, C[1]); g.addColorStop(1, C[3]);
        c.fillStyle = g; c.beginPath(); c.moveTo(6, 0); c.quadraticCurveTo(len * 0.55, -8, len, 0); c.quadraticCurveTo(len * 0.55, 8, 6, 0); c.fill();
        c.restore();
      }
      c.restore();
    }
    c.fillStyle = C[0]; c.beginPath(); c.ellipse(0, 6, 12, 20, 0, 0, TAU); c.fill();
    c.fillStyle = C[1]; c.beginPath(); c.ellipse(0, 10, 7, 12, 0, 0, TAU); c.fill();
    c.fillStyle = C[2];
    for (let i = -1; i <= 1; i++) { c.save(); c.translate(i * 4, -22); c.rotate(-Math.PI / 2 + i * 0.4); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(7, -4, 14, 0); c.quadraticCurveTo(7, 4, 0, 0); c.fill(); c.restore(); }
    c.fillStyle = C[1]; c.beginPath(); c.arc(0, -14, 12, 0, TAU); c.fill();
    kiteFace(c, 0, -16, 0.6, f);
  },
};

// ---------- Dumlar (dunyo koordinatalarida, p — fizik zanjir nuqtalari) ----------
function tailNormals(p) {
  const n = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    n.push([-dy / d, dx / d]);
  }
  return n;
}
function strand(c, p, nm, off) {
  c.beginPath();
  for (let i = 0; i < p.length; i++) { const o = off(i), x = p[i].x + nm[i][0] * o, y = p[i].y + nm[i][1] * o; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
}
const TAIL = {
  bows(c, k, p) {
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(p[0].x, p[0].y); for (let i = 1; i < p.length; i++) c.lineTo(p[i].x, p[i].y); c.stroke();
    for (let i = 2; i < p.length; i += 2) {
      c.save(); c.translate(p[i].x, p[i].y); c.rotate(Math.atan2(p[i].y - p[i - 1].y, p[i].x - p[i - 1].x));
      c.fillStyle = k.cols[(i / 2) % 4];
      c.beginPath(); c.moveTo(0, 0); c.lineTo(-4, -8); c.lineTo(4, -8); c.closePath(); c.moveTo(0, 0); c.lineTo(-4, 8); c.lineTo(4, 8); c.closePath(); c.fill();
      c.restore();
    }
  },
  ribbons(c, k, p, t) {
    const nm = tailNormals(p); c.lineCap = 'round'; c.lineJoin = 'round';
    for (const [o, col] of [[-5, k.cols[2]], [5, k.cols[0]]]) {
      c.strokeStyle = col; c.lineWidth = 5;
      strand(c, p, nm, i => o * (1 + i * 0.12) + Math.sin(t * 9 + i * 0.8 + o) * i * 0.35); c.stroke();
    }
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.5; strand(c, p, nm, i => Math.sin(t * 9 + i * 0.8) * i * 0.3); c.stroke();
  },
  twin(c, k, p, t) {
    const nm = tailNormals(p); c.lineCap = 'round';
    for (const [o, col] of [[-4, k.cols[0]], [4, k.cols[1]]]) {
      c.strokeStyle = col; c.lineWidth = 3.2;
      strand(c, p, nm, i => o * (1 + i * 0.2) + Math.sin(t * 8 + i * 0.7 + o) * i * 0.45); c.stroke();
    }
    const e = p[p.length - 1]; c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 10);
    c.drawImage(GLOW.p, e.x - 14, e.y - 14, 28, 28); c.globalAlpha = 1;
  },
  streamers(c, k, p, t) {
    const nm = tailNormals(p); c.lineCap = 'round';
    for (const [o, col] of [[-6, k.cols[1]], [0, '#ffffff'], [6, k.cols[3]]]) {
      c.strokeStyle = col; c.lineWidth = 3;
      strand(c, p, nm, i => o * (1 + i * 0.1) + Math.sin(t * 7 + i * 0.6 + o) * i * 0.5); c.stroke();
    }
  },
  tentacles(c, k, p, t) {
    const nm = tailNormals(p), n = p.length; c.lineCap = 'round';
    const off = (i, j) => (j - 2) * 6 * (1 + i * 0.18) + Math.sin(t * 6 + i * 0.7 + j * 1.3) * i * 0.6;
    for (let j = 0; j < 5; j++) {
      c.strokeStyle = j % 2 ? k.cols[0] : k.cols[1];
      for (let i = 1; i < n; i++) {
        const o0 = off(i - 1, j), o1 = off(i, j);
        c.lineWidth = 7 * (1 - i / n) + 1.5;
        c.beginPath(); c.moveTo(p[i - 1].x + nm[i - 1][0] * o0, p[i - 1].y + nm[i - 1][1] * o0); c.lineTo(p[i].x + nm[i][0] * o1, p[i].y + nm[i][1] * o1); c.stroke();
      }
    }
  },
  dragon(c, k, p, t) {
    const nm = tailNormals(p), n = p.length, C = k.cols;
    for (let i = n - 1; i >= 1; i--) {
      const r = lerp(14, 5, i / (n - 1)), q = p[i], up = nm[i][1] < 0 ? 1 : -1, ux = nm[i][0] * up, uy = nm[i][1] * up, tx = -uy, ty = ux;
      c.fillStyle = C[2]; c.beginPath();
      c.moveTo(q.x + ux * r * 0.6 + tx * r * 0.5, q.y + uy * r * 0.6 + ty * r * 0.5);
      c.lineTo(q.x + ux * r * 1.55, q.y + uy * r * 1.55);
      c.lineTo(q.x + ux * r * 0.6 - tx * r * 0.5, q.y + uy * r * 0.6 - ty * r * 0.5); c.closePath(); c.fill();
      c.fillStyle = i % 2 ? C[0] : '#ff6b6b'; c.beginPath(); c.arc(q.x, q.y, r, 0, TAU); c.fill();
      c.fillStyle = C[1]; c.beginPath(); c.arc(q.x - ux * r * 0.35, q.y - uy * r * 0.35, r * 0.55, 0, TAU); c.fill();
    }
    const e = p[n - 1], a = Math.atan2(e.y - p[n - 2].y, e.x - p[n - 2].x);
    c.save(); c.translate(e.x, e.y); c.rotate(a);
    for (const [ang, col] of [[-0.5, C[1]], [0.5, C[1]], [0, C[2]]]) { c.save(); c.rotate(ang + Math.sin(t * 8) * 0.15); c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(9, -5, 18, 0); c.quadraticCurveTo(9, 5, 0, 0); c.fill(); c.restore(); }
    c.restore();
  },
  flame(c, k, p, t) {
    const nm = tailNormals(p), C = k.cols, n = p.length; c.lineCap = 'round';
    for (let i = 2; i < n; i += 3) { c.globalAlpha = 0.45; c.drawImage(GLOW.o, p[i].x - 18, p[i].y - 18, 36, 36); }
    c.globalAlpha = 1;
    const off = o => i => o * (1 + i * 0.15) + Math.sin(t * 7 + i * 0.6 + o) * i * 0.5;
    for (const [o, col, w] of [[-6, C[0], 4], [6, C[2], 4], [0, C[1], 6]]) { c.strokeStyle = col; c.lineWidth = w; strand(c, p, nm, off(o)); c.stroke(); }
    for (const o of [-6, 0, 6]) {
      const i = n - 1, d = off(o)(i), x = p[i].x + nm[i][0] * d, y = p[i].y + nm[i][1] * d;
      c.fillStyle = C[3]; c.beginPath(); c.arc(x, y, 4.5, 0, TAU); c.fill();
      c.fillStyle = C[2]; c.beginPath(); c.arc(x, y, 2.2, 0, TAU); c.fill();
    }
  },
};

function drawKiteBody(c, k, t, f) { BODY[k.id](c, k, t, f); }
function drawKiteTail(c, k, p, t) { TAIL[k.tail](c, k, p, t); }

// Do'kon uchun: fizikasiz, sun'iy to'lqinlanuvchi dum bilan varrakni (x, y) markazda chizadi
function drawKiteIcon(c, k, t, x, y, sc) {
  const a = 0.3, ca = Math.cos(a), sa = Math.sin(a), ax = k.att[0] * ca - k.att[1] * sa, ay = k.att[0] * sa + k.att[1] * ca, p = [];
  for (let i = 0; i < k.n; i++) p.push({ x: ax - i * k.seg * 0.74, y: ay + i * k.seg * 0.6 + Math.sin(t * 5 - i * 0.55) * i * 0.8 });
  c.save(); c.translate(x, y); c.scale(sc, sc);
  if (k.glow) c.drawImage(GLOW[k.glow], -60, -60, 120, 120);
  TAIL[k.tail](c, k, p, t);
  c.rotate(a); BODY[k.id](c, k, t, { vy: 0, blink: t % 3.3 < 0.12 });
  c.restore();
}
