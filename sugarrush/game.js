/* SUGAR RUSH — YouTube Playables uchun 3D o'yin (three.js).
   Shirinliklar olami: qahramon o'zi yuguradi, marmelad kubiklarni yig'adi, ulardan kamalak ko'priklar quradi
   va orqadan quvib kelayotgan shokolad to'lqinidan qochadi. */
import * as THREE from './three.module.min.js';
import { GLTFLoader } from './lib/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from './lib/utils/SkeletonUtils.js';

// ---------- Yordamchilar ----------
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pickOne = arr => arr[(Math.random() * arr.length) | 0];
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Har kadrda yangi obyekt yaratmaslik uchun qayta ishlatiladigan vaqtinchalik obyektlar
const _m4 = new THREE.Matrix4(), _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _sc = new THREE.Vector3(), _eu = new THREE.Euler(), _col = new THREE.Color();
const COLORS = new Map();
function colorOf(hex) { let c = COLORS.get(hex); if (!c) { c = new THREE.Color(hex); COLORS.set(hex, c); } return c; }
// Konfet palitrasi
const PALETTE = [0xff5d8f, 0xffb22c, 0x6ee36a, 0x3fc5ff, 0xb46bff, 0xff7ae0, 0xffe94a];
const palette = i => PALETTE[((i % PALETTE.length) + PALETTE.length) % PALETTE.length];

// ---------- Matnlar (10 til) ----------
const KEYS = ['play', 'shop', 'level', 'heroes', 'upgrades', 'startBlocks', 'magnet', 'lavaSlow', 'swipe', 'collect', 'complete', 'next', 'caught', 'fell', 'retry', 'buy', 'equip', 'equipped', 'paused', 'resume', 'progress', 'bonus', 'back', 'subtitle', 'gift'];
const RAW = {
  en: ['PLAY', 'SHOP', 'Level', 'Heroes', 'Upgrades', 'Start jellies', 'Magnet', 'Slow chocolate', 'Swipe to steer', 'Grab jellies, build bridges!', 'Level complete!', 'NEXT', 'The chocolate got you!', 'Splash! Into the syrup!', 'TRY AGAIN', 'Buy', 'Equip', 'Equipped', 'Paused', 'Tap to continue', 'Progress', 'Bonus', 'Back', 'Outrun the chocolate flood!', "Gift"],
  es: ['JUGAR', 'TIENDA', 'Nivel', 'Héroes', 'Mejoras', 'Gomitas iniciales', 'Imán', 'Chocolate lento', 'Desliza para moverte', '¡Junta gomitas y haz puentes!', '¡Nivel completado!', 'SIGUIENTE', '¡El chocolate te alcanzó!', '¡Plaf! ¡Al sirope!', 'REINTENTAR', 'Comprar', 'Usar', 'En uso', 'Pausa', 'Toca para continuar', 'Progreso', 'Bonus', 'Volver', '¡Escapa de la ola de chocolate!', "Regalo"],
  pt: ['JOGAR', 'LOJA', 'Nível', 'Heróis', 'Melhorias', 'Jujubas iniciais', 'Ímã', 'Chocolate lento', 'Deslize para mover', 'Pegue jujubas e faça pontes!', 'Nível concluído!', 'PRÓXIMO', 'O chocolate te pegou!', 'Splash! No xarope!', 'TENTAR DE NOVO', 'Comprar', 'Usar', 'Em uso', 'Pausado', 'Toque para continuar', 'Progresso', 'Bônus', 'Voltar', 'Fuja da onda de chocolate!', "Presente"],
  ru: ['ИГРАТЬ', 'МАГАЗИН', 'Уровень', 'Герои', 'Улучшения', 'Стартовый мармелад', 'Магнит', 'Медленный шоколад', 'Свайпай, чтобы рулить', 'Собирай мармелад — строй мосты!', 'Уровень пройден!', 'ДАЛЕЕ', 'Шоколад догнал!', 'Плюх! В сироп!', 'ЕЩЁ РАЗ', 'Купить', 'Выбрать', 'Выбран', 'Пауза', 'Нажми, чтобы продолжить', 'Прогресс', 'Бонус', 'Назад', 'Убеги от шоколадной волны!', "Подарок"],
  uz: ["O'YNASH", "DO'KON", 'Level', 'Qahramonlar', 'Yaxshilash', "Boshlang'ich marmelad", 'Magnit', 'Sekin shokolad', "Yo'nalish uchun suring", "Marmelad yig' — ko'prik qur!", 'Level tugadi!', 'KEYINGI', 'Shokolad yetib oldi!', 'Shalop! Sharbatga tushdingiz!', 'QAYTA', 'Sotib olish', 'Tanlash', 'Tanlangan', 'Pauza', 'Davom etish uchun bosing', 'Progress', 'Bonus', 'Orqaga', "Shokolad to'lqinidan qoch!", "Sovg'a"],
  tr: ['OYNA', 'MAĞAZA', 'Seviye', 'Kahramanlar', 'Geliştirmeler', 'Başlangıç jelibonu', 'Mıknatıs', 'Yavaş çikolata', 'Yönlendirmek için kaydır', 'Jelibon topla, köprü kur!', 'Seviye tamamlandı!', 'SONRAKİ', 'Çikolata seni yakaladı!', 'Şap! Şuruba düştün!', 'TEKRAR DENE', 'Satın al', 'Seç', 'Seçili', 'Duraklatıldı', 'Devam etmek için dokun', 'İlerleme', 'Bonus', 'Geri', 'Çikolata selinden kaç!', "Hediye"],
  id: ['MAIN', 'TOKO', 'Level', 'Pahlawan', 'Upgrade', 'Jeli awal', 'Magnet', 'Cokelat lambat', 'Geser untuk mengarahkan', 'Ambil jeli, bangun jembatan!', 'Level selesai!', 'LANJUT', 'Cokelat menangkapmu!', 'Byur! Jatuh ke sirup!', 'COBA LAGI', 'Beli', 'Pakai', 'Dipakai', 'Jeda', 'Ketuk untuk lanjut', 'Progres', 'Bonus', 'Kembali', 'Kabur dari banjir cokelat!', "Hadiah"],
  fr: ['JOUER', 'BOUTIQUE', 'Niveau', 'Héros', 'Améliorations', 'Bonbons de départ', 'Aimant', 'Chocolat lent', 'Glisse pour diriger', 'Ramasse des bonbons, bâtis des ponts !', 'Niveau terminé !', 'SUIVANT', 'Le chocolat t’a eu !', 'Plouf ! Dans le sirop !', 'RÉESSAYER', 'Acheter', 'Choisir', 'Choisi', 'Pause', 'Touche pour continuer', 'Progression', 'Bonus', 'Retour', 'Fuis la vague de chocolat !', "Cadeau"],
  de: ['SPIELEN', 'SHOP', 'Level', 'Helden', 'Upgrades', 'Start-Gummis', 'Magnet', 'Langsame Schoko', 'Wischen zum Lenken', 'Sammle Gummis, baue Brücken!', 'Level geschafft!', 'WEITER', 'Die Schokolade hat dich!', 'Platsch! In den Sirup!', 'NOCHMAL', 'Kaufen', 'Wählen', 'Gewählt', 'Pause', 'Tippen zum Fortsetzen', 'Fortschritt', 'Bonus', 'Zurück', 'Entkomme der Schokoflut!', "Geschenk"],
  hi: ['खेलें', 'दुकान', 'लेवल', 'हीरो', 'अपग्रेड', 'शुरुआती जेली', 'चुंबक', 'धीमी चॉकलेट', 'दिशा के लिए स्वाइप करें', 'जेली उठाओ, पुल बनाओ!', 'लेवल पूरा!', 'आगे', 'चॉकलेट ने पकड़ लिया!', 'छपाक! शरबत में गिर गए!', 'फिर कोशिश करें', 'खरीदें', 'चुनें', 'चुना गया', 'रुका हुआ', 'जारी रखने के लिए टैप करें', 'प्रगति', 'बोनस', 'वापस', 'चॉकलेट की बाढ़ से बचो!', "उपहार"],
};
const STR = {};
for (const l in RAW) { STR[l] = {}; KEYS.forEach((k, i) => { STR[l][k] = RAW[l][i]; }); }
let L = STR.en;

// ---------- YouTube Playables SDK ----------
const YT = (typeof ytgame !== 'undefined' && ytgame.IN_PLAYABLES_ENV) ? ytgame : null;
function yt(fn) { if (!YT) return; try { const r = fn(YT); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
const SAVE_KEY = 'sugarrush_save_v1';
const Store = {
  async load() {
    try { const s = YT ? await YT.game.loadData() : localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : {}; } catch (e) { return {}; }
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

// ---------- Ovoz ----------
const Snd = (() => {
  let ac = null, master = null, sfx = null, mus = null, noiseBuf = null, rumbleG = null;
  let enabled = true, musicOn = false, nextT = 0, step = 0, chain = 0, chainT = 0;
  function init() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ac = new AC(); } catch (e) { return; }
    master = ac.createGain(); master.gain.value = enabled ? 0.9 : 0; master.connect(ac.destination);
    sfx = ac.createGain(); sfx.gain.value = 0.8; sfx.connect(master);
    mus = ac.createGain(); mus.gain.value = 0.22; mus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // shokolad to'lqinining g'ulduri (balandligi to'lqin yaqinligiga bog'liq)
    const src = ac.createBufferSource(), lp = ac.createBiquadFilter();
    src.buffer = noiseBuf; src.loop = true; lp.type = 'lowpass'; lp.frequency.value = 160;
    rumbleG = ac.createGain(); rumbleG.gain.value = 0;
    src.connect(lp); lp.connect(rumbleG); rumbleG.connect(sfx); src.start();
  }
  const ok = () => ac && ac.state === 'running';
  function osc(type, f0, f1, t, dur, vol, dest = sfx) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, dur, vol, ftype, freq, dest = sfx, q = 1) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = ftype; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  const semi = n => 261.63 * Math.pow(2, n / 12);
  const PENTA = [0, 2, 4, 7, 9];
  const pent = i => semi(12 + PENTA[i % 5] + 12 * Math.floor(i / 5));
  // Quvnoq major ritm (C - Am - F - G)
  const RIFF = [12, -1, 16, 19, -1, 16, 21, 19, 12, -1, 16, 19, 24, 21, 19, 16];
  const BASS = [0, -3, 5, 7];
  const STEP = 60 / 128 / 2;
  function playStep(i, t) {
    const r = RIFF[i % 16];
    if (r >= 0) osc('triangle', semi(r + 12), 0, t, 0.14, 0.05, mus);
    if (i % 2 === 0) osc('triangle', semi(BASS[Math.floor(i / 16) % 4] - 12), 0, t, STEP * 1.6, 0.2, mus);
    if (i % 4 === 0) osc('sine', 140, 50, t, 0.18, 0.45, mus);
    if (i % 8 === 4) { noise(t, 0.1, 0.2, 'bandpass', 2200, mus, 0.8); osc('triangle', 330, 200, t, 0.08, 0.06, mus); }
    if (i % 2 === 1) noise(t, 0.03, 0.06, 'highpass', 8000, mus);
  }
  return {
    // AudioContext yaratish Windows'da sekin: yuklanishda oldindan yaratamiz, bosilganda faqat yoqamiz
    prepare() { init(); },
    unlock() { init(); if (!ac) return; if (ac.state === 'suspended') ac.resume().catch(() => {}); musicOn = true; },
    setEnabled(v) { enabled = v; if (master) master.gain.setTargetAtTime(v ? 0.9 : 0, ac.currentTime, 0.05); },
    suspend() { if (ac && ac.state === 'running') ac.suspend().catch(() => {}); },
    resume() { if (ac && ac.state === 'suspended') ac.resume().catch(() => {}); },
    rumble(v) { if (rumbleG) rumbleG.gain.setTargetAtTime(v, ac.currentTime, 0.1); },
    tick(dt) {
      chainT -= dt; if (chainT <= 0) chain = 0;
      if (!ok() || !musicOn) return;
      if (nextT < ac.currentTime) nextT = ac.currentTime + 0.05;
      while (nextT < ac.currentTime + 0.2) { playStep(step++, nextT); nextT += STEP; }
    },
    // marmelad "boing" ovozi: ketma-ket yig'ilganda balandlashib boradi
    pickup() { if (!ok()) return; chain = Math.min(chain + 1, 14); chainT = 0.7; const t = ac.currentTime, f = pent(chain); osc('sine', f * 0.7, f, t, 0.12, 0.22); osc('triangle', f * 2, 0, t + 0.03, 0.1, 0.06); },
    place() { if (!ok()) return; const t = ac.currentTime; osc('sine', 420, 700, t, 0.07, 0.18); },
    coin() { if (!ok()) return; const t = ac.currentTime; osc('square', 1318, 0, t, 0.06, 0.05); osc('square', 1760, 0, t + 0.06, 0.12, 0.05); },
    hit() { if (!ok()) return; const t = ac.currentTime; osc('sine', 500, 120, t, 0.3, 0.3); noise(t, 0.2, 0.3, 'bandpass', 900); },
    splash() { if (!ok()) return; const t = ac.currentTime; noise(t, 0.9, 0.5, 'lowpass', 900); osc('sine', 600, 90, t, 0.45, 0.3); },
    pop() { if (!ok()) return; const t = ac.currentTime; osc('sine', 900, 1800, t, 0.06, 0.08); noise(t + 0.05, 0.4, 0.06, 'highpass', 4000); },
    step(k) { if (!ok()) return; const t = ac.currentTime; osc('triangle', semi(12 + (k % 24)), 0, t, 0.12, 0.16); },
    win() { if (!ok()) return; const t = ac.currentTime; [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => osc('triangle', semi(n + 12), 0, t + i * 0.07, 0.35, 0.16)); noise(t, 0.8, 0.12, 'highpass', 3000); },
    lose() { if (!ok()) return; const t = ac.currentTime; [12, 8, 5, 0].forEach((n, i) => osc('triangle', semi(n + 12), 0, t + i * 0.14, 0.3, 0.14)); },
    click() { if (!ok()) return; osc('sine', 660, 990, ac.currentTime, 0.08, 0.15); },
    buy() { if (!ok()) return; const t = ac.currentTime; [0, 4, 7, 12].forEach((n, i) => osc('triangle', semi(n + 19), 0, t + i * 0.06, 0.2, 0.16)); },
    no() { if (!ok()) return; const t = ac.currentTime; osc('square', 180, 150, t, 0.12, 0.05); osc('square', 150, 120, t + 0.12, 0.14, 0.05); },
    whoosh() { if (!ok()) return; noise(ac.currentTime, 0.4, 0.25, 'bandpass', 900, sfx, 0.7); },
  };
})();

// ---------- Renderer va sahna ----------
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
// Avtomatik sifat: FPS'ga qarab ichki ruxsat o'zgaradi
const PR_MAX = Math.min(window.devicePixelRatio || 1, 2);
let pr = Math.min(PR_MAX, 1), prLocked = false;
renderer.setPixelRatio(pr);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping; // ranglarni buzmasdan yorug' joylarni yumshatadi
renderer.toneMappingExposure = 1.0;
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const FOG = new THREE.Color(0xffd3ea);
scene.fog = new THREE.Fog(FOG, 34, 125);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);
scene.add(new THREE.HemisphereLight(0xfff4fb, 0xffa8d6, 0.55));
const sun = new THREE.DirectionalLight(0xfffaf0, 1.9);
sun.position.set(-6, 14, 4);
scene.add(sun, sun.target);
// Atrof aksi (environment): pushti-havorang "studiya" va yorug' panellar, yaltiroq konfetlarda aks etadi
(function makeEnv() {
  const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vP; void main(){ vec3 c = mix(vec3(1.0, 0.55, 0.78), vec3(0.6, 0.8, 1.0), smoothstep(-0.4, 0.6, vP.y)); gl_FragColor = vec4(c * 0.8, 1.0); }' })));
  const lm = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6, 6) });
  for (const [x, y, z, sx, sz] of [[-4, 7, 3, 5, 3], [6, 4, -3, 2, 4], [0, 8, -6, 3, 2]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.2, sz), lm); b.position.set(x, y, z); b.lookAt(0, 0, 0); es.add(b); }
  scene.environment = pm.fromScene(es, 0.035).texture;
  pm.dispose();
})();

