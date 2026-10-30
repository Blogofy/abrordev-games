'use strict';
/* KITE — dunyolar: osmon, uzoq manzara, o'rta qatlam bezaklari, yer va ob-havo.
   game.js dagi umumiy o'zgaruvchilardan foydalanadi (ctx, VW, VH, GROUND, T) — shuning uchun bu yerda
   yuklanish paytida ular ishlatilmaydi, faqat funksiyalar ichida (Scen.init game.js dan chaqiriladi). */
const WORLD_AT = [0, 400, 1000, 1800, 2800]; // har bir dunyo boshlanadigan masofa (metr); keyin har 1000 m da navbatdagisi
const WORLDS = [
  { key: 'meadow', sky: ['#3d9df5', '#c5ecff'], sun: [0.78, 0.17], sunCol: '#fff6c8', night: 0, far: ['#9fd6a0', '#6fbf7e'], cloud: '#ffffff', fog: '#d4f1ff', storm: ['#7a7ea3', '#2a2b48'], flyer: 'bird', ground: 'grass', props: ['windmill', 'tree', 'tree', 'balloon', 'barn'], fx: 'petals' },
  { key: 'bay', sky: ['#5a3d9e', '#ffb27a'], sun: [0.7, 0.6], sunCol: '#ffd27a', night: 0.1, far: ['#c97a8a', '#3d5aa0'], cloud: '#ffd6c4', fog: '#ffc4a0', storm: ['#8a6f9e', '#3a2a55'], flyer: 'gull', ground: 'water', props: ['lighthouse', 'boat', 'palm', 'boat'], fx: 'glints' },
  { key: 'peaks', sky: ['#4f8fdc', '#e8f5ff'], sun: [0.82, 0.2], sunCol: '#ffffff', night: 0, far: ['#c2d4ea', '#93adcf'], cloud: '#ffffff', fog: '#eef7ff', storm: ['#9fb3cc', '#4a5a78'], flyer: 'eagle', ground: 'snow', props: ['pine', 'pine', 'cabin', 'pine'], fx: 'snow' },
  { key: 'city', sky: ['#120c38', '#5a2a8a'], sun: [0.72, 0.15], sunCol: '#e6deff', night: 1, far: ['#2c2160', '#3d2678'], cloud: '#6a5aa8', fog: '#4c2c7c', storm: ['#4a3a7a', '#1a1238'], flyer: 'drone', ground: 'roof', props: ['tower', 'tower', 'ferris', 'tower'], fx: 'none' },
  { key: 'cosmos', sky: ['#04041a', '#2b1660'], sun: [0.76, 0.2], sunCol: '#ffffff', night: 1, far: ['#3a2a7a', '#6a4aa8'], cloud: '#8a7ad8', fog: '#3a2a7a', storm: ['#5a3a8a', '#200f40'], flyer: 'ufo', ground: 'clouds', props: ['island', 'island', 'crystal'], fx: 'dust' },
];
for (const w of WORLDS) w.C = { skyT: hex(w.sky[0]), skyB: hex(w.sky[1]), sun: hex(w.sunCol), far0: hex(w.far[0]), far1: hex(w.far[1]), cloud: hex(w.cloud), fog: hex(w.fog), st0: hex(w.storm[0]), st1: hex(w.storm[1]) };
function worldStart(i) { const n = WORLD_AT.length; return i < n ? WORLD_AT[i] : WORLD_AT[n - 1] + (i - n + 1) * 1000; }
function worldIndexAt(m) { let i = 0; while (worldStart(i + 1) <= m) i++; return i; }
const worldDef = i => WORLDS[i % WORLDS.length];
const NEON = ['#ff5fd2', '#7df9ff', '#ffe66d', '#9d7bff'];

