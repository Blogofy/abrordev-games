'use strict';
/* TOWER PALS — YouTube Playables uchun HTML5 o'yin.
   Kranda tebranayotgan hayvonchani bosib tashlang va minorani bayroqli marragacha ko'taring.
   Har 5 daraja — yangi bob (hovli, sohil, qor, shahar, Oy) va yangi qiyinchilik; ba'zi darajalarda yangi do'st ochiladi.
   Yuklanish tartibi: util.js, i18n.js, audio.js, pets.js, scene.js, game.js */

// ---------- YouTube Playables SDK ----------
const YT = (typeof ytgame !== 'undefined' && ytgame.IN_PLAYABLES_ENV) ? ytgame : null;
function yt(fn) { if (!YT) return; try { const r = fn(YT); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
const SAVE_KEY = 'towerpals_save_v2';
const Store = {
  async load() {
    try {
      const s = YT ? await YT.game.loadData() : localStorage.getItem(SAVE_KEY);
      return s ? JSON.parse(s) : {};
    } catch (e) { return {}; }
  },
  save(obj) {
    const s = JSON.stringify(obj);
    try { if (YT) YT.game.saveData(s).catch(() => {}); else localStorage.setItem(SAVE_KEY, s); } catch (e) {}
  },
};
async function detectLang() {
  let l = 'en';
  try { l = YT ? await YT.system.getLanguage() : (navigator.language || 'en'); } catch (e) {}
  l = String(l || 'en').toLowerCase().slice(0, 2);
  return STR[l] ? l : 'en';
}
window.addEventListener('error', () => yt(y => y.health.logError()));

// ---------- Holat ----------
const G = 2400, LR = 170, PERF = 10, BASE_W = 170, BASE_H = 40;
const CONF = ['#ef476f', '#ffd166', '#06d6a0', '#4fb3ff', '#b388ff', '#ffffff'];
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
let W = 0, H = 0, DPR = 1, S = 1, VW = 520, VH = 900, VX0 = 0, VX1 = 520, VY0 = 0, VY1 = 900;
let state = 'menu', paused = false, firstFrame = false, ready = false, T = 0, last = 0, timeScale = 1;
let lives = 3, combo = 0, deadT = 0, winT = 0, hintT = 0, spawnDelay = 0, failReason = '', winShown = false, loseShown = false, starsWon = 0;
let shake = 0, flash = 0, danger = 0, wobA = 0, wobV = 0, zoom = 1, zoomT = 1, bestTop = 0;
let camY = -800, topY = -BASE_H, swingP = 0, nextKind = 'cat', goalY = -300, goalBroken = false, goalT = 0;
let cfg = null, L = STR.en, screenNow = '', newPal = null, palSel = 0;
let save = { lv: 1, stars: {}, owned: STARTER_PALS.slice(), tut: false };
const pivot = { x: 260, y: 0 };
let cur = null;
const blocks = [], losers = [], parts = [], pops = [];

const groundScreen = () => VH - 110;
const totalStars = () => Object.values(save.stars).reduce((a, b) => a + b, 0);

// Daraja sozlamalari: marra balandligi, tebranish tezligi va bobga xos qiyinchilik (shamol, yuruvchi kran, past tortishish)
function levelCfg(n) {
  const ch = Math.floor((n - 1) / 5) % CHAPTERS.length, key = CHAPTERS[ch].key, d = 1 - Math.exp(-(n - 1) / 15), R = mulberry32(n * 977 + 5);
  const c = { n, ch, key, goal: Math.min(2100, 300 + (n - 1) * 55), swing: lerp(2.0, 3.6, d), trolley: 0, wind: 0, grav: 1 };
  if (key === 'city' || key === 'moon') c.trolley = Math.min(110, 40 + n * 2.5);
  else if (n >= 13) c.trolley = Math.min(80, (n - 12) * 6);
  if (key === 'beach' || key === 'snow') c.wind = (R() < 0.5 ? -1 : 1) * Math.min(1, 0.45 + n * 0.02);
  else if (n >= 18 && key !== 'moon') c.wind = (R() < 0.5 ? -1 : 1) * 0.5;
  if (key === 'moon') { c.grav = 0.55; c.swing *= 0.8; }
  return c;
}

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  S = Math.min(H / 900, W / 520);
  const oldVW = VW;
  VW = W / S; VH = H / S;
  const dx = VW / 2 - (blocks.length ? blocks[0].x : oldVW / 2);
  for (const b of blocks) b.x += dx;
  for (const b of losers) b.x += dx;
  if (cur) cur.x += dx;
  viewBounds();
}
function viewBounds() {
  VX0 = VW / 2 - VW / (2 * zoom); VX1 = VW / 2 + VW / (2 * zoom);
  VY0 = VH / 2 - VH / (2 * zoom); VY1 = VH / 2 + VH / (2 * zoom);
}

// ---------- O'yin oqimi ----------
function pickKind(prev) {
  const pool = save.owned.length > 1 ? save.owned.filter(k => k !== prev) : save.owned;
  return pool[(Math.random() * pool.length) | 0];
}
function resetWorld(demo) {
  blocks.length = losers.length = pops.length = 0;
  blocks.push({ kind: 'base', x: VW / 2, y: -BASE_H / 2, w: BASE_W, h: BASE_H, sqT: 9, mood: 'idle', moodT: 0, seed: 0 });
  topY = -BASE_H; bestTop = 0;
  if (demo) for (const k of ['dog', 'panda', 'cat']) addBlock(k, VW / 2 + rand(-8, 8));
  camY = -groundScreen(); wobA = wobV = 0; danger = 0; zoom = zoomT = 1; viewBounds();
  pivot.x = VW / 2; pivot.y = topY - 230 - LR;
  nextKind = pickKind();
  cur = null; spawnDelay = 0.5; goalBroken = false; goalT = 0;
}
function addBlock(kind, x) {
  const K = PALS[kind];
  const b = { kind, x, y: topY - K.h / 2, w: K.w, h: K.h, sqT: 0, mood: 'happy', moodT: 0.8, seed: rand(0, 100) };
  blocks.push(b); topY -= K.h;
  return b;
}
function spawnHanging() {
  const kind = nextKind;
  nextKind = pickKind(kind);
  const K = PALS[kind];
  cur = { kind, w: K.w, h: K.h, mode: 'hang', x: pivot.x, y: pivot.y, vx: 0, vy: 0, ang: 0, entry: 0, seed: rand(0, 100) };
}
function startLevel(n) {
  n = clamp(n | 0, 1, save.lv);
  cfg = levelCfg(n);
  Scene.setChapter(cfg.ch); Snd.setChapter(cfg.ch);
  resetWorld(false);
  goalY = -cfg.goal;
  state = 'play'; lives = 3; combo = 0; timeScale = 1; swingP = 0; winShown = loseShown = false;
  hintT = save.tut ? 0 : 5;
  if (!save.tut) { save.tut = true; Store.save(save); }
  const twist = cfg.grav < 1 ? '🌙 ' + L.lowGrav : cfg.wind ? '💨 ' + L.wind : cfg.trolley ? '🏗️ ' + L.moving : '';
  banner(`${L.level} ${n} · ${L.chapters[cfg.ch]}`, L.goal, twist);
  show('hud'); Snd.duck(0.26); Snd.whoosh();
}
function goMenu() {
  state = 'menu'; cfg = levelCfg(save.lv);
  Scene.setChapter(cfg.ch); Snd.setChapter(cfg.ch);
  resetWorld(true);
  renderMenu(); show('menu'); Snd.duck(0.26);
}
function endRun(reason) { if (state !== 'play') return; state = 'dead'; deadT = 0; failReason = reason; Snd.duck(0.08); }
function winLevel() {
  state = 'win'; winT = 0; goalBroken = true; goalT = 0; winShown = false;
  starsWon = clamp(lives, 1, 3);
  const n = cfg.n;
  save.stars[n] = Math.max(save.stars[n] || 0, starsWon);
  newPal = null;
  if (n >= save.lv) {
    save.lv = n + 1;
    const g = giftAt(n);
    if (g && !save.owned.includes(g)) { save.owned.push(g); newPal = g; }
  }
  Store.save(save);
  yt(y => y.engagement.sendScore({ value: save.lv - 1 }));
  confetti(); flash = 0.45; shake = 6; Snd.win();
  for (let i = 1; i < blocks.length; i++) { blocks[i].mood = 'happy'; blocks[i].moodT = 999; }
  for (let i = 0; i < 40; i++) addP(VW / 2 + rand(-200, 200), goalY + rand(-5, 25), rand(-160, 160), rand(-260, 40), rand(1.6, 2.6), rand(7, 11), pickOne(CONF), 'conf', 300);
  pop(L.complete, VW / 2, topY - 40, 40, '#ffd23f', 1.6);
}

function release() {
  if (!cur || cur.mode !== 'hang' || cur.entry < 0.6) return;
  cur.vx = 0; cur.vy = 0; // to'g'ri pastga tushadi (shamol bo'lsa, yon tomonga suriladi)
  cur.mode = 'fall';
  Snd.drop();
  hintT = Math.min(hintT, 0.5);
}
function land(dx) {
  const top = blocks[blocks.length - 1], perfect = Math.abs(dx) < PERF;
  const b = addBlock(cur.kind, perfect ? top.x : cur.x);
  b.seed = cur.seed;
  for (let i = 0; i < 4 && i < blocks.length; i++) blocks[blocks.length - 1 - i].sqT = -i * 0.06;
  wobV += (dx / top.w) * 0.5;
  const by = b.y + b.h / 2;
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) addP(b.x + (s * b.w) / 2, by, s * rand(40, 140), rand(-80, -20), rand(0.3, 0.6), rand(4, 8), '#ffffff', 'dot');
  if (perfect) {
    combo++;
    pop(L.perfect[(Math.random() * L.perfect.length) | 0] + (combo > 1 ? ' x' + combo : ''), b.x, b.y - b.h, 32, '#ffd23f');
    addP(b.x, by, 0, 0, 0.5, b.w * 0.6, '#ffd23f', 'hring');
    for (let i = 0; i < 12; i++) { const a = rand(0, TAU), v = rand(120, 380); addP(b.x, b.y, Math.cos(a) * v, Math.sin(a) * v, rand(0.3, 0.6), rand(2, 4), i % 2 ? '#ffd23f' : '#ffffff', 'spark'); }
    Snd.perfect(combo);
    if (combo % 4 === 0 && lives < 3) { lives++; pop('♥ ' + L.heart, VW / 2, b.y - b.h - 40, 30, '#ff4d6d', 1.2); Snd.life(); }
  } else {
    combo = 0;
    Snd.land(300 + PAL_LIST.indexOf(b.kind) * 40);
  }
  cur = null; spawnDelay = 0.3;
  bestTop = Math.min(bestTop, topY);
  checkStability();
  if (state === 'play' && topY <= goalY) winLevel();
}
function checkStability() {
  let sumM = 0, sumX = 0, maxR = 0;
  for (let i = blocks.length - 1; i >= 1; i--) {
    const b = blocks[i], m = b.w * b.h;
    sumM += m; sumX += m * b.x;
    const com = sumX / sumM, s = blocks[i - 1], r = Math.abs(com - s.x) / (s.w / 2);
    if (r > 1) { collapse(i, Math.sign(com - s.x) || 1); return; }
    if (r > maxR) maxR = r;
  }
  danger = maxR;
}
function toLoser(b, vx, vy, va) { losers.push({ kind: b.kind, w: b.w, h: b.h, x: b.x, y: b.y, vx, vy, ang: b.ang || 0, va, life: 4, seed: b.seed || 0 }); }
function collapse(i, dir) {
  const fallen = blocks.splice(i);
  fallen.forEach((b, k) => toLoser(b, dir * (rand(60, 180) + k * 25), rand(-220, -40), dir * rand(1.2, 3.5)));
  topY = blocks[blocks.length - 1].y - blocks[blocks.length - 1].h / 2;
  timeScale = 0.35; shake = 18; flash = 0.5;
  pop(L.collapse, VW / 2, camY + VH * 0.35, 48, '#ff4d6d', 1.4);
  Snd.crash();
  lives = 0;
  endRun(L.failFell);
}
function loseLife() {
  lives--; combo = 0; shake = Math.max(shake, 7);
  pop(L.oops, VW / 2, camY + VH * 0.4, 40, '#ff4d6d');
  Snd.oops();
  if (lives <= 0) endRun(L.failHearts);
}
function tipOff(dx) {
  const d = Math.sign(dx);
  toLoser(cur, d * 160, -160, d * 5);
  cur = null; spawnDelay = 0.45;
  loseLife();
}
function miss() {
  toLoser(cur, cur.vx, cur.vy, rand(-3, 3));
  cur = null; spawnDelay = 0.45;
  loseLife();
}

