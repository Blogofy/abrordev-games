'use strict';
/* TOWER PALS — sahna: boblar (har 5 daraja — yangi joy), osmon, yerdagi manzara, balandlikdagi bezaklar,
   marra (bayroqli lenta), shamol va qor. game.js dagi umumiy o'zgaruvchilardan foydalanadi:
   ctx, VW, VH, camY, T, VX0/VX1/VY0/VY1 (kamera uzoqlashganda ko'rinadigan chegaralar). */
const CHAPTERS = [
  { key: 'yard', icon: '🏡', sky: ['#8fd3ff', '#e6f7ff'] },
  { key: 'beach', icon: '🏖️', sky: ['#5fc2ff', '#fff0d0'] },
  { key: 'snow', icon: '❄️', sky: ['#8fb9ea', '#f0f7ff'] },
  { key: 'city', icon: '🏙️', sky: ['#ff8f8f', '#ffd6a0'] },
  { key: 'moon', icon: '🌙', sky: ['#05061a', '#1d1640'] },
].map(c => Object.assign(c, { C: [hex(c.sky[0]), hex(c.sky[1])] }));
const HIGH_SKY = [[1800, '#3f7fe0', '#a9d8ff'], [3200, '#1b1f5a', '#5a3d8f'], [4600, '#05061a', '#170f3a']].map(([a, t, b]) => [a, hex(t), hex(b)]);

