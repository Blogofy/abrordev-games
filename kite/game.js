'use strict';
/* KITE — YouTube Playables uchun HTML5 o'yin.
   Bosib turing: varrak ko'tariladi. Qo'yib yuboring: pastga tushadi.
   5 ta dunyo bo'ylab uching, yulduz yig'ing, topshiriqlarni bajaring va yangi varraklarni oching.
   Yuklanish tartibi: util.js, i18n.js, audio.js, kites.js, world.js, game.js */

// ---------- YouTube Playables SDK ----------
const YT = (typeof ytgame !== 'undefined' && ytgame.IN_PLAYABLES_ENV) ? ytgame : null;
function yt(fn) { if (!YT) return; try { const r = fn(YT); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
const SAVE_KEY = 'kite_save_v1', OLD_SAVE_KEY = 'varrak_save_v1';
const Store = {
  async load() {
    try {
      if (YT) { const s = await YT.game.loadData(); return s ? JSON.parse(s) : {}; }
      const s = localStorage.getItem(SAVE_KEY) || localStorage.getItem(OLD_SAVE_KEY); // eski Varrak rekordi ham ko'chadi
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
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
let W = 0, H = 0, DPR = 1, S = 1, VW = 520, VH = 900, KX = 140, CEIL = 84, GROUND = 830;
let state = 'menu', paused = false, holding = false, keyHold = false, firstFrame = false, ready = false;
let T = 0, last = 0, speed = 170, dist = 0, bonus = 0, finalScore = 0, displayScore = 0, shownScore = -1;
let combo = 0, comboTimer = 0, nextChunk = 0, ringNext = 0, powerNext = 0, mCheckT = 0;
let timeScale = 1, shake = 0, flash = 0, zoom = 1, scorePop = 0, starPop = 0;
let deadT = 0, overT = 0, hintT = 0, newBest = false, shopFrom = 'menu', shopSel = 0;
let L = STR.en;
let save = { best: 0, stars: 0, owned: ['classic'], kite: 'classic', missions: [], mlv: 0, rank: 0, tut: false, total: 0, maxWorld: 0 };
let KD = KITES[0];
const KSC = 1.15; // varrak chizilish masshtabi
const KR = 14;    // varrak to'qnashuv radiusi (kechirimli)
const pw = { magnet: 0, double: 0, turbo: 0, shield: false, inv: 0 };
const run = { stars: 0, near: 0, rings: 0, powers: 0, maxCombo: 0, world: 0 };
const ptrs = new Set();
const kite = { x: 140, y: 400, vy: 0, vx: 0, ang: 0.3, spin: 0, surprise: 0, dead: false, tail: [] };
const stars = [], hazards = [], rings = [], powerups = [], parts = [], pops = [], lines = [];

const meters = () => dist / 20;
const diff = () => 1 - Math.exp(-dist / 40000);
const score = () => Math.floor(meters()) + bonus;
const comboMult = () => Math.min(5, 1 + Math.floor(combo / 5));
const rangeY = () => [CEIL + 30, GROUND - 50];

// ---------- O'lcham ----------
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  S = Math.min(H / 900, W / 520);
  VW = W / S; VH = H / S;
  KX = clamp(VW * 0.28, 120, 380);
  CEIL = 84; GROUND = VH - 70;
  if (state !== 'dead') kite.x = KX;
  kite.y = clamp(kite.y, CEIL, GROUND - 30);
}

function attach() {
  const c = Math.cos(kite.ang), s = Math.sin(kite.ang);
  return { x: kite.x + (KD.att[0] * c - KD.att[1] * s) * KSC, y: kite.y + (KD.att[0] * s + KD.att[1] * c) * KSC };
}
function resetKite() {
  kite.x = KX; kite.y = VH * 0.44; kite.vy = 0; kite.vx = 0; kite.ang = 0.3; kite.spin = 0; kite.surprise = 0; kite.dead = false;
  kite.tail = [];
  const a = attach();
  for (let i = 0; i < KD.n; i++) { const x = a.x - i * KD.seg * 0.8, y = a.y + i * KD.seg * 0.5; kite.tail.push({ x, y, px: x, py: y }); }
}

// ---------- Topshiriqlar ----------
const M_TYPES = ['starsRun', 'distRun', 'nearRun', 'ringRun', 'worldReach', 'powerRun', 'scoreRun', 'comboRun', 'starsTotal'];
function mTarget(type, lv) {
  const r50 = v => Math.round(v / 50) * 50;
  switch (type) {
    case 'starsRun': return 20 + lv * 6;
    case 'distRun': return r50(300 + lv * 130);
    case 'nearRun': return 2 + Math.floor(lv / 2);
    case 'ringRun': return 2 + Math.floor(lv / 4);
    case 'worldReach': return Math.min(4, 1 + Math.floor(lv / 3));
    case 'powerRun': return 2 + Math.floor(lv / 4);
    case 'scoreRun': return r50(500 + lv * 250);
    case 'comboRun': return 10 + lv * 3;
    default: return Math.round((100 + lv * 60) / 10) * 10;
  }
}
function newMission(skip) {
  const lv = save.mlv++, type = pickOne(M_TYPES.filter(t => !skip.includes(t)));
  return { type, target: mTarget(type, lv), reward: 20 + Math.min(lv, 25) * 6, base: save.total, done: false };
}
function mProg(m) {
  const inRun = state === 'play' || state === 'dead';
  if (m.type === 'starsTotal') return save.total - m.base + (inRun ? run.stars : 0);
  if (!inRun && state !== 'over') return 0;
  switch (m.type) {
    case 'starsRun': return run.stars;
    case 'distRun': return Math.floor(meters());
    case 'nearRun': return run.near;
    case 'ringRun': return run.rings;
    case 'worldReach': return run.world;
    case 'powerRun': return run.powers;
    case 'scoreRun': return state === 'over' ? finalScore : score();
    case 'comboRun': return run.maxCombo;
  }
  return 0;
}
const mText = m => L.m[m.type].replace('{n}', m.target).replace('{w}', L.worlds[m.target % 5]);
function checkMissions() {
  let any = false;
  for (const m of save.missions) {
    if (m.done || mProg(m) < m.target) continue;
    m.done = true; m.fresh = true; save.stars += m.reward; save.rank++; any = true;
    toast(`✔ ${L.done} +${m.reward}`);
    Snd.mission();
  }
  if (any) Store.save(save);
}
function refreshMissions() {
  const ms = save.missions;
  for (let i = 0; i < ms.length; i++) if (ms[i].done) ms[i] = newMission(ms.map(m => m.type));
  while (ms.length < 3) ms.push(newMission(ms.map(m => m.type)));
  Store.save(save);
}

// ---------- O'yin oqimi ----------
function clearWorld() { stars.length = hazards.length = rings.length = powerups.length = pops.length = 0; }
function startRun() {
  refreshMissions();
  clearWorld();
  for (const k in run) run[k] = 0;
  pw.magnet = pw.double = pw.turbo = pw.inv = 0; pw.shield = false;
  if (state !== 'menu') { Scen.reset(0); flash = 0.6; } // oldingi o'yin boshqa dunyoda tugagan bo'lishi mumkin
  Scen.focus(0); Snd.setWorld(0);
  state = 'play'; dist = 0; bonus = 0; combo = 0; comboTimer = 0;
  nextChunk = 250; ringNext = 2600; powerNext = 1600; timeScale = 1;
  resetKite();
  hintT = save.tut ? 0 : 5;
  if (!save.tut) { save.tut = true; Store.save(save); }
  show('hud'); Snd.duck(0.3); Snd.whoosh();
}
function goMenu() {
  state = 'menu'; clearWorld();
  refreshMissions();
  Scen.reset(0); Scen.focus(0); Snd.setWorld(0);
  pw.magnet = pw.double = pw.turbo = pw.inv = 0; pw.shield = false;
  resetKite(); flash = 0.5;
  renderMenu(); show('menu'); Snd.duck(0.25);
}
function die(cause) {
  if (state !== 'play') return;
  state = 'dead'; deadT = 0; combo = 0;
  timeScale = 0.2; shake = 20; flash = 1; zoom = 1.08;
  kite.dead = true; kite.vy = -420; kite.vx = -40; kite.spin = (Math.random() < 0.5 ? -1 : 1) * rand(8, 12);
  burst(kite.x, kite.y, 22, ['#ffffff', '#ffd166', '#ef476f', '#118ab2'], 520, 'spark', 0, 0.7);
  if (cause === 'flyer') burst(kite.x, kite.y, 12, ['#2b2d42', '#4a4e69', '#ffffff'], 220, 'feather', 120, 1.6);
  if (cause === 'storm') burst(kite.x, kite.y, 14, ['#fff5a8', '#ffffff'], 600, 'spark', 0, 0.4);
  if (cause === 'water') burst(kite.x, GROUND, 24, ['#ffffff', '#9ad1ff', '#5b86d6'], 420, 'dot', 900, 0.9);
  else if (cause === 'ground') burst(kite.x, GROUND, 16, ['#ffffff', '#a89f91'], 260, 'dot', 500, 0.8);
  addP(kite.x, kite.y, 0, 0, 0.5, 40, '#ffffff', 'ring');
  if (cause === 'water') Snd.splash(); else Snd.hit();
  Snd.duck(0.08);
}
function finishRun() {
  state = 'over'; overT = 0; displayScore = 0; shownScore = -1;
  finalScore = score();
  save.stars += run.stars; save.total += run.stars;
  save.maxWorld = Math.max(save.maxWorld, run.world);
  checkMissions();
  newBest = finalScore > save.best;
  if (newBest) { save.best = finalScore; confetti(); Snd.best(0.35); }
  Store.save(save);
  Snd.duck(0.2);
  showOver();
  yt(y => y.engagement.sendScore({ value: save.best }));
}
function enterWorld(wi) {
  run.world = wi;
  bonus += 100; scorePop = 1; flash = 0.35; zoom = Math.max(zoom, 1.05);
  banner(L.newWorld, L.worlds[wi % 5]);
  pop('+100', KX + 40, kite.y - 60, 34, '#ffd23f', 1);
  for (let i = 0; i < 40; i++) addP(rand(0, VW), rand(-60, -10), rand(-60, 60), rand(120, 280), rand(1.6, 2.6), rand(6, 10), pickOne(['#ef476f', '#ffd166', '#06d6a0', '#7df9ff', '#ffffff']), 'conf', 120);
  Snd.world(); Snd.setWorld(wi);
}

// ---------- Bo'laklar (yulduz naqshlari va to'siqlar) ----------
function addStar(x, y) { const [t, b] = rangeY(); stars.push({ x, y: clamp(y, t, b), t: rand(0, 6) }); }
function starLine(x, y, n) { for (let i = 0; i < n; i++) addStar(x + i * 44, y); return n * 44; }
function starWave(x, y, n) {
  const amp = rand(50, 100), [t, b] = rangeY();
  y = clamp(y, t + amp, b - amp);
  for (let i = 0; i < n; i++) addStar(x + i * 42, y + Math.sin(i * 0.7) * amp);
  return n * 42;
}
function starArc(x, y, n, up) {
  for (let i = 0; i < n; i++) { const u = (i / (n - 1)) * 2 - 1; addStar(x + i * 42, y + (up ? -1 : 1) * (1 - u * u) * 90); }
  return n * 42;
}
function starZig(x, y, n) { for (let i = 0; i < n; i++) addStar(x + i * 40, y + (i % 2 ? -45 : 45)); return n * 40; }
function starRing(x, y) {
  const [t, b] = rangeY(); y = clamp(y, t + 70, b - 70);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; addStar(x + 75 + Math.cos(a) * 70, y + Math.sin(a) * 70); }
  addStar(x + 75, y);
  return 170;
}
function starPattern(x) {
  const [t, b] = rangeY(), y = rand(t + 60, b - 60), r = Math.random();
  if (r < 0.28) return starWave(x, y, 10);
  if (r < 0.5) return starArc(x, y, 8, Math.random() < 0.5);
  if (r < 0.64) return starLine(x, y, 7);
  if (r < 0.78) return starZig(x, y, 9);
  if (r < 0.9) return starRing(x, y);
  starLine(x, y - 40, 6); starLine(x + 22, y + 40, 6);
  return 6 * 44 + 22;
}
function storm(x, y, d, wd, canDrift = true, size = 0) {
  const s = size || rand(0.9, 1.1 + 0.3 * d), [t, b] = rangeY();
  if (canDrift) y = clamp(y, t + 40 * s, b - 30 * s);
  const o = {
    type: 'storm', x: x + 70 * s, y, by: y, s, t: rand(0, 6), zap: 0, za: 0, zt: rand(0.3, 1.2), passed: false, minGap: 1e9, half: 75 * s,
    drift: canDrift && d > 0.25 && Math.random() < 0.6 ? rand(30, 40 + 50 * d) : 0, col: [rgb(wd.C.st0), rgb(wd.C.st1)],
  };
  hazards.push(o);
  return o;
}
function arcAround(o) {
  const [t, b] = rangeY(), dir = o.y - t > b - o.y ? -1 : 1;
  for (let i = 0; i < 7; i++) { const u = (i / 6) * 2 - 1; addStar(o.x + u * 130, o.y + dir * (95 * o.s + 35 * (1 - u * u))); }
}
function gate(x, d, wd) {
  const [t, b] = rangeY(), gapH = lerp(270, 210, d), gy = rand(t + gapH / 2 + 40, b - gapH / 2 - 40);
  storm(x, gy - gapH / 2 - 50, 0, wd, false, 1);
  storm(x, gy + gapH / 2 + 50, 0, wd, false, 1);
  starLine(x + 4, gy, 4);
  return 160;
}
// Uchuvchi xavflar har dunyoda boshqacha ko'rinadi: qush, chag'alay, burgut, dron, NUJ
const FLY = { bird: { s: 1, v: 1, amp: 1 }, gull: { s: 1.05, v: 1.15, amp: 1.2 }, eagle: { s: 1.3, v: 1.3, amp: 0.7 }, drone: { s: 1, v: 0.85, amp: 0.6 }, ufo: { s: 1.15, v: 1, amp: 1.4 } };
function flock(x, d, skin) {
  const [t, b] = rangeY(), F = FLY[skin];
  const n = 1 + (Math.random() < 0.35 + 0.4 * d ? 1 : 0) + (Math.random() < 0.3 * d ? 1 : 0);
  let bx = x + 140;
  for (let i = 0; i < n; i++) {
    const y = rand(t + 20, b - 20), s = rand(0.95, 1.15) * F.s;
    hazards.push({ type: 'flyer', skin, x: bx, y, by: y, amp: rand(10, 30 + 50 * d) * F.amp, f: rand(1.6, 3), v: rand(40, 70 + 150 * d) * F.v, s, t: rand(0, 6), passed: false, minGap: 1e9, half: 20 * s });
    bx += rand(110, 170);
  }
  return n * 150;
}
const RIVALS = [['#2b2d42', '#ef233c'], ['#3a0ca3', '#f72585'], ['#1b4332', '#ffb703'], ['#14213d', '#fca311']];
function rival(x, d) {
  const [t, b] = rangeY(), y = rand(t + 70, b - 70);
  hazards.push({ type: 'rival', x: x + 120, y, by: y, amp: rand(40, 80 + 60 * d), f: rand(1.3, 2.1), v: rand(30, 60 + 60 * d), t: rand(0, 6), col: pickOne(RIVALS), passed: false, minGap: 1e9, half: 24 });
  if (Math.random() < 0.6) starLine(x + 260, y + (y > (t + b) / 2 ? -120 : 120), 5);
  return 300;
}
// Meteorlar: kelish nuqtasi va vaqti oldindan hisoblanadi, ekran chetida ogohlantirish chiqadi
function meteorShower(d) {
  const [t, b] = rangeY(), n = 2 + (Math.random() < 0.5 + d * 0.4 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const tau = 1.8 + i * 0.8, ty = rand(t + 20, b - 20), vy = rand(200, 280), vx = -rand(160, 240);
    hazards.push({ type: 'meteor', x: KX + (speed - vx) * tau, y: ty - vy * tau, vx, vy, t: 0, passed: false, minGap: 1e9, half: 16 });
  }
  return 320;
}
function spawnChunk() {
  const d = diff(), x = VW + 40, [t, b] = rangeY(), gap = lerp(240, 140, d);
  const wi = worldIndexAt((dist + x - KX) / 20), wd = worldDef(wi);
  if (dist < 800) return starWave(x, (t + b) / 2, 9) + gap;
  if (dist > ringNext && Math.random() < 0.3) {
    ringNext = dist + rand(3400, 5000);
    const y = rand(t + 80, b - 80);
    starLine(x, y, 3);
    rings.push({ x: x + 180, px: x + 180, y, t: 0, done: false, ft: 0 });
    return 300 + starLine(x + 300, y, 8) + gap;
  }
  if (dist > powerNext && Math.random() < 0.35) {
    powerNext = dist + rand(4200, 6500);
    const y = rand(t + 70, b - 70);
    powerups.push({ x: x + 60, y, type: pickOne(['magnet', 'shield', 'double']), t: rand(0, 6) });
    return 160 + starArc(x + 180, y, 7, Math.random() < 0.5) + gap;
  }
  const r = Math.random();
  if (r < 0.3) return starPattern(x) + gap;
  if (r < 0.48) { const w = flock(x, d, wd.flyer); if (Math.random() < 0.6) starLine(x + 60, rand(t, b), 5); return w + gap; }
  if (r < 0.64) { const o = storm(x, rand(t + 60, b - 60), d, wd); arcAround(o); return 150 * o.s + gap; }
  if (r < 0.78) return gate(x, d, wd) + gap;
  if (r < 0.9) {
    if (wd.key === 'cosmos') return meteorShower(d) + gap;
    if (wi >= 1) return rival(x, d) + gap;
  }
  const w = flock(x, d, wd.flyer);
  storm(x + w * 0.5, rand(t + 60, b - 60), d, wd);
  return w + 160 + gap;
}

// ---------- Effektlar ----------
function addP(x, y, vx, vy, life, size, color, type = 'dot', g = 0) {
  if (parts.length > 500) return;
  parts.push({ x, y, vx, vy, life, max: life, size, color, type, g, rot: rand(0, TAU), vr: rand(-8, 8) });
}
function burst(x, y, n, colors, spd, type = 'spark', g = 0, life = 0.6) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), v = rand(spd * 0.3, spd);
    addP(x, y, Math.cos(a) * v, Math.sin(a) * v, rand(life * 0.6, life), rand(2, 4.5), colors[i % colors.length], type, g);
  }
}
function confetti() {
  const cols = ['#ef476f', '#ffd166', '#118ab2', '#06d6a0', '#ffffff'];
  for (let i = 0; i < 90; i++) addP(rand(0, VW), rand(-120, -10), rand(-60, 60), rand(80, 260), rand(2.2, 3.6), rand(7, 12), cols[i % 5], 'conf', 140);
}
function pop(text, x, y, size, color, life = 0.9) { pops.push({ text, x, y, size, color, t: 0, life }); }