// ---------- Effektlar ----------
function addP(x, y, vx, vy, life, size, color, type = 'dot', g = 0) {
  if (parts.length > 500) return;
  parts.push({ x, y, vx, vy, life, max: life, size, color, type, g, rot: rand(0, TAU), vr: rand(-8, 8) });
}
function confetti() { for (let i = 0; i < 90; i++) addP(rand(VX0, VX1), camY + VY0 + rand(-120, -10), rand(-60, 60), rand(80, 260), rand(2.2, 3.6), rand(7, 12), CONF[i % CONF.length], 'conf', 140); }
function pop(text, x, y, size, color, life = 1) { pops.push({ text, x, y, size, color, t: 0, life }); }

// ---------- Yangilash ----------
function update(rdt) {
  T += rdt;
  timeScale += (1 - timeScale) * (1 - Math.exp(-rdt * 2));
  const dt = rdt * timeScale, wind = state === 'play' ? cfg.wind : 0, grav = cfg ? cfg.grav : 1;
  shake = Math.max(0, shake - rdt * 40);
  flash = Math.max(0, flash - rdt * 2.5);
  wobV += (-40 * wobA - 4 * wobV) * dt; wobA += wobV * dt;

  // Kran
  if (state === 'play' || state === 'menu') {
    swingP += (state === 'play' ? cfg.swing : 2.2) * dt;
    pivot.x = VW / 2 + (state === 'play' && cfg.trolley ? Math.sin(T * 0.7) * cfg.trolley : 0);
  }
  pivot.y += (topY - 230 - LR - pivot.y) * (1 - Math.exp(-dt * 5));
  // Kamera: g'alabada uzoqlashib, butun minorani ekranning yuqori qismida ko'rsatadi
  let camT;
  if (state === 'win') {
    const top = Math.min(topY, goalY) - 200, bottom = 90, span = bottom - top, center = (top + bottom) / 2, sc = VH * 0.33;
    zoomT = Math.min(1, (VH * 0.6) / span);
    camT = center - VH / 2 - (sc - VH / 2) / zoom;
  } else { camT = Math.min(-groundScreen(), topY - VH * 0.64); zoomT = 1; }
  zoom += (zoomT - zoom) * (1 - Math.exp(-rdt * 3));
  camY += (camT - camY) * (1 - Math.exp(-rdt * 3));
  viewBounds();
  Scene.update(dt, wind);
  if (goalBroken) goalT += rdt;

  if (!cur && state === 'play') { spawnDelay -= dt; if (spawnDelay <= 0) spawnHanging(); }
  if (cur) {
    if (cur.mode === 'hang') {
      cur.entry = Math.min(1, cur.entry + dt / 0.35);
      const th = wind * 0.12 + 0.62 * Math.sin(swingP), e = lerp(0.2, 1, easeOutBack(cur.entry));
      cur.x = pivot.x + LR * e * Math.sin(th);
      cur.y = pivot.y + LR * e * Math.cos(th);
      cur.ang = th;
    } else {
      const top = blocks[blocks.length - 1], prevBottom = cur.y + cur.h / 2;
      cur.vy += G * grav * dt; cur.vx += wind * 260 * dt; cur.vx *= 1 - 0.5 * dt;
      cur.x += cur.vx * dt; cur.y += cur.vy * dt;
      cur.ang *= Math.exp(-dt * 14);
      if (prevBottom <= topY && cur.y + cur.h / 2 >= topY) {
        const dx = cur.x - top.x;
        if ((cur.w + top.w) / 2 - Math.abs(dx) > 0) { if (Math.abs(dx) <= top.w / 2) land(dx); else tipOff(dx); }
      }
      if (cur && (cur.y + cur.h / 2 >= 0 || cur.y - camY > VH + 150)) miss();
    }
  }
  for (const b of blocks) {
    b.sqT += dt;
    if (b.moodT > 0) { b.moodT -= dt; if (b.moodT <= 0) b.mood = 'idle'; }
  }
  for (let i = losers.length - 1; i >= 0; i--) {
    const b = losers[i];
    b.life -= dt; b.vy += G * 0.8 * grav * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.ang += b.va * dt;
    if (b.y + b.h / 2 > 0 && b.vy > 0) { b.y = -b.h / 2; b.vy *= -0.35; b.vx *= 0.6; b.va *= 0.5; }
    if (b.life <= 0 || b.y - camY > VY1 + 300) losers.splice(i, 1);
  }
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    if (p.type === 'conf') { p.vx += Math.sin(p.life * 5 + p.rot) * 60 * dt; p.vy *= 1 - 0.8 * dt; }
    else { p.vx *= 1 - 2.5 * dt; p.vy *= 1 - 2.5 * dt; }
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
  }
  for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; p.t += dt; p.y -= 40 * dt; if (p.t >= p.life) pops.splice(i, 1); }
  if (hintT > 0 && state === 'play') hintT -= dt;

  if (state === 'dead') { deadT += rdt; if (deadT > 1.8 && !loseShown) { loseShown = true; showLose(); } }
  else if (state === 'win') { winT += rdt; if (winT > 2.1 && !winShown) { winShown = true; showWin(); } }
}