const Scen = (() => {
  const PAL = { night: 0, sunX: 0.78, sunY: 0.17 };
  let A = 0, B = 0, BT = 0, oFar = 0, oFar2 = 0, oMid = 0, oNear = 0, fwT = 1, shT = 2, PA = 1; // PA — joriy bezakning shaffofligi
  const mids = [], grounds = [], clouds = [], nstars = [], fx = [], fws = [], shots = [];
  const wk = key => (worldDef(A).key === key ? 1 - BT : 0) + (worldDef(B).key === key ? BT : 0);
  const cur = () => (BT > 0.5 ? B : A);
  const HC = {};
  const hz = (h, k = 0.3) => rgb(mix(HC[h] || (HC[h] = hex(h)), PAL.fog, k)); // uzoqlik tumani bilan aralashtirilgan rang
  function fillTri(x1, y1, x2, y2, x3, y3) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill(); }
  function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }

  // ---------- Dunyolar orasidagi o'tish ----------
  function focus(m) {
    const i = worldIndexAt(m), s = worldStart(i), n = worldStart(i + 1);
    A = B = i; BT = 0;
    if (i > 0 && m < s + 50) { A = i - 1; BT = smooth(clamp((m - s + 30) / 80, 0, 1)); }
    else if (m > n - 30) { B = i + 1; BT = smooth(clamp((m - n + 30) / 80, 0, 1)); }
    const da = worldDef(A), db = worldDef(B);
    for (const k in da.C) PAL[k] = mix(da.C[k], db.C[k], BT);
    PAL.night = lerp(da.night, db.night, BT); PAL.sunX = lerp(da.sun[0], db.sun[0], BT); PAL.sunY = lerp(da.sun[1], db.sun[1], BT);
  }

  // ---------- Yaratish ----------
  function makeCloud(x) {
    const p = rand(0.12, 0.45), s = rand(0.6, 1.3) * (0.6 + p), n = 4 + ((Math.random() * 3) | 0), puffs = [];
    for (let i = 0; i < n; i++) puffs.push({ ox: (i - (n - 1) / 2) * 26 + rand(-6, 6), oy: rand(-12, 6) - (i > 0 && i < n - 1 ? 10 : 0), r: rand(18, 30) });
    return { x, y: rand(VH * 0.06, VH * 0.5), s, p, a: rand(0.35, 0.75), puffs, w: (n * 26 + 60) * s };
  }
  const PROP_W = { windmill: 70, tree: 70, balloon: 90, barn: 100, lighthouse: 90, boat: 100, palm: 100, pine: 110, cabin: 90, tower: 70, ferris: 180, island: 150, crystal: 80 };
  const BALLOONS = [['#ef476f', '#ffd166'], ['#06d6a0', '#ffffff'], ['#118ab2', '#ffd166'], ['#9d4edd', '#ff9ecf']];
  const SAILS = [['#ffffff', '#ffd6a5'], ['#ff6b6b', '#ffffff'], ['#ffd166', '#ffffff']];
  function makeProp(x, wi) {
    const d = worldDef(wi), kind = pickOne(d.props), s = rand(0.85, 1.15);
    const o = { x, kind, wi, s, seed: Math.random() * 100, w: PROP_W[kind] * s, gap: rand(30, 150) };
    if (kind === 'balloon') { o.y = rand(0.28, 0.5); o.col = pickOne(BALLOONS); o.gap += 60; }
    else if (kind === 'boat') o.col = pickOne(SAILS);
    else if (kind === 'tower') {
      o.w = rand(50, 90); o.h = rand(160, 330); o.neon = pickOne(NEON); o.win = [];
      for (let i = 0; i < 26; i++) o.win.push([Math.random(), Math.random(), Math.random() < 0.55, pickOne(['#ffd166', '#ffd166', '#7df9ff', '#ff9ee8'])]);
    } else if (kind === 'island') { o.y = rand(0.36, 0.58); o.gap += 40; }
    return o;
  }
  function makeGround(x, wi) {
    const d = worldDef(wi), w = rand(110, 190), g = { x, w, wi, type: d.ground, h: 0, deco: [] };
    if (g.type === 'grass') {
      for (let i = 0; i < w / 24; i++) g.deco.push({ dx: rand(6, w - 6), dy: rand(4, 26), c: pickOne(['#ffffff', '#ffd166', '#ff8fab', '#c77dff']) });
      g.fence = Math.random() < 0.3;
    } else if (g.type === 'roof') {
      g.h = rand(0, 16); g.neon = pickOne(NEON); g.win = [];
      for (let i = 0; i < Math.floor(w / 28); i++) g.win.push([10 + i * 28 + rand(-3, 3), rand(20, 40), Math.random() < 0.55]);
      g.ant = Math.random() < 0.4 ? rand(0.2, 0.8) : 0;
    } else if (g.type === 'snow') { g.h = rand(-3, 5); g.man = Math.random() < 0.12; }
    return g;
  }
  function fill(arr, off, wi, make, margin) {
    while (arr.length && arr[0].x + arr[0].w < off - 80) arr.shift();
    let end = arr.length ? arr[arr.length - 1].x + arr[arr.length - 1].w + (arr[arr.length - 1].gap || 0) : off - 80;
    while (end < off + VW + margin) { const o = make(end, wi); arr.push(o); end = o.x + o.w + (o.gap || 0); }
  }
  function init() {
    for (let i = 0; i < 90; i++) nstars.push({ x: Math.random(), y: Math.random() * 0.62, r: rand(1, 2.4), ph: rand(0, TAU) });
    for (let i = 0; i < 8; i++) clouds.push(makeCloud(rand(-100, VW)));
    for (let i = 0; i < 60; i++) fx.push({ x: rand(0, VW), y: rand(0, VH), r: rand(0.8, 2.2), ph: rand(0, TAU), c: pickOne(['#ffffff', '#ffd1e8', '#fff3a8']) });
  }
  function reset(wi) {
    mids.length = grounds.length = fws.length = shots.length = 0;
    oMid = oNear = 0;
    fill(mids, oMid, wi, makeProp, 140); fill(grounds, oNear, wi, makeGround, 140);
    focus(worldStart(wi));
  }
  function update(dt, dx, wi) {
    oFar += dx * 0.06; oFar2 += dx * 0.03; oMid += dx * 0.3; oNear += dx;
    fill(mids, oMid, wi, makeProp, 140); fill(grounds, oNear, wi, makeGround, 140);
    for (const c of clouds) { c.x -= dx * c.p + 8 * dt; if (c.x < -c.w) Object.assign(c, makeCloud(VW + rand(20, 300))); }
    // ob-havo zarralari (ekran koordinatalarida)
    const type = worldDef(cur()).fx;
    for (const p of fx) {
      if (type === 'snow') { p.x -= dx * 0.6 + 30 * dt - Math.sin(T * 1.5 + p.ph) * 20 * dt; p.y += (40 + p.r * 25) * dt; }
      else if (type === 'petals') { p.x -= dx * 0.7 + 20 * dt; p.y += (16 + Math.sin(T * 2 + p.ph) * 30) * dt; }
      else if (type === 'dust') { p.x -= dx * 0.4 + 5 * dt; p.y += Math.sin(T + p.ph) * 6 * dt; }
      else if (type === 'glints') { p.x -= dx * 0.8; }
      else continue;
      if (p.x < -20) { p.x = VW + rand(0, 60); p.y = rand(-20, VH); }
      if (p.y > VH + 20) { p.y = -10; p.x = rand(0, VW + 100); }
    }
    // neon shahar ustida mushaklar, koinotda uchar yulduzlar
    if (wk('city') > 0.4) { fwT -= dt; if (fwT <= 0) { fwT = rand(0.6, 1.4); fws.push({ x: rand(VW * 0.1, VW * 0.9), y: rand(VH * 0.1, VH * 0.4), t: 0, col: pickOne(NEON), n: 20 + ((Math.random() * 12) | 0), r: rand(50, 95) }); } }
    for (let i = fws.length - 1; i >= 0; i--) { fws[i].t += dt; if (fws[i].t > 1.6) fws.splice(i, 1); }
    if (wk('cosmos') > 0.4) { shT -= dt; if (shT <= 0) { shT = rand(1.2, 2.8); shots.push({ x: rand(VW * 0.3, VW * 1.1), y: rand(-20, VH * 0.25), t: 0 }); } }
    for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i]; s.t += dt; s.x -= 520 * dt; s.y += 260 * dt; if (s.t > 0.9) shots.splice(i, 1); }
  }
  function groundAt(x) { for (const g of grounds) if (x >= g.x - oNear && x < g.x - oNear + g.w) return g.type; return worldDef(cur()).ground; }

  // ---------- Osmon ----------
  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, rgb(PAL.skyT)); g.addColorStop(1, rgb(PAL.skyB));
    ctx.fillStyle = g; ctx.fillRect(-60, -60, VW + 120, VH + 120);
    if (PAL.night > 0.02) {
      ctx.fillStyle = '#ffffff';
      for (const s of nstars) { ctx.globalAlpha = PAL.night * (0.45 + 0.55 * Math.sin(T * 2.2 + s.ph) ** 2); ctx.fillRect(s.x * VW, s.y * VH, s.r, s.r); }
      ctx.globalAlpha = 1;
    }
    const ac = wk('cosmos');
    if (ac > 0.01) { aurora(ac); planet(ac); }
    const sx = VW * PAL.sunX, sy = VH * PAL.sunY, day = 1 - PAL.night;
    if (day > 0.02) {
      ctx.globalAlpha = day;
      const gr = ctx.createRadialGradient(sx, sy, 10, sx, sy, 200);
      gr.addColorStop(0, rgb(PAL.sun, 0.65)); gr.addColorStop(1, rgb(PAL.sun, 0));
      ctx.fillStyle = gr; ctx.fillRect(sx - 200, sy - 200, 400, 400);
      // quyosh nurlari sekin aylanadi
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(T * 0.05); ctx.fillStyle = rgb(PAL.sun, 0.12);
      for (let i = 0; i < 10; i++) { ctx.rotate(TAU / 10); fillTri(0, 0, -24, -260, 24, -260); }
      ctx.restore();
      ctx.fillStyle = rgb(mix(PAL.sun, [255, 255, 255], 0.5)); circ(sx, sy, 40);
      ctx.globalAlpha = 1;
    }
    if (PAL.night > 0.05) {
      ctx.globalAlpha = PAL.night;
      ctx.drawImage(GLOW.w, sx - 90, sy - 90, 180, 180);
      ctx.fillStyle = '#f6f1d5'; circ(sx, sy, 30);
      ctx.fillStyle = 'rgba(120,110,90,0.18)'; circ(sx - 9, sy - 6, 6); circ(sx + 8, sy + 8, 4); circ(sx + 10, sy - 10, 3);
      ctx.globalAlpha = 1;
    }
  }
  function aurora(a) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const cols = ['80,255,170', '90,200,255', '255,110,220'];
    for (let j = 0; j < 3; j++) {
      ctx.beginPath();
      for (let x = -40; x <= VW + 40; x += 20) {
        const y = VH * (0.16 + j * 0.07) + Math.sin(x * 0.008 + T * 0.4 + j * 2) * 30 + Math.sin(x * 0.019 - T * 0.3 + j) * 14;
        if (x === -40) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = `rgba(${cols[j]},${0.1 * a})`; ctx.lineWidth = 46 - j * 8; ctx.stroke();
      ctx.strokeStyle = `rgba(${cols[j]},${0.16 * a})`; ctx.lineWidth = 9; ctx.stroke();
    }
    ctx.restore();
  }
  function planet(a) {
    const span = VW + 320, px = (((VW * 0.3 - oFar * 0.4) % span) + span) % span - 160, py = VH * 0.3, r = 54;
    ctx.globalAlpha = a;
    ctx.strokeStyle = 'rgba(255,220,160,0.75)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(px, py, r * 1.7, r * 0.42, -0.25, Math.PI, TAU); ctx.stroke();
    const g = ctx.createRadialGradient(px - 18, py - 18, 6, px, py, r); g.addColorStop(0, '#ffb3d9'); g.addColorStop(1, '#7a3cff');
    ctx.fillStyle = g; circ(px, py, r);
    ctx.beginPath(); ctx.ellipse(px, py, r * 1.7, r * 0.42, -0.25, 0, Math.PI); ctx.stroke();
    ctx.fillStyle = '#c9b8ff'; circ(px + 120, py - 70, 12);
    ctx.fillStyle = '#7df9ff'; circ(px - 140, py + 40, 7);
    ctx.globalAlpha = 1;
  }

  // ---------- Uzoq manzara ----------
  function ridge(off, col, fr, amp, base) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-120, VH + 80);
    for (let x = -120; x <= VW + 120; x += 20) {
      const w = x + off;
      ctx.lineTo(x, base - (Math.sin(w * fr) * 0.5 + 0.5) * amp - Math.sin(w * fr * 2.9 + 1.3) * amp * 0.22 - Math.sin(w * fr * 7.1) * amp * 0.06);
    }
    ctx.lineTo(VW + 120, VH + 80); ctx.closePath(); ctx.fill();
  }
  const tw = x => 1 - Math.abs((((x % 1) + 1) % 1) * 2 - 1); // uchburchak to'lqin (cho'qqilar uchun)
  function peaks(off, col, fr, amp, base, snow) {
    ctx.beginPath(); ctx.moveTo(-120, VH + 80);
    for (let x = -120; x <= VW + 120; x += 12) { const w = x + off; ctx.lineTo(x, base - amp * (0.62 * tw(w * fr) + 0.28 * tw(w * fr * 2.3 + 0.37) + 0.1 * tw(w * fr * 5.3 + 0.71))); }
    ctx.lineTo(VW + 120, VH + 80); ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = snow; ctx.beginPath(); ctx.moveTo(-120, -20);
    for (let x = -120; x <= VW + 120; x += 16) ctx.lineTo(x, base - amp * 0.52 + Math.sin((x + off) * 0.05) * 7 + Math.sin((x + off) * 0.13) * 4);
    ctx.lineTo(VW + 120, -20); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function skyline(off, col, depth, minH, bw) {
    const span = bw + 6, i0 = Math.floor(off / span) - 2, n = Math.ceil((VW + 240) / span) + 2;
    for (let i = i0; i < i0 + n; i++) {
      const x = i * span - off - 120, h = minH + hash(i * 3.1 + depth) * 170 * depth + 30, top = GROUND + 10 - h;
      ctx.fillStyle = col; ctx.fillRect(x, top, bw, h + 80);
      if (hash(i * 7.7 + depth) > 0.72) { ctx.fillRect(x + bw / 2 - 1, top - 18, 2, 18); if ((T * 1.5 + i) % 1 < 0.5) { ctx.fillStyle = '#ff4d6d'; ctx.fillRect(x + bw / 2 - 2, top - 21, 4, 4); } }
      for (let r = 0; r < 14; r++) {
        const wy = top + 10 + r * 14; if (wy > GROUND) break;
        for (let q = 0; q < 4; q++) {
          const hv = hash(i * 97 + r * 13 + q * 3 + depth); if (hv < 0.62) continue;
          ctx.fillStyle = hv > 0.93 ? 'rgba(255,120,220,0.85)' : hv > 0.84 ? 'rgba(120,230,255,0.8)' : 'rgba(255,214,120,0.75)';
          ctx.fillRect(x + 6 + (q * (bw - 12)) / 4, wy, 4, 6);
        }
      }
    }
  }
  function puffRow(off, col, base, r0) {
    ctx.fillStyle = col; ctx.beginPath();
    const sp = r0 * 1.3, i0 = Math.floor(off / sp) - 2;
    for (let i = i0; i < i0 + (VW + 240) / sp + 3; i++) { const x = i * sp - off - 120, r = r0 * (0.7 + hash(i) * 0.6); ctx.moveTo(x + r, base); ctx.arc(x, base, r, 0, TAU); }
    ctx.fill(); ctx.fillRect(-120, base, VW + 240, VH - base + 80);
  }
  function drawSea(C) {
    const hy = GROUND - 150;
    ridge(oFar2, rgb(mix(C.far0, PAL.skyB, 0.4)), 0.006, 28, hy + 4);
    const g = ctx.createLinearGradient(0, hy, 0, GROUND + 40);
    g.addColorStop(0, rgb(mix(C.far1, PAL.skyB, 0.45))); g.addColorStop(1, rgb(C.far1));
    ctx.fillStyle = g; ctx.fillRect(-120, hy, VW + 240, VH - hy + 80);
    const sx = PAL.sunX * VW;
    ctx.fillStyle = rgb(PAL.sun, 0.55);
    for (let i = 0; i < 9; i++) { const w = (70 - i * 5) * (0.7 + 0.3 * Math.sin(T * 2 + i * 1.7)); ctx.fillRect(sx - w / 2 + Math.sin(T + i) * 6, hy + 6 + i * 13, w, 3); }
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    for (let i = 0; i < 14; i++) { const row = i % 7, span = VW + 240, x = (((hash(i) * 900 - oFar * (1 + row * 0.5)) % span) + span) % span - 120; ctx.fillRect(x, hy + 12 + row * 19, 30 + hash(i + 9) * 40, 2); }
  }
  function drawFarOf(wi) {
    const d = worldDef(wi), C = d.C, sky = PAL.skyB;
    if (d.key === 'meadow') { ridge(oFar2, rgb(mix(C.far0, sky, 0.45)), 0.0026, 170, GROUND - 170); ridge(oFar, rgb(C.far1), 0.0038, 120, GROUND - 100); }
    else if (d.key === 'bay') drawSea(C);
    else if (d.key === 'peaks') { peaks(oFar2, rgb(mix(C.far0, sky, 0.35)), 0.0016, 320, GROUND - 120, rgb(mix([255, 255, 255], sky, 0.25))); peaks(oFar, rgb(C.far1), 0.0024, 210, GROUND - 60, '#ffffff'); }
    else if (d.key === 'city') { skyline(oFar2, rgb(mix(C.far0, sky, 0.25)), 0.5, 70, 46); skyline(oFar, rgb(C.far1), 1, 110, 58); }
    else { puffRow(oFar2, rgb(mix(C.far0, sky, 0.4)), GROUND - 150, 40); puffRow(oFar, rgb(mix(C.far1, sky, 0.2)), GROUND - 80, 48); }
  }
  function drawClouds(pmin, pmax) {
    const col = mix(PAL.cloud, PAL.skyB, 0.15), k = (1 - PAL.night * 0.4) * (1 - wk('cosmos') * 0.6);
    for (const c of clouds) {
      if (c.p < pmin || c.p >= pmax) continue;
      ctx.fillStyle = rgb(col, c.a * k);
      ctx.beginPath();
      for (const p of c.puffs) { const x = c.x + p.ox * c.s, y = c.y + p.oy * c.s; ctx.moveTo(x + p.r * c.s, y); ctx.arc(x, y, p.r * c.s, 0, TAU); }
      ctx.fill();
    }
  }
  function drawFw() {
    const a = wk('city');
    for (const f of fws) {
      const k = f.t / 1.6, e = 1 - Math.pow(1 - Math.min(1, f.t / 0.6), 3), r = f.r * e;
      ctx.globalAlpha = (1 - k) * 0.9 * a; ctx.fillStyle = f.col;
      for (let i = 0; i < f.n; i++) { const an = (i / f.n) * TAU; ctx.fillRect(f.x + Math.cos(an) * r - 1.5, f.y + Math.sin(an) * r + k * k * 40 - 1.5, 3, 3); }
      if (f.t < 0.25) { ctx.globalAlpha = a * (1 - f.t / 0.25); ctx.drawImage(GLOW.w, f.x - 32, f.y - 32, 64, 64); }
    }
    ctx.globalAlpha = 1;
    for (const s of shots) {
      ctx.globalAlpha = Math.sin((s.t / 0.9) * Math.PI) * wk('cosmos');
      const g = ctx.createLinearGradient(s.x, s.y, s.x + 90, s.y - 45); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + 90, s.y - 45); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ---------- O'rta qatlam bezaklari (x — chap chet, b — asos chizig'i) ----------
  const PROPS = {
    windmill(x, b, o) {
      const s = o.s, cx = x + o.w / 2, h = 110 * s;
      ctx.fillStyle = hz('#f3ece0'); ctx.beginPath(); ctx.moveTo(cx - 16 * s, b); ctx.lineTo(cx - 8 * s, b - h); ctx.lineTo(cx + 8 * s, b - h); ctx.lineTo(cx + 16 * s, b); ctx.fill();
      ctx.fillStyle = hz('#d1495b'); fillTri(cx - 12 * s, b - h, cx, b - h - 16 * s, cx + 12 * s, b - h);
      ctx.fillStyle = hz('#8a5a44'); ctx.fillRect(cx - 4 * s, b - 22 * s, 8 * s, 22 * s);
      const hy = b - h + 2 * s;
      ctx.save(); ctx.translate(cx, hy); ctx.rotate(T * 1.6 + o.seed);
      for (let i = 0; i < 4; i++) { ctx.rotate(TAU / 4); ctx.fillStyle = hz('#ffffff'); ctx.fillRect(-4 * s, 4 * s, 8 * s, 50 * s); ctx.fillStyle = hz('#d1495b'); ctx.fillRect(-4 * s, 40 * s, 8 * s, 14 * s); }
      ctx.restore();
      ctx.fillStyle = hz('#5c3d2e'); circ(cx, hy, 5 * s);
    },
    tree(x, b, o) {
      const s = o.s, cx = x + o.w / 2;
      ctx.fillStyle = hz('#7a5232'); ctx.fillRect(cx - 4 * s, b - 34 * s, 8 * s, 34 * s);
      ctx.fillStyle = hz('#3f9a4f'); circ(cx - 14 * s, b - 40 * s, 18 * s); circ(cx + 14 * s, b - 42 * s, 18 * s); circ(cx, b - 58 * s, 22 * s);
      ctx.fillStyle = hz('#62c467'); circ(cx - 6 * s, b - 64 * s, 10 * s); circ(cx - 18 * s, b - 46 * s, 8 * s);
    },
    balloon(x, b, o) {
      const s = o.s, cx = x + o.w / 2, cy = VH * o.y + Math.sin(T * 0.9 + o.seed) * 10, r = 30 * s, by = cy + r * 1.15 + 16 * s;
      ctx.strokeStyle = hz('#6b4a2e'); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx - r * 0.38, cy + r); ctx.lineTo(cx - 7 * s, by); ctx.moveTo(cx + r * 0.38, cy + r); ctx.lineTo(cx + 7 * s, by); ctx.stroke();
      ctx.fillStyle = hz('#8a5a34'); ctx.fillRect(cx - 8 * s, by, 16 * s, 12 * s);
      ctx.save(); ctx.beginPath(); ctx.moveTo(cx, cy + r * 1.15);
      ctx.bezierCurveTo(cx - r * 1.5, cy + r * 0.2, cx - r * 1.1, cy - r * 1.3, cx, cy - r * 1.3);
      ctx.bezierCurveTo(cx + r * 1.1, cy - r * 1.3, cx + r * 1.5, cy + r * 0.2, cx, cy + r * 1.15); ctx.closePath();
      ctx.fillStyle = hz(o.col[0]); ctx.fill(); ctx.clip();
      ctx.fillStyle = hz(o.col[1]);
      for (let i = -2; i <= 2; i += 2) { ctx.beginPath(); ctx.ellipse(cx + i * r * 0.36, cy - r * 0.1, r * 0.17, r * 1.4, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.ellipse(cx - r * 0.45, cy - r * 0.55, r * 0.22, r * 0.45, 0.3, 0, TAU); ctx.fill();
      ctx.restore();
    },
    barn(x, b, o) {
      const s = o.s, w = 70 * s, x0 = x + (o.w - w) / 2, h = 46 * s;
      ctx.fillStyle = hz('#c8423b'); ctx.fillRect(x0, b - h, w, h);
      ctx.fillStyle = hz('#8e2b2b'); fillTri(x0 - 6 * s, b - h, x0 + w / 2, b - h - 30 * s, x0 + w + 6 * s, b - h);
      ctx.strokeStyle = hz('#ffffff'); ctx.lineWidth = 3 * s;
      const dx = x0 + w / 2 - 12 * s, dy = b - 30 * s;
      ctx.strokeRect(dx, dy, 24 * s, 30 * s); ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx + 24 * s, b); ctx.moveTo(dx + 24 * s, dy); ctx.lineTo(dx, b); ctx.stroke();
    },
    lighthouse(x, b, o) {
      const s = o.s, cx = x + o.w / 2, h = 130 * s, ly = b - h - 10 * s;
      // nur — aylanayotgan mayoq
      const a = Math.sin(T * 1.3 + o.seed);
      ctx.globalAlpha = PA * (0.07 + 0.11 * Math.abs(a)); ctx.fillStyle = '#fff6c8';
      fillTri(cx, ly, cx + a * 170 * s, ly - 26 * s, cx + a * 170 * s, ly + 18 * s);
      ctx.globalAlpha = PA;
      ctx.fillStyle = hz('#4a3d5c'); ctx.beginPath(); ctx.ellipse(cx, b, 42 * s, 20 * s, 0, Math.PI, TAU); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.moveTo(cx - 14 * s, b - 8 * s); ctx.lineTo(cx - 9 * s, b - h); ctx.lineTo(cx + 9 * s, b - h); ctx.lineTo(cx + 14 * s, b - 8 * s); ctx.closePath();
      ctx.fillStyle = hz('#ffffff'); ctx.fill(); ctx.clip();
      ctx.fillStyle = hz('#e63946'); for (let i = 0; i < 4; i++) ctx.fillRect(cx - 20 * s, b - 8 * s - ((i * 2 + 1) * h) / 8.5, 40 * s, h / 8.5);
      ctx.restore();
      ctx.fillStyle = hz('#2b2d42'); ctx.fillRect(cx - 12 * s, b - h - 4 * s, 24 * s, 5 * s);
      ctx.fillStyle = '#fff3b0'; ctx.fillRect(cx - 7 * s, b - h - 16 * s, 14 * s, 12 * s);
      ctx.fillStyle = hz('#e63946'); fillTri(cx - 10 * s, b - h - 16 * s, cx, b - h - 27 * s, cx + 10 * s, b - h - 16 * s);
      ctx.drawImage(GLOW.y, cx - 28 * s, ly - 28 * s, 56 * s, 56 * s);
    },
    boat(x, b, o) {
      const s = o.s, cx = x + o.w / 2, by = b - 8 * s + Math.sin(T * 1.8 + o.seed) * 3;
      ctx.save(); ctx.translate(cx, by); ctx.rotate(Math.sin(T * 1.4 + o.seed) * 0.06);
      ctx.fillStyle = hz('#7b4b2a'); ctx.beginPath(); ctx.moveTo(-34 * s, -6 * s); ctx.lineTo(34 * s, -6 * s); ctx.lineTo(24 * s, 8 * s); ctx.lineTo(-24 * s, 8 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = hz('#5a3520'); ctx.fillRect(-1.5 * s, -66 * s, 3 * s, 60 * s);
      ctx.fillStyle = hz(o.col[0]); fillTri(3 * s, -64 * s, 30 * s, -10 * s, 3 * s, -10 * s);
      ctx.fillStyle = hz(o.col[1]); fillTri(-3 * s, -54 * s, -24 * s, -10 * s, -3 * s, -10 * s);
      ctx.fillStyle = hz('#e63946'); fillTri(1.5 * s, -66 * s, 14 * s, -62 * s, 1.5 * s, -58 * s);
      ctx.restore();
    },
    palm(x, b, o) {
      const s = o.s, cx = x + o.w / 2, tx = cx + 16 * s, ty = b - 86 * s, sw = Math.sin(T * 2 + o.seed) * 0.08;
      ctx.fillStyle = hz('#f2d49b'); ctx.beginPath(); ctx.ellipse(cx, b, 46 * s, 16 * s, 0, Math.PI, TAU); ctx.fill();
      ctx.strokeStyle = hz('#8a5a34'); ctx.lineWidth = 7 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx, b - 8 * s); ctx.quadraticCurveTo(cx + 4 * s, b - 50 * s, tx, ty); ctx.stroke();
      ctx.fillStyle = hz('#2f9e5a');
      for (let i = 0; i < 6; i++) {
        ctx.save(); ctx.translate(tx, ty); ctx.rotate(-Math.PI / 2 + (i - 2.5) * 0.55 + sw);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(20 * s, -10 * s, 42 * s, 6 * s); ctx.quadraticCurveTo(20 * s, 2 * s, 0, 0); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = hz('#6b4226'); circ(tx - 4 * s, ty + 5 * s, 4 * s); circ(tx + 4 * s, ty + 6 * s, 4 * s);
    },
    pine(x, b, o) {
      const s = o.s;
      for (let j = 0; j < 3; j++) {
        const cx = x + (0.2 + j * 0.3) * o.w + hash(o.seed + j) * 10, h = (60 + hash(o.seed * 3 + j) * 55) * s, w = h * 0.5;
        ctx.fillStyle = hz('#5a3d2e'); ctx.fillRect(cx - 3 * s, b - 10 * s, 6 * s, 10 * s);
        for (let k = 0; k < 3; k++) {
          const ty = b - 8 * s - k * h * 0.26, tw2 = w * (1 - k * 0.25), th = h * 0.46;
          ctx.fillStyle = hz('#2d6a4f'); fillTri(cx - tw2 / 2, ty, cx, ty - th, cx + tw2 / 2, ty);
          ctx.fillStyle = hz('#ffffff', 0.1); fillTri(cx - tw2 * 0.2, ty - th * 0.6, cx, ty - th, cx + tw2 * 0.2, ty - th * 0.6);
        }
      }
    },
    cabin(x, b, o) {
      const s = o.s, w = 56 * s, x0 = x + (o.w - w) / 2, h = 34 * s, chx = x0 + w * 0.72, chy = b - h - 22 * s;
      ctx.fillStyle = hz('#8b5a3c'); ctx.fillRect(x0, b - h, w, h);
      ctx.fillStyle = hz('#6f4630'); for (let i = 1; i < 4; i++) ctx.fillRect(x0, b - h + i * 8 * s, w, 2 * s);
      ctx.fillStyle = hz('#6f4630'); ctx.fillRect(chx - 4 * s, chy, 8 * s, 18 * s);
      ctx.fillStyle = hz('#ffffff', 0.1); fillTri(x0 - 8 * s, b - h + 2 * s, x0 + w / 2, b - h - 26 * s, x0 + w + 8 * s, b - h + 2 * s);
      ctx.fillStyle = '#ffd166'; ctx.fillRect(x0 + 10 * s, b - 24 * s, 12 * s, 11 * s);
      ctx.drawImage(GLOW.y, x0 - 4 * s, b - 38 * s, 40 * s, 40 * s);
      for (let i = 0; i < 3; i++) { const k = (T * 0.5 + i / 3 + o.seed) % 1; ctx.fillStyle = `rgba(240,244,255,${(1 - k) * 0.6})`; circ(chx + k * 16 * s, chy - k * 42 * s, (4 + k * 9) * s); }
    },
    tower(x, b, o) {
      const h = o.h, w = o.w - 10, x0 = x + 5;
      ctx.fillStyle = hz('#24194f', 0.12); ctx.fillRect(x0, b - h, w, h + 10);
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x0, b - h, w * 0.3, h);
      ctx.strokeStyle = o.neon; ctx.globalAlpha = PA * 0.85; ctx.lineWidth = 2; ctx.strokeRect(x0 + 1, b - h + 1, w - 2, h + 10); ctx.globalAlpha = PA;
      for (const v of o.win) { if (!v[2]) continue; ctx.fillStyle = v[3]; ctx.fillRect(x0 + 5 + v[0] * (w - 15), b - h + 12 + v[1] * (h - 36), 5, 7); }
      ctx.fillStyle = hz('#24194f', 0.12); ctx.fillRect(x0 + w / 2 - 1, b - h - 26, 2, 26);
      if ((T * 1.2 + o.seed) % 1 < 0.5) { ctx.fillStyle = '#ff4d6d'; circ(x0 + w / 2, b - h - 27, 3); ctx.drawImage(GLOW.p, x0 + w / 2 - 12, b - h - 39, 24, 24); }
    },
    ferris(x, b, o) {
      const s = o.s, cx = x + o.w / 2, R = 62 * s, cy = b - R - 22 * s, a0 = T * 0.35 + o.seed;
      ctx.strokeStyle = hz('#3a2a6a', 0.1); ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(cx - 34 * s, b); ctx.lineTo(cx, cy); ctx.lineTo(cx + 34 * s, b); ctx.stroke();
      ctx.strokeStyle = 'rgba(125,249,255,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = a0 + (i * TAU) / 10; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); }
      ctx.stroke();
      ctx.strokeStyle = '#ff5fd2'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      for (let i = 0; i < 10; i++) { const a = a0 + (i * TAU) / 10, gx = cx + Math.cos(a) * R, gy = cy + Math.sin(a) * R; ctx.fillStyle = NEON[i % 4]; rrect(ctx, gx - 6 * s, gy, 12 * s, 10 * s, 3 * s); ctx.fill(); }
      ctx.drawImage(GLOW.p, cx - 20, cy - 20, 40, 40);
    },
    island(x, b, o) {
      const s = o.s, cx = x + o.w / 2, cy = VH * o.y + Math.sin(T * 0.8 + o.seed) * 8, w = 60 * s;
      ctx.drawImage(GLOW.p, cx - w * 1.2, cy - 10, w * 2.4, 90 * s);
      ctx.fillStyle = hz('#5b3f8a', 0.2); ctx.beginPath(); ctx.moveTo(cx - w, cy); ctx.lineTo(cx + w, cy); ctx.lineTo(cx + w * 0.5, cy + 30 * s); ctx.lineTo(cx + 10 * s, cy + 64 * s); ctx.lineTo(cx - w * 0.4, cy + 34 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = hz('#59d68a', 0.2); ctx.beginPath(); ctx.ellipse(cx, cy, w, 9 * s, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = hz('#7a5232', 0.2); ctx.fillRect(cx + 10 * s, cy - 30 * s, 5 * s, 30 * s);
      ctx.fillStyle = hz('#ff8fd8', 0.2); circ(cx + 12 * s, cy - 36 * s, 15 * s); circ(cx + 2 * s, cy - 30 * s, 10 * s);
    },
    crystal(x, b, o) {
      const s = o.s, cx = x + o.w / 2;
      ctx.drawImage(GLOW.c, cx - 50 * s, b - 90 * s, 100 * s, 100 * s);
      for (let j = 0; j < 4; j++) {
        const h = (40 + hash(o.seed + j) * 50) * s, w = 11 * s;
        ctx.save(); ctx.translate(cx + (j - 1.5) * 12 * s, b); ctx.rotate((j - 1.5) * 0.18);
        ctx.fillStyle = j % 2 ? '#7df9ff' : '#c77dff'; ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -h * 0.8); ctx.lineTo(0, -h); ctx.lineTo(w / 2, -h * 0.8); ctx.lineTo(w / 2, 0); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -h * 0.8); ctx.lineTo(0, -h); ctx.lineTo(0, 0); ctx.fill();
        ctx.restore();
      }
    },
  };

  // ---------- Yer ----------
  const wave = w => Math.sin(w * 0.035 + T * 2.2) * 4 + Math.sin(w * 0.013 - T * 1.3) * 3;
  const GROUNDS = {
    grass(x, g) {
      const top = GROUND + g.h;
      ctx.fillStyle = '#3f9f4a'; ctx.fillRect(x, top + 8, g.w + 1, VH - top + 60);
      ctx.fillStyle = '#6fcf5c'; ctx.fillRect(x, top, g.w + 1, 10);
      ctx.beginPath();
      for (let k = Math.ceil(g.x / 18) * 18; k < g.x + g.w; k += 18) { const xx = k - oNear; ctx.moveTo(xx - 11, top + 2); ctx.arc(xx, top + 2, 11, Math.PI, TAU); }
      ctx.fill();
      for (const f of g.deco) { ctx.fillStyle = f.c; circ(x + f.dx, top + 4 + f.dy, 3.2); ctx.fillStyle = '#fff6a0'; circ(x + f.dx, top + 4 + f.dy, 1.3); }
      if (g.fence) {
        ctx.fillStyle = '#f5ebe0';
        for (let k = 8; k < g.w - 8; k += 22) ctx.fillRect(x + k, top - 22, 5, 24);
        ctx.fillRect(x + 6, top - 18, g.w - 12, 4); ctx.fillRect(x + 6, top - 9, g.w - 12, 4);
      }
    },
    water(x, g) {
      const top = GROUND, gr = ctx.createLinearGradient(0, top - 8, 0, VH);
      gr.addColorStop(0, '#5b86d6'); gr.addColorStop(1, '#1f2f6e');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x, VH + 60);
      for (let xx = x; xx <= x + g.w + 12; xx += 12) ctx.lineTo(xx, top + wave(xx + oNear));
      ctx.lineTo(x + g.w + 12, VH + 60); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3; ctx.beginPath();
      for (let xx = x; xx <= x + g.w + 12; xx += 12) { const y = top + wave(xx + oNear); if (xx === x) ctx.moveTo(xx, y); else ctx.lineTo(xx, y); }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 4; i++) { const hx = hash(g.x * 0.1 + i), yy = top + 18 + hash(g.x + i * 7) * 40; if ((T * 0.8 + hx * 5) % 1 < 0.6) ctx.fillRect(x + hx * g.w, yy, 18, 2); }
    },
    snow(x, g) {
      const top = GROUND + g.h;
      ctx.fillStyle = '#dbe8f7'; ctx.fillRect(x, top + 8, g.w + 1, VH - top + 60);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x, top + 2, g.w + 1, 10); ctx.beginPath();
      for (let k = Math.ceil(g.x / 40) * 40; k < g.x + g.w + 40; k += 40) { const xx = k - oNear; ctx.moveTo(xx - 26, top + 6); ctx.ellipse(xx, top + 6, 26, 9, 0, Math.PI, TAU); }
      ctx.fill();
      ctx.fillStyle = 'rgba(120,160,220,0.25)'; ctx.fillRect(x, top + 16, g.w + 1, 4);
      if (g.man) {
        const mx = x + g.w * 0.5;
        ctx.fillStyle = '#ffffff'; circ(mx, top - 8, 12); circ(mx, top - 26, 9);
        ctx.fillStyle = '#1b1530'; circ(mx - 3, top - 28, 1.4); circ(mx + 3, top - 28, 1.4);
        ctx.fillStyle = '#ff8c42'; fillTri(mx, top - 26, mx + 9, top - 25, mx, top - 23);
        ctx.fillStyle = '#e63946'; ctx.fillRect(mx - 9, top - 19, 18, 3);
      }
    },
    roof(x, g) {
      const top = GROUND + g.h;
      ctx.fillStyle = '#1d1442'; ctx.fillRect(x, top, g.w + 1, VH - top + 60);
      if (g.ant) { const ax = x + g.w * g.ant; ctx.fillRect(ax - 1, top - 30, 2, 30); ctx.fillRect(ax - 10, top - 22, 20, 2); if ((T * 1.4 + g.x) % 1 < 0.5) { ctx.fillStyle = '#ff4d6d'; circ(ax, top - 31, 2.5); } }
      ctx.fillStyle = g.neon; ctx.globalAlpha = 0.9; ctx.fillRect(x, top, g.w + 1, 3); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,200,110,0.85)';
      for (const w of g.win) if (w[2]) ctx.fillRect(x + w[0], top + w[1], 7, 9);
    },
    clouds(x, g) {
      const top = GROUND + 4;
      ctx.fillStyle = '#9d8cf0'; ctx.fillRect(x, top + 10, g.w + 1, VH - top + 60);
      ctx.fillStyle = '#e4dcff'; ctx.beginPath();
      for (let k = Math.ceil(g.x / 34) * 34; k < g.x + g.w + 34; k += 34) { const xx = k - oNear, r = 22 + hash(k) * 14, cy = top + 12 + Math.sin(T * 1.2 + k * 0.1) * 3; ctx.moveTo(xx + r, cy); ctx.arc(xx, cy, r, 0, TAU); }
      ctx.fill();
      ctx.fillStyle = 'rgba(157,140,240,0.85)'; ctx.fillRect(x, top + 34, g.w + 1, VH - top + 40);
    },
  };

  function drawBack() {
    drawFarOf(A);
    if (BT > 0 && B !== A) { ctx.globalAlpha = BT; drawFarOf(B); ctx.globalAlpha = 1; }
    drawFw();
    drawClouds(0, 0.26);
    // dunyo almashganda eski dunyo bezaklari so'nadi, yangilari paydo bo'ladi (masalan, ombor dengizda qolmasin)
    for (const o of mids) {
      const x = o.x - oMid; if (x > VW + 80 || x + o.w < -80) continue;
      PA = o.wi === A ? (A === B ? 1 : 1 - BT) : o.wi === B ? BT : 0;
      if (PA < 0.02) continue;
      ctx.globalAlpha = PA; PROPS[o.kind](x, GROUND + 6, o);
    }
    ctx.globalAlpha = 1; PA = 1;
    const fg = ctx.createLinearGradient(0, GROUND - 140, 0, GROUND + 10);
    fg.addColorStop(0, rgb(PAL.fog, 0)); fg.addColorStop(1, rgb(PAL.fog, 0.5 - PAL.night * 0.2));
    ctx.fillStyle = fg; ctx.fillRect(-120, GROUND - 140, VW + 240, 200);
    drawClouds(0.26, 1);
  }
  function drawGround() {
    for (const g of grounds) { const x = g.x - oNear; if (x > VW + 120 || x + g.w < -120) continue; GROUNDS[g.type](x, g); }
  }
  function drawFront() {
    const type = worldDef(cur()).fx;
    if (type === 'none') return;
    for (let i = 0; i < fx.length; i++) {
      const p = fx[i];
      if (type === 'snow') { ctx.fillStyle = 'rgba(255,255,255,0.85)'; circ(p.x, p.y, p.r * 1.5); }
      else if (type === 'petals') { if (i % 3) continue; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(T * 2 + p.ph); ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 2.2, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      else if (type === 'dust') { ctx.globalAlpha = 0.3 + 0.6 * Math.abs(Math.sin(T * 3 + p.ph)); ctx.fillStyle = '#ffffff'; ctx.fillRect(p.x, p.y, 2, 2); }
      else if (type === 'glints') { if (i % 4) continue; const a = Math.max(0, Math.sin(T * 4 + p.ph)); if (a < 0.1) continue; ctx.globalAlpha = a * 0.8; ctx.fillStyle = '#fff6d8'; ctx.fillRect(p.x - 4 * a, p.y, 8 * a, 1.5); ctx.fillRect(p.x - 0.75, p.y - 4 * a, 1.5, 8 * a); }
    }
    ctx.globalAlpha = 1;
  }
  return { PAL, init, reset, focus, update, groundAt, drawSky, drawBack, drawGround, drawFront, wk, get world() { return cur(); } };
})();