function collectStar(s) {
  combo++; comboTimer = 1.5; run.maxCombo = Math.max(run.maxCombo, combo);
  const m = comboMult(), dbl = pw.double > 0 ? 2 : 1, v = 10 * m * dbl;
  bonus += v; run.stars += dbl; scorePop = 1; starPop = 1;
  burst(s.x, s.y, 7, dbl > 1 ? ['#ff9ee8', '#fff3b0', '#ffffff'] : ['#ffd23f', '#fff3b0', '#ffffff'], 260, 'spark', 0, 0.35);
  addP(s.x, s.y, 0, 0, 0.35, 14, '#ffd23f', 'ring');
  pop('+' + v, s.x, s.y - 20, 20, '#fff3b0', 0.55);
  if (combo % 5 === 0) { pop('x' + m + '!', kite.x + 30, kite.y - 70, 44, '#ffd23f'); zoom = Math.max(zoom, 1.03); }
  Snd.star(combo);
}
function nearMiss() {
  bonus += 25; scorePop = 1; kite.surprise = 0.6; run.near++;
  timeScale = Math.min(timeScale, 0.5); zoom = Math.max(zoom, 1.035);
  pop(L.near[(Math.random() * L.near.length) | 0] + ' +25', kite.x + 20, kite.y - 60, 30, '#7df9ff');
  burst(kite.x, kite.y, 8, ['#7df9ff', '#ffffff'], 300, 'spark', 0, 0.4);
  Snd.near();
}
function takeRing(r) {
  r.done = true; pw.turbo = 2.8; run.rings++; bonus += 50; scorePop = 1; zoom = 1.07; shake = Math.max(shake, 6);
  pop(L.turbo + ' +50', VW / 2, VH * 0.32, 48, '#ffd23f', 1.2);
  burst(r.x, r.y, 24, ['#ffd23f', '#ffffff', '#ff9f1c'], 520, 'spark', 0, 0.6);
  Snd.turbo();
}
function takePower(p) {
  run.powers++; zoom = Math.max(zoom, 1.04); scorePop = 1;
  burst(p.x, p.y, 18, ['#ffffff', '#7df9ff', '#ffd23f'], 420, 'spark', 0, 0.5);
  addP(p.x, p.y, 0, 0, 0.45, 30, '#ffffff', 'ring');
  if (p.type === 'magnet') { pw.magnet = 8; pop(L.magnet, VW / 2, VH * 0.32, 44, '#ff9ee8', 1.1); }
  else if (p.type === 'shield') { pw.shield = true; pop(L.shield, VW / 2, VH * 0.32, 44, '#7df9ff', 1.1); }
  else { pw.double = 10; pop(L.double, VW / 2, VH * 0.32, 44, '#ffd23f', 1.1); }
  Snd.power();
}
// To'siqni urib yuborish (turbo, qalqon yoki daxlsizlik paytida)
function smash(h) {
  h.knock = { vx: rand(250, 450), vy: rand(-520, -280), spin: rand(-10, 10), a: 0 };
  bonus += 20; scorePop = 1; shake = Math.max(shake, 8);
  burst(h.x, h.y, 16, ['#ffffff', '#ffd23f', '#ff9ee8'], 480, 'spark', 0, 0.5);
  pop('+20', h.x, h.y - 30, 24, '#ffffff', 0.6);
  Snd.smash();
}
function hazard(h, gap, cause) {
  if (gap < 0) {
    if (pw.turbo > 0 || pw.inv > 0) { smash(h); return; }
    if (pw.shield) {
      pw.shield = false; pw.inv = 1.2; smash(h);
      pop(L.saved, kite.x + 20, kite.y - 64, 32, '#7df9ff'); addP(kite.x, kite.y, 0, 0, 0.5, 46, '#7df9ff', 'ring');
      Snd.shield(); return;
    }
    die(cause); return;
  }
  if (!h.passed) {
    if (gap < h.minGap) h.minGap = gap;
    if (h.x + h.half < kite.x - KR) { h.passed = true; if (h.minGap < 26) nearMiss(); }
  }
}
const PUFFS = [{ ox: -42, oy: 10, r: 28 }, { ox: -14, oy: -12, r: 36 }, { ox: 20, oy: -8, r: 34 }, { ox: 46, oy: 10, r: 26 }, { ox: 2, oy: 14, r: 32 }];
function stormGap(s) {
  let g = 1e9;
  for (const p of PUFFS) {
    const d = Math.hypot(kite.x - (s.x + p.ox * s.s), kite.y - (s.y + p.oy * s.s)) - (p.r * s.s * 0.82 + KR);
    if (d < g) g = d;
  }
  return g;
}