// ---------- Chizish ----------
function text(s, x, y, size, color, align = 'center', stroke = true) {
  ctx.font = `900 ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size * 0.16); ctx.strokeStyle = 'rgba(30,25,70,0.6)'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
function heart(x, y, s, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 1.1, y - s * 0.35, x - s * 0.45, y - s * 1.05, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s * 1.1, y - s * 0.35, x, y + s * 0.35); ctx.fill();
}
function drawCrane() {
  const py = pivot.y - camY, beamY = py - 26;
  if (beamY < VY0 - 60) return;
  ctx.fillStyle = '#ffb703'; ctx.fillRect(VX0 - 20, beamY - 9, VX1 - VX0 + 40, 18);
  ctx.fillStyle = '#3d405b';
  for (let x = Math.floor((VX0 - 20) / 30) * 30; x < VX1 + 20; x += 30) { ctx.beginPath(); ctx.moveTo(x, beamY - 9); ctx.lineTo(x + 12, beamY - 9); ctx.lineTo(x + 2, beamY + 9); ctx.lineTo(x - 10, beamY + 9); ctx.fill(); }
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(VX0 - 20, beamY + 9, VX1 - VX0 + 40, 4);
  // shamol ko'rsatkichi (shamol xaltasi)
  if (cfg && cfg.wind) {
    const wx = VW / 2 + 150 * (cfg.wind > 0 ? -1 : 1), d = Math.sign(cfg.wind), fl = Math.sin(T * 12) * 3;
    ctx.fillStyle = '#3d405b'; ctx.fillRect(wx - 2, beamY + 9, 4, 26);
    ctx.save(); ctx.translate(wx, beamY + 32); ctx.scale(d, 1);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#ffffff' : '#ff5d73'; const x0 = i * 12, h0 = 10 - i * 1.6, h1 = 10 - (i + 1) * 1.6; ctx.beginPath(); ctx.moveTo(x0, -h0 + fl * i * 0.2); ctx.lineTo(x0 + 12, -h1 + fl * (i + 1) * 0.2); ctx.lineTo(x0 + 12, h1 + fl * (i + 1) * 0.2); ctx.lineTo(x0, h0 + fl * i * 0.2); ctx.fill(); }
    ctx.restore();
  }
  ctx.fillStyle = '#3d405b'; rrect(ctx, pivot.x - 28, beamY - 4, 56, 28, 8); ctx.fill();
  ctx.fillStyle = '#8d99ae'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(pivot.x + s * 16, beamY - 6, 6, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(pivot.x, beamY + 10, 4, 0, TAU); ctx.fill();
  if (cur && cur.mode === 'hang') {
    const tx = cur.x - Math.sin(cur.ang) * (cur.h / 2), ty = cur.y - camY - Math.cos(cur.ang) * (cur.h / 2);
    ctx.strokeStyle = '#3d405b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(pivot.x, py); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.save(); ctx.translate(tx, ty); ctx.rotate(cur.ang);
    ctx.strokeStyle = '#8d99ae'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-12, 4); ctx.lineTo(-8, -6); ctx.lineTo(8, -6); ctx.lineTo(12, 4); ctx.stroke();
    ctx.restore();
    // tushish chizig'i: qayerga tushishini ko'rsatadi (faqat birinchi darajalarda)
    if (cfg && cfg.n <= 3) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([6, 8]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cur.x, cur.y - camY + cur.h / 2); ctx.lineTo(cur.x, topY - camY); ctx.stroke(); ctx.setLineDash([]);
    }
  } else {
    const len = 40 + Math.sin(T * 3) * 4;
    ctx.strokeStyle = '#3d405b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(pivot.x, py); ctx.lineTo(pivot.x, py + len); ctx.stroke();
    ctx.strokeStyle = '#8d99ae'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(pivot.x - 14, py + len + 8); ctx.lineTo(pivot.x - 10, py + len); ctx.lineTo(pivot.x + 10, py + len); ctx.lineTo(pivot.x + 14, py + len + 8); ctx.stroke();
  }
}
function drawTower() {
  const totalH = Math.max(300, -topY);
  const sway = wobA + Math.sin(T * 2.4) * 0.015 * Math.max(0, danger - 0.4);
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i], sy = b.y - camY;
    if (sy < VY0 - 120 || sy > VY1 + 120) continue;
    const off = i === 0 ? 0 : sway * 300 * (-b.y / totalH);
    let sx = 1, syk = 1;
    if (b.sqT >= 0 && b.sqT < 0.4) { const k = b.sqT / 0.4; syk = 1 - 0.22 * Math.sin(k * Math.PI * 2) * (1 - k); sx = 1 / syk; }
    // g'alabada hammasi quvonib sakraydi
    const jump = state === 'win' && i > 0 ? -Math.abs(Math.sin(T * 7 - i * 0.55)) * (winT < 2.5 ? 7 : 3) : 0;
    const mood = b.mood === 'idle' && danger > 0.65 && i > blocks.length - 4 ? 'nervous' : b.mood;
    ctx.save(); ctx.translate(b.x + off, sy + b.h / 2 + jump); ctx.rotate(i === 0 ? 0 : sway * 0.5); ctx.scale(sx, syk); ctx.translate(0, -b.h / 2);
    drawPet(ctx, b.kind, b.w, b.h, mood, b.seed, false, T);
    ctx.restore();
  }
}
function drawBody(b, mood, legs) {
  ctx.save(); ctx.translate(b.x, b.y - camY); ctx.rotate(b.ang || 0);
  if (b.mode === 'hang') { const e = easeOutBack(b.entry); ctx.scale(lerp(0.5, 1, e), lerp(0.5, 1, e)); }
  drawPet(ctx, b.kind, b.w, b.h, mood, b.seed, legs, T);
  ctx.restore();
}
function drawParts() {
  for (const p of parts) {
    const a = clamp(p.life / p.max, 0, 1), y = p.y - camY;
    if (p.type === 'spark') {
      ctx.globalAlpha = a; ctx.strokeStyle = p.color; ctx.lineWidth = p.size * a + 0.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x - p.vx * 0.05, y - p.vy * 0.05); ctx.stroke();
    } else if (p.type === 'hring') {
      ctx.globalAlpha = a; ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(0.1, 5 * a);
      ctx.beginPath(); ctx.ellipse(p.x, y, p.size * (1 + (1 - a) * 1.6), p.size * 0.18 * (1 + (1 - a)), 0, 0, TAU); ctx.stroke();
    } else if (p.type === 'conf') {
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.save(); ctx.translate(p.x, y); ctx.rotate(p.rot); ctx.scale(Math.cos(p.rot * 1.7), 1);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore();
    } else {
      ctx.globalAlpha = a * 0.8; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, y, p.size * (0.4 + 0.6 * a), 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
function drawPops() {
  for (const p of pops) {
    const k = p.t / p.life, s = p.t < 0.22 ? easeOutBack(p.t / 0.22) : 1;
    ctx.save(); ctx.translate(p.x, p.y - camY); ctx.scale(s, s);
    ctx.globalAlpha = k > 0.65 ? (1 - k) / 0.35 : 1;
    text(p.text, 0, 0, p.size, p.color);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function drawHUD() {
  if (state !== 'play' && state !== 'dead') return;
  for (let i = 0; i < 3; i++) heart(100 + i * 36, 40, 15, i < lives ? '#ff4d6d' : 'rgba(255,255,255,0.35)');
  text(`${L.level} ${cfg.n}`, VW / 2, 30, 24, '#ffffff');
  // marragacha yo'l
  const bw = Math.min(180, VW * 0.36), bx = VW / 2 - bw / 2, by = 52, f = clamp((-topY - BASE_H) / (cfg.goal - BASE_H), 0, 1);
  ctx.fillStyle = 'rgba(30,25,70,0.4)'; rrect(ctx, bx - 3, by - 3, bw + 6, 14, 7); ctx.fill();
  const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#7df9ff'); g.addColorStop(1, '#ffd23f');
  ctx.fillStyle = g; rrect(ctx, bx, by, Math.max(8, bw * f), 8, 4); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(bx + bw + 10, by - 12, 3, 26);
  ctx.fillStyle = '#ef476f'; ctx.beginPath(); ctx.moveTo(bx + bw + 13, by - 12); ctx.lineTo(bx + bw + 30, by - 6 + Math.sin(T * 4) * 2); ctx.lineTo(bx + bw + 13, by); ctx.fill();
  if (cfg.wind) {
    const d = Math.sign(cfg.wind), n = Math.round(Math.abs(cfg.wind) * 3) || 1;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < n; i++) { const x = VW / 2 + d * ((i - (n - 1) / 2) * 16 + ((T * 30) % 8)), y = 82; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(x - d * 5, y - 7); ctx.lineTo(x + d * 3, y); ctx.lineTo(x - d * 5, y + 7); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  // keyingi hayvoncha
  const nx = VW - 52, ny = 56;
  ctx.fillStyle = 'rgba(255,255,255,0.78)'; ctx.beginPath(); ctx.arc(nx, ny, 36, 0, TAU); ctx.fill();
  drawPetIcon(ctx, nextKind, nx, ny, 52, 'idle', T);
  text(L.next, nx, ny + 46, 14, '#ffffff');
  if (hintT > 0 && state === 'play' && cur) {
    ctx.globalAlpha = Math.min(1, hintT * 2);
    const hy = cur.y - camY + cur.h / 2 + 60 + Math.abs(Math.sin(T * 5)) * -10;
    text(L.hint, VW / 2, hy + 50, 30, '#ffffff');
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(VW / 2, hy, 12, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${1 - (T % 1)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(VW / 2, hy, 12 + (T % 1) * 22, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
function render() {
  ctx.setTransform(DPR * S, 0, 0, DPR * S, 0, 0);
  Scene.drawSky();
  ctx.save();
  if (shake > 0) ctx.translate(rand(-1, 1) * shake * 0.6, rand(-1, 1) * shake * 0.6);
  if (zoom !== 1) { ctx.translate(VW / 2, VH / 2); ctx.scale(zoom, zoom); ctx.translate(-VW / 2, -VH / 2); }
  Scene.drawBack(-camY);
  if (state !== 'menu') Scene.drawGoal(goalY, goalBroken, goalT);
  drawTower();
  if (state === 'play' || state === 'dead') drawCrane();
  if (cur) drawBody(cur, cur.mode === 'hang' ? 'look' : 'scared', true);
  for (const b of losers) drawBody(b, 'scared', true);
  drawParts(); drawPops();
  ctx.restore();
  Scene.drawFront(state === 'play' ? cfg.wind : 0);
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.5})`; ctx.fillRect(0, 0, VW, VH); }
  drawHUD();
}