// Materiallar keshi va to'q binafsha multfilm kontur
const toonCache = new Map();
// Yaltiroq "konfet" material: lak qoplamasi (clearcoat) va atrof aksi
function toon(color, emissive = 0, ei = 0, fog = true) {
  const k = color + ':' + emissive + ':' + ei + ':' + fog;
  if (!toonCache.has(k)) toonCache.set(k, new THREE.MeshPhysicalMaterial({ color, emissive, emissiveIntensity: ei, fog, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.12 }));
  return toonCache.get(k);
}
function glossy(o) { return new THREE.MeshPhysicalMaterial(Object.assign({ roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 }, o)); }
// Marmelad effekti: rangi o'zidan nur taratadi, chetlari yorqinroq (ichidan yorug'lik o'tayotgandek)
function jellify(mat, k = 0.3) {
  mat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' +
      '  float jRim = 1.0 - saturate(dot(normalize(normal), normalize(vViewPosition)));\n' +
      `  totalEmissiveRadiance += diffuseColor.rgb * (${k.toFixed(2)} + jRim * jRim * 0.9);`);
  };
  mat.customProgramCacheKey = () => 'jelly' + k;
  return mat;
}
// Qirralari yumaloq kub (marmelad uchun): chetga yaqin nuqtalar zichroq, burchaklar silliq
function roundedBox(r = 0.16, seg = 4) {
  const g = new THREE.BoxGeometry(1, 1, 1, seg, seg, seg), p = g.attributes.position, n = g.attributes.normal, h = 0.5 - r;
  const v = new THREE.Vector3(), c = new THREE.Vector3(), warp = u => Math.sign(u) * 0.5 * Math.pow(Math.abs(u) * 2, 0.3);
  for (let i = 0; i < p.count; i++) {
    v.set(warp(p.getX(i)), warp(p.getY(i)), warp(p.getZ(i)));
    c.set(clamp(v.x, -h, h), clamp(v.y, -h, h), clamp(v.z, -h, h));
    v.sub(c);
    const len = v.length();
    if (len > 1e-6) { v.multiplyScalar(1 / len); n.setXYZ(i, v.x, v.y, v.z); }
    else v.set(n.getX(i), n.getY(i), n.getZ(i));
    c.addScaledVector(v, r); p.setXYZ(i, c.x, c.y, c.z);
  }
  return g;
}
const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x3a1240, side: THREE.BackSide });
const OUTLINE_NOFOG = new THREE.MeshBasicMaterial({ color: 0x3a1240, side: THREE.BackSide, fog: false });
function outlined(geo, mat, k = 1.08, out = OUTLINE) {
  const g = new THREE.Group(), o = new THREE.Mesh(geo, out), m = new THREE.Mesh(geo, mat);
  o.scale.setScalar(k); g.add(o, m); return g;
}

// ---------- Teksturalar (kod bilan chiziladi) ----------
function canvasTex(w, h, draw, repeat = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const GLOW_TEX = canvasTex(64, 64, (x) => {
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
});
// Oldindan hisoblangan, chok-choksiz takrorlanuvchi shovqin (sharbat, shokolad va bulutlar uchun)
function makeNoiseTex() {
  const N = 256, layers = seed => { const R = mulberry32(seed); return [8, 16, 32, 64].map(g => { const a = new Float32Array(g * g); for (let i = 0; i < a.length; i++) a[i] = R(); return { g, a }; }); };
  const fbm = (Ls, x, y) => {
    let v = 0, amp = 0.5, tot = 0;
    for (const { g, a } of Ls) {
      const fx = x * g, fy = y * g, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), x0 = ix % g, x1 = (ix + 1) % g, y0 = (iy % g) * g, y1 = ((iy + 1) % g) * g;
      v += amp * lerp(lerp(a[y0 + x0], a[y0 + x1], sx), lerp(a[y1 + x0], a[y1 + x1], sx), sy); tot += amp; amp *= 0.5;
    }
    return v / tot;
  };
  const chans = [layers(11), layers(29)].map(Ls => {
    const f = new Float32Array(N * N); let lo = 1, hi = 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const v = fbm(Ls, x / N, y / N); f[y * N + x] = v; if (v < lo) lo = v; if (v > hi) hi = v; }
    for (let i = 0; i < f.length; i++) f[i] = (f[i] - lo) / (hi - lo);
    return f;
  });
  const data = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) { data[i * 4] = chans[0][i] * 255; data[i * 4 + 1] = chans[1][i] * 255; data[i * 4 + 3] = 255; }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}
const NOISE_TEX = makeNoiseTex();
// Yo'l yuzasi: vafli pechenye (2x2 birlik)
const WAFER_TEX = canvasTex(256, 256, (x) => {
  x.fillStyle = '#e8a75a'; x.fillRect(0, 0, 256, 256);
  const c = 32;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const px = i * c, py = j * c;
    x.fillStyle = '#f6c47c'; x.fillRect(px + 5, py + 5, c - 10, c - 10);
    x.fillStyle = '#ffe2ad'; x.fillRect(px + 5, py + 5, c - 10, 4); x.fillRect(px + 5, py + 5, 4, c - 10);
    x.fillStyle = '#cf8a42'; x.fillRect(px + 5, py + c - 9, c - 10, 4); x.fillRect(px + c - 9, py + 5, 4, c - 10);
  }
  const R = mulberry32(3);
  x.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 90; i++) { x.beginPath(); x.arc(R() * 256, R() * 256, 1 + R() * 1.5, 0, TAU); x.fill(); } // shakar donalari
}, true);
// Yo'l yon tomoni: qatlamli tort (yuqorida glazur oqib tushadi), 3x3 birlik
const CAKE_TEX = canvasTex(128, 256, (x, w, h) => {
  const band = (y0, y1, col) => { x.fillStyle = col; x.fillRect(0, y0 * h, w, (y1 - y0) * h + 1); };
  band(0.0, 0.07, '#ff8fc8');    // pushti glazur
  band(0.07, 0.15, '#ffe08a');   // biskvit
  band(0.15, 0.18, '#ffffff');   // qaymoq
  band(0.18, 0.26, '#ffd06a');   // biskvit
  band(0.26, 0.34, '#8a4a2a');   // shokolad
  band(0.34, 1.0, '#ff6fae');    // qulupnay murabbo (sharbat ichida)
  const R = mulberry32(8);
  x.fillStyle = '#ff8fc8';
  for (let px = 4; px < w; px += 14 + R() * 10) { const r = 4 + R() * 5, len = 6 + R() * 18; x.fillRect(px - r, 0.06 * h, r * 2, len); x.beginPath(); x.arc(px, 0.06 * h + len, r, 0, TAU); x.fill(); }
  x.fillStyle = 'rgba(255,255,255,0.55)'; x.fillRect(0, 0.01 * h, w, 3);
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(200,140,60,${0.25 + R() * 0.3})`; x.beginPath(); x.arc(R() * w, (0.08 + R() * 0.17) * h, 1 + R() * 2, 0, TAU); x.fill(); }
}, true);
// Tanga yuzasi (yulduzli shokolad tanga)
const COIN_TEX = canvasTex(128, 128, (x) => {
  const g = x.createRadialGradient(50, 44, 6, 64, 64, 64);
  g.addColorStop(0, '#fff6b8'); g.addColorStop(0.6, '#ffcf3a'); g.addColorStop(1, '#d99a0a');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = '#b87800'; x.lineWidth = 8; x.beginPath(); x.arc(64, 64, 50, 0, TAU); x.stroke();
  const star = (ox, oy, col) => { x.fillStyle = col; x.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 14 : 32, a = -Math.PI / 2 + (i * Math.PI) / 5; x.lineTo(ox + Math.cos(a) * r, oy + Math.sin(a) * r); } x.closePath(); x.fill(); };
  star(66, 68, '#c98a00'); star(64, 64, '#fff1a0');
});
// Lolipop spirali (oq chiziqlar porlash xaritasida, asosiy rangini instansiya beradi)
const SWIRL_EM = canvasTex(128, 128, (x) => {
  x.fillStyle = '#000'; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = '#fff'; x.lineWidth = 7; x.beginPath();
  for (let a = 0; a < TAU * 4; a += 0.08) { const r = a * 2.4; x.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); }
  x.stroke();
});
// Konfet tayoqcha: qizil-oq qiya chiziqlar
const STRIPE_TEX = canvasTex(64, 256, (x) => {
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 64, 256);
  x.fillStyle = '#ff3f6e';
  for (let y = -64; y < 320; y += 40) { x.beginPath(); x.moveTo(0, y); x.lineTo(64, y - 40); x.lineTo(64, y - 22); x.lineTo(0, y + 18); x.closePath(); x.fill(); }
}, true);
STRIPE_TEX.repeat.set(1, 3);
// Shokolad plitka
const CHOCO_TEX = canvasTex(128, 128, (x) => {
  x.fillStyle = '#6a3518'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const px = i * 64 + 6, py = j * 64 + 6;
    x.fillStyle = '#8a4a24'; x.fillRect(px, py, 52, 52);
    x.fillStyle = '#a8653a'; x.fillRect(px, py, 52, 6); x.fillRect(px, py, 6, 52);
    x.fillStyle = '#4e240f'; x.fillRect(px, py + 46, 52, 6); x.fillRect(px + 46, py, 6, 52);
  }
}, true);

// ---------- Qulupnay sharbati dengizi va shokolad to'lqini (tez shaderlar) ----------
const SEA_GLSL = `
  uniform sampler2D uNoise;
  vec3 syrup(vec2 p, float t){
    vec2 w = texture2D(uNoise, p * 0.5 + vec2(t * 0.01, t * 0.016)).gg - 0.5;
    float n = texture2D(uNoise, p + w * 0.5 + vec2(0.0, -t * 0.02)).r;
    float d = texture2D(uNoise, p * 2.7 + vec2(t * 0.015, 0.0)).g;
    float ribbon = sin(n * 18.0 + t * 0.8) * 0.5 + 0.5;
    vec3 col = mix(vec3(0.95, 0.38, 0.64), vec3(1.0, 0.6, 0.79), smoothstep(0.3, 0.7, n));
    col = mix(col, vec3(1.0, 0.96, 0.98), smoothstep(0.86, 0.98, ribbon) * 0.85);
    col += vec3(1.0) * smoothstep(0.86, 0.95, d) * 0.25;
    return col;
  }
  vec3 choco(vec2 p, float t){
    float n = texture2D(uNoise, p + vec2(0.0, -t * 0.06)).r;
    float g = texture2D(uNoise, p * 2.3 + vec2(t * 0.02, 0.0)).g;
    vec3 col = mix(vec3(0.24, 0.1, 0.04), vec3(0.5, 0.26, 0.12), smoothstep(0.25, 0.75, n));
    col = mix(col, vec3(0.92, 0.66, 0.46), smoothstep(0.8, 0.93, g) * 0.8);
    vec2 sp = p * 22.0; vec2 cell = floor(sp);
    float r = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
    if (r > 0.84) { vec2 f = fract(sp) - 0.5; float dd = length(f * vec2(1.0, 2.6)); vec3 sc = 0.62 + 0.38 * cos(6.2831 * (fract(r * 7.0) + vec3(0.0, 0.33, 0.67))); col = mix(col, sc, smoothstep(0.24, 0.16, dd)); }
    return col;
  }`;
const seaUniforms = { uTime: { value: 0 }, uFog: { value: FOG }, uNear: { value: 34 }, uFar: { value: 125 }, uNoise: { value: NOISE_TEX }, uSun: { value: new THREE.Vector3(-0.35, 0.75, 0.55).normalize() } };
const seaMat = new THREE.ShaderMaterial({
  uniforms: seaUniforms,
  vertexShader: `uniform float uTime; varying vec2 vW; varying float vD; varying vec3 vWorld;
    void main(){ vec4 wp = modelMatrix * vec4(position, 1.0);
      wp.y += sin(wp.x*0.5 + uTime*1.3)*0.08 + cos(wp.z*0.45 + uTime)*0.08;
      vW = wp.xz; vWorld = wp.xyz; vec4 mv = viewMatrix * wp; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform float uTime, uNear, uFar; uniform vec3 uFog, uSun; varying vec2 vW; varying float vD; varying vec3 vWorld; ${SEA_GLSL}
    void main(){ vec3 col = syrup(vW * 0.03, uTime);
      // to'lqinli sirt normali shovqindan olinadi: quyosh yaltirashi va qirraga qarab oqarish (fresnel)
      vec2 q = vW * 0.05 + vec2(uTime * 0.01, -uTime * 0.02);
      float h0 = texture2D(uNoise, q).r, hx = texture2D(uNoise, q + vec2(0.006, 0.0)).r, hz = texture2D(uNoise, q + vec2(0.0, 0.006)).r;
      vec3 N = normalize(vec3((h0 - hx) * 5.0, 1.0, (h0 - hz) * 5.0));
      vec3 V = normalize(cameraPosition - vWorld);
      float spec = pow(max(dot(N, normalize(V + uSun)), 0.0), 90.0);
      float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
      col = mix(col, vec3(1.0, 0.88, 0.96), fres * 0.35) + spec * 0.6;
      col = mix(col, uFog, smoothstep(uNear, uFar, vD) * 0.85); gl_FragColor = vec4(col, 1.0); }`,
});
const sea = new THREE.Mesh(new THREE.PlaneGeometry(260, 320, 52, 64), seaMat);
sea.rotation.x = -Math.PI / 2; sea.position.y = -1.1;
scene.add(sea);
// Quvlab kelayotgan shokolad to'lqini (tepasida qaymoq ko'pigi)
const waveMat = new THREE.ShaderMaterial({
  uniforms: seaUniforms,
  vertexShader: `uniform float uTime; varying vec2 vW; varying float vH;
    void main(){ vec3 p = position; vH = uv.y;
      p.y += uv.y * (sin(p.x*0.7 + uTime*3.0)*0.5 + sin(p.x*1.9 - uTime*2.0)*0.25);
      p.z -= uv.y*uv.y*1.8 + sin(p.x*0.5 + uTime*2.0)*0.3*uv.y;
      vec4 wp = modelMatrix * vec4(p, 1.0); vW = vec2(wp.x, wp.y*1.5 + uTime*2.0); gl_Position = projectionMatrix * viewMatrix * wp; }`,
  fragmentShader: `uniform float uTime; varying vec2 vW; varying float vH; ${SEA_GLSL}
    void main(){ vec3 col = choco(vW * 0.04, uTime) * (0.95 + vH * 0.35);
      float crest = smoothstep(0.82, 0.92, vH + sin(vW.x * 1.7 + uTime * 2.0) * 0.03);
      col = mix(col, vec3(1.0, 0.95, 0.9), crest); gl_FragColor = vec4(col, 1.0); }`,
  side: THREE.DoubleSide,
});
const wave = new THREE.Mesh(new THREE.PlaneGeometry(70, 6, 70, 10), waveMat);
wave.position.y = 1.2;
const waveGroup = new THREE.Group(); waveGroup.add(wave); scene.add(waveGroup);

// Osmon: pastel gradient va paxta-qand bulutlar
const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, uniforms: seaUniforms,
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D uNoise; uniform float uTime; varying vec3 vP; void main(){ float h = vP.y;
    vec3 top = vec3(0.42, 0.74, 1.0), mid = vec3(0.74, 0.74, 1.0), hor = vec3(1.0, 0.8, 0.9);
    vec3 c = mix(hor, mid, smoothstep(-0.02, 0.22, h)); c = mix(c, top, smoothstep(0.22, 0.8, h));
    vec2 uv = vec2(atan(vP.x, vP.z) / 6.2831 * 3.0 + uTime * 0.004, h * 1.8);
    float cl = texture2D(uNoise, uv).r * 0.7 + texture2D(uNoise, uv * 2.7 + 0.3).g * 0.3;
    float m = smoothstep(0.5, 0.68, cl) * smoothstep(0.0, 0.06, h) * (1.0 - smoothstep(0.38, 0.7, h));
    vec3 cloud = mix(vec3(1.0, 0.78, 0.92), vec3(1.0, 0.98, 1.0), smoothstep(0.6, 0.85, cl));
    c = mix(c, cloud, m * 0.95);
    gl_FragColor = vec4(c, 1.0); }`,
}));
sky.renderOrder = -1;
scene.add(sky);