// ---------- Yangilash ----------
function update(rdt) {
  T += rdt;
  timeScale += (1 - timeScale) * (1 - Math.exp(-rdt * 2.5));
  const dt = rdt * timeScale;
  shake = Math.max(0, shake - rdt * 45);
  flash = Math.max(0, flash - rdt * 2.5);
  const zt = pw.turbo > 0 && state === 'play' ? 0.96 : 1;
  zoom += (zt - zoom) * (1 - Math.exp(-rdt * 4));
  scorePop = Math.max(0, scorePop - rdt * 5); starPop = Math.max(0, starPop - rdt * 5);
  kite.surprise = Math.max(0, kite.surprise - dt);

  const target = state === 'menu' ? 170 : state === 'play' ? (300 + 230 * diff()) * (pw.turbo > 0 ? 1.85 : 1) : 0;
  speed += (target - speed) * (1 - Math.exp(-dt * (state === 'play' ? 2 : 1.2)));
  const dx = speed * dt;

  if (state === 'play') {
    dist += dx;
    while (dist >= nextChunk) nextChunk += spawnChunk();
    if (pw.magnet > 0) pw.magnet -= dt;
    if (pw.double > 0) pw.double -= dt;
    if (pw.turbo > 0) { pw.turbo -= dt; if (pw.turbo <= 0) pw.inv = Math.max(pw.inv, 0.8); }
    if (pw.inv > 0) pw.inv -= dt;
    if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) combo = 0; }
    if (hintT > 0) hintT -= dt;
    const wi = worldIndexAt(meters());
    if (wi > run.world) enterWorld(wi);
    mCheckT -= dt; if (mCheckT <= 0) { mCheckT = 0.25; checkMissions(); }
    Scen.focus(meters());
  }
  Scen.update(dt, dx, state === 'play' ? worldIndexAt((dist + VW - KX) / 20) : Scen.world);
  for (const l of lines) { l.x -= (speed * 1.7 + 150) * dt; if (l.x + l.l < 0) { l.x = VW + rand(0, 300); l.y = rand(CEIL, GROUND - 20); l.l = rand(40, 130); } }
  updateKite(dt);
  updateObjects(dt, dx);
  updateParts(dt);
  kiteFx();
  if (state === 'dead') { deadT += rdt; if (deadT > 1.3) finishRun(); }
  else if (state === 'over') {
    overT += rdt;
    displayScore += (finalScore - displayScore) * (1 - Math.exp(-rdt * 4));
    if (Math.abs(finalScore - displayScore) < 0.5) displayScore = finalScore;
    const v = Math.round(displayScore);
    if (v !== shownScore) { shownScore = v; $('oScore').textContent = v; }
  }
}