// ---------- Interfeys (DOM) ----------
const SCREENS = ['menu', 'map', 'pals', 'win', 'lose', 'pauseScr'];
function show(id) {
  screenNow = id;
  for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id);
  $('btnPause').classList.toggle('hidden', id !== 'hud');
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const starRow = (k, cls = '') => [1, 2, 3].map(i => `<i class="star${i <= k ? '' : ' off'}${cls}"></i>`).join('');
function banner(small, big, extra) {
  const el = $('banner');
  $('bnSmall').textContent = small; $('bnName').textContent = big; $('bnExtra').textContent = extra || '';
  $('bnExtra').style.display = extra ? '' : 'none';
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function renderMenu() {
  $('mStars').textContent = totalStars();
  $('tPlay').textContent = L.play;
  $('tPlayLv').textContent = `${L.level} ${save.lv}`;
  $('mPals').textContent = `${save.owned.length}/${PAL_LIST.length}`;
}
function applyLang() {
  document.documentElement.lang = Object.keys(STR).find(k => STR[k] === L) || 'en';
  $('tSub').textContent = L.sub;
  for (const id of ['tMap', 'tMap2', 'tMap3', 'tMap4', 'tMap5']) $(id).textContent = L.map;
  for (const id of ['tPals', 'tPals2']) $(id).textContent = L.pals;
  $('tComplete').textContent = L.complete; $('tNewPal').textContent = L.newPal;
  $('btnNext').textContent = L.nextLevel; $('btnRetry').textContent = L.retry;
  $('tFail').textContent = L.fail; $('tPaused').textContent = L.paused; $('btnResume').textContent = L.resume;
}

// Darajalar xaritasi: pastdan yuqoriga zigzag yo'l, har 5 darajada bob nomi
function renderMap() {
  $('mapStars').textContent = totalStars();
  const maxLv = Math.ceil(Math.max(save.lv + 4, 10) / 5) * 5, NODE = 96, HEAD = 64, PAD = 50;
  const items = [];
  let y = PAD;
  for (let n = maxLv; n >= 1; n--) {
    items.push({ n, y, x: 50 + Math.sin(n * 1.15) * 26 });
    y += NODE;
    if (n % 5 === 1) { items.push({ head: (n - 1) / 5, y }); y += HEAD; }
  }
  const total = y + PAD, nodes = items.filter(i => !i.head);
  const pts = nodes.map(i => `${i.x},${i.y + 32}`).join(' ');
  let html = `<svg class="path" viewBox="0 0 100 ${total}" preserveAspectRatio="none"><polyline points="${pts}" vector-effect="non-scaling-stroke"/></svg>`;
  for (const it of items) {
    if (it.head !== undefined) { const c = CHAPTERS[it.head % CHAPTERS.length]; html += `<div class="chap" style="top:${it.y + 10}px">${c.icon} ${esc(L.chapters[it.head % CHAPTERS.length])}</div>`; continue; }
    const n = it.n, st = save.stars[n] || 0, cls = n < save.lv ? 'done' : n === save.lv ? 'cur' : 'locked', gift = giftAt(n);
    html += `<button class="node ${cls}" data-n="${n}" style="left:${it.x}%;top:${it.y}px"><b>${n}</b>` +
      (cls === 'done' ? `<span class="nst">${starRow(st)}</span>` : '') + (gift && n >= save.lv ? '<span class="gift">🎁</span>' : '') + '</button>';
  }
  const inner = $('mapIn'); inner.style.height = total + 'px'; inner.innerHTML = html;
  const curNode = nodes.find(i => i.n === save.lv);
  requestAnimationFrame(() => { const w = $('mapWrap'); w.scrollTop = Math.max(0, (curNode ? curNode.y : 0) - w.clientHeight / 2 + 40); });
}
$('mapIn').addEventListener('click', e => {
  const b = e.target.closest('.node'); if (!b) return;
  const n = +b.dataset.n;
  if (n > save.lv) { Snd.no(); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; }
  Snd.click(); startLevel(n);
});

// Do'stlar kolleksiyasi
function buildPals() {
  const grid = $('grid'); grid.innerHTML = '';
  PAL_LIST.forEach((k, i) => {
    const el = document.createElement('div'); el.className = 'kcard';
    const cv = document.createElement('canvas'); cv.width = cv.height = 192;
    el.appendChild(cv); el.insertAdjacentHTML('beforeend', '<div class="kn"></div>');
    el.addEventListener('click', () => { palSel = i; Snd.click(); renderPals(); });
    grid.appendChild(el); PALS[k].el = el; PALS[k].cv = cv;
  });
}
function silhouette(c, w, h) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(60,50,110,0.9)'; c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'source-over'; }
function renderPals() {
  $('palCount').textContent = `${save.owned.length}/${PAL_LIST.length}`;
  PAL_LIST.forEach((k, i) => {
    const P = PALS[k], own = save.owned.includes(k), c = P.cv.getContext('2d');
    P.el.className = 'kcard' + (own ? '' : ' locked') + (i === palSel ? ' sel' : '');
    P.el.querySelector('.kn').textContent = own ? P.name : L.unlockAt.replace('{n}', P.gift);
    c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, 96, 96);
    drawPetIcon(c, k, 48, 50, 76, 'idle', 0.5);
    if (!own) silhouette(c, 96, 96);
  });
  const k = PAL_LIST[palSel], own = save.owned.includes(k);
  $('pName').textContent = own ? PALS[k].name : '???';
  $('pLock').textContent = own ? '' : '🔒 ' + L.unlockAt.replace('{n}', PALS[k].gift);
}
function drawPreviewCanvas(cv, kind, locked) {
  const r = cv.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const w = Math.round(r.width * DPR), h = Math.round(r.height * DPR);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
  const size = Math.min(w * 0.7, h * 0.8), bounce = Math.abs(Math.sin(T * 3)) * size * 0.06;
  if (!locked) { c.globalAlpha = 0.5; c.drawImage(GLOW.w, w / 2 - size * 0.7, h / 2 - size * 0.7, size * 1.4, size * 1.4); c.globalAlpha = 1; }
  drawPetIcon(c, kind, w / 2, h * 0.5 - bounce, size, locked ? 'idle' : (T % 4 < 1.2 ? 'happy' : 'idle'), T, !locked);
  if (locked) silhouette(c, w, h);
}
function showWin() {
  $('wLevel').textContent = `${L.level} ${cfg.n} · ${L.chapters[cfg.ch]}`;
  for (let i = 1; i <= 3; i++) { const s = $('ws' + i); s.className = 'bigstar'; }
  for (let i = 1; i <= starsWon; i++) setTimeout(() => { if (screenNow !== 'win') return; $('ws' + i).className = 'bigstar on'; Snd.star(i); }, 250 + i * 330);
  $('wPal').classList.toggle('hidden', !newPal);
  if (newPal) { $('wPalName').textContent = PALS[newPal].name; setTimeout(() => { if (screenNow === 'win') Snd.unlock2(); }, 1400); }
  show('win');
}
function showLose() {
  const f = clamp((-bestTop - BASE_H) / (cfg.goal - BASE_H), 0, 1);
  $('lReason').textContent = failReason;
  $('lBar').style.width = (f * 100).toFixed(0) + '%';
  $('lPct').textContent = Math.round(f * 100) + '%';
  Snd.fail();
  show('lose');
}