// ---------- Zarrachalar — obyekt havzasi bilan ----------
class Particles {
  constructor(n, blending, alpha = 1, soft = 1) {
    this.n = n; this.list = []; this.pool = [];
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 3); this.size = new Float32Array(n); this.alpha = new Float32Array(n);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 400 }, uAlpha: { value: alpha }, uSoft: { value: soft } }, transparent: true, depthWrite: false, blending,
      vertexShader: `uniform float uScale; attribute vec3 aColor; attribute float aSize, aAlpha; varying vec3 vC; varying float vA;
        void main(){ vC = aColor; vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uAlpha, uSoft; varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard;
        float a = mix(smoothstep(0.5, 0.42, d), smoothstep(0.5, 0.0, d), uSoft); gl_FragColor = vec4(vC, a * vA * uAlpha); }`,
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; scene.add(this.points);
  }
  add(x, y, z, vx, vy, vz, life, size, color, grav = 0, drag = 1, grow = 0) {
    if (this.list.length >= this.n) return;
    const p = this.pool.pop() || {}, c = colorOf(color);
    p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.life = p.max = life; p.size = size;
    p.r = c.r; p.g = c.g; p.b = c.b; p.grav = grav; p.drag = drag; p.grow = grow;
    this.list.push(p);
  }
  update(dt) {
    const list = this.list;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i]; p.life -= dt;
      if (p.life <= 0) { list[i] = list[list.length - 1]; list.pop(); this.pool.push(p); continue; }
      p.vy += p.grav * dt; const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; p.vz *= k;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.size += p.grow * dt;
    }
    const n = list.length;
    for (let i = 0; i < n; i++) {
      const p = list[i];
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      this.col[i * 3] = p.r; this.col[i * 3 + 1] = p.g; this.col[i * 3 + 2] = p.b;
      this.size[i] = p.size; this.alpha[i] = Math.min(1, (p.life / p.max) * 1.6);
    }
    const g = this.points.geometry, a = g.attributes;
    g.setDrawRange(0, n);
    a.position.needsUpdate = a.aColor.needsUpdate = a.aSize.needsUpdate = a.aAlpha.needsUpdate = true;
  }
}
const glow = new Particles(700, THREE.AdditiveBlending);            // yaltiroq uchqunlar
const candy = new Particles(1400, THREE.NormalBlending, 1, 0);      // rangli sepkilar, konfetti
const puff = new Particles(500, THREE.NormalBlending, 0.55);        // shakar changi, ko'pik
function burst(x, y, z, n, colors, spd, life = 0.6, size = 0.2, grav = -9) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), e = rand(-0.2, 1.2), v = rand(spd * 0.3, spd);
    candy.add(x, y, z, Math.cos(a) * Math.cos(e) * v, Math.sin(e) * v, Math.sin(a) * Math.cos(e) * v, rand(life * 0.6, life), size * rand(0.7, 1.3), Array.isArray(colors) ? colors[i % colors.length] : colors, grav, 1.5);
  }
}
function sparkle(x, y, z, n, spd = 3) {
  for (let i = 0; i < n; i++) { const a = rand(0, TAU), v = rand(spd * 0.3, spd); glow.add(x, y, z, Math.cos(a) * v, rand(0.5, 3), Math.sin(a) * v, rand(0.3, 0.6), rand(0.25, 0.45), 0xfff6c0, 0, 2); }
}

// ---------- Instancing: yuzlab bir xil obyekt bitta chaqiruvda chiziladi ----------
class InstSet {
  constructor(geo, mat, cap, outlineK = 0, parent = scene, colors = false) {
    this.cap = cap; this.k = outlineK; this.n = 0;
    const mk = m => { const im = new THREE.InstancedMesh(geo, m, cap); im.count = 0; im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); parent.add(im); return im; };
    this.body = mk(mat);
    this.out = outlineK ? mk(OUTLINE) : null;
    if (colors) for (let i = 0; i < cap; i++) this.body.setColorAt(i, _col.set(0xffffff));
  }
  reset() { this.setCount(0); }
  setCount(n) { this.n = n; this.body.count = n; if (this.out) this.out.count = n; }
  add() { if (this.n >= this.cap) return -1; const i = this.n; this.setCount(i + 1); return i; }
  set(i, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
    _v.set(x, y, z); _eu.set(rx, ry, rz); _q.setFromEuler(_eu); _sc.set(sx, sy, sz);
    this.body.setMatrixAt(i, _m4.compose(_v, _q, _sc));
    if (this.out) { _sc.multiplyScalar(this.k); this.out.setMatrixAt(i, _m4.compose(_v, _q, _sc)); }
    this.dirty = true;
  }
  hide(i) { this.set(i, 0, -100, 0, 0); }
  color(i, hex) { this.body.setColorAt(i, _col.set(hex)); this.body.instanceColor.needsUpdate = true; }
  commit() {
    if (!this.dirty) return;
    this.body.instanceMatrix.needsUpdate = true;
    if (this.out) this.out.instanceMatrix.needsUpdate = true;
    this.dirty = false;
  }
  dispose() { this.body.removeFromParent(); this.body.dispose(); if (this.out) { this.out.removeFromParent(); this.out.dispose(); } }
}

// ---------- Geometriyalar va materiallar ----------
const B = 0.7;           // ko'prik bloki o'lchami
const TRACK_W = 6.5;
const STEPS = 40, SD = 0.8, SH = 0.34;
const GEO = {
  leg: new THREE.CapsuleGeometry(0.11, 0.28, 4, 10),
  arm: new THREE.CapsuleGeometry(0.085, 0.26, 4, 10),
  body: new THREE.CapsuleGeometry(0.3, 0.32, 6, 14),
  head: new THREE.SphereGeometry(0.36, 22, 16),
  box: new THREE.BoxGeometry(1, 1, 1),
  rbox: roundedBox(0.16, 4),
  eye: new THREE.SphereGeometry(0.085, 12, 10),
  pupil: new THREE.SphereGeometry(0.05, 10, 8),
  smile: new THREE.TorusGeometry(0.06, 0.016, 6, 14, Math.PI),
  cone: new THREE.ConeGeometry(1, 1, 14),
  ball: new THREE.SphereGeometry(1, 18, 14),
  dome: new THREE.SphereGeometry(1, 16, 10, 0, TAU, 0, Math.PI / 2),
  crystal: new THREE.OctahedronGeometry(1, 0),
  coin: new THREE.CylinderGeometry(0.3, 0.3, 0.07, 22).rotateX(Math.PI / 2),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 18),
  cylOpen: new THREE.CylinderGeometry(1, 1, 1, 16, 1, true),
  lolli: new THREE.CylinderGeometry(1, 1, 0.22, 28).rotateX(Math.PI / 2),
  disc: new THREE.CircleGeometry(1, 24),
  torus: new THREE.TorusGeometry(1, 0.38, 10, 26),
};
const M = {
  white: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  black: new THREE.MeshBasicMaterial({ color: 0x2a0f30 }),
  jelly: jellify(glossy({ color: 0xffffff, roughness: 0.22 })),
  cakeSide: new THREE.MeshStandardMaterial({ map: CAKE_TEX, roughness: 0.75 }),
  wafer: new THREE.MeshStandardMaterial({ map: WAFER_TEX, bumpMap: WAFER_TEX, bumpScale: 2.5, roughness: 0.85 }),
  coinSide: glossy({ color: 0xffc83a, metalness: 1, roughness: 0.28 }),
  coinFace: glossy({ map: COIN_TEX, metalness: 0.6, roughness: 0.3 }),
  gem: jellify(glossy({ color: 0xff4fd8, roughness: 0.15 }), 0.45),
  tint: glossy({ color: 0xffffff, roughness: 0.4, clearcoat: 0.6 }),
  sugar: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.75, sheen: 1, sheenColor: 0xffffff, sheenRoughness: 0.4 }),
  lolli: glossy({ color: 0xffffff, emissive: 0xffffff, emissiveMap: SWIRL_EM, emissiveIntensity: 0.9 }),
  cane: glossy({ color: 0xffffff, map: STRIPE_TEX }),
  shadow: new THREE.MeshBasicMaterial({ color: 0x7a2a6a, transparent: true, opacity: 0.25, depthWrite: false }),
};
const jellyCache = new Map();
function jellyMat(hex) { if (!jellyCache.has(hex)) jellyCache.set(hex, jellify(glossy({ color: hex, roughness: 0.22 }))); return jellyCache.get(hex); }
const SETS = {
  block: new InstSet(GEO.rbox, M.jelly, 420, 1.1, scene, true),
  coin: new InstSet(GEO.coin, [M.coinSide, M.coinFace, M.coinFace], 160, 1.12),
  gem: new InstSet(GEO.crystal, M.gem, 40, 1.1),
  cell: new InstSet(GEO.rbox, M.jelly, 900, 1.05, scene, true),
  gumdrop: new InstSet(GEO.dome, M.sugar, 700, 1.1, scene, true),
  sprinkle: new InstSet(GEO.ball, M.tint, 260, 0, scene, true),
  stick: new InstSet(GEO.cyl, M.tint, 160, 1.12),
  lolli: new InstSet(GEO.lolli, M.lolli, 160, 1.05, scene, true),
  cane: new InstSet(GEO.cyl, M.cane, 160, 1.06),
  mound: new InstSet(GEO.dome, M.sugar, 160, 1.03, scene, true),
  stair: new InstSet(GEO.box, M.tint, STEPS, 1.03, scene, true),
};