function updateKite(dt) {
  const k = kite;
  if (state === 'menu') {
    const ty = VH * 0.44 + Math.sin(T * 1.4) * 45;
    k.vy = (ty - k.y) * 2.5; k.y += k.vy * dt;
  } else if (state === 'play') {
    const tv = holding ? -440 : 370;
    k.vy += (tv - k.vy) * Math.min(1, dt * 4.5);
    k.y += k.vy * dt;
    if (k.y < CEIL) { k.y = CEIL; if (k.vy < 0) k.vy *= 0.5; }
    if (k.y + 18 > GROUND) {
      if (pw.turbo > 0 || pw.inv > 0) { k.y = GROUND - 18; k.vy = -520; }
      else if (pw.shield) {
        pw.shield = false; pw.inv = 1.2; k.y = GROUND - 18; k.vy = -620;
        pop(L.saved, k.x + 20, k.y - 64, 32, '#7df9ff'); addP(k.x, k.y, 0, 0, 0.5, 46, '#7df9ff', 'ring'); Snd.shield();
      } else die(Scen.groundAt(k.x) === 'water' ? 'water' : 'ground');
    }
  } else {
    k.vy += 1100 * dt; k.y += k.vy * dt; k.x += k.vx * dt; k.ang += k.spin * dt; k.spin *= 1 - 0.8 * dt;
  }
  if (state === 'menu' || state === 'play') {
    const ta = 0.32 + clamp(k.vy / 1000, -0.4, 0.4) + Math.sin(T * 6.5) * 0.04;
    k.ang += (ta - k.ang) * (1 - Math.exp(-dt * 10));
  }
  updateTail(dt);
}
function updateTail(dt) {
  const pts = kite.tail, a = attach(), seg = KD.seg;
  pts[0].x = a.x; pts[0].y = a.y;
  const wind = state === 'menu' || state === 'play' ? -(speed * 2 + 300) : -100;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i], vx = (p.x - p.px) * 0.94, vy = (p.y - p.py) * 0.94;
    p.px = p.x; p.py = p.y;
    p.x += vx + wind * dt * dt;
    p.y += vy + (420 + Math.sin(T * 9 + i * 0.7) * 900) * dt * dt;
  }
  for (let it = 0; it < 4; it++) {
    for (let i = 1; i < pts.length; i++) {
      const a0 = pts[i - 1], b = pts[i], dx = b.x - a0.x, dy = b.y - a0.y, d = Math.hypot(dx, dy) || 0.001, k = (d - seg) / d;
      if (i === 1) { b.x -= dx * k; b.y -= dy * k; }
      else { a0.x += dx * k * 0.5; a0.y += dy * k * 0.5; b.x -= dx * k * 0.5; b.y -= dy * k * 0.5; }
    }
  }
}
function kiteFx() {
  if (state !== 'play' && state !== 'menu') return;
  if (pw.turbo > 0 && state === 'play') for (let i = 0; i < 2; i++) addP(kite.x - 10, kite.y + rand(-12, 12), -speed * 0.5 - rand(50, 150), rand(-30, 30), 0.45, rand(4, 7), `hsl(${(T * 400 + i * 60) % 360},100%,65%)`, 'dot');
  if (KD.id === 'phoenix' && Math.random() < 0.5) { const p = kite.tail[(Math.random() * kite.tail.length) | 0]; addP(p.x, p.y, rand(-30, 10), rand(-40, -10), 0.6, rand(2, 4), pickOne(['#ffd000', '#ff7b00', '#ff2e63']), 'dot'); }
}

function updateObjects(dt, dx) {
  const play = state === 'play', pull = pw.magnet > 0 || pw.turbo > 0;
  for (let i = stars.length - 1; i >= 0; i--) {
    const s = stars[i]; s.x -= dx; s.t += dt;
    if (play) {
      const ddx = kite.x - s.x, ddy = kite.y - s.y;
      let dd = Math.hypot(ddx, ddy);
      if (pull && dd < 340) {
        const m = Math.min(dd, (500 + (340 - dd) * 4) * dt);
        s.x += (ddx / (dd || 1)) * m; s.y += (ddy / (dd || 1)) * m; dd -= m;
      }
      if (dd < 36) { stars.splice(i, 1); collectStar(s); continue; }
    }
    if (s.x < -60) stars.splice(i, 1);
  }
  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i]; h.t += dt;
    if (h.knock) {
      h.x += h.knock.vx * dt - dx; h.y += h.knock.vy * dt; h.knock.vy += 900 * dt; h.knock.a += h.knock.spin * dt;
      if (h.y > VH + 150 || h.x < -250 || h.x > VW + 400) hazards.splice(i, 1);
      continue;
    }
    if (h.type === 'flyer') {
      h.x -= dx + h.v * dt; h.y = h.by + Math.sin(h.t * h.f) * h.amp;
      if (play) hazard(h, Math.hypot(kite.x - h.x, kite.y - h.y) - (15 * h.s + KR), 'flyer');
    } else if (h.type === 'storm') {
      h.x -= dx;
      if (h.drift) h.y = h.by + Math.sin(h.t * 1.1) * h.drift;
      h.zt -= dt; if (h.zap > 0) h.zap -= dt;
      if (h.zt <= 0) { h.zap = 0.14; h.za = rand(0, TAU); h.zt = rand(0.5, 1.6); }
      if (play) hazard(h, stormGap(h), 'storm');
    } else if (h.type === 'rival') {
      h.x -= dx + h.v * dt; h.y = h.by + Math.sin(h.t * h.f) * h.amp;
      if (play) hazard(h, Math.hypot(kite.x - h.x, kite.y - h.y) - (22 + KR), 'flyer');
    } else {
      h.x += h.vx * dt - dx; h.y += h.vy * dt;
      if (Math.random() < 0.6 && h.x < VW + 40 && h.y > -20) addP(h.x, h.y, rand(-20, 20), rand(-20, 20), 0.4, rand(3, 6), pickOne(['#ffd166', '#ff7b00', '#ff4d6d']), 'dot');
      if (play) hazard(h, Math.hypot(kite.x - h.x, kite.y - h.y) - (16 + KR), 'storm');
      if (h.y > GROUND - 6) { burst(h.x, GROUND, 14, ['#ffd166', '#ff7b00', '#ffffff'], 360, 'spark', 0, 0.5); shake = Math.max(shake, 4); hazards.splice(i, 1); continue; }
    }
    if (h.x < -220) hazards.splice(i, 1);
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i]; r.px = r.x; r.x -= dx; r.t += dt;
    if (r.done) r.ft += dt;
    else if (play && r.px >= kite.x && r.x < kite.x && Math.abs(r.y - kite.y) < 60) takeRing(r);
    if (r.x < -100) rings.splice(i, 1);
  }
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i]; p.x -= dx; p.t += dt;
    if (play && Math.hypot(kite.x - p.x, kite.y - (p.y + Math.sin(p.t * 3) * 6)) < 24 + KR + 8) { powerups.splice(i, 1); takePower(p); continue; }
    if (p.x < -60) powerups.splice(i, 1);
  }
  for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; p.t += dt; p.y -= 45 * dt; if (p.t >= p.life) pops.splice(i, 1); }
}
function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    if (p.type === 'conf') { p.vx += Math.sin(p.life * 5 + p.rot) * 60 * dt; p.vy *= 1 - 0.8 * dt; }
    else if (p.type === 'feather') { p.vx *= 1 - 2 * dt; p.vy *= 1 - 2 * dt; p.x += Math.sin(p.life * 7 + p.rot) * 40 * dt; }
    else { p.vx *= 1 - 2.5 * dt; p.vy *= 1 - 2.5 * dt; }
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
  }
}