// ---------- Boshqaruv ----------
function setPaused(p) {
  if (paused === p) return;
  paused = p;
  if (p) { Snd.suspend(); if (state === 'play') show('pauseScr'); }
  else { Snd.resume(); if (state === 'play') show('hud'); }
}
document.addEventListener('pointerdown', () => Snd.unlock(), true);
canvas.addEventListener('pointerdown', e => { e.preventDefault(); if (state === 'play' && !paused) release(); });
canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (state === 'play') setPaused(!paused);
    else if (screenNow === 'map' || screenNow === 'pals') { Snd.click(); goMenu(); }
    return;
  }
  if (e.code !== 'Space' && e.code !== 'Enter' && e.code !== 'ArrowDown') return;
  e.preventDefault();
  if (e.repeat) return;
  Snd.unlock();
  if (paused) { setPaused(false); return; }
  if (state === 'play') release();
  else if (screenNow === 'menu' && ready) startLevel(save.lv);
  else if (screenNow === 'win') startLevel(Math.min(cfg.n + 1, save.lv));
  else if (screenNow === 'lose') startLevel(cfg.n);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) setPaused(true);
  else if (state !== 'play') setPaused(false);
});
function onBtn(id, fn) { $(id).addEventListener('click', e => { e.currentTarget.blur(); Snd.unlock(); Snd.click(); fn(); }); }
onBtn('btnPlay', () => startLevel(save.lv));
onBtn('btnMap', () => { renderMap(); show('map'); });
onBtn('btnPals', () => { palSel = 0; renderPals(); show('pals'); });
onBtn('btnMapBack', goMenu);
onBtn('btnPalsBack', goMenu);
onBtn('btnNext', () => startLevel(Math.min(cfg.n + 1, save.lv)));
onBtn('btnReplay', () => startLevel(cfg.n));
onBtn('btnRetry', () => startLevel(cfg.n));
onBtn('btnWinMap', () => { goMenu(); renderMap(); show('map'); });
onBtn('btnLoseMap', () => { goMenu(); renderMap(); show('map'); });
onBtn('btnPause', () => setPaused(true));
onBtn('btnResume', () => setPaused(false));
onBtn('btnPauseMap', () => { setPaused(false); goMenu(); renderMap(); show('map'); });