// ---------- Qahramonlar ----------
// Animatsiyali 3D modellar (Quaternius "Ultimate Monsters", CC0)
const SKINS = [
  { name: 'Froggy', price: 0, model: 'Frog', css: ['#ffe14d', '#3a8a3a'] },
  { name: 'Birb', price: 300, model: 'Birb', css: ['#ff6b6b', '#3f7fff'] },
  { name: 'Dino', price: 700, model: 'Dino', css: ['#ffd23f', '#c2307a'] },
  { name: 'Yeti', price: 1500, model: 'Yeti', css: ['#7ad7ff', '#f4f4ff'] },
  { name: 'Mushy', price: 2500, model: 'MushroomKing', css: ['#ffd2b0', '#3fa7d6'] },
];
// Model yuklanmay qolsa (masalan, tarmoq xatosi), o'yin qahramonsiz qolmasligi uchun kod bilan yasalgan ayiqcha chiqadi
const FALLBACK_HERO = { main: 0xff5d6c, accent: 0xffb3bd };
const _bp = new THREE.Vector3();
const gltfLoader = new GLTFLoader();
const modelCache = new Map();
function loadModel(name) { if (!modelCache.has(name)) modelCache.set(name, gltfLoader.loadAsync('models/' + name + '.gltf')); return modelCache.get(name); }
// Skeletli (animatsiyali) modellar uchun kontur: har bir nuqta normal bo'ylab tashqariga suriladi
const OUTLINE_SKIN = new THREE.MeshBasicMaterial({ color: 0x3a1240, side: THREE.BackSide });
OUTLINE_SKIN.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <skinning_vertex>', '#include <skinning_vertex>\n  transformed += normalize(objectNormal) * 0.06;'); };
OUTLINE_SKIN.customProgramCacheKey = () => 'outlineSkin';
// Modelni o'yinga tayyorlaydi: o'lcham, yo'nalish, yaltiroq material va kontur
function prepModel(gltf) {
  const m = cloneSkinned(gltf.scene);
  const box = new THREE.Box3().setFromObject(m), s = 1.75 / (box.max.y - box.min.y);
  m.scale.setScalar(s); m.rotation.y = Math.PI; m.position.y = -box.min.y * s; // model +Z ga qaraydi, bizda yugurish -Z tomonga
  const skinned = [];
  m.traverse(o => {
    if (!o.isMesh) return;
    const src = o.material; // yaltiroq konfet ko'rinishi
    o.material = new THREE.MeshPhysicalMaterial({ map: src.map, color: src.color, roughness: 0.45, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.15,
      emissive: 0xffffff, emissiveMap: src.map, emissiveIntensity: 0.28 }); // ranglar yorqinroq va jonliroq ko'rinsin
    o.frustumCulled = false;
    if (o.isSkinnedMesh) skinned.push(o);
  });
  for (const o of skinned) {
    const ol = new THREE.SkinnedMesh(o.geometry, OUTLINE_SKIN);
    ol.bind(o.skeleton, o.bindMatrix); ol.position.copy(o.position); ol.quaternion.copy(o.quaternion); ol.scale.copy(o.scale); ol.frustumCulled = false;
    o.parent.add(ol);
  }
  return m;
}
function attachModel(h, gltf) {
  const m = prepModel(gltf);
  h.rig.add(m);
  h.model = m; h.mixer = new THREE.AnimationMixer(m); h.actions = {}; h.anim = null;
  h.spine = m.getObjectByName('Abdomen') || m.getObjectByName('Torso'); // marmelad minorasi shu suyakka ergashadi
  for (const c of gltf.animations) h.actions[c.name] = h.mixer.clipAction(c);
  playAnim(h, 'Idle', 0);
}
function playAnim(h, name, fade = 0.2, once = false) {
  if (!h.actions || h.anim === name || !h.actions[name]) return;
  const a = h.actions[name];
  a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = once;
  a.fadeIn(fade).play();
  if (h.anim && h.actions[h.anim]) h.actions[h.anim].fadeOut(fade);
  h.anim = name;
}
function part(geo, color, k = 1.08, em = 0, ei = 0) { return outlined(geo, toon(color, em, ei), k); }
function partMat(geo, mat, k = 1.08) { return outlined(geo, mat, k); }
function face(rig, y, z, spread = 0.13, blush = true) {
  rig.userData.eyes = rig.userData.eyes || [];
  for (const sx of [-1, 1]) {
    // ko'z: oq, qorachiq va yaltiroq nuqta (ko'z qisish uchun guruh bo'lib turadi)
    const eye = new THREE.Group(); eye.position.set(sx * spread, y, z);
    const e = new THREE.Mesh(GEO.eye, M.white); e.scale.z = 0.6;
    const p = new THREE.Mesh(GEO.pupil, M.black); p.position.z = -0.04;
    const hl = new THREE.Mesh(GEO.pupil, M.white); hl.scale.setScalar(0.38); hl.position.set(0.018, 0.022, -0.078);
    eye.add(e, p, hl); rig.add(eye); rig.userData.eyes.push(eye);
    if (blush) { const ch = new THREE.Mesh(GEO.ball, toon(0xff7aa8)); ch.scale.set(0.06, 0.04, 0.02); ch.position.set(sx * (spread + 0.09), y - 0.1, z + 0.01); rig.add(ch); }
  }
  const sm = new THREE.Mesh(GEO.smile, M.black); sm.rotation.z = Math.PI; sm.position.set(0, y - 0.1, z - 0.02); rig.add(sm);
}
function makeHero(id) {
  const S = SKINS[id], root = new THREE.Group(), rig = new THREE.Group();
  root.add(rig);
  const h = { id, root, rig, legs: [], arms: [], eyes: [], phase: 0, sway: 0, swayV: 0, topPop: 0, blink: rand(1, 3), hop: 0, greet: 0, mixer: null };
  // Orqadagi marmelad minorasi (instancing, har biri boshqa rangda)
  h.stack = new THREE.Group(); h.stack.position.set(0, 0.78, 0.55); rig.add(h.stack);
  h.stackSet = new InstSet(GEO.rbox, M.jelly, 22, 1.1, h.stack, true);
  for (let i = 0; i < 22; i++) h.stackSet.color(i, palette(i));
  h.shadow = new THREE.Mesh(GEO.disc, M.shadow); h.shadow.rotation.x = -Math.PI / 2; h.shadow.scale.setScalar(0.6); h.shadow.position.y = 0.02; root.add(h.shadow);
  // model fonda yuklanadi; yuklanmasa zaxira ayiqcha chiqadi
  loadModel(S.model).then(g => { if (hero === h) { attachModel(h, g); needWarm = true; } })
    .catch(() => { if (hero === h) { buildFallbackBear(h); needWarm = true; } });
  return h;
}
function buildFallbackBear(h) {
  const S = FALLBACK_HERO, rig = h.rig;
  h.stack.position.set(0, 0.6, 0.44);
  for (const sx of [-1, 1]) {
    const lp = new THREE.Group(); lp.position.set(sx * 0.14, 0.52, 0);
    const l = part(GEO.leg, S.main); l.position.y = -0.24; lp.add(l); rig.add(lp); h.legs.push(lp);
    const ap = new THREE.Group(); ap.position.set(sx * 0.37, 0.98, 0); ap.rotation.z = sx * 0.18;
    const a = part(GEO.arm, S.main); a.position.y = -0.2; ap.add(a); rig.add(ap); h.arms.push(ap);
  }
  const body = part(GEO.body, S.main, 1.08, S.main, 0.25); body.position.y = 0.86; rig.add(body);
  const belly = new THREE.Mesh(GEO.ball, toon(S.accent)); belly.scale.set(0.2, 0.24, 0.1); belly.position.set(0, 0.84, -0.24); rig.add(belly);
  const head = part(GEO.head, S.main, 1.08, S.main, 0.25); head.position.y = 1.42; rig.add(head);
  for (const sx of [-1, 1]) { const ear = part(GEO.ball, S.main, 1.12, S.main, 0.25); ear.scale.setScalar(0.13); ear.position.set(sx * 0.25, 1.72, 0.02); rig.add(ear); }
  const snout = new THREE.Mesh(GEO.ball, toon(S.accent)); snout.scale.set(0.14, 0.1, 0.08); snout.position.set(0, 1.35, -0.32); rig.add(snout);
  const nose = new THREE.Mesh(GEO.ball, M.black); nose.scale.set(0.05, 0.035, 0.03); nose.position.set(0, 1.39, -0.4); rig.add(nose);
  face(rig, 1.5, -0.3, 0.14, false);
  h.eyes = rig.userData.eyes || [];
}

// ---------- Holat ----------
let state = 'menu', paused = false, firstFrame = false, T = 0, last = 0;
let save = { level: 1, coins: 0, skin: 0, owned: [0], up: { start: 0, magnet: 0, lava: 0 }, tut: false };
let blocks = 0, runCoins = 0, s = 0, px = 0, py = 0, vy = 0, targetX = 0, prevX = 0, lavaS = -16, stun = 0, inv = 0, buildT = 0;
let finishS = 100, stairS = 110, step = 0, stepT = 0, endT = 0, mult = 1, stateT = 0, shake = 0, hintT = 0, dustT = 0, fireT = 3, cakeZ = -400, cellN = 0, giftWon = 0;
let hero = null;
const cam = { pos: new THREE.Vector3(0, 6, 10), look: new THREE.Vector3(0, 1, -6), tgt: new THREE.Vector3(), lk: new THREE.Vector3() };
const level = { plats: [], picks: [], obs: [], cells: new Map(), cellAnim: [], stairAnim: [], flying: [], lollis: [], group: new THREE.Group() };
scene.add(level.group);
// Urilganda uchib ketadigan marmeladlar uchun tayyor havza
const debris = [];
for (let i = 0; i < 12; i++) { const m = outlined(GEO.rbox, jellyMat(palette(i)), 1.1); m.scale.setScalar(0.34); m.visible = false; scene.add(m); debris.push({ mesh: m, on: false, vx: 0, vy: 0, vz: 0, vr: 0 }); }

const UP = {
  start: { max: 5, cost: l => Math.round(100 * Math.pow(1.8, l)), icon: '🍬', key: 'startBlocks' },
  magnet: { max: 5, cost: l => Math.round(150 * Math.pow(1.9, l)), icon: '🧲', key: 'magnet' },
  lava: { max: 6, cost: l => Math.round(200 * Math.pow(2, l)), icon: '🐢', key: 'lavaSlow' },
};

function setHero(id) {
  if (hero) { hero.stackSet.dispose(); if (hero.mixer) hero.mixer.stopAllAction(); scene.remove(hero.root); }
  hero = makeHero(id); scene.add(hero.root);
}