// ---------- Chizish yordamchilari ----------
function text(s, x, y, size, color, align = 'center', stroke = true) {
  ctx.font = `900 ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size * 0.16); ctx.strokeStyle = 'rgba(25,18,60,0.6)'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }

// ---------- Obyektlarni chizish ----------
function drawStar(s) {
  const y = s.y + Math.sin(s.t * 3) * 4, sc = 1 + Math.sin(s.t * 5) * 0.08;
  ctx.drawImage(pw.double > 0 ? GLOW.p : GLOW.y, s.x - 30, y - 30, 60, 60);
  ctx.save(); ctx.translate(s.x, y); ctx.rotate(Math.sin(s.t * 2) * 0.35);
  drawStarIcon(ctx, 0, 0, sc);
  ctx.restore();
}
function drawMagnet(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.lineCap = 'butt'; ctx.lineWidth = 9; ctx.strokeStyle = '#ef476f';
  ctx.beginPath(); ctx.moveTo(-11, -12); ctx.lineTo(-11, 0); ctx.arc(0, 0, 11, Math.PI, 0, true); ctx.lineTo(11, -12); ctx.stroke();
  ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-11, -13); ctx.lineTo(-11, -6); ctx.moveTo(11, -13); ctx.lineTo(11, -6); ctx.stroke();
  ctx.restore();
}
function drawShieldIcon(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(0, -15); ctx.quadraticCurveTo(10, -10, 14, -11); ctx.quadraticCurveTo(15, 8, 0, 16); ctx.quadraticCurveTo(-15, 8, -14, -11); ctx.quadraticCurveTo(-10, -10, 0, -15); ctx.closePath();
  ctx.fillStyle = '#4cc9f0'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.moveTo(0, -11); ctx.quadraticCurveTo(7, -7, 10, -8); ctx.quadraticCurveTo(10, 0, 0, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawTurboIcon(x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-12, -9); ctx.lineTo(-3, 0); ctx.lineTo(-12, 9); ctx.moveTo(1, -9); ctx.lineTo(10, 0); ctx.lineTo(1, 9); ctx.stroke();
  ctx.restore();
}
function drawRing(r, front) {
  const k = r.done ? Math.min(1, r.ft / 0.4) : 0;
  if (k >= 1) return;
  const rx = (15 + Math.sin(r.t * 4) * 4) * (1 + k * 0.7), ry = 62 * (1 + k * 0.7);
  ctx.save(); ctx.translate(r.x, r.y); ctx.globalAlpha = 1 - k;
  if (!front) ctx.drawImage(GLOW.y, -70, -90, 140, 180);
  const a0 = front ? -Math.PI / 2 : Math.PI / 2, a1 = front ? Math.PI / 2 : Math.PI * 1.5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#ff9f1c'; ctx.lineWidth = 10; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, a0, a1); ctx.stroke();
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, a0, a1); ctx.stroke();
  if (front && !r.done) {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 3; i++) { const a = r.t * 3 + (i * TAU) / 3; circle(Math.cos(a) * rx, Math.sin(a) * ry, 2.5); }
    drawTurboIcon(0, -92 + Math.sin(T * 3) * 5, 1);
  }
  ctx.restore();
}
function drawPower(p) {
  const y = p.y + Math.sin(p.t * 3) * 6, r = 24 + Math.sin(p.t * 5) * 1.5;
  ctx.save(); ctx.translate(p.x, y);
  ctx.drawImage(p.type === 'shield' ? GLOW.c : p.type === 'magnet' ? GLOW.p : GLOW.y, -52, -52, 104, 104);
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; circle(0, 0, r);
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 0, r - 6, -2.6, -1.8); ctx.stroke();
  if (p.type === 'magnet') drawMagnet(0, 4, 0.85);
  else if (p.type === 'shield') drawShieldIcon(0, 1, 0.9);
  else { drawStarIcon(ctx, -6, -4, 0.6); text('x2', 5, 7, 18, '#ffffff'); }
  ctx.restore();
}
function drawPlayer() {
  const k = kite;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(k.x, k.y);
  if (k.dead) { for (let i = 1; i <= 10; i++) ctx.lineTo(k.x - i * 3 + Math.sin(T * 12 + i) * 3, k.y + i * 8); }
  else { const ax = -20, ay = VH + 30; ctx.quadraticCurveTo((ax + k.x) / 2 + 30, (ay + k.y) / 2 + 70 + Math.sin(T * 1.7) * 8, ax, ay); }
  ctx.stroke();
  const blinkInv = pw.inv > 0 && pw.turbo <= 0 && state === 'play' && (T * 12) % 1 < 0.4;
  if (blinkInv) ctx.globalAlpha = 0.45;
  drawKiteTail(ctx, KD, k.tail, T);
  ctx.save(); ctx.translate(k.x, k.y);
  if (pw.turbo > 0 && state === 'play') { ctx.globalAlpha = 0.55 + 0.3 * Math.sin(T * 20); ctx.drawImage(GLOW.y, -80, -80, 160, 160); ctx.globalAlpha = blinkInv ? 0.45 : 1; }
  ctx.rotate(k.ang); ctx.scale(KSC, KSC);
  if (KD.glow) ctx.drawImage(GLOW[KD.glow], -55, -55, 110, 110);
  drawKiteBody(ctx, KD, T, { vy: k.vy, dead: k.dead, surprise: k.surprise, blink: T % 3.3 < 0.12 });
  ctx.restore();
  ctx.globalAlpha = 1;
  if (pw.shield && state === 'play') {
    const r = 50 + Math.sin(T * 4) * 2;
    ctx.fillStyle = 'rgba(125,249,255,0.12)'; circle(k.x, k.y, r);
    ctx.strokeStyle = 'rgba(180,250,255,0.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(k.x, k.y, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(k.x, k.y, r - 7, -2.5, -1.7); ctx.stroke();
  }
  if (pw.magnet > 0 && state === 'play') {
    ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(T * 2.5); ctx.globalAlpha = Math.min(1, pw.magnet) * (0.55 + 0.3 * Math.sin(T * 10));
    ctx.strokeStyle = '#ff9ee8'; ctx.lineWidth = 3; ctx.setLineDash([10, 9]);
    ctx.beginPath(); ctx.arc(0, 0, 60 + Math.sin(T * 6) * 3, 0, TAU); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
  }
}
function cloudPath() { ctx.beginPath(); for (const p of PUFFS) { ctx.moveTo(p.ox + p.r, p.oy); ctx.arc(p.ox, p.oy, p.r, 0, TAU); } }
function drawStorm(s) {
  const br = 1 + Math.sin(s.t * 3) * 0.025;
  ctx.save(); ctx.translate(s.x, s.y); ctx.scale(s.s * br, s.s / br);
  ctx.drawImage(GLOW.r, -110, -90, 220, 180);
  if (s.zap > 0) {
    ctx.save(); ctx.rotate(s.za); ctx.strokeStyle = '#fff5a8'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath(); let x = 0, y = 44; ctx.moveTo(x, y);
    for (let i = 0; i < 4; i++) { x += rand(-12, 12); y += rand(9, 15); ctx.lineTo(x, y); }
    ctx.stroke(); ctx.restore();
  }
  const g = ctx.createLinearGradient(0, -50, 0, 46);
  g.addColorStop(0, s.col[0]); g.addColorStop(1, s.col[1]);
  ctx.fillStyle = g; cloudPath(); ctx.fill();
  if (s.zap > 0) { ctx.fillStyle = 'rgba(255,245,170,0.35)'; cloudPath(); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.13)'; ctx.beginPath(); ctx.arc(-18, -22, 18, 0, TAU); ctx.moveTo(30, -16); ctx.arc(16, -16, 14, 0, TAU); ctx.fill();
  // Jahldor yuz — ko'zlari varrakni kuzatadi
  const la = Math.atan2(kite.y - s.y, kite.x - s.x), lx = Math.cos(la) * 2.5, ly = Math.sin(la) * 2.5;
  const blink = s.t % 4 < 0.12 ? 0.15 : 1;
  for (const ex of [-14, 14]) {
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(ex, 2, 7, 8 * blink, 0, 0, TAU); ctx.fill();
    if (blink === 1) { ctx.fillStyle = '#15142a'; circle(ex + lx, 3 + ly, 3.6); }
  }
  ctx.strokeStyle = '#15142a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-24, -10); ctx.lineTo(-7, -4); ctx.moveTo(24, -10); ctx.lineTo(7, -4); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-9, 22); ctx.quadraticCurveTo(0, 15, 9, 22); ctx.stroke();
  ctx.restore();
}
function wing(f) {
  ctx.beginPath(); ctx.moveTo(-6, -3); ctx.quadraticCurveTo(0, -6 - 26 * f, 13, -4 - 22 * f); ctx.quadraticCurveTo(9, -1, 7, 1); ctx.closePath(); ctx.fill();
}
const BIRD_COLS = {
  bird: { body: '#2b2d42', back: '#3d3b5e', front: '#2b2d42', belly: '#4a4e69', beak: '#ffb703', head: '#2b2d42' },
  gull: { body: '#f4f4f8', back: '#c3c9d8', front: '#9aa3b8', belly: '#ffffff', beak: '#ffb703', head: '#ffffff' },
  eagle: { body: '#6b4226', back: '#8a5a34', front: '#5a3418', belly: '#a0703c', beak: '#ffcf3a', head: '#f5f0e6' },
};
function drawBird(b, C) {
  const f = Math.sin(b.t * 15);
  ctx.fillStyle = C.back; wing(-f * 0.6 + 0.3);
  ctx.fillStyle = C.body; ctx.beginPath(); ctx.ellipse(0, 0, 16, 9, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(14, -2); ctx.lineTo(26, -9); ctx.lineTo(25, 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.head; circle(-13, -4, 8);
  ctx.fillStyle = C.belly; ctx.beginPath(); ctx.ellipse(1, 3, 10, 4.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = C.beak; ctx.beginPath(); ctx.moveTo(-19, -7); ctx.lineTo(-29, -3); ctx.lineTo(-19, 0); ctx.closePath(); ctx.fill();
  const la = Math.atan2(kite.y - b.y, kite.x - b.x);
  ctx.fillStyle = '#ffffff'; circle(-14, -6, 3.4);
  ctx.fillStyle = '#111111'; circle(-14 + Math.cos(la) * 1.3, -6 + Math.sin(la) * 1.3, 1.7);
  ctx.strokeStyle = '#111111'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-20, -8); ctx.lineTo(-10, -12); ctx.stroke();
  ctx.fillStyle = C.front; wing(f);
}
function drawDrone(b) {
  ctx.fillStyle = '#3a3f5c'; ctx.fillRect(-24, -3, 48, 4);
  for (const sx of [-22, 22]) {
    ctx.fillStyle = '#3a3f5c'; ctx.fillRect(sx - 1.5, -8, 3, 6);
    ctx.fillStyle = 'rgba(220,230,255,0.6)'; ctx.beginPath(); ctx.ellipse(sx, -9, 13 * Math.abs(Math.sin(T * 40 + sx)) + 2, 2.5, 0, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#2b2f45'; rrect(ctx, -13, -6, 26, 15, 6); ctx.fill();
  ctx.drawImage(GLOW.p, -14, -6, 28, 28);
  ctx.fillStyle = '#111'; circle(0, 7, 6.5);
  ctx.fillStyle = '#ff2e63'; circle(0, 7, 3.5 + Math.sin(T * 8) * 0.8);
  ctx.fillStyle = (T * 3 + b.t) % 1 < 0.5 ? '#7df9ff' : '#ff5fd2'; circle(-9, -1, 2); circle(9, -1, 2);
  ctx.strokeStyle = '#7df9ff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-7, -1); ctx.lineTo(-2, 1); ctx.moveTo(7, -1); ctx.lineTo(2, 1); ctx.stroke();
}
function drawUfo(b) {
  ctx.fillStyle = 'rgba(160,255,200,0.14)'; ctx.beginPath(); ctx.moveTo(-8, 6); ctx.lineTo(8, 6); ctx.lineTo(24, 48); ctx.lineTo(-24, 48); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(170,240,255,0.75)'; ctx.beginPath(); ctx.ellipse(0, -4, 13, 13, 0, Math.PI, TAU); ctx.fill();
  ctx.fillStyle = '#7ddc6a'; circle(0, -7, 6);
  ctx.fillStyle = '#111'; circle(-2.2, -8, 1.5); circle(2.2, -8, 1.5);
  const g = ctx.createLinearGradient(0, -6, 0, 10); g.addColorStop(0, '#e8ecf5'); g.addColorStop(1, '#7a83a3');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 2, 30, 9, 0, 0, TAU); ctx.fill();
  for (let i = 0; i < 5; i++) { ctx.fillStyle = NEON[(i + Math.floor(T * 6)) % 4]; circle(-20 + i * 10, 4, 2.4); }
}
function drawRival(h) {
  const C = h.col;
  ctx.save(); ctx.translate(h.x, h.y);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(80, VH - h.y, 170, VH - h.y + 60); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 26);
  const tp = [];
  for (let i = 1; i < 10; i++) { const x = i * 7 + Math.sin(h.t * 8 + i) * 3, y = 26 + i * 6; tp.push([x, y]); ctx.lineTo(x, y); }
  ctx.stroke();
  for (let i = 1; i < tp.length; i += 2) { ctx.fillStyle = C[i % 4 === 1 ? 1 : 0]; ctx.beginPath(); ctx.moveTo(tp[i][0], tp[i][1]); ctx.lineTo(tp[i][0] - 7, tp[i][1] - 4); ctx.lineTo(tp[i][0] - 7, tp[i][1] + 4); ctx.closePath(); ctx.moveTo(tp[i][0], tp[i][1]); ctx.lineTo(tp[i][0] + 7, tp[i][1] - 4); ctx.lineTo(tp[i][0] + 7, tp[i][1] + 4); ctx.closePath(); ctx.fill(); }
  ctx.rotate(-0.3 + Math.sin(h.t * 3) * 0.12);
  const t = [0, -32], r = [24, -6], bt = [0, 28], l = [-24, -6], c = [0, -6];
  kTri(ctx, t, l, c, C[0]); kTri(ctx, t, r, c, C[1]); kTri(ctx, l, bt, c, C[1]); kTri(ctx, r, bt, c, C[0]);
  kRim(ctx, [t, r, bt, l]);
  // Jahldor raqib yuzi
  for (const ex of [-7, 7]) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(ex, -8, 5, 5.5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#111'; circle(ex - 1.5, -7, 2.6); }
  ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-13, -17); ctx.lineTo(-3, -13); ctx.moveTo(13, -17); ctx.lineTo(3, -13); ctx.stroke();
  ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-5, 4); ctx.quadraticCurveTo(0, 0, 5, 4); ctx.stroke();
  ctx.restore();
}
function drawMeteor(h) {
  const a = Math.atan2(h.vy, h.vx - speed);
  ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(a);
  const g = ctx.createLinearGradient(0, 0, -100, 0); g.addColorStop(0, 'rgba(255,200,80,0.9)'); g.addColorStop(1, 'rgba(255,60,140,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(-100, 0); ctx.lineTo(0, 14); ctx.closePath(); ctx.fill();
  ctx.drawImage(GLOW.o, -42, -42, 84, 84);
  ctx.fillStyle = '#6b4a5e'; circle(0, 0, 15);
  ctx.fillStyle = '#4a3346'; circle(-4, -4, 4); circle(5, 3, 3); circle(-2, 7, 2.5);
  ctx.restore();
}
function drawHazard(h) {
  ctx.save();
  if (h.knock) { ctx.translate(h.x, h.y); ctx.rotate(h.knock.a); ctx.translate(-h.x, -h.y); }
  if (h.type === 'storm') drawStorm(h);
  else if (h.type === 'rival') drawRival(h);
  else if (h.type === 'meteor') drawMeteor(h);
  else {
    ctx.translate(h.x, h.y); ctx.scale(h.s, h.s);
    ctx.globalAlpha = 0.25 + Scen.PAL.night * 0.45; ctx.drawImage(GLOW.w, -36, -36, 72, 72); ctx.globalAlpha = 1;
    if (h.skin === 'drone') drawDrone(h); else if (h.skin === 'ufo') drawUfo(h); else drawBird(h, BIRD_COLS[h.skin]);
  }
  ctx.restore();
}
function drawParts() {
  for (const p of parts) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = p.type === 'conf' ? Math.min(1, p.life) : a;
    if (p.type === 'spark') {
      ctx.strokeStyle = p.color; ctx.lineWidth = p.size * a + 0.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05); ctx.stroke();
    } else if (p.type === 'ring') {
      ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(0.1, 4 * a);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + (1 - a) * 2.2), 0, TAU); ctx.stroke();
    } else if (p.type === 'feather') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.ellipse(0, 0, 9, 3, 0, 0, TAU); ctx.fill(); ctx.restore();
    } else if (p.type === 'conf') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(Math.cos(p.rot * 1.7), 1);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore();
    } else {
      ctx.fillStyle = p.color; circle(p.x, p.y, p.size * (0.4 + 0.6 * a));
    }
  }
  ctx.globalAlpha = 1;
}
function drawPops() {
  for (const p of pops) {
    const k = p.t / p.life, s = p.t < 0.22 ? easeOutBack(p.t / 0.22) : 1;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s, s);
    ctx.globalAlpha = k > 0.65 ? (1 - k) / 0.35 : 1;
    text(p.text, 0, 0, p.size, p.color);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function drawLines() {
  const a = clamp(speed / 500, 0, 1) * (pw.turbo > 0 ? 0.45 : pw.magnet > 0 ? 0.25 : 0.12);
  if (a < 0.01) return;
  ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath();
  for (const l of lines) { ctx.moveTo(l.x, l.y); ctx.lineTo(l.x + l.l * (pw.turbo > 0 ? 2 : 1), l.y); }
  ctx.stroke();
}
function warnAt(x, y, a) {
  ctx.globalAlpha = clamp(a, 0, 1);
  ctx.fillStyle = '#ef476f'; circle(x, y, 14 + Math.sin(T * 14) * 2);
  text('!', x, y + 1, 22, '#ffffff', 'center', false);
  ctx.globalAlpha = 1;
}
function drawWarnings() {
  if (state !== 'play') return;
  for (const h of hazards) {
    if (h.knock) continue;
    if (h.type === 'flyer' || h.type === 'rival') {
      if (h.x < VW + 10 || h.x > VW + 400) continue;
      warnAt(VW - 26, clamp(h.y, CEIL, GROUND - 20), 1 - (h.x - VW) / 400);
    } else if (h.type === 'meteor') {
      if (h.x < VW - 20 && h.y > 0) continue;
      const vx = speed - h.vx, te = Math.max((h.x - VW + 20) / vx, -h.y / h.vy, 0);
      if (te > 1.6) continue;
      warnAt(clamp(h.x - vx * te, 26, VW - 26), clamp(h.y + h.vy * te, 26, GROUND - 20), 1.2 - te / 1.6);
    }
  }
  const prox = clamp(1 - (GROUND - kite.y - 18) / 130, 0, 1);
  if (prox > 0 && !pw.shield && pw.turbo <= 0 && pw.inv <= 0) {
    const g = ctx.createLinearGradient(0, VH, 0, VH - 220);
    g.addColorStop(0, `rgba(239,71,111,${0.45 * prox})`); g.addColorStop(1, 'rgba(239,71,111,0)');
    ctx.fillStyle = g; ctx.fillRect(0, VH - 220, VW, 220);
  }
}

// ---------- O'yin ichidagi HUD (kanvasda) ----------
function hudBar(x, y, w, f, col) {
  ctx.fillStyle = 'rgba(20,14,50,0.4)'; rrect(ctx, x, y, w, 8, 4); ctx.fill();
  ctx.fillStyle = col; rrect(ctx, x, y, Math.max(8, w * clamp(f, 0, 1)), 8, 4); ctx.fill();
}
function drawHUD() {
  if (state !== 'play' && state !== 'dead') return;
  text(String(score()), VW / 2, 48, 46 * (1 + scorePop * 0.25), '#ffffff');
  // keyingi dunyogacha yo'l
  const wi = run.world, m = meters(), s0 = worldStart(wi), s1 = worldStart(wi + 1), f = clamp((m - s0) / (s1 - s0), 0, 1);
  const bw = Math.min(190, VW * 0.4), bx = VW / 2 - bw / 2, by = 82;
  ctx.fillStyle = 'rgba(20,14,50,0.4)'; rrect(ctx, bx - 3, by - 3, bw + 6, 14, 7); ctx.fill();
  const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#7df9ff'); g.addColorStop(1, '#ffd23f');
  ctx.fillStyle = g; rrect(ctx, bx, by, Math.max(8, bw * f), 8, 4); ctx.fill();
  for (const [x, w] of [[bx - 14, wi], [bx + bw + 14, wi + 1]]) {
    const C = worldDef(w).C, gg = ctx.createLinearGradient(0, by - 6, 0, by + 14);
    gg.addColorStop(0, rgb(C.skyT)); gg.addColorStop(1, rgb(C.far1));
    ctx.fillStyle = gg; circle(x, by + 4, 9); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, by + 4, 9, 0, TAU); ctx.stroke();
  }
  // yig'ilgan yulduzlar
  drawStarIcon(ctx, VW - 28, 42, 1 + starPop * 0.3);
  text(String(run.stars), VW - 50, 43, 28, '#ffffff', 'right');
  if (combo >= 2 && state === 'play') {
    const cm = comboMult(), c = cm > 1 ? '#ffd23f' : '#ffffff';
    text('COMBO ' + combo + (cm > 1 ? '  x' + cm : ''), VW / 2, 116, 20, c);
    hudBar(VW / 2 - 55, 130, 110, comboTimer / 1.5, c);
  }
  // faol kuchaytirgichlar (chapda, pauza tugmasi ostida)
  let iy = 112;
  const ix = 30;
  if (pw.turbo > 0) { drawTurboIcon(ix, iy, 0.9); hudBar(ix + 20, iy - 4, 60, pw.turbo / 2.8, '#ffd23f'); iy += 34; }
  if (pw.magnet > 0) { drawMagnet(ix, iy + 2, 0.75); hudBar(ix + 20, iy - 4, 60, pw.magnet / 8, '#ff9ee8'); iy += 34; }
  if (pw.double > 0) { text('x2', ix, iy, 20, '#ffd23f'); hudBar(ix + 20, iy - 4, 60, pw.double / 10, '#ffd23f'); iy += 34; }
  if (pw.shield) drawShieldIcon(ix, iy, 0.8);
  if (hintT > 0 && state === 'play') {
    ctx.globalAlpha = Math.min(1, hintT);
    text('▲  ' + L.up, VW / 2, VH * 0.24, 24, holding ? '#ffd23f' : '#ffffff');
    text('▼  ' + L.down, VW / 2, VH * 0.24 + 40, 24, holding ? '#ffffff' : '#ffd23f');
    ctx.globalAlpha = 1;
  }
}

function render() {
  ctx.setTransform(DPR * S, 0, 0, DPR * S, 0, 0);
  Scen.drawSky();
  ctx.save();
  if (shake > 0) ctx.translate(rand(-1, 1) * shake * 0.6, rand(-1, 1) * shake * 0.6);
  if (zoom !== 1) { ctx.translate(kite.x, kite.y); ctx.scale(zoom, zoom); ctx.translate(-kite.x, -kite.y); }
  Scen.drawBack(); drawLines(); Scen.drawGround();
  for (const r of rings) drawRing(r, false);
  for (const s of stars) drawStar(s);
  for (const p of powerups) drawPower(p);
  if (screenNow !== 'shop') drawPlayer(); // do'konda varrak katta oynada ko'rsatiladi
  for (const r of rings) drawRing(r, true);
  for (const h of hazards) drawHazard(h);
  drawParts(); drawPops();
  Scen.drawFront();
  ctx.restore();
  drawWarnings();
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash * 0.55})`; ctx.fillRect(0, 0, VW, VH); }
  drawHUD();
}