// ---------- Asosiy sikl ----------
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (!paused) update(dt);
  Snd.tick();
  render();
  if (screenNow === 'pals') drawPreviewCanvas($('pv'), PAL_LIST[palSel], !save.owned.includes(PAL_LIST[palSel]));
  else if (screenNow === 'win' && newPal) drawPreviewCanvas($('wPalCv'), newPal, false);
  if (!firstFrame) { firstFrame = true; yt(y => y.game.firstFrameReady()); }
  requestAnimationFrame(frame);
}

function normalizeSave(d) {
  const s = Object.assign({}, save, d || {});
  s.lv = Math.max(1, s.lv | 0); s.tut = !!s.tut;
  const st = {}; if (s.stars && typeof s.stars === 'object') for (const k in s.stars) { const v = s.stars[k] | 0; if (+k >= 1 && v >= 1) st[k] = Math.min(3, v); }
  s.stars = st;
  s.owned = Array.isArray(s.owned) ? s.owned.filter(k => PALS[k]) : [];
  for (const k of PAL_LIST) if ((!PALS[k].gift || PALS[k].gift < s.lv) && !s.owned.includes(k)) s.owned.push(k); // o'tilgan darajalar sovg'alari
  return s;
}

Scene.init(); resize();
cfg = levelCfg(1); Scene.setChapter(0); resetWorld(true);
window.addEventListener('resize', resize);
Snd.prepare();
last = performance.now();
requestAnimationFrame(frame);

(async () => {
  const [data, lang] = await Promise.all([Store.load(), detectLang()]);
  save = normalizeSave(data);
  L = STR[lang];
  applyLang(); buildPals(); goMenu();
  ready = true;
  if (YT) {
    try {
      Snd.setEnabled(YT.system.isAudioEnabled());
      YT.system.onAudioEnabledChange(v => Snd.setEnabled(v));
      YT.system.onPause(() => setPaused(true));
      YT.system.onResume(() => { if (state !== 'play') setPaused(false); });
    } catch (e) {}
  }
  yt(y => y.game.gameReady());
})();