// ---------- Level generatori ----------
function clearLevel() {
  const g = level.group;
  g.traverse(o => {
    if (o.isMesh && o.userData.own) o.geometry.dispose();
    if (o.isMesh && o.userData.ownMat) o.material.dispose();
    if (o.isSprite && o.userData.own) { o.material.map.dispose(); o.material.dispose(); }
  });
  g.clear();
  level.plats.length = level.picks.length = level.obs.length = level.cellAnim.length = level.stairAnim.length = level.flying.length = level.lollis.length = 0;
  level.cells.clear(); cellN = 0; level.gift = null;
  for (const k in SETS) SETS[k].reset();
  for (const d of debris) { d.on = false; d.mesh.visible = false; }
}
function labelSprite(text, color) {
  const t = canvasTex(256, 128, (x) => {
    x.font = '900 86px system-ui, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineJoin = 'round'; x.lineWidth = 18; x.strokeStyle = '#3a1240'; x.strokeText(text, 128, 66); x.fillStyle = color; x.fillText(text, 128, 66);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  sp.scale.set(2, 1, 1); sp.userData.own = true; return sp;
}
function addPlatform(s0, len, cx, w) {
  level.plats.push({ s0, s1: s0 + len, cx, w });
  const sideGeo = new THREE.BoxGeometry(w, 3, len), suv = sideGeo.attributes.uv;
  // yon tomonlar: tekstura 3x3 birlikda takrorlanadi (±x yuzalari uzunlik bo'ylab, ±z kenglik bo'ylab)
  for (let i = 0; i < suv.count; i++) { const f = Math.floor(i / 4); suv.setX(i, suv.getX(i) * (f < 2 ? len : w) / 3); }
  const side = new THREE.Mesh(sideGeo, M.cakeSide); side.userData.own = true;
  side.position.set(cx, -1.62, -(s0 + len / 2));
  const topGeo = new THREE.BoxGeometry(w + 0.12, 0.3, len + 0.12), uv = topGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w + 0.12) / 3.2, uv.getY(i) * (len + 0.12) / 3.2); // vafli 3.2 birlik
  const top = new THREE.Mesh(topGeo, M.wafer); top.userData.own = true;
  top.position.set(cx, -0.15, -(s0 + len / 2));
  const edge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.34, len + 0.3), OUTLINE); edge.userData.own = true;
  edge.position.copy(top.position);
  level.group.add(side, edge, top);
  // chetlardagi marmelad tomchilar (gumdrop) va konfet donachalari
  for (let z = s0 + 1; z < s0 + len - 1; z += rand(1.4, 2.8)) {
    const sx = Math.random() < 0.5 ? -1 : 1, r = rand(0.18, 0.3), i = SETS.gumdrop.add();
    if (i >= 0) { SETS.gumdrop.set(i, cx + sx * (w / 2 - 0.12), 0, -z, r, r * 1.25, r); SETS.gumdrop.color(i, pickOne(PALETTE)); }
    if (Math.random() < 0.4) { const j = SETS.sprinkle.add(); if (j >= 0) { SETS.sprinkle.set(j, cx + sx * (w / 2 - 0.35), 0.08, -z - 0.5, 0.09); SETS.sprinkle.color(j, pickOne(PALETTE)); } }
  }
}
function genLevel(n) {
  clearLevel();
  const R = mulberry32(n * 7919 + 13), rr = (a, b) => a + R() * (b - a);
  let pos = 0;
  addPlatform(-30, 52, 0, TRACK_W); pos = 22;
  const segs = Math.min(4 + n, 16);
  const pick = (sp, x, kind) => {
    const idx = SETS[kind].add();
    if (idx < 0) return;
    if (kind === 'block') SETS.block.color(idx, palette(Math.floor(R() * 7)));
    const p = { s: sp, x, kind, idx, alive: true, ph: R() * 6 };
    level.picks.push(p); placePick(p);
  };
  let prevExit = 0; // oldingi bo'lak tugagan joyning x koordinatasi
  for (let i = 0; i < segs; i++) {
    const gap = rr(2.8, 3.4 + Math.min(n, 12) * 0.33);
    const narrow = n >= 3 && R() < 0.28;
    // tor yo'lak: ikki bo'lak, ikkinchisi yonga surilgan; ular orasidan o'tishda ham marmelad sarflanadi.
    // Birinchi bo'lak oldingi yo'l tugagan joy yaqinidan boshlanadi (jarlikni qiyshiq kesib o'tishga majburlamasin)
    const a = narrow ? clamp(prevExit + rr(-1, 1), -1.9, 1.9) : 0, b = narrow ? clamp(a + (R() < 0.5 ? -1 : 1) * rr(1.6, 3), -2, 2) : 0;
    const shift = narrow ? Math.ceil(Math.max(0, Math.abs(a - b) - 1.2) / B) * 2 + 3 : 0;
    // keyingi jarlik uchun kerakli marmelad va oz zaxira:
    // 1-2 levelda yengilroq, keyin har jarlikka 0-1 ta ortiqcha, ba'zan 3 talik bonus qator
    const need = Math.ceil(gap / B) + 1 + shift;
    // to'siq bo'ladigan platformada urilganda yo'qotiladigan marmelad uchun qo'shimcha zaxira
    const hasObs = !narrow && n >= 2 && R() < 0.4 + n * 0.03;
    let count = need + (n <= 2 ? 2 : 0) + Math.floor(R() * 2) + (R() < 0.25 ? 3 : 0) + (hasObs ? 2 : 0);
    // platforma barcha marmeladlar (va to'siq atrofidagi bo'sh joy) sig'adigan uzunlikda bo'ladi
    const len = Math.max(rr(15, 21), 4.5 + count * 0.95 + Math.ceil(count / 4) * 1.6 + (hasObs ? 3 : 0));
    const obsAt = pos + len * rr(0.35, 0.8);
    let lanes;
    if (!narrow) { addPlatform(pos, len, 0, TRACK_W); lanes = [[pos, pos + len, 0, TRACK_W]]; }
    else {
      addPlatform(pos, len / 2, a, 2.3); addPlatform(pos + len / 2, len / 2, b, 2.3);
      lanes = [[pos, pos + len / 2, a, 2.3], [pos + len / 2, pos + len, b, 2.3]];
    }
    let sp = pos + 2.5;
    while (count > 0 && sp < pos + len - 1.5) {
      if (hasObs && Math.abs(sp - obsAt) < 1.5) { sp = obsAt + 1.6; continue; } // to'siq ustiga marmelad qo'yilmaydi (1.6: kasr xatosi bilan cheksiz sikl bo'lmasin)
      const ln = lanes.find(l => sp >= l[0] && sp < l[1]) || lanes[0];
      const run = Math.min(count, 4 + Math.floor(R() * 4));
      const x0 = ln[2] + rr(-ln[3] / 2 + 0.6, ln[3] / 2 - 0.6), zig = !narrow && R() < 0.35;
      for (let k = 0; k < run && sp < pos + len - 1 && !(hasObs && Math.abs(sp - obsAt) < 1.5); k++, sp += 0.95) { pick(sp, zig ? clamp(x0 + Math.sin(k * 0.9) * 1.6, -2.6, 2.6) : x0, 'block'); count--; }
      sp += rr(0.8, 1.6);
    }
    if (!narrow && R() < 0.12 + n * 0.01) pick(pos + len - 1.2, rr(-2, 2), 'gem');
    if (!narrow && R() < 0.55) { const cx = rr(-2.4, 2.4), c0 = pos + rr(2, len - 6); for (let k = 0; k < 5; k++) pick(c0 + k * 0.9, cx, 'coin'); }
    // to'siqlar
    if (hasObs) {
      const r = R(), at = obsAt;
      if (r < 0.4 || n < 4) addObstacle({ type: 'boulder', s: at, amp: rr(1.6, 2.5), spd: rr(1.1, 1.8 + n * 0.04), ph: R() * 6, col: palette(Math.floor(R() * 7)) });
      else if (r < 0.75) { addObstacle({ type: 'geyser', s: at, x: rr(-2, 2), period: 2.6, ph: R() * 2.6 }); if (n >= 6) addObstacle({ type: 'geyser', s: at + 3, x: rr(-2, 2), period: 2.6, ph: R() * 2.6 }); }
      else addObstacle({ type: 'wall', s: at, gx: rr(-1.8, 1.8), gw: 2.4 });
    }
    prevExit = narrow ? b : 0;
    pos += len + gap;
  }
  addPlatform(pos, 14, 0, TRACK_W);
  finishS = pos + 9; stairS = pos + 14;
  buildFinish(); buildStairs(); buildScenery(pos);
  for (const k in SETS) SETS[k].commit();
}
function placePick(p) {
  const set = SETS[p.kind], y = 0.55 + Math.sin(T * 3 + p.ph) * 0.12, ry = T * 2.2 + p.ph;
  // marmelad joyida jele kabi silkinib turadi
  if (p.kind === 'block') { const w = Math.sin(T * 7 + p.ph) * 0.08; set.set(p.idx, p.x, y, -p.s, 0.44 * (1 + w), 0.44 * (1 - w), 0.44 * (1 + w), 0.3, ry, 0.2); }
  else if (p.kind === 'coin') set.set(p.idx, p.x, y, -p.s, 1, 1, 1, 0, ry * 1.4, 0);
  else set.set(p.idx, p.x, y + 0.1, -p.s, 0.38, 0.55, 0.38, 0, ry, 0);
}
function addObstacle(o) {
  o.hit = false;
  if (o.type === 'boulder') {
    // Yumalayotgan ulkan saqich
    o.mesh = new THREE.Group();
    const b = outlined(GEO.ball, toon(o.col, o.col, 0.15), 1.06); b.scale.setScalar(0.72); o.mesh.add(b); o.ball = b;
    const shine = new THREE.Mesh(GEO.ball, M.white); shine.scale.set(0.12, 0.08, 0.05); shine.position.set(-0.3, 0.42, -0.5); o.mesh.add(shine);
    o.mesh.position.set(0, 0.72, -o.s);
  } else if (o.type === 'geyser') {
    // Gazli ichimlik favvorasi: pechenye qopqoq, ko'pikli ustun
    o.mesh = new THREE.Group();
    const cap = part(GEO.cyl, 0xd99a55, 1.08); cap.scale.set(0.6, 0.12, 0.6); cap.position.y = 0.06;
    const vent = new THREE.Mesh(GEO.disc, glossy({ color: 0xff5fb4, emissive: 0xff5fb4, emissiveIntensity: 0.2 })); vent.rotation.x = -Math.PI / 2; vent.scale.setScalar(0.4); vent.position.y = 0.13; o.vent = vent;
    const foam = new THREE.Mesh(GEO.cylOpen, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, emissive: 0xffd6ec, emissiveIntensity: 0.35, transparent: true, opacity: 0.92 })); foam.scale.set(0.42, 0.01, 0.42); o.fire = foam;
    const core = new THREE.Mesh(GEO.cylOpen, glossy({ color: 0xff8fc8, emissive: 0xff8fc8, emissiveIntensity: 0.3 })); core.scale.set(0.24, 0.01, 0.24); o.core = core;
    vent.userData.ownMat = foam.userData.ownMat = core.userData.ownMat = true;
    o.mesh.add(cap, vent, foam, core); o.mesh.position.set(o.x, 0, -o.s);
  } else {
    // Shokolad plitka devor, ustida konfet-makkajo'xori tikanlar
    o.mesh = new THREE.Group();
    const half = TRACK_W / 2, chocoMat = glossy({ map: CHOCO_TEX, bumpMap: CHOCO_TEX, bumpScale: 2, roughness: 0.35, clearcoat: 0.6 });
    chocoMat.userData = {};
    for (const [a, b] of [[-half, o.gx - o.gw / 2], [o.gx + o.gw / 2, half]]) {
      if (b - a < 0.2) continue;
      const w = partMat(GEO.box, chocoMat, 1.04); w.scale.set(b - a, 0.9, 0.6); w.position.set((a + b) / 2, 0.45, 0); o.mesh.add(w);
      for (let x = a + 0.4; x < b - 0.2; x += 0.8) {
        const sp = part(GEO.cone, 0xffb02c, 1.1); sp.scale.set(0.16, 0.4, 0.16); sp.position.set(x, 1.05, 0); o.mesh.add(sp);
        const tip = new THREE.Mesh(GEO.cone, toon(0xffffff)); tip.scale.set(0.07, 0.14, 0.07); tip.position.set(x, 1.22, 0); o.mesh.add(tip);
      }
    }
    o.mesh.traverse(m => { if (m.isMesh && m.material === chocoMat) m.userData.ownMat = true; });
    o.mesh.position.set(0, 0, -o.s);
  }
  level.group.add(o.mesh); level.obs.push(o);
}
let BANNER = null;
function buildFinish() {
  // Konfet tayoqchalardan marra darvozasi
  const g = new THREE.Group(); g.position.set(0, 0, -finishS);
  for (const sx of [-1, 1]) {
    const p = partMat(GEO.cyl, M.cane, 1.06); p.scale.set(0.22, 3.6, 0.22); p.position.set(sx * 3.2, 1.8, 0); g.add(p);
    const knob = part(GEO.ball, palette(sx > 0 ? 0 : 3), 1.1); knob.scale.setScalar(0.32); knob.position.set(sx * 3.2, 3.75, 0); g.add(knob);
  }
  if (!BANNER) BANNER = canvasTex(256, 32, (x) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#ff3f8e' : '#ffffff'; x.fillRect(i * 16, j * 16, 16, 16); } });
  const bar = new THREE.Mesh(GEO.box, new THREE.MeshBasicMaterial({ map: BANNER })); bar.userData.ownMat = true; bar.scale.set(6.8, 0.5, 0.3); bar.position.y = 3.4; g.add(bar);
  level.group.add(g);
}
function buildStairs() {
  for (let k = 0; k < STEPS; k++) {
    const i = SETS.stair.add();
    SETS.stair.color(i, new THREE.Color().setHSL((0.92 + (k / STEPS) * 0.8) % 1, 0.9, 0.62).getHex());
    SETS.stair.hide(i);
    if ((k + 1) % 4 === 0) {
      const h = (k + 1) * SH, lb = labelSprite('x' + stairMult(k), '#ffffff');
      lb.position.set(2.6, h + 0.9, -(stairS + k * SD + SD / 2)); lb.scale.set(1.6, 0.8, 1); level.group.add(lb);
    }
  }
  // Zinapoya tepasida sovg'a qutisi: cho'qqiga (x11) yetganda qopqog'i uchib ochiladi va tanga beradi
  const gift = new THREE.Group(), lid = new THREE.Group();
  const box = part(GEO.box, 0xff5fb4, 1.05); box.scale.set(1.2, 0.85, 1.2); box.position.y = 0.425;
  const rib1 = new THREE.Mesh(GEO.box, toon(0xffe94a)); rib1.scale.set(0.22, 0.87, 1.22); rib1.position.y = 0.425;
  const rib2 = new THREE.Mesh(GEO.box, toon(0xffe94a)); rib2.scale.set(1.22, 0.87, 0.22); rib2.position.y = 0.425;
  const cap = part(GEO.box, 0xff3f9e, 1.05); cap.scale.set(1.34, 0.26, 1.34);
  const rib3 = new THREE.Mesh(GEO.box, toon(0xffe94a)); rib3.scale.set(0.24, 0.28, 1.36);
  const rib4 = new THREE.Mesh(GEO.box, toon(0xffe94a)); rib4.scale.set(1.36, 0.28, 0.24);
  lid.add(cap, rib3, rib4);
  for (const sx of [-1, 1]) { const bow = part(GEO.torus, 0xffe94a, 1.08); bow.scale.set(0.22, 0.22, 0.4); bow.rotation.set(0, sx * 0.6, Math.PI / 2); bow.position.set(sx * 0.2, 0.3, 0); lid.add(bow); }
  lid.position.y = 0.98;
  gift.add(box, rib1, rib2, lid);
  gift.position.set(0, STEPS * SH, -(stairS + STEPS * SD + 0.8));
  level.group.add(gift);
  // qutining tepasida qancha tanga berishi yozib qo'yiladi
  const label = coinLabel('+' + giftCoins());
  label.position.set(0, STEPS * SH + 2.6, -(stairS + STEPS * SD + 0.8)); label.scale.set(2.4, 1.2, 1);
  level.group.add(label);
  level.gift = { group: gift, lid, label, t: -1 };
}
const giftCoins = () => 50 + save.level * 10;
function coinLabel(text) {
  const t = canvasTex(256, 128, (x) => {
    x.fillStyle = '#3a1240'; x.beginPath(); x.arc(64, 64, 40, 0, TAU); x.fill();
    const g = x.createRadialGradient(52, 50, 4, 64, 64, 34); g.addColorStop(0, '#fff6b8'); g.addColorStop(0.6, '#ffcf3a'); g.addColorStop(1, '#d99a0a');
    x.fillStyle = g; x.beginPath(); x.arc(64, 64, 32, 0, TAU); x.fill();
    x.font = '900 64px system-ui, Arial, sans-serif'; x.textAlign = 'left'; x.textBaseline = 'middle';
    x.lineJoin = 'round'; x.lineWidth = 16; x.strokeStyle = '#3a1240'; x.strokeText(text, 110, 68); x.fillStyle = '#ffe066'; x.fillText(text, 110, 68);
  });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  sp.userData.own = true; return sp;
}
function openGift() {
  const g = level.gift;
  if (!g || g.t >= 0) return;
  g.t = 0; giftWon = giftCoins();
  const gp = g.group.position;
  burst(gp.x, gp.y + 1, gp.z, 70, PALETTE, 8, 1.6, 0.22, -7);
  for (let i = 0; i < 26; i++) glow.add(gp.x, gp.y + 1, gp.z, rand(-3, 3), rand(5, 10), rand(-3, 3), rand(1, 1.6), 0.4, 0xffd23f, -12, 0.4);
  sparkle(gp.x, gp.y + 1.2, gp.z, 20, 5);
  toast('+' + giftWon); Snd.win();
}
function setStair(k, pop) {
  const h = (k + 1) * SH, sy = h * (0.3 + 0.7 * pop);
  SETS.stair.set(k, 0, sy / 2 - 0.02, -(stairS + k * SD + SD / 2), 3.4, sy, SD);
}
const stairMult = k => 1 + (k + 1) * 0.25;
function buildScenery(endPos) {
  // sharbat ichidan chiqib turgan ulkan lolipoplar, konfet tayoqchalar va marmelad tepaliklar
  for (let z = -20; z < endPos + 60; z += rand(4, 8)) {
    for (const sx of [-1, 1]) {
      if (Math.random() < 0.3) continue;
      const x = sx * rand(7, 22), r = Math.random();
      if (r < 0.4) {
        const h = rand(3, 8), rad = rand(1.2, 2.4), i = SETS.stick.add(), j = SETS.lolli.add();
        if (i >= 0) SETS.stick.set(i, x, -1 + h / 2, -z, 0.14, h, 0.14);
        if (j >= 0) {
          const l = { idx: j, x, y: -1 + h + rad * 0.8, z: -z, r: rad, ry: sx * rand(0.2, 0.6), rz: rand(0, TAU), spin: rand(0.3, 0.9) * (Math.random() < 0.5 ? -1 : 1) };
          SETS.lolli.set(j, l.x, l.y, l.z, rad, rad, rad, 0, l.ry, l.rz); SETS.lolli.color(j, pickOne(PALETTE)); level.lollis.push(l);
        }
      } else if (r < 0.65) {
        const h = rand(3, 9), i = SETS.cane.add();
        if (i >= 0) SETS.cane.set(i, x, -1 + h / 2, -z, 0.45, h, 0.45, rand(-0.12, 0.12), rand(0, 3), rand(-0.12, 0.12));
      } else {
        const rad = rand(1.5, 4), i = SETS.mound.add();
        if (i >= 0) { SETS.mound.set(i, x, -1.1, -z, rad, rad * rand(0.8, 1.3), rad); SETS.mound.color(i, pickOne(PALETTE)); }
      }
    }
  }
  // Uzoqdagi ulkan tort (o'yinning maqsadi), tepasida shamlar
  cakeZ = -(stairS + STEPS * SD + 175);
  const cake = new THREE.Group();
  [[70, 30, 0xff9ad0], [52, 26, 0xfff4fa], [34, 22, 0x8a4a2a]].reduce((y, [r, h, c]) => {
    const tier = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 40), toon(c, 0, 0, false)); tier.userData.own = true; tier.position.y = y + h / 2;
    const ol = new THREE.Mesh(tier.geometry, OUTLINE_NOFOG); ol.scale.set(1.015, 1.01, 1.015); ol.position.copy(tier.position);
    const drip = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.6, r + 0.6, 3, 40), toon(0xffffff, 0, 0, false)); drip.userData.own = true; drip.position.y = y + h - 1.5;
    cake.add(ol, tier, drip);
    return y + h;
  }, -2);
  const cherry = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 16), toon(0xff2d55, 0xff2d55, 0.3, false)); cherry.userData.own = true; cherry.position.y = 85; cake.add(cherry);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU, cx = Math.cos(a) * 24, cz = Math.sin(a) * 24;
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 12, 12), toon(palette(i), 0, 0, false)); candle.userData.own = true; candle.position.set(cx, 82, cz); cake.add(candle);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, color: 0xffd060, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); flame.scale.set(7, 10, 1); flame.position.set(cx, 91, cz); cake.add(flame);
  }
  cake.position.set(0, -1, cakeZ); cake.scale.setScalar(0.55);
  level.group.add(cake);
}