// ---------- Interfeys (DOM) ----------
const SCREENS = ['menu', 'over', 'shop', 'pauseScr'];
let screenNow = '';
function show(id) {
  screenNow = id;
  for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id);
  $('btnPause').classList.toggle('hidden', id !== 'hud');
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const STAR_I = '<i class="star"></i>';
function missionRows() {
  return save.missions.map(m => {
    const p = Math.min(mProg(m), m.target), f = m.done ? 1 : p / m.target;
    const num = m.type === 'worldReach' ? '' : `${m.done ? m.target : p}/${m.target}`;
    return `<div class="mis${m.done ? ' done' : ''}${m.fresh ? ' fresh' : ''}"><span class="chk">${m.done ? '✔' : ''}</span><span class="mt">${esc(mText(m))}</span><span class="mr">+${m.reward}${STAR_I}</span>` +
      `<span class="mbar"><i style="width:${(f * 100).toFixed(1)}%"></i></span><span class="mn">${num}</span></div>`;
  }).join('');
}
function renderMenu() {
  $('mStars').textContent = save.stars;
  $('mRank').textContent = `${L.rank} ${save.rank + 1}`;
  $('mList').innerHTML = missionRows();
  $('mBest').innerHTML = save.best > 0 ? `${esc(L.best)}: <b>${save.best}</b>` : '';
}
function showOver() {
  $('oScore').textContent = '0';
  const b = $('oBadge');
  if (newBest) { b.className = 'badge new'; b.textContent = L.newBest; }
  else { b.className = 'badge'; b.textContent = `${L.best}: ${save.best}`; }
  $('oDist').textContent = `${Math.floor(meters())} ${L.unit}`;
  $('oStars').textContent = run.stars;
  $('oWorld').textContent = L.worlds[run.world % 5];
  $('oList').innerHTML = missionRows();
  show('over');
}
let toastT = 0;
function toast(msg) {
  const el = $('toast');
  el.innerHTML = esc(msg) + STAR_I;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2700);
}
function banner(small, big) {
  const el = $('banner');
  $('bnSmall').textContent = small; $('bnName').textContent = big;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function applyLang() {
  document.documentElement.lang = Object.keys(STR).find(k => STR[k] === L) || 'en';
  $('tSub').textContent = L.sub;
  $('btnPlay').textContent = L.play;
  $('tMissions').textContent = L.missions;
  $('tKites').textContent = L.kites; $('tKites2').textContent = L.kites;
  $('tScore').textContent = L.score;
  $('btnRetry').textContent = L.retry;
  $('tHome').textContent = L.home;
  $('tShop').textContent = L.kites;
  $('tPaused').textContent = L.paused;
  $('btnResume').textContent = L.resume;
  $('btnHome2').textContent = L.home;
}

// ---------- Varraklar do'koni ----------
function buildShop() {
  const grid = $('grid'); grid.innerHTML = '';
  KITES.forEach((k, i) => {
    const el = document.createElement('div'); el.className = 'kcard';
    const cv = document.createElement('canvas'); cv.width = cv.height = 96 * 2;
    el.appendChild(cv);
    el.insertAdjacentHTML('beforeend', `<div class="kn">${esc(k.name)}</div><div class="kp"></div>`);
    el.addEventListener('click', () => { shopSel = i; Snd.click(); renderShop(); });
    grid.appendChild(el); k.el = el; k.cv = cv;
  });
}
function drawThumb(k) {
  const c = k.cv.getContext('2d'), s = k.cv.width / 96;
  c.setTransform(s, 0, 0, s, 0, 0); c.clearRect(0, 0, 96, 96);
  drawKiteIcon(c, k, 0.4, 56, 40, 0.6);
}
function renderShop() {
  $('sStars').textContent = save.stars;
  KITES.forEach((k, i) => {
    const own = save.owned.includes(k.id), cur = k.id === save.kite;
    k.el.className = 'kcard' + (own ? ' owned' : ' locked') + (i === shopSel ? ' sel' : '') + (cur ? ' cur' : '');
    k.el.querySelector('.kp').innerHTML = cur ? esc(L.equipped) : own ? '✔' : STAR_I + k.price;
    drawThumb(k);
  });
  const k = KITES[shopSel], own = save.owned.includes(k.id), b = $('btnAct');
  $('pName').textContent = k.name;
  b.classList.remove('shake');
  if (k.id === save.kite) { b.textContent = L.equipped + ' ✔'; b.className = 'btn play act off'; }
  else if (own) { b.textContent = L.equip; b.className = 'btn play act'; }
  else { b.innerHTML = `${esc(L.buy)} ${STAR_I}${k.price}`; b.className = 'btn play act' + (save.stars < k.price ? ' off' : ''); }
}
function openShop() {
  shopFrom = screenNow === 'over' ? 'over' : 'menu';
  shopSel = KITES.indexOf(KD);
  renderShop(); show('shop');
}
function closeShop() {
  if (shopFrom === 'over') { $('oList').innerHTML = missionRows(); show('over'); }
  else { renderMenu(); show('menu'); }
}
function equip(k) {
  save.kite = k.id; KD = k;
  if (state !== 'play' && state !== 'dead') resetKite();
}
function shopAction() {
  const k = KITES[shopSel], b = $('btnAct');
  if (k.id === save.kite) return;
  if (save.owned.includes(k.id)) { equip(k); Snd.click(); }
  else if (save.stars >= k.price) {
    save.stars -= k.price; save.owned.push(k.id); equip(k); Snd.buy();
    const r = $('pv').getBoundingClientRect();
    pvBurst = 1;
    if (r.width) for (let i = 0; i < 30; i++) addP(rand(0, VW), rand(-60, -10), rand(-60, 60), rand(100, 260), rand(1.4, 2.4), rand(6, 10), pickOne(['#ef476f', '#ffd166', '#06d6a0', '#7df9ff']), 'conf', 120);
  } else { Snd.no(); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; }
  Store.save(save); renderShop();
}
let pvBurst = 0;
function drawPreview() {
  const cv = $('pv'), r = cv.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const w = Math.round(r.width * DPR), h = Math.round(r.height * DPR);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const c = cv.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
  pvBurst = Math.max(0, pvBurst - 0.03);
  const sc = Math.min(w / 230, h / 175) * (1 + pvBurst * 0.25 * Math.sin(pvBurst * 12));
  c.globalAlpha = 0.5; c.drawImage(GLOW.w, w * 0.56 - 90 * sc, h * 0.4 - 90 * sc, 180 * sc, 180 * sc); c.globalAlpha = 1;
  drawKiteIcon(c, KITES[shopSel], T, w * 0.56, h * 0.4 + Math.sin(T * 1.6) * 6 * sc, sc);
}

// ---------- Boshqaruv ----------
function syncHold() { holding = ptrs.size > 0 || keyHold; }
function setPaused(p) {
  if (paused === p) return;
  paused = p;
  if (p) { ptrs.clear(); keyHold = false; syncHold(); Snd.suspend(); if (state === 'play') show('pauseScr'); }
  else { Snd.resume(); if (state === 'play') show('hud'); }
}
document.addEventListener('pointerdown', () => Snd.unlock(), true);
canvas.addEventListener('pointerdown', e => { e.preventDefault(); if (state !== 'play' || paused) return; ptrs.add(e.pointerId); syncHold(); });
const lift = e => { ptrs.delete(e.pointerId); syncHold(); };
window.addEventListener('pointerup', lift);
window.addEventListener('pointercancel', lift);
window.addEventListener('blur', () => { ptrs.clear(); keyHold = false; syncHold(); });
canvas.addEventListener('contextmenu', e => e.preventDefault());
const HOLD_KEYS = ['Space', 'ArrowUp', 'KeyW'];
window.addEventListener('keydown', e => {
  if (e.code === 'Escape' || e.code === 'KeyP') { if (state === 'play') setPaused(!paused); else if (screenNow === 'shop') closeShop(); return; }
  if (!HOLD_KEYS.includes(e.code) && e.code !== 'Enter') return;
  e.preventDefault();
  if (e.repeat) return;
  Snd.unlock();
  if (paused) { setPaused(false); return; }
  if ((screenNow === 'menu' && ready) || (screenNow === 'over' && overT > 0.7)) startRun();
  if (state === 'play' && HOLD_KEYS.includes(e.code)) { keyHold = true; syncHold(); }
});
window.addEventListener('keyup', e => { if (HOLD_KEYS.includes(e.code)) { keyHold = false; syncHold(); } });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) setPaused(true);
  else if (state !== 'play') setPaused(false);
});
function onBtn(id, fn) { $(id).addEventListener('click', e => { e.currentTarget.blur(); Snd.unlock(); fn(); }); }
onBtn('btnPlay', () => { Snd.click(); startRun(); });
onBtn('btnKites', () => { Snd.click(); openShop(); });
onBtn('btnKites2', () => { Snd.click(); openShop(); });
onBtn('btnRetry', () => { if (overT > 0.5) { Snd.click(); startRun(); } });
onBtn('btnHome', () => { Snd.click(); goMenu(); });
onBtn('btnBack', () => { Snd.click(); closeShop(); });
onBtn('btnAct', shopAction);
onBtn('btnPause', () => { Snd.click(); setPaused(true); });
onBtn('btnResume', () => { Snd.click(); setPaused(false); });
onBtn('btnHome2', () => { setPaused(false); Snd.click(); goMenu(); });