const Scene = (() => {
  const decos = [], nstars = [], flakes = [], streaks = [];
  let decoNextY = -500, ch = CHAPTERS[0];
  const circ = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
  const tri = (x1, y1, x2, y2, x3, y3) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill(); };

  function init() {
    for (let i = 0; i < 120; i++) nstars.push({ x: Math.random(), y: Math.random(), r: rand(1, 2.4), ph: rand(0, TAU) });
    for (let i = 0; i < 60; i++) flakes.push({ x: rand(0, 1), y: rand(0, 1), r: rand(1.2, 3.2), ph: rand(0, TAU) });
    for (let i = 0; i < 18; i++) streaks.push({ x: rand(0, 1), y: rand(0, 1), l: rand(40, 120), v: rand(0.8, 1.3) });
  }
  function setChapter(i) { ch = CHAPTERS[i % CHAPTERS.length]; decos.length = 0; decoNextY = -500; }

  // ---------- Osmon ----------
  function skyAt(alt) {
    if (ch.key === 'moon') return ch.C;
    let prev = [0, ch.C[0], ch.C[1]];
    for (const s of HIGH_SKY) {
      if (alt < s[0]) { const k = smooth(clamp((alt - prev[0]) / (s[0] - prev[0]), 0, 1)); return [mix(prev[1], s[1], k), mix(prev[2], s[2], k)]; }
      prev = s;
    }
    return [prev[1], prev[2]];
  }
  function drawSky() {
    const alt = Math.max(0, -(camY + VH / 2)), [top, bot] = skyAt(alt);
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, rgb(top)); g.addColorStop(1, rgb(bot));
    ctx.fillStyle = g; ctx.fillRect(-60, -60, VW + 120, VH + 120);
    const sa = ch.key === 'moon' ? 1 : clamp((alt - 2600) / 1600, 0, 1);
    if (sa > 0) {
      ctx.fillStyle = '#ffffff';
      for (const s of nstars) {
        const y = (((s.y * VH * 2 - camY * 0.05) % (VH * 2)) + VH * 2) % (VH * 2) - VH * 0.5;
        ctx.globalAlpha = sa * (0.5 + 0.5 * Math.sin(T * 2 + s.ph) ** 2);
        ctx.fillRect(s.x * VW, y, s.r, s.r);
      }
      ctx.globalAlpha = 1;
    }
    if (ch.key === 'moon') {
      // Yer — Oydan ko'rinishi
      const ex = VW * 0.78, ey = VH * 0.2 - camY * 0.03, r = 46;
      ctx.drawImage(GLOW.c, ex - r * 2.2, ey - r * 2.2, r * 4.4, r * 4.4);
      const eg = ctx.createRadialGradient(ex - 14, ey - 14, 6, ex, ey, r); eg.addColorStop(0, '#7fd3ff'); eg.addColorStop(1, '#1f5fbf');
      ctx.fillStyle = eg; circ(ex, ey, r);
      ctx.fillStyle = '#5ccf7a'; ctx.beginPath(); ctx.ellipse(ex - 12, ey - 6, 16, 11, 0.5, 0, TAU); ctx.ellipse(ex + 16, ey + 14, 12, 8, -0.4, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(ex + 4, ey - 26, 18, 5, 0.2, 0, TAU); ctx.fill();
    } else if (ch.key !== 'city') {
      const sx = VW * 0.82, sy = VH * 0.14 - camY * 0.02, a = clamp(1 - alt / 2600, 0, 1);
      if (a > 0.02 && sy > -80) {
        ctx.globalAlpha = a;
        const gr = ctx.createRadialGradient(sx, sy, 8, sx, sy, 130); gr.addColorStop(0, 'rgba(255,246,200,0.7)'); gr.addColorStop(1, 'rgba(255,246,200,0)');
        ctx.fillStyle = gr; ctx.fillRect(sx - 130, sy - 130, 260, 260);
        ctx.fillStyle = '#fff8d6'; circ(sx, sy, 32);
        ctx.globalAlpha = 1;
      }
    } else {
      const sx = VW * 0.26, sy = VH * 0.42 - camY * 0.02, a = clamp(1 - alt / 1800, 0, 1);
      if (a > 0.02) { ctx.globalAlpha = a; ctx.drawImage(GLOW.o, sx - 120, sy - 120, 240, 240); ctx.fillStyle = '#ffd08a'; circ(sx, sy, 40); ctx.globalAlpha = 1; }
    }
  }

  // ---------- Yerdagi manzaralar (gy — yer chizig'ining ekrandagi o'rni) ----------
  function ridge(col, base, amp, fr, ph) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(VX0 - 60, base + 40);
    for (let x = VX0 - 60; x <= VX1 + 60; x += 24) ctx.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin(x * fr + ph)) - Math.sin(x * fr * 2.7 + ph * 2) * amp * 0.2);
    ctx.lineTo(VX1 + 60, base + 40); ctx.closePath(); ctx.fill();
  }
  function groundFill(gy, col, topCol, band = 8) {
    ctx.fillStyle = col; ctx.fillRect(VX0 - 60, gy, VX1 - VX0 + 120, VY1 - gy + 400);
    ctx.fillStyle = topCol; ctx.fillRect(VX0 - 60, gy, VX1 - VX0 + 120, band);
  }
  const at = off => VW / 2 + off; // minora o'rtadan; bezaklar uning ikki yonida
  const P = {
    tree(x, gy, s = 1) {
      const sw = Math.sin(T * 1.5 + x * 0.01) * 0.05;
      ctx.save(); ctx.translate(x, gy); ctx.rotate(sw); ctx.scale(s, s);
      ctx.fillStyle = '#8a5a34'; ctx.fillRect(-5, -40, 10, 40);
      ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.arc(0, -55, 28, 0, TAU); ctx.arc(-16, -42, 18, 0, TAU); ctx.arc(16, -42, 18, 0, TAU); ctx.fill();
      ctx.fillStyle = '#6cc75f'; circ(-8, -64, 11);
      ctx.restore();
    },
    house(x, gy, col = '#ef6f6c') {
      ctx.fillStyle = '#fff3e0'; ctx.fillRect(x - 24, gy - 40, 48, 40);
      ctx.fillStyle = col; tri(x - 30, gy - 38, x, gy - 64, x + 30, gy - 38);
      ctx.fillStyle = '#6ec1ff'; ctx.fillRect(x - 14, gy - 30, 10, 10);
      ctx.fillStyle = '#9c6b3f'; ctx.fillRect(x + 4, gy - 22, 10, 22);
    },
    doghouse(x, gy) {
      ctx.fillStyle = '#d9834a'; ctx.fillRect(x - 22, gy - 30, 44, 30);
      ctx.fillStyle = '#a2532a'; tri(x - 28, gy - 28, x, gy - 50, x + 28, gy - 28);
      ctx.fillStyle = '#3a2420'; ctx.beginPath(); ctx.arc(x, gy - 10, 10, Math.PI, TAU); ctx.fill(); ctx.fillRect(x - 10, gy - 10, 20, 10);
      ctx.fillStyle = '#c98b5a'; circ(x + 34, gy - 6, 6); circ(x + 46, gy - 6, 6); ctx.fillRect(x + 34, gy - 9, 12, 6); // suyak
    },
    fence(x, gy, w) {
      ctx.fillStyle = '#ffffff';
      for (let k = 0; k <= w; k += 18) ctx.fillRect(x + k - 3, gy - 26, 6, 26);
      ctx.fillRect(x - 4, gy - 20, w + 8, 4); ctx.fillRect(x - 4, gy - 10, w + 8, 4);
    },
    palm(x, gy, s = 1) {
      const sw = Math.sin(T * 2 + x) * 0.08;
      ctx.save(); ctx.translate(x, gy); ctx.scale(s, s);
      ctx.strokeStyle = '#a0703c'; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(6, -50, 22, -96); ctx.stroke();
      ctx.fillStyle = '#2fb36a';
      for (let i = 0; i < 6; i++) { ctx.save(); ctx.translate(22, -96); ctx.rotate(-Math.PI / 2 + (i - 2.5) * 0.55 + sw); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(22, -12, 46, 6); ctx.quadraticCurveTo(22, 2, 0, 0); ctx.fill(); ctx.restore(); }
      ctx.fillStyle = '#7a4a22'; circ(18, -90, 5); circ(27, -89, 5);
      ctx.restore();
    },
    umbrella(x, gy, col) {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2, gy - 70, 4, 70);
      for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#ffffff' : col; ctx.beginPath(); ctx.moveTo(x, gy - 74); ctx.arc(x, gy - 64, 46, Math.PI + (i * Math.PI) / 6, Math.PI + ((i + 1) * Math.PI) / 6); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = '#ff5d73'; rrect(ctx, x + 10, gy - 12, 34, 12, 4); ctx.fill();
    },
    castle(x, gy) {
      ctx.fillStyle = '#e9c27a';
      ctx.fillRect(x - 30, gy - 28, 60, 28); ctx.fillRect(x - 34, gy - 44, 18, 44); ctx.fillRect(x + 16, gy - 44, 18, 44); ctx.fillRect(x - 10, gy - 52, 20, 24);
      for (const ox of [-34, -25, 16, 25, -10, 1]) ctx.fillRect(x + ox, ox === -10 || ox === 1 ? gy - 58 : gy - 50, 9, 6);
      ctx.fillStyle = '#c99a50'; ctx.beginPath(); ctx.arc(x, gy, 8, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = '#ff5d73'; ctx.fillRect(x - 1, gy - 72, 2, 20); tri(x + 1, gy - 72, x + 14, gy - 67, x + 1, gy - 62);
    },
    pine(x, gy, s = 1) {
      ctx.save(); ctx.translate(x, gy); ctx.scale(s, s);
      ctx.fillStyle = '#6b4a2e'; ctx.fillRect(-4, -12, 8, 12);
      for (let k = 0; k < 3; k++) { const y = -10 - k * 22, w = 42 - k * 9; ctx.fillStyle = '#2d6a4f'; tri(-w, y, 0, y - 40, w, y); ctx.fillStyle = '#ffffff'; tri(-w * 0.35, y - 26, 0, y - 40, w * 0.35, y - 26); }
      ctx.restore();
    },
    igloo(x, gy) {
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, gy, 42, Math.PI, TAU); ctx.fill();
      ctx.strokeStyle = '#c9dcf2'; ctx.lineWidth = 2; ctx.beginPath();
      for (const r of [14, 28]) { ctx.moveTo(x - Math.sqrt(42 * 42 - r * r), gy - r); ctx.lineTo(x + Math.sqrt(42 * 42 - r * r), gy - r); } ctx.stroke();
      ctx.fillStyle = '#3a4a6a'; ctx.beginPath(); ctx.arc(x + 22, gy, 13, Math.PI, TAU); ctx.fill();
    },
    snowman(x, gy) {
      ctx.fillStyle = '#ffffff'; circ(x, gy - 16, 17); circ(x, gy - 42, 12);
      ctx.fillStyle = '#1b1530'; circ(x - 4, gy - 45, 1.8); circ(x + 4, gy - 45, 1.8);
      ctx.fillStyle = '#ff8c42'; tri(x, gy - 42, x + 12, gy - 41, x, gy - 39);
      ctx.fillStyle = '#e63946'; ctx.fillRect(x - 12, gy - 33, 24, 4);
      ctx.fillStyle = '#2b2d42'; ctx.fillRect(x - 9, gy - 60, 18, 6); ctx.fillRect(x - 6, gy - 72, 12, 13);
    },
    lamp(x, gy) {
      ctx.fillStyle = '#3d405b'; ctx.fillRect(x - 3, gy - 90, 6, 90); ctx.fillRect(x - 3, gy - 92, 22, 5);
      ctx.fillStyle = '#ffe9a8'; circ(x + 18, gy - 84, 7);
      ctx.drawImage(GLOW.y, x - 12, gy - 114, 60, 60);
    },
    building(x, gy, w, h, col) {
      ctx.fillStyle = col; ctx.fillRect(x - w / 2, gy - h, w, h);
      ctx.fillStyle = 'rgba(255,230,160,0.85)';
      for (let r = 0; r < Math.floor((h - 20) / 18); r++) for (let q = 0; q < Math.floor((w - 10) / 16); q++) if (hash(x + r * 7 + q * 13) > 0.45) ctx.fillRect(x - w / 2 + 8 + q * 16, gy - h + 12 + r * 18, 8, 10);
    },
    flag(x, gy) {
      ctx.fillStyle = '#d9d9e0'; ctx.fillRect(x - 2, gy - 90, 4, 90);
      const wv = Math.sin(T * 3) * 4;
      ctx.fillStyle = '#ef476f'; ctx.beginPath(); ctx.moveTo(x + 2, gy - 90); ctx.quadraticCurveTo(x + 22, gy - 94 + wv, x + 42, gy - 88); ctx.lineTo(x + 42, gy - 66); ctx.quadraticCurveTo(x + 22, gy - 70 + wv, x + 2, gy - 66); ctx.fill();
      ctx.fillStyle = '#ffd23f'; ctx.save(); ctx.translate(x + 22, gy - 78); starPath(ctx, 7, 3); ctx.fill(); ctx.restore();
    },
    rocket(x, gy) {
      ctx.fillStyle = '#ff5d73'; tri(x - 26, gy, x - 14, gy - 40, x - 14, gy); tri(x + 26, gy, x + 14, gy - 40, x + 14, gy);
      ctx.fillStyle = '#f2f2f7'; ctx.beginPath(); ctx.moveTo(x - 15, gy); ctx.lineTo(x - 15, gy - 90); ctx.quadraticCurveTo(x, gy - 140, x + 15, gy - 90); ctx.lineTo(x + 15, gy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4fb3ff'; circ(x, gy - 82, 8); ctx.fillStyle = '#ff5d73'; ctx.fillRect(x - 15, gy - 30, 30, 8);
    },
    rover(x, gy) {
      ctx.fillStyle = '#5a5f7a'; for (const ox of [-18, 0, 18]) circ(x + ox, gy - 7, 7);
      ctx.fillStyle = '#e8e8f0'; rrect(ctx, x - 26, gy - 30, 52, 16, 4); ctx.fill();
      ctx.fillStyle = '#4a6fa5'; ctx.fillRect(x - 20, gy - 38, 30, 6);
      ctx.fillStyle = '#5a5f7a'; ctx.fillRect(x + 14, gy - 50, 3, 20); ctx.fillStyle = (T % 1) < 0.5 ? '#ff4d6d' : '#550015'; circ(x + 15, gy - 52, 3);
    },
    dish(x, gy) {
      ctx.fillStyle = '#9aa0b8'; ctx.fillRect(x - 3, gy - 40, 6, 40);
      ctx.save(); ctx.translate(x, gy - 44); ctx.rotate(-0.5 + Math.sin(T * 0.5) * 0.2);
      ctx.fillStyle = '#e8e8f0'; ctx.beginPath(); ctx.ellipse(0, 0, 26, 10, 0, 0, Math.PI); ctx.fill(); ctx.fillStyle = '#9aa0b8'; ctx.fillRect(-1, -14, 2, 14);
      ctx.restore();
    },
  };
  const SCENES = {
    yard(gy) {
      ridge('#bfe9ad', gy - 70, 50, 0.007, 1); ridge('#9ddc8a', gy - 30, 40, 0.012, 2.4);
      P.house(at(-640), gy, '#7aa6ff'); P.tree(at(-520), gy); P.house(at(-330), gy); P.tree(at(-210), gy, 1.1); P.fence(at(-170), gy, 60);
      P.doghouse(at(170), gy); P.tree(at(300), gy, 0.95); P.house(at(420), gy, '#ffb347'); P.tree(at(560), gy, 1.1); P.house(at(700), gy, '#ef6f6c');
      groundFill(gy, '#6cc65a', '#5ab34a');
      for (let i = 0; i < 40; i++) { const x = at(((i * 97.3) % 1800) - 900), y = gy + 18 + ((i * 37) % 70); ctx.fillStyle = ['#ffffff', '#ffd23f', '#ff8fab'][i % 3]; circ(x, y + Math.sin(T * 2 + i) * 1.5, 3.5); }
    },
    beach(gy) {
      const hy = gy - 80;
      ridge('#9fd0c8', hy + 4, 18, 0.01, 0.5);
      const g = ctx.createLinearGradient(0, hy, 0, gy); g.addColorStop(0, '#5fb4e8'); g.addColorStop(1, '#2e86c9');
      ctx.fillStyle = g; ctx.fillRect(VX0 - 60, hy, VX1 - VX0 + 120, gy - hy + 2);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      for (let i = 0; i < 26; i++) { const row = i % 5, x = VX0 + ((hash(i) * 1600 + T * (12 + row * 6)) % (VX1 - VX0 + 200)) - 100; ctx.fillRect(x, hy + 10 + row * 13, 22 + hash(i + 3) * 30, 2); }
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.moveTo(VX0 - 60, gy - 2);
      for (let x = VX0 - 60; x <= VX1 + 60; x += 16) ctx.lineTo(x, gy - 4 + Math.sin(x * 0.05 + T * 2) * 3);
      ctx.lineTo(VX1 + 60, gy + 4); ctx.lineTo(VX0 - 60, gy + 4); ctx.fill();
      P.palm(at(-560), gy, 1.1); P.umbrella(at(-420), gy, '#4fb3ff'); P.castle(at(-260), gy); P.palm(at(-180), gy, 0.9);
      P.umbrella(at(230), gy, '#ff5d73'); P.palm(at(360), gy, 1.15); P.castle(at(500), gy); P.palm(at(640), gy);
      groundFill(gy, '#f4d79b', '#e9c27a', 6);
      for (let i = 0; i < 24; i++) { const x = at(((i * 131.7) % 1800) - 900), y = gy + 20 + ((i * 41) % 70); ctx.fillStyle = ['#ffffff', '#ff9ab8', '#ffd6a5'][i % 3]; ctx.beginPath(); ctx.arc(x, y, 4, Math.PI, TAU); ctx.fill(); }
    },
    snow(gy) {
      ctx.fillStyle = '#c3d6ef'; ctx.beginPath(); ctx.moveTo(VX0 - 60, gy);
      for (let x = VX0 - 60; x <= VX1 + 60; x += 14) { const w = x * 0.004; ctx.lineTo(x, gy - 60 - 120 * (1 - Math.abs(((w % 1) + 1) % 1 * 2 - 1))); }
      ctx.lineTo(VX1 + 60, gy); ctx.fill();
      ridge('#e6f0fb', gy - 30, 36, 0.01, 1.2);
      P.pine(at(-600), gy, 1.1); P.igloo(at(-470), gy); P.pine(at(-340), gy, 0.9); P.snowman(at(-220), gy); P.pine(at(-160), gy, 0.8);
      P.pine(at(200), gy, 1); P.igloo(at(320), gy); P.snowman(at(450), gy); P.pine(at(560), gy, 1.2); P.pine(at(680), gy, 0.9);
      groundFill(gy, '#f4f8ff', '#dbe7f5', 6);
    },
    city(gy) {
      for (let i = -14; i <= 14; i++) { const x = at(i * 64), h = 120 + hash(i * 3.3) * 200; ctx.fillStyle = '#b07aa8'; ctx.fillRect(x - 30, gy - h - 40, 60, h + 40); }
      for (let i = -9; i <= 9; i++) { if (Math.abs(i) < 2) continue; P.building(at(i * 96 + 20), gy, 70 + hash(i) * 30, 90 + hash(i * 7.1) * 120, '#7d5a94'); }
      P.lamp(at(-200), gy); P.lamp(at(190), gy); P.lamp(at(-470), gy); P.lamp(at(460), gy);
      groundFill(gy, '#5c5f7a', '#c9c3d6', 14);
      ctx.fillStyle = '#ffe9a8'; for (let x = Math.floor((VX0 - 60) / 60) * 60; x < VX1 + 60; x += 60) ctx.fillRect(x, gy + 40, 30, 5);
    },
    moon(gy) {
      ridge('#6f6890', gy - 40, 70, 0.006, 0.7); ridge('#8d86a8', gy - 10, 34, 0.012, 2);
      P.dish(at(-520), gy); P.rover(at(-360), gy); P.flag(at(-230), gy); P.rocket(at(260), gy); P.dish(at(420), gy); P.rover(at(560), gy);
      groundFill(gy, '#c9c6d8', '#b3afc8', 6);
      ctx.fillStyle = 'rgba(120,110,150,0.35)';
      for (let i = 0; i < 18; i++) { const x = at(((i * 151.3) % 1800) - 900), y = gy + 24 + ((i * 53) % 90), r = 8 + (i % 4) * 5; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.4, 0, 0, TAU); ctx.fill(); }
    },
  };

  // ---------- Balandlikdagi bezaklar ----------
  function addDeco(y) {
    const a = -y, r = Math.random();
    let type;
    if (ch.key === 'moon') type = r < 0.25 ? 'planet' : r < 0.5 ? 'sat' : r < 0.7 ? 'ufo' : r < 0.85 ? 'comet' : 'astro';
    else if (a < 1600) type = r < 0.5 ? 'cloud' : r < 0.75 ? (ch.key === 'beach' ? 'gull' : 'bird') : 'balloon';
    else if (a < 3000) type = r < 0.45 ? 'cloud' : r < 0.7 ? 'plane' : r < 0.85 ? 'balloon' : 'bird';
    else if (a < 4400) type = r < 0.3 ? 'cloud' : r < 0.5 ? 'plane' : r < 0.8 ? 'sat' : 'ufo';
    else type = r < 0.25 ? 'planet' : r < 0.5 ? 'sat' : r < 0.7 ? 'ufo' : r < 0.85 ? 'comet' : 'astro';
    const dir = Math.random() < 0.5 ? -1 : 1;
    const sp = { cloud: rand(6, 18), bird: rand(40, 70), gull: rand(40, 70), balloon: rand(8, 16), plane: rand(70, 110), sat: rand(10, 25), ufo: rand(30, 60), planet: rand(2, 5), comet: rand(140, 220), astro: rand(6, 14) }[type];
    decos.push({ type, x: rand(-60, VW + 60), y, vx: dir * sp, t: rand(0, 10), s: rand(0.8, 1.3), hue: (Math.random() * 360) | 0 });
  }
  function drawDeco(d) {
    const x = d.x, y = d.y - camY, f = d.vx < 0 ? -1 : 1;
    if (y < VY0 - 150 || y > VY1 + 150) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(d.s, d.s);
    switch (d.type) {
      case 'cloud':
        ctx.fillStyle = ch.key === 'city' ? 'rgba(255,224,214,0.85)' : 'rgba(255,255,255,0.85)'; ctx.beginPath();
        for (const [ox, oy, r] of [[-40, 6, 24], [-12, -10, 32], [22, -4, 28], [48, 8, 20], [5, 12, 24]]) { ctx.moveTo(ox + r, oy); ctx.arc(ox, oy, r, 0, TAU); }
        ctx.fill(); break;
      case 'bird': case 'gull': {
        const fl = Math.sin(d.t * 12) * 8;
        ctx.strokeStyle = d.type === 'gull' ? '#ffffff' : '#2b2d42'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-12, -fl); ctx.quadraticCurveTo(-6, -fl * 0.2, 0, 2); ctx.quadraticCurveTo(6, -fl * 0.2, 12, -fl); ctx.stroke(); break;
      }
      case 'balloon': {
        ctx.translate(0, Math.sin(d.t * 1.5) * 8);
        ctx.strokeStyle = '#6e4626'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-16, 22); ctx.lineTo(-8, 52); ctx.moveTo(16, 22); ctx.lineTo(8, 52); ctx.stroke();
        ctx.fillStyle = '#9c6b3f'; ctx.fillRect(-10, 50, 20, 14);
        const cols = [`hsl(${d.hue},85%,60%)`, '#ffffff'];
        for (let i = 0; i < 6; i++) { ctx.fillStyle = cols[i % 2]; ctx.beginPath(); ctx.moveTo(0, 26); ctx.ellipse(0, -4, 34, 38, 0, Math.PI * 0.5 + (i / 6) * TAU, Math.PI * 0.5 + ((i + 1) / 6) * TAU); ctx.closePath(); ctx.fill(); }
        break;
      }
      case 'plane':
        ctx.scale(f, 1);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(-240, 0); ctx.stroke();
        ctx.fillStyle = '#ffffff'; rrect(ctx, -40, -8, 80, 16, 8); ctx.fill();
        ctx.fillStyle = '#e63946'; tri(-36, -6, -44, -26, -24, -6);
        ctx.fillStyle = '#d0d7e2'; tri(-6, 2, -22, 22, 10, 4);
        ctx.fillStyle = '#4fb3ff'; for (let i = 0; i < 5; i++) ctx.fillRect(-18 + i * 9, -4, 5, 4);
        break;
      case 'sat':
        ctx.rotate(d.t * 0.3);
        ctx.fillStyle = '#4a6fa5'; ctx.fillRect(-44, -9, 28, 18); ctx.fillRect(16, -9, 28, 18);
        ctx.fillStyle = '#d9d9e0'; rrect(ctx, -14, -12, 28, 24, 4); ctx.fill();
        ctx.fillStyle = (d.t % 1) < 0.5 ? '#ff4d6d' : '#550015'; circ(0, -16, 3);
        break;
      case 'ufo': {
        ctx.translate(0, Math.sin(d.t * 2) * 6); ctx.rotate(Math.sin(d.t * 1.7) * 0.1);
        ctx.fillStyle = `rgba(150,255,170,${0.15 + 0.1 * Math.sin(d.t * 6)})`; ctx.beginPath(); ctx.moveTo(-14, 6); ctx.lineTo(14, 6); ctx.lineTo(34, 90); ctx.lineTo(-34, 90); ctx.fill();
        ctx.fillStyle = 'rgba(160,230,255,0.85)'; ctx.beginPath(); ctx.arc(0, -6, 16, Math.PI, TAU); ctx.fill();
        ctx.fillStyle = '#9aa5b8'; ctx.beginPath(); ctx.ellipse(0, 0, 40, 11, 0, 0, TAU); ctx.fill();
        for (let i = 0; i < 5; i++) { ctx.fillStyle = (Math.floor(d.t * 6) + i) % 2 ? '#ffd23f' : '#ff4d6d'; circ(-28 + i * 14, 2, 3); }
        break;
      }
      case 'planet': {
        const g = ctx.createRadialGradient(-20, -20, 5, 0, 0, 60);
        g.addColorStop(0, `hsl(${d.hue},70%,70%)`); g.addColorStop(1, `hsl(${d.hue},60%,35%)`);
        ctx.fillStyle = g; circ(0, 0, 55);
        ctx.strokeStyle = `hsla(${(d.hue + 40) % 360},80%,75%,0.8)`; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, 0, 90, 18, -0.3, 0, TAU); ctx.stroke();
        break;
      }
      case 'comet': {
        ctx.scale(f, 1);
        const g = ctx.createLinearGradient(-160, 0, 0, 0); g.addColorStop(0, 'rgba(160,220,255,0)'); g.addColorStop(1, 'rgba(200,240,255,0.9)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-160, -2); ctx.lineTo(0, -8); ctx.lineTo(0, 8); ctx.lineTo(-160, 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; circ(0, 0, 8);
        break;
      }
      case 'astro':
        ctx.rotate(d.t * 0.4);
        ctx.fillStyle = '#f0f0f5'; rrect(ctx, -14, -6, 28, 30, 10); ctx.fill(); circ(0, -16, 16);
        ctx.fillStyle = '#2b3a67'; ctx.beginPath(); ctx.ellipse(0, -16, 11, 9, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; circ(-4, -19, 3);
        break;
    }
    ctx.restore();
  }

  // ---------- Marra: ikki havo shari ko'tarib turgan bayroqchali lenta ----------
  function drawGoal(goalY, broken, bt) {
    const y = goalY - camY;
    if (y < VY0 - 200 || y > VY1 + 100) return;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.setLineDash([14, 10]); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(VX0 - 40, y); ctx.lineTo(VX1 + 40, y); ctx.stroke(); ctx.setLineDash([]);
    const x0 = VW / 2 - 205, x1 = VW / 2 + 205, up = broken ? bt * bt * 600 : 0, bob = Math.sin(T * 1.6) * 6;
    for (const [bx, hue] of [[x0, 350], [x1, 200]]) {
      const by = y - 120 + bob - up;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx, by + 30); ctx.lineTo(bx, y - up * 0.6); ctx.stroke();
      const g = ctx.createRadialGradient(bx - 10, by - 12, 4, bx, by, 36); g.addColorStop(0, `hsl(${hue},90%,78%)`); g.addColorStop(1, `hsl(${hue},80%,55%)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(bx, by, 26, 32, 0, 0, TAU); ctx.fill();
      tri(bx - 5, by + 34, bx + 5, by + 34, bx, by + 28);
    }
    if (!broken) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo(VW / 2, y + 26, x1, y); ctx.stroke();
      const COLS = ['#ef476f', '#ffd166', '#06d6a0', '#4fb3ff', '#b388ff'];
      for (let i = 1; i < 14; i++) {
        const u = i / 14, px = lerp(x0, x1, u), py = y + 52 * u * (1 - u); // lentaning egilishi bo'ylab
        ctx.fillStyle = COLS[i % 5]; tri(px - 9, py, px + 9, py, px + Math.sin(T * 4 + i) * 2, py + 18);
      }
      ctx.fillStyle = '#ffd23f'; ctx.save(); ctx.translate(x1 + 34, y - 4 + bob * 0.5); starPath(ctx, 15, 6.5); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#ff9f1c'; ctx.stroke(); ctx.restore();
    }
  }

  // ---------- Yangilash va oldingi qatlam (shamol, qor) ----------
  function update(dt, wind) {
    while (decoNextY > camY - 300 / Math.min(1, zoom)) { addDeco(decoNextY); decoNextY -= rand(260, 420); }
    for (let i = decos.length - 1; i >= 0; i--) {
      const d = decos[i]; d.t += dt; d.x += d.vx * dt;
      if (d.x < -260) d.x = VW + 240; else if (d.x > VW + 260) d.x = -240;
      if (d.y - camY > VY1 + 600) decos.splice(i, 1);
    }
    for (const f of flakes) { f.y += (0.05 + f.r * 0.02) * dt; f.x += (Math.sin(T + f.ph) * 0.01 + wind * 0.08) * dt; if (f.y > 1) { f.y -= 1; f.x = Math.random(); } f.x = ((f.x % 1) + 1) % 1; }
    for (const s of streaks) { s.x += wind * s.v * 0.9 * dt; if (s.x > 1.2) { s.x = -0.2; s.y = Math.random(); } else if (s.x < -0.2) { s.x = 1.2; s.y = Math.random(); } }
  }
  function drawBack(gy) {
    for (const d of decos) drawDeco(d);
    if (gy < VY1 + 260) SCENES[ch.key](gy);
  }
  function drawFront(wind) {
    if (wind) {
      ctx.strokeStyle = `rgba(255,255,255,${0.18 + Math.abs(wind) * 0.2})`; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
      for (const s of streaks) { const x = s.x * VW, y = s.y * VH; ctx.moveTo(x, y); ctx.lineTo(x - Math.sign(wind) * s.l, y); }
      ctx.stroke();
    }
    if (ch.key === 'snow') { ctx.fillStyle = 'rgba(255,255,255,0.85)'; for (const f of flakes) { ctx.beginPath(); ctx.arc(f.x * VW, f.y * VH, f.r, 0, TAU); ctx.fill(); } }
  }
  return { init, setChapter, drawSky, drawBack, drawFront, drawGoal, update, get chapter() { return ch; } };
})();