// ---------- Run (o'yin) ----------
function resetRun() {
  genLevel(save.level);
  blocks = save.up.start * 2; runCoins = 0; s = 0; px = 0; py = 0; vy = 0; targetX = 0; prevX = 0;
  lavaS = -16; stun = 0; inv = 0; buildT = 0; step = 0; stepT = 0; endT = 0; mult = 1; giftWon = 0;
  hero.root.position.set(0, 0, 0); hero.root.scale.setScalar(1); hero.root.visible = true; hero.rig.rotation.set(0, 0, 0); hero.root.userData.splashed = false;
  waveGroup.position.z = -lavaS;
  // shaderlarni oldindan kompilyatsiya qilish (o'yin paytida qotmasligi uchun)
  try { renderer.compile(scene, camera); } catch (e) {}
  needWarm = true;
}
// Butun levelni tepadan bir marta "isitib" chizish: Windows (ANGLE/D3D) har bir obyekt turini birinchi
// chizishda qo'shimcha kompilyatsiya qiladi. Buni menyuda bajarib qo'ysak, o'yin paytida qotish bo'lmaydi.
const warmCam = new THREE.OrthographicCamera(-40, 40, 40, -40, 1, 1200);
let needWarm = false;
function warmUp() {
  const far = -(cakeZ) + 80, mid = -far / 2 + 30;
  warmCam.left = -45; warmCam.right = 45; warmCam.top = far / 2 + 40; warmCam.bottom = -(far / 2 + 40);
  warmCam.position.set(0, 300, mid); warmCam.up.set(0, 0, -1); warmCam.lookAt(0, 0, mid); warmCam.updateProjectionMatrix();
  const hidden = [];
  scene.traverse(o => { if (!o.visible && o !== hero.root) { hidden.push(o); o.visible = true; } });
  renderer.render(scene, warmCam);
  for (const o of hidden) o.visible = false;
}
function startRun() {
  state = 'intro'; stateT = 0;
  showScreen(null); $('hud').classList.remove('off');
  $('lvl').textContent = L.level + ' ' + save.level;
  hintT = save.tut ? 0 : 4; $('hint').style.opacity = hintT > 0 ? 1 : 0;
  if (!save.tut) { save.tut = true; persist(); }
  Snd.whoosh();
}
function onSolid(x, sp) {
  for (const p of level.plats) if (sp >= p.s0 && sp <= p.s1 && Math.abs(x - p.cx) <= p.w / 2 + 0.12) return true;
  return level.cells.has(Math.round(x / B) + ',' + Math.floor(sp / B));
}
function placeCell(x, sp) {
  const ix = Math.round(x / B), is = Math.floor(sp / B), key = ix + ',' + is;
  if (level.cells.has(key)) return;
  const idx = SETS.cell.add();
  const c = { idx, x: ix * B, z: -(is + 0.5) * B, drop: 0 };
  level.cells.set(key, c);
  if (idx >= 0) { level.cellAnim.push(c); SETS.cell.color(idx, palette(cellN++)); SETS.cell.set(idx, c.x, -B / 2 + 0.6, c.z, B * 0.96); }
  blocks--; buildT = 0.15;
  Snd.place();
  sparkle(c.x, 0.1, c.z, 2, 1.5);
}
function hitObstacle() {
  if (inv > 0) return;
  const lose = Math.min(blocks, 3); // urilganda 3 ta marmelad tushib qoladi
  blocks -= lose; stun = 0.5; inv = 1.3; shake = 0.5;
  let k = 0;
  for (const d of debris) {
    if (k >= lose) break;
    if (d.on) continue;
    d.on = true; d.mesh.visible = true; d.mesh.position.set(px, 1 + k * 0.3, -s + 0.4);
    d.vx = rand(-4, 4); d.vy = rand(3, 7); d.vz = rand(-1, 3); d.vr = rand(-8, 8); k++;
  }
  burst(px, 1, -s, 22, PALETTE, 6, 0.6, 0.18);
  sparkle(px, 1.2, -s, 8);
  Snd.hit();
}
let lastDeath = 'fall';
function die(kind) {
  lastDeath = kind;
  state = kind; stateT = 0; vy = kind === 'fall' ? 0 : 6;
  Snd.rumble(0);
}
function winLevel() {
  state = 'win'; stateT = 0;
  // x11 dan keyin ortib qolgan har bir marmelad bonus tanga beradi
  const base = 10 + save.level * 2, bonus = blocks * 2, earned = Math.round(base * mult) + runCoins + bonus + giftWon;
  $('winBonus').textContent = [giftWon ? `🎁 ${L.gift} +${giftWon}` : '', bonus > 0 ? `${L.bonus} +${bonus}` : ''].filter(Boolean).join(' · ');
  save.coins += earned; save.level++;
  persist();
  yt(y => y.engagement.sendScore({ value: save.level - 1 }));
  $('winMult').textContent = 'x' + mult; countUp($('winCoins'), earned);
  $('hud').classList.add('off'); showScreen('win');
  Snd.win(); Snd.rumble(0);
  burst(px, py + 1.5, -s, 90, PALETTE, 10, 2, 0.22, -6);
  sparkle(px, py + 1.5, -s, 20, 5);
}
function loseLevel() {
  state = 'lose'; stateT = 0;
  $('loseTitle').textContent = lastDeath === 'fall' ? L.fell : L.caught;
  $('hud').classList.add('off'); showScreen('lose');
  requestAnimationFrame(() => { $('loseMeter').style.width = Math.round(clamp(s / finishS, 0, 1) * 100) + '%'; });
  Snd.lose();
}