// ---------- Asosiy sikl ----------
function frame(now) {
  const rdt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (!paused) update(rdt);
  Snd.tick();
  render();
  if (screenNow === 'shop') drawPreview();
  if (!firstFrame) { firstFrame = true; yt(y => y.game.firstFrameReady()); }
  requestAnimationFrame(frame);
}

function normalizeSave(d) {
  const s = Object.assign({}, save, d || {});
  s.best = s.best | 0; s.stars = s.stars | 0; s.mlv = s.mlv | 0; s.rank = s.rank | 0; s.total = s.total | 0; s.maxWorld = s.maxWorld | 0; s.tut = !!s.tut;
  s.owned = Array.isArray(s.owned) ? s.owned.filter(id => KITES.some(k => k.id === id)) : [];
  if (!s.owned.includes('classic')) s.owned.unshift('classic');
  if (!s.owned.includes(s.kite)) s.kite = 'classic';
  s.missions = Array.isArray(s.missions) ? s.missions.filter(m => m && M_TYPES.includes(m.type) && m.target > 0).slice(0, 3) : [];
  return s;
}

resize(); Scen.init(); Scen.reset(0); resetKite();
for (let i = 0; i < 24; i++) lines.push({ x: rand(0, VW * 1.5), y: rand(CEIL, GROUND - 20), l: rand(40, 130) });
window.addEventListener('resize', resize);
Snd.prepare();
last = performance.now();
requestAnimationFrame(frame);

(async () => {
  const [data, lang] = await Promise.all([Store.load(), detectLang()]);
  save = normalizeSave(data);
  KD = kiteById(save.kite); resetKite();
  L = STR[lang];
  applyLang(); buildShop(); refreshMissions(); renderMenu(); show('menu');
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