function update(dt) {
  T += dt; stateT += dt;
  seaUniforms.uTime.value = T;
  shake = Math.max(0, shake - dt * 1.6);
  animateHero(dt);

  if (state === 'intro' && stateT > 0.7) state = 'play';
  if (state === 'play') {
    if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').style.opacity = 0; }
    stun = Math.max(0, stun - dt); inv = Math.max(0, inv - dt); buildT = Math.max(0, buildT - dt);
    const base = 7.2 + Math.min(save.level, 15) * 0.08;
    const runSpeed = base * (stun > 0 ? 0.3 : 1) * (buildT > 0 ? 0.86 : 1);
    s += runSpeed * dt;
    prevX = px; px = damp(px, targetX, 12, dt);
    // tayanch tekshiruvi: tagida yer yo'q bo'lsa, marmelad qo'yiladi
    if (!onSolid(px, s)) { if (blocks > 0) placeCell(px, s); else die('fall'); }
    // shokolad to'lqini
    let chocoSpeed = base * (0.9 + Math.min(save.level, 10) * 0.004 - 0.03 * save.up.lava);
    if (s - lavaS > 14 - Math.min(save.level, 10) * 0.3) chocoSpeed *= 1.3;
    lavaS += chocoSpeed * dt;
    if (state === 'play' && lavaS >= s - 0.4) die('caught');
    collectAndCollide();
    if (s >= finishS && state === 'play') { state = 'stairs'; stateT = 0; targetX = 0; burst(0, 3, -finishS, 60, PALETTE, 9, 1.4, 0.22, -6); Snd.pop(); }
    // oyoq ostidan shakar changi
    dustT -= dt;
    if (dustT <= 0 && state === 'play' && py > -0.1) { dustT = 0.06; puff.add(px + rand(-0.15, 0.15), 0.08, -s + 0.25, rand(-0.4, 0.4), rand(0.3, 0.8), rand(0.5, 1.2), 0.5, 0.35, 0xfff0f6, 0, 2, 1.4); }
  } else if (state === 'stairs') {
    prevX = px; px = damp(px, 0, 6, dt);
    lavaS += 3 * dt;
    stepT -= dt;
    const atStairs = s >= stairS - 0.3;
    if (!atStairs) s = Math.min(stairS, s + 7 * dt); // zinapoyagacha yugurib boradi
    else if (endT === 0 && stepT <= 0) {
      if (blocks > 0 && step < STEPS) {
        blocks--; level.stairAnim.push({ k: step, pop: 0 }); setStair(step, 0); step++; stepT = 0.09;
        mult = stairMult(step - 1); Snd.step(step);
        if (step % 4 === 0 && step < STEPS) { toast('x' + mult); sparkle(1.7, step * SH + 0.5, -(stairS + step * SD), 6); }
      } else { endT = 0.001; if (step >= STEPS) openGift(); }
    }
    if (step > 0) s = damp(s, stairS + (step - 0.5) * SD, 10, dt);
    py = damp(py, step > 0 ? step * SH : 0, 12, dt);
    if (endT > 0) { endT += dt; if (endT > (giftWon ? 1.9 : 1.1)) winLevel(); } // sovg'a ochilganini ko'rishga vaqt
  } else if (state === 'fall') {
    vy -= 28 * dt; py += vy * dt; s += 3 * dt;
    if (py < -1 && !hero.root.userData.splashed) {
      hero.root.userData.splashed = true; hero.root.visible = false;
      burst(px, -0.8, -s, 60, [0xff6fae, 0xffffff, 0xff9ad0], 8, 1, 0.26, -14);
      for (let i = 0; i < 10; i++) puff.add(px + rand(-0.5, 0.5), -0.6, -s, rand(-0.6, 0.6), rand(1, 2), rand(-0.6, 0.6), rand(0.8, 1.4), 0.6, 0xffc4e1, 0, 0.5, 1.2);
      Snd.splash(); shake = 0.6;
    }
    if (stateT > 1.4) loseLevel();
  } else if (state === 'caught') {
    lavaS += 6 * dt; py = damp(py, 2.5, 3, dt); hero.root.scale.setScalar(Math.max(0.01, 1 - stateT * 0.9));
    if (Math.random() < 0.7) candy.add(px + rand(-0.4, 0.4), py + rand(0, 1.5), -s, rand(-2, 2), rand(1, 4), rand(-1, 1), 0.7, 0.25, pickOne([0x5a2d14, 0x8a4a24, 0xfff1e6]), -8, 1);
    if (stateT > 1.3) { hero.root.visible = false; loseLevel(); }
  } else if (state === 'menu' || state === 'shop') {
    lavaS = damp(lavaS, -16, 2, dt);
  }

  // Sahna obyektlari
  hero.root.position.set(px, py, -s);
  waveGroup.position.set(0, 0, -lavaS);
  sea.position.set(0, -1.1, -s - 40);
  sky.position.set(0, 0, -s);
  sun.position.set(-6, 14, -s + 4); sun.target.position.set(0, 0, -s - 6);
  // faqat kamera yaqinidagi buyumlar aylanadi (qolganlari harakatsiz turadi)
  for (const p of level.picks) if (p.alive && p.s > s - 4 && p.s < s + 70) placePick(p);
  for (let i = level.flying.length - 1; i >= 0; i--) {
    const p = level.flying[i], set = SETS[p.kind];
    p.fly = Math.min(1, p.fly + dt / (p.kind === 'coin' ? 0.3 : 0.2));
    const t = p.fly, e = t * t;
    if (p.kind === 'coin') { const sc = (1 + Math.sin(t * Math.PI) * 0.5) * (1 - e * 0.9); set.set(p.idx, p.x, p.fy + t * 1.6, -p.s, sc, sc, sc, 0, T * 20, 0); }
    else {
      const tx = px, ty = py + 0.62 + Math.min(blocks, 10) * 0.34, tz = -s + 0.44, sc = lerp(p.kind === 'gem' ? 0.5 : 0.44, 0.34, t);
      set.set(p.idx, lerp(p.x, tx, e), lerp(p.fy, ty, e) + Math.sin(t * Math.PI) * 0.9, lerp(-p.s, tz, e), sc, sc, sc, t * 6, t * 4, 0);
    }
    if (t >= 1) { set.hide(p.idx); level.flying.splice(i, 1); if (p.kind !== 'coin') hero.topPop = 1; }
  }
  // sovg'a qutisi: yozuv tebranib turadi; ochilganda qopqoq aylanib uchadi, quti sakraydi va tangalar otiladi
  const gf = level.gift;
  if (gf) {
    gf.label.position.y = STEPS * SH + 2.6 + Math.sin(T * 3) * 0.15;
    if (gf.t >= 0) {
      gf.t += dt; const t = gf.t;
      gf.lid.position.set(t * 1.6, 0.98 + t * 5 - t * t * 4.5, t * 0.6); gf.lid.rotation.set(t * 3, 0, -t * 7);
      const sq = 1 + Math.sin(Math.min(t * 8, Math.PI)) * 0.2; gf.group.scale.set(sq, 1 / sq, sq);
      gf.label.visible = t < 0.3;
      if (t < 1.2 && Math.random() < 0.6) { const gp = gf.group.position; candy.add(gp.x + rand(-0.4, 0.4), gp.y + 0.9, gp.z + rand(-0.4, 0.4), rand(-2, 2), rand(5, 9), rand(-2, 2), 1.4, 0.24, pickOne(PALETTE), -12, 0.5); }
    }
  }
  // dengizdagi lolipoplar sekin aylanadi
  for (const l of level.lollis) if (l.z < -s + 20 && l.z > -s - 130) { l.rz += l.spin * dt; SETS.lolli.set(l.idx, l.x, l.y, l.z, l.r, l.r, l.r, 0, l.ry, l.rz); }
  for (const o of level.obs) if (o.s > s - 6 && o.s < s + 80) animateObstacle(o);
  for (let i = level.stairAnim.length - 1; i >= 0; i--) {
    const a = level.stairAnim[i]; a.pop = Math.min(1, a.pop + dt * 6); setStair(a.k, a.pop);
    if (a.pop >= 1) level.stairAnim.splice(i, 1);
  }
  for (let i = level.cellAnim.length - 1; i >= 0; i--) {
    const c = level.cellAnim[i]; c.drop = Math.min(1, c.drop + dt * 7);
    const sq = 1 + Math.sin(c.drop * Math.PI) * 0.18; // jele kabi lapanglaydi
    SETS.cell.set(c.idx, c.x, -B / 2 + 0.6 * (1 - c.drop), c.z, B * 0.96 * sq, B * 0.96 / sq, B * 0.96 * sq);
    if (c.drop >= 1) level.cellAnim.splice(i, 1);
  }
  for (const d of debris) {
    if (!d.on) continue;
    const m = d.mesh; d.vy -= 20 * dt; m.position.x += d.vx * dt; m.position.y += d.vy * dt; m.position.z += d.vz * dt; m.rotation.x += d.vr * dt; m.rotation.z += d.vr * dt;
    if (m.position.y < -1.2) { burst(m.position.x, -0.9, m.position.z, 6, [0xff6fae, 0xffffff], 3, 0.5, 0.18); d.on = false; m.visible = false; }
  }
  for (const k in SETS) SETS[k].commit();
  // atrof-muhit: havoda suzayotgan rangli sepkilar, yaltiroq yulduzchalar, tort ustidagi mushaklar
  if (Math.random() < 0.6) candy.add(rand(-14, 14), rand(0.5, 7), -s - rand(-4, 40), rand(-0.3, 0.3), rand(-0.4, 0.4), rand(-0.3, 0.3), rand(2, 3.5), rand(0.1, 0.16), pickOne(PALETTE), 0, 0.2);
  if (Math.random() < 0.25) glow.add(rand(-16, 16), -0.95, -s - rand(-6, 40), 0, rand(0.2, 0.6), 0, rand(0.5, 1), rand(0.2, 0.35), 0xffffff, 0, 0.5);
  fireT -= dt;
  if (fireT <= 0) {
    fireT = rand(1.5, 3.5);
    const fx = rand(-40, 40), fy = rand(62, 92), col = pickOne(PALETTE);
    for (let i = 0; i < 34; i++) { const a = rand(0, TAU), e = rand(-1.2, 1.2), v = rand(10, 16); glow.add(fx, fy, cakeZ, Math.cos(a) * Math.cos(e) * v, Math.sin(e) * v, Math.sin(a) * Math.cos(e) * v * 0.3, rand(1.2, 1.8), rand(2.5, 4), i % 3 ? col : 0xffffff, -6, 0.8); }
    if (state === 'play' || state === 'menu') Snd.pop();
  }
  const near = clamp(1 - (s - lavaS - 3) / 11, 0, 1);
  if (state === 'play') {
    if (near > 0.2 && Math.random() < near) candy.add(px + rand(-4, 4), rand(0.5, 3), -lavaS - 0.5, rand(-1, 1), rand(1, 3), rand(-6, -2), 0.8, 0.2, pickOne([0x5a2d14, 0x8a4a24]), -6, 0.5);
    Snd.rumble(near * 0.5);
  }
  glow.update(dt); candy.update(dt); puff.update(dt);
  updateCamera(dt, near);
  updateHUD(near);
}
function collectAndCollide() {
  const R = 0.8 + save.up.magnet * 0.2; // magnit: har darajada biroz kengayadi, lekin butun yo'lni yig'ib olmaydi
  for (const p of level.picks) {
    if (!p.alive) continue;
    const ds = p.s - s;
    if (ds < -2 || ds > R + 3) continue;
    const dx = p.x - px, d = Math.hypot(dx, ds);
    if (save.up.magnet > 0 && d < R + 0.9 && p.kind !== 'coin') { p.x -= dx * 0.18; p.s -= ds * 0.18; }
    if (d < R) {
      // yig'ilgan buyum yo'qolmaydi: qahramon orqasidagi minoraga uchib boradi (tanga esa yuqoriga sakrab yo'qoladi)
      p.alive = false; p.fly = 0; p.fy = 0.55 + Math.sin(T * 3 + p.ph) * 0.12; level.flying.push(p);
      if (p.kind === 'coin') { runCoins++; Snd.coin(); sparkle(p.x, 0.6, -p.s, 6); }
      else {
        blocks += p.kind === 'gem' ? 5 : 1; hero.hop = 1; Snd.pickup();
        burst(p.x, 0.6, -p.s, p.kind === 'gem' ? 30 : 9, PALETTE, p.kind === 'gem' ? 6 : 3.5, 0.5, 0.16);
        if (p.kind === 'gem') { toast('+5'); sparkle(p.x, 0.8, -p.s, 12, 4); }
      }
    }
  }
  for (const o of level.obs) {
    const ds = o.s - s;
    if (Math.abs(ds) > 1.2) continue;
    if (o.type === 'boulder') { if (Math.hypot(o.cx - px, ds) < 0.95) hitObstacle(); }
    else if (o.type === 'geyser') { if (o.active && Math.hypot(o.x - px, ds) < 0.75) hitObstacle(); }
    else if (Math.abs(ds) < 0.45 && Math.abs(px - o.gx) > o.gw / 2 - 0.25) hitObstacle();
  }
}
function animateObstacle(o) {
  if (o.type === 'boulder') {
    const prev = o.cx ?? 0;
    o.cx = Math.sin(T * o.spd + o.ph) * o.amp;
    o.mesh.position.x = o.cx; o.ball.rotation.z -= (o.cx - prev) / 0.72;
    o.mesh.position.y = 0.72 + Math.abs(Math.sin(T * o.spd * 2 + o.ph)) * 0.12; // saqich sakrab yumalaydi
  } else if (o.type === 'geyser') {
    const t = ((T + o.ph) % o.period) / o.period, warn = t > 0.45 && t < 0.6, on = t >= 0.6 && t < 0.92;
    o.active = on;
    const h = on ? 3.4 * Math.min(1, (t - 0.6) * 12) * (1 + Math.sin(T * 30) * 0.06) : 0.01;
    o.fire.scale.y = h; o.fire.position.y = h / 2 + 0.1; o.core.scale.y = h * 0.9; o.core.position.y = h * 0.45 + 0.1;
    o.fire.visible = o.core.visible = on;
    o.vent.material.emissiveIntensity = warn ? 0.8 + Math.sin(T * 40) * 0.4 : on ? 1 : 0.2;
    o.mesh.position.x = o.x + (warn ? Math.sin(T * 60) * 0.03 : 0);
    if (warn && Math.random() < 0.6) puff.add(o.x + rand(-0.2, 0.2), 0.25, -o.s, rand(-0.3, 0.3), rand(0.8, 1.6), rand(-0.3, 0.3), 0.6, 0.25, 0xffffff, 0, 0.5, 0.4);
    if (on && Math.random() < 0.8) puff.add(o.x + rand(-0.3, 0.3), h, -o.s, rand(-1, 1), rand(1, 3), rand(-1, 1), 0.6, 0.45, pickOne([0xffffff, 0xffd6ec]), -3, 1, 0.5);
  }
}
function animateHero(dt) {
  const h = hero, running = state === 'play' || state === 'intro' || state === 'stairs';
  const speed = running ? (stun > 0 ? 3 : 9) : 0;
  h.phase += dt * speed * 1.6;
  const sw = running ? Math.sin(h.phase) : 0;
  const proc = h.legs.length > 0; // kod bilan yasalgan qahramon; modelning o'z animatsiyalari bor
  if (proc) {
    h.legs[0].rotation.x = sw * 0.9; h.legs[1].rotation.x = -sw * 0.9;
    h.arms[0].rotation.x = -sw * 0.8; h.arms[1].rotation.x = sw * 0.8;
  }
  const idle = state === 'menu' || state === 'shop';
  // yugurganda jele kabi biroz lapanglaydi
  const bounce = running ? Math.abs(Math.sin(h.phase)) : 0;
  if (proc) {
    h.rig.position.y = running ? bounce * 0.09 : Math.sin(T * 2.5) * 0.03;
    h.rig.scale.set(1 + (running ? (0.5 - bounce) * 0.05 : 0), 1 - (running ? (0.5 - bounce) * 0.05 : Math.sin(T * 2.5) * -0.015), 1);
  } else { h.rig.position.y = 0; h.rig.scale.set(1, 1, 1); }
  h.rig.rotation.x = running ? (proc ? -0.12 : -0.04) : 0;
  const lat = (px - prevX) / Math.max(dt, 1e-3);
  h.rig.rotation.z = damp(h.rig.rotation.z, clamp(-lat * 0.015, -0.14, 0.14), 10, dt);
  h.stack.rotation.z = -h.rig.rotation.z * 0.9;
  h.rig.rotation.y = idle ? damp(h.rig.rotation.y, state === 'shop' ? Math.sin(T * 0.8) * 0.6 : Math.sin(T * 0.5) * 0.25, 4, dt) : damp(h.rig.rotation.y, 0, 8, dt);
  if (inv > 0 && state === 'play') h.root.visible = Math.floor(T * 14) % 2 === 0;
  else if (running || idle) h.root.visible = true;
  // ko'z qisish
  h.blink -= dt; if (h.blink < -0.13) h.blink = rand(2, 4.5);
  const eyeY = h.blink < 0 ? 0.12 : 1;
  for (const e of h.eyes) e.scale.set(1, eyeY, 1);
  // do'konda tanlanganda salomlashadi (kod qahramoni quvnoq sakraydi)
  h.greet = Math.max(0, h.greet - dt);
  if (proc && h.greet > 0) h.rig.position.y += Math.abs(Math.sin(T * 9)) * 0.22;
  // marmelad olganda kichkina sakrash
  h.hop = Math.max(0, h.hop - dt * 5);
  if (h.hop > 0) { h.rig.position.y += Math.sin(h.hop * Math.PI) * 0.16; h.rig.scale.y *= 1 + Math.sin(h.hop * Math.PI) * 0.08; }
  // Model animatsiyalari: holatga qarab yumshoq almashinadi
  if (h.mixer) {
    let want = 'Idle';
    if (idle && h.greet > 0) want = 'Wave'; // do'konda ko'rsatilganda salom beradi
    if (running) want = stun > 0 ? 'HitReact' : 'Run';
    else if (state === 'win') want = 'Wave';
    else if (state === 'fall') want = 'Jump_Idle';
    else if (state === 'caught') want = 'Death';
    playAnim(h, want, 0.18, want === 'HitReact' || want === 'Death');
    if (h.actions.Run) h.actions.Run.timeScale = 1.25;
    h.mixer.update(dt);
    if (h.spine) {
      // minora qorin suyagining orqasida turadi: yugurganda tana bilan birga egiladi
      h.rig.updateWorldMatrix(true, false);
      const bp = h.spine.getWorldPosition(_bp);
      h.rig.worldToLocal(bp);
      h.stack.position.set(bp.x, bp.y - 0.18, bp.z + 0.32);
    }
  }
  if (state === 'win') {
    // g'alaba: aylanadi (kod qahramoni sakrab qo'llarini ko'taradi, model qo'l silkitadi)
    h.rig.rotation.y += dt * (proc ? 4 : 1.2); h.rig.rotation.z = 0;
    if (proc) {
      const j = Math.abs(Math.sin(T * 7));
      h.rig.position.y = j * 0.35; h.rig.scale.set(1 + (0.5 - j) * 0.08, 1 - (0.5 - j) * 0.08, 1);
      h.arms[0].rotation.x = h.arms[1].rotation.x = -2.7 + Math.sin(T * 14) * 0.25;
      h.legs[0].rotation.x = Math.sin(T * 14) * 0.3; h.legs[1].rotation.x = -Math.sin(T * 14) * 0.3;
    }
  } else if ((state === 'fall' || state === 'caught') && proc) {
    // qo'llarini silkitib qo'rqib ketadi
    h.arms[0].rotation.x = -2.2 + Math.sin(T * 26) * 0.7; h.arms[1].rotation.x = -2.2 - Math.sin(T * 26) * 0.7;
    h.legs[0].rotation.x = Math.sin(T * 22) * 0.8; h.legs[1].rotation.x = -Math.sin(T * 22) * 0.8;
    for (const e of h.eyes) e.scale.set(1.25, 1.25, 1);
  }
  // marmelad minorasi chayqalishi
  h.swayV += (-90 * h.sway - 9 * h.swayV - clamp(lat, -15, 15) * 0.5) * dt; h.sway += h.swayV * dt;
  h.topPop = Math.max(0, h.topPop - dt * 5);
  // minora faqat yugurishda ko'rinadi va 8 kubikdan oshmaydi (oldindagi yo'lni to'smasin); aniq son HUD'da
  const n = running ? Math.min(blocks, 8) : 0, set = h.stackSet;
  set.setCount(n);
  for (let i = 0; i < n; i++) {
    const k = Math.pow(i / 12, 1.5), sc = 0.34 * (i === n - 1 ? 1 + h.topPop * 0.35 : 1);
    set.set(i, h.sway * k * 0.25, i * 0.34, 0, sc, sc, sc, 0, 0, -h.sway * k * 0.15);
  }
  set.commit();
  h.shadow.visible = py > -0.2 && state !== 'fall';
}
function updateCamera(dt, near) {
  const portrait = window.innerHeight > window.innerWidth;
  const tgt = cam.tgt, look = cam.lk;
  if (state === 'menu' || state === 'shop') {
    // do'konda pastki panel ekranning yarmidan ko'pini egallaydi: kamera pastga qarab, qahramonni yuqoriga chiqaradi
    const d = state === 'shop' ? 6.5 : 5.2;
    tgt.set(state === 'shop' ? 0 : 1.6, state === 'shop' ? 1.2 : 2.2, -s - d); look.set(0, state === 'shop' ? -1.2 : 1.1, -s);
    if (portrait && state === 'menu') { tgt.y = 2.6; tgt.z = -s - 6.2; look.y = 1.6; }
  } else if (state === 'stairs' || state === 'win') {
    tgt.set(7, py + 3.2, -s + 3); look.set(0, py + 1.2, -s - 1.5);
  } else {
    const o = portrait ? [7.2, 9.6] : [5.2, 8];
    tgt.set(px * 0.6, Math.max(py, -0.5) + o[0], -s + o[1]); look.set(px * 0.4, Math.max(py, -0.5) + 0.4, -s - 7);
  }
  const k = state === 'intro' ? 3.5 : 5, kz = state === 'play' ? 12 : k;
  cam.pos.x = damp(cam.pos.x, tgt.x, k, dt); cam.pos.y = damp(cam.pos.y, tgt.y, k, dt); cam.pos.z = damp(cam.pos.z, tgt.z, kz, dt);
  cam.look.x = damp(cam.look.x, look.x, k, dt); cam.look.y = damp(cam.look.y, look.y, k, dt); cam.look.z = damp(cam.look.z, look.z, kz, dt);
  camera.position.copy(cam.pos);
  const sh = shake * 0.35 + (state === 'play' ? near * 0.05 : 0);
  if (sh > 0) { camera.position.x += rand(-sh, sh); camera.position.y += rand(-sh, sh); }
  camera.lookAt(cam.look);
  const fovT = (portrait ? 70 : 55) + (state === 'play' && buildT <= 0 ? 3 : 0);
  if (Math.abs(camera.fov - fovT) > 0.05) { camera.fov = damp(camera.fov, fovT, 3, dt); camera.updateProjectionMatrix(); }
}

// ---------- UI ----------
const $ = id => document.getElementById(id);
const ui = {};
function showScreen(name) {
  for (const id of ['menu', 'shop', 'win', 'lose']) $(id).classList.toggle('hidden', id !== name);
  if (name === 'menu' || name === 'shop') { document.querySelectorAll('.coinsv').forEach(e => { e.textContent = fmt(save.coins); }); $('menulvl').textContent = save.level; }
}
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : String(n);
function applyLang() {
  document.querySelectorAll('[data-t]').forEach(e => { e.textContent = L[e.dataset.t] || ''; });
}
let toastTimer = 0;
function toast(t) { const e = $('toast'); e.textContent = t; e.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => e.classList.remove('show'), 700); }
function countUp(el, v) { const t0 = performance.now(); const f = () => { const k = Math.min(1, (performance.now() - t0) / 900); el.textContent = Math.round(v * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); }; f(); }
// HUD faqat qiymat o'zgarganda yangilanadi (sahifa joylashuvi qayta hisoblanmasligi uchun transform ishlatiladi)
function hudSet(key, v, fn) { if (ui[key] !== v) { ui[key] = v; fn(v); } }
function resetHUD() { for (const k in ui) delete ui[k]; }
function updateHUD(near) {
  if (state !== 'play' && state !== 'stairs' && state !== 'intro') return;
  hudSet('blocks', blocks, v => {
    const b = $('blocks');
    if (ui.prevBlocks !== undefined && v > ui.prevBlocks) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
    ui.prevBlocks = v; $('bcount').textContent = v; b.classList.toggle('low', v < 3);
  });
  hudSet('coins', runCoins, v => { $('coins').textContent = fmt(save.coins + v); });
  const q = x => Math.round(clamp(x, 0, 1) * 400) / 4;
  hudSet('prog', q(s / finishS), v => { $('prog').style.transform = `translateX(${v - 100}%)`; $('dot').style.transform = `translateX(${v}%)`; });
  hudSet('lava', q(lavaS / finishS), v => { $('lavabar').style.transform = `translateX(${v - 100}%)`; });
  hudSet('warn', state === 'play' ? Math.round(near * 20) / 20 : 0, v => { $('warn').style.opacity = v; });
}
// ---------- Do'kon kartalari uchun qahramon rasmlari ----------
// Har bir qahramon alohida kichik renderer'da bir marta chizilib, rasm (PNG) sifatida saqlanadi.
const thumbs = {};
let thumbR = null, thumbScene = null, thumbCam = null, thumbJob = null;
function thumbSetup() {
  thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  thumbR.setPixelRatio(1); thumbR.setSize(192, 192, false);
  thumbR.outputColorSpace = THREE.SRGBColorSpace; thumbR.toneMapping = THREE.NeutralToneMapping;
  thumbScene = new THREE.Scene();
  thumbScene.add(new THREE.HemisphereLight(0xffffff, 0xffb3d9, 2.4));
  const d = new THREE.DirectionalLight(0xffffff, 2.4); d.position.set(-2, 4, -5); thumbScene.add(d);
  thumbCam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
}
async function makeThumb(i) {
  if (thumbs[i]) return thumbs[i];
  if (!thumbR) thumbSetup();
  const holder = new THREE.Group(), g = await loadModel(SKINS[i].model), m = prepModel(g);
  holder.add(m);
  const idleClip = g.animations.find(a => a.name === 'Idle');
  if (idleClip) { const mx = new THREE.AnimationMixer(m); mx.clipAction(idleClip).play(); mx.update(0.4); }
  holder.rotation.y = -0.45; // 3/4 burchakdan
  thumbScene.add(holder);
  thumbCam.position.set(0, 1.15, -4.4); thumbCam.lookAt(0, 0.88, 0);
  thumbR.render(thumbScene, thumbCam);
  thumbs[i] = thumbR.domElement.toDataURL('image/png');
  thumbScene.remove(holder);
  return thumbs[i];
}
function fillThumbs() {
  // rasmlar birin-ketin chiziladi va tayyor bo'lgani darhol kartaga qo'yiladi
  if (thumbJob) return;
  thumbJob = (async () => {
    for (let i = 0; i < SKINS.length; i++) {
      if (thumbs[i]) continue;
      try { await makeThumb(i); } catch (e) { continue; }
      const img = document.querySelector(`#shopList img[data-i="${i}"]`);
      if (img) { img.src = thumbs[i]; img.classList.add('ready'); }
      await new Promise(r => setTimeout(r, 0));
    }
    thumbJob = null;
  })();
}
let shopSel = 0;
function openShop() { state = 'shop'; shopSel = save.skin; renderShop('heroes'); showScreen('shop'); }
function previewHero(i) {
  if (hero.id !== i) { setHero(i); hero.root.position.set(px, py, -s); needWarm = true; }
  hero.greet = 2.2;
}
function updatePick() {
  // tanlangan qahramon uchun tugma: sotib olish (tasdiqlash), tanlash yoki "tanlangan"
  const sk = SKINS[shopSel], owned = save.owned.includes(shopSel), btn = $('btnPick');
  $('pickName').textContent = sk.name;
  btn.classList.remove('off', 'green', 'pink');
  if (!owned) { btn.innerHTML = `${L.buy} <i class="coin"></i> ${fmt(sk.price)}`; btn.classList.add('pink'); if (save.coins < sk.price) btn.classList.add('off'); }
  else if (save.skin === shopSel) { btn.textContent = L.equipped; btn.classList.add('green', 'off'); }
  else { btn.textContent = L.equip; btn.classList.add('green'); }
}
function renderShop(tab) {
  $('tabHeroes').classList.toggle('on', tab === 'heroes'); $('tabUp').classList.toggle('on', tab !== 'heroes');
  $('pickBar').classList.toggle('hidden', tab !== 'heroes');
  const list = $('shopList'); list.innerHTML = '';
  if (tab === 'heroes') {
    SKINS.forEach((sk, i) => {
      const owned = save.owned.includes(i), equipped = save.skin === i;
      const c = document.createElement('div'); c.className = 'card' + (shopSel === i ? ' sel' : '') + (owned ? '' : ' locked');
      c.innerHTML = `<img class="thumb${thumbs[i] ? ' ready' : ''}" data-i="${i}" alt="${sk.name}" ${thumbs[i] ? `src="${thumbs[i]}"` : ''} style="--a:${sk.css[0]};--b:${sk.css[1]}"><b>${sk.name}</b>` +
        (owned ? `<div class="lvl">${equipped ? L.equipped : ''}</div>` : `<div class="price"><i class="coin"></i>${fmt(sk.price)}</div>`);
      // bosilganda faqat ko'rsatadi; sotib olish pastdagi tugma orqali tasdiqlanadi
      c.addEventListener('click', () => { Snd.click(); shopSel = i; previewHero(i); renderShop('heroes'); });
      list.appendChild(c);
    });
    updatePick();
    fillThumbs();
  } else {
    for (const k of Object.keys(UP)) {
      const u = UP[k], lv = save.up[k], maxed = lv >= u.max, cost = maxed ? 0 : u.cost(lv), can = !maxed && save.coins >= cost;
      const c = document.createElement('div'); c.className = 'card' + (!maxed && !can ? ' cant' : '');
      c.innerHTML = `<div class="ico">${u.icon}</div><b>${L[u.key]}</b><div class="lvl">${lv} / ${u.max}</div>` +
        (maxed ? '<div class="lvl">MAX</div>' : `<div class="price"><i class="coin"></i>${fmt(cost)}</div>`);
      c.addEventListener('click', () => {
        if (maxed || !can) { Snd.no(); return; }
        save.coins -= cost; save.up[k]++; Snd.buy(); persist(); renderShop('up'); showScreen('shop');
      });
      list.appendChild(c);
    }
  }
}
function goMenu() {
  resetRun(); state = 'menu'; stateT = 0;
  $('hud').classList.add('off'); showScreen('menu');
  resetHUD();
}
$('btnPlay').addEventListener('click', () => { Snd.unlock(); Snd.click(); startRun(); });
$('btnShop').addEventListener('click', () => { Snd.unlock(); Snd.click(); openShop(); });
$('btnBack').addEventListener('click', () => {
  Snd.click();
  // faqat ko'rib chiqilgan (sotib olinmagan yoki tanlanmagan) qahramon o'rniga tanlangani qaytadi
  if (hero.id !== save.skin) { setHero(save.skin); hero.root.position.set(px, py, -s); needWarm = true; }
  state = 'menu'; showScreen('menu');
});
$('btnPick').addEventListener('click', () => {
  const sk = SKINS[shopSel], owned = save.owned.includes(shopSel);
  if (!owned) {
    if (save.coins < sk.price) { Snd.no(); const b = $('btnPick'); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; }
    save.coins -= sk.price; save.owned.push(shopSel); Snd.buy();
    burst(px, 1.2, -s, 50, PALETTE, 6, 1.2, 0.18, -8); sparkle(px, 1.4, -s, 14, 4); // xarid bayrami
  } else if (save.skin === shopSel) return;
  else Snd.click();
  save.skin = shopSel; previewHero(shopSel); persist();
  renderShop('heroes'); showScreen('shop');
});
$('tabHeroes').addEventListener('click', () => { Snd.click(); renderShop('heroes'); });
$('tabUp').addEventListener('click', () => { Snd.click(); renderShop('up'); });
$('btnNext').addEventListener('click', () => { Snd.click(); goMenu(); });
$('btnRetry').addEventListener('click', () => { Snd.click(); goMenu(); });
$('pause').addEventListener('pointerdown', () => setPaused(false));

// Qahramonlar tartib raqami bilan emas, nomi bilan saqlanadi: ro'yxat o'zgarsa ham sotib olinganlari adashmaydi
function persist() { Store.save(Object.assign({}, save, { owned: save.owned.map(i => SKINS[i].name), skin: SKINS[save.skin].name })); }
// Avvalgi versiyalar raqam saqlagan: o'sha paytdagi tartib bo'yicha nomga aylantiriladi
const OLD_SKIN_ORDER = ['Bunny', 'Froggy', 'Birb', 'Dino', 'Yeti', 'Mushy', 'Gummy', 'Sprinkles', 'Cuppy', 'Scoop', 'Mallow'];
function skinIndex(v) {
  const name = typeof v === 'number' ? OLD_SKIN_ORDER[v] : v;
  return SKINS.findIndex(sk => sk.name === name);
}

// ---------- Boshqaruv ----------
let dragging = false, dragX = 0;
const keys = { l: false, r: false };
window.addEventListener('pointerdown', e => {
  Snd.unlock();
  if (state !== 'play' && state !== 'intro') return;
  dragging = true; dragX = e.clientX;
});
window.addEventListener('pointermove', e => {
  if (!dragging) return;
  targetX = clamp(targetX + ((e.clientX - dragX) / Math.min(window.innerWidth, 700)) * 9, -4.2, 4.2);
  dragX = e.clientX;
});
const endDrag = () => { dragging = false; };
window.addEventListener('pointerup', endDrag); window.addEventListener('pointercancel', endDrag);
window.addEventListener('keydown', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.l = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.r = true;
  if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
    e.preventDefault(); Snd.unlock();
    if (paused) setPaused(false);
    else if (state === 'menu') startRun();
    else if (state === 'win' || state === 'lose') goMenu();
  }
});
window.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.l = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.r = false;
});
window.addEventListener('blur', () => { dragging = false; keys.l = keys.r = false; });
function setPaused(p) {
  if (paused === p) return;
  paused = p; $('pause').classList.toggle('hidden', !p);
  if (p) { Snd.suspend(); dragging = false; } else { Snd.resume(); last = performance.now(); perf.t = perf.n = 0; }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  glow.mat.uniforms.uScale.value = candy.mat.uniforms.uScale.value = puff.mat.uniforms.uScale.value = h * pr * 0.5;
}
// FPS kuzatuvchisi: sekin bo'lsa ruxsatni pasaytiradi, tez bo'lsa ko'taradi
const perf = { t: 0, n: 0, hold: 2, upBlock: 0, ceil: PR_MAX }; // ceil: bir marta sekinlashgan darajadan yuqoriga qaytilmaydi
function adaptQuality(rawDt) {
  if (prLocked || paused || document.hidden) return;
  perf.t += rawDt; perf.n++;
  if (perf.t < 1) return;
  const fps = perf.n / perf.t; perf.t = perf.n = 0;
  if (perf.hold > 0) { perf.hold--; return; }
  if (perf.upBlock > 0) perf.upBlock--;
  if (fps < 50 && pr > 0.6) { perf.ceil = Math.max(0.6, Math.round((pr - 0.1) * 100) / 100); pr = Math.max(0.6, Math.round((pr - 0.15) * 100) / 100); perf.upBlock = 10; resize(); }
  else if (fps > 58 && pr + 0.05 < perf.ceil && perf.upBlock === 0) { pr = Math.min(perf.ceil, Math.round((pr + 0.1) * 100) / 100); resize(); }
}

function frame(now) {
  const raw = Math.max(0, (now - last) / 1000), dt = Math.min(0.05, raw);
  last = now;
  if (!paused) {
    if (state === 'play') targetX = clamp(targetX + ((keys.r ? 1 : 0) - (keys.l ? 1 : 0)) * 9 * dt, -4.2, 4.2);
    update(dt);
    adaptQuality(raw);
  }
  Snd.tick(dt);
  if (needWarm) { needWarm = false; warmUp(); }
  renderer.render(scene, camera);
  if (!firstFrame) { firstFrame = true; yt(y => y.game.firstFrameReady()); }
}

// ---------- Ishga tushirish ----------
Snd.prepare();
setHero(0);
resize();
window.addEventListener('resize', resize);
goMenu();
applyLang();
last = performance.now();
renderer.setAnimationLoop(frame);

(async () => {
  const [data, lang] = await Promise.all([Store.load(), detectLang()]);
  if (data && typeof data === 'object') {
    save = Object.assign(save, data);
    save.up = Object.assign({ start: 0, magnet: 0, lava: 0 }, data.up || {});
    for (const k in UP) save.up[k] = clamp(save.up[k] | 0, 0, UP[k].max); // eski saqlanmada chegaradan oshgan darajalar
    const owned = (Array.isArray(save.owned) ? save.owned : []).map(skinIndex).filter(i => i >= 0);
    save.owned = [...new Set([0, ...owned])]; // boshlang'ich qahramon doim bor
    save.level = Math.max(1, save.level | 0); save.coins = Math.max(0, save.coins | 0);
    save.skin = skinIndex(save.skin);
    if (!save.owned.includes(save.skin)) save.skin = 0;
  }
  L = STR[lang]; document.documentElement.lang = lang;
  applyLang();
  setHero(save.skin);
  goMenu();
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
