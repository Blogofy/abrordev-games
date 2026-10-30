'use strict';
/* KITE — ovoz: WebAudio sintez (fayllarsiz). Musiqa har bir dunyoda tonalligi va cholg'usini o'zgartiradi. */
const Snd = (() => {
  let ac = null, master = null, sfx = null, mus = null, noiseBuf = null;
  let enabled = true, musicOn = false, nextT = 0, step = 0, key = 0, lead = 'triangle', pad = false;
  function init() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ac = new AC(); } catch (e) { return; }
    master = ac.createGain(); master.gain.value = enabled ? 0.9 : 0; master.connect(ac.destination);
    sfx = ac.createGain(); sfx.gain.value = 0.8; sfx.connect(master);
    mus = ac.createGain(); mus.gain.value = 0.25; mus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const ok = () => ac && ac.state === 'running';
  function osc(type, f0, f1, t, dur, vol, dest = sfx) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, dur, vol, ftype, freq, dest = sfx, q = 1) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = ftype; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  // Major pentatonika: quvnoq, hamma madaniyatga tanish ohang
  const PENTA = [0, 2, 4, 7, 9];
  const pent = i => PENTA[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5);
  const note = semi => 261.63 * Math.pow(2, (semi + key) / 12);
  const MEL = [4, -1, 5, 4, 2, -1, 0, -1, 1, 2, -1, 4, 2, -1, -1, -1, 4, -1, 5, 7, 6, -1, 5, 4, 2, -1, 4, 2, 1, -1, 0, -1];
  const CHORDS = [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]]; // I – vi – IV – V
  const STEP = 60 / 116 / 2;
  const KEYS = [0, 2, -3, 3, 5], LEADS = ['triangle', 'triangle', 'sine', 'square', 'sine'], PADS = [false, false, true, true, true];
  function playStep(i, t) {
    const m = MEL[i % 32], ch = CHORDS[Math.floor(i / 8) % 4], s8 = i % 8;
    if (m >= 0) {
      const f = note(pent(m) + 12);
      osc(lead, f, 0, t, 0.28, lead === 'square' ? 0.045 : 0.12, mus);
      osc('sine', f * 2, 0, t + 0.01, 0.12, 0.025, mus);
    }
    if (s8 === 0 || s8 === 3 || s8 === 6) osc('triangle', note(ch[0] - 12), 0, t, STEP * 2.2, 0.17, mus);
    if (s8 === 2 || s8 === 6) for (const iv of ch) osc('triangle', note(iv), 0, t, 0.16, 0.03, mus);
    if (pad && s8 === 0) for (const iv of ch) osc('sine', note(iv), 0, t, STEP * 7.5, 0.03, mus);
    if (s8 === 0 || s8 === 4) osc('sine', 125, 48, t, 0.2, 0.42, mus);
    if (s8 === 2 || s8 === 6) noise(t, 0.11, 0.16, 'bandpass', 1700, mus, 0.9);
    if (i % 2 === 1) noise(t, 0.035, 0.06, 'highpass', 6500, mus);
  }
  return {
    prepare() { init(); },
    unlock() {
      init();
      if (!ac) return;
      if (ac.state === 'suspended') ac.resume().catch(() => {});
      musicOn = true;
    },
    setEnabled(v) { enabled = v; if (master) master.gain.setTargetAtTime(v ? 0.9 : 0, ac.currentTime, 0.05); },
    suspend() { if (ac && ac.state === 'running') ac.suspend().catch(() => {}); },
    resume() { if (ac && ac.state === 'suspended') ac.resume().catch(() => {}); },
    duck(v) { if (mus) mus.gain.setTargetAtTime(v, ac.currentTime, 0.2); },
    setWorld(i) { const w = i % KEYS.length; key = KEYS[w]; lead = LEADS[w]; pad = PADS[w]; },
    tick() {
      if (!ok() || !musicOn) return;
      if (nextT < ac.currentTime) nextT = ac.currentTime + 0.05;
      while (nextT < ac.currentTime + 0.2) { playStep(step++, nextT); nextT += STEP; }
    },
    star(c) { if (!ok()) return; const t = ac.currentTime, f = note(pent(Math.min(c - 1, 14)) + 12); osc('triangle', f, 0, t, 0.2, 0.2); osc('sine', f * 2, 0, t + 0.03, 0.15, 0.07); },
    near() { if (!ok()) return; const t = ac.currentTime; noise(t, 0.25, 0.25, 'bandpass', 1200, sfx, 0.8); osc('square', 660, 990, t, 0.12, 0.05); },
    turbo() { if (!ok()) return; const t = ac.currentTime; noise(t, 0.7, 0.35, 'bandpass', 900, sfx, 0.5); osc('sawtooth', 160, 640, t, 0.5, 0.08); [0, 2, 4, 5, 7].forEach((n, i) => osc('triangle', note(pent(n + 5)), 0, t + i * 0.05, 0.25, 0.15)); },
    hit() { if (!ok()) return; const t = ac.currentTime; noise(t, 0.6, 0.6, 'lowpass', 900); osc('sawtooth', 220, 50, t, 0.5, 0.22); },
    splash() { if (!ok()) return; const t = ac.currentTime; noise(t, 0.8, 0.55, 'lowpass', 1400, sfx, 0.5); noise(t + 0.05, 0.5, 0.25, 'highpass', 3000); },
    smash() { if (!ok()) return; const t = ac.currentTime; noise(t, 0.3, 0.45, 'lowpass', 1600); osc('square', 320, 90, t, 0.22, 0.09); osc('triangle', 880, 0, t + 0.05, 0.15, 0.1); },
    whoosh() { if (!ok()) return; noise(ac.currentTime, 0.35, 0.25, 'bandpass', 700, sfx, 0.7); },
    power() { if (!ok()) return; const t = ac.currentTime; [0, 4, 7, 12, 16].forEach((n, i) => osc('triangle', note(n + 12), 0, t + i * 0.045, 0.2, 0.15)); },
    shield() { if (!ok()) return; const t = ac.currentTime; osc('sine', 1900, 500, t, 0.35, 0.18); noise(t, 0.3, 0.25, 'highpass', 4000); },
    mission() { if (!ok()) return; const t = ac.currentTime; [0, 4, 7, 12].forEach((n, i) => { osc('triangle', note(n + 12), 0, t + i * 0.09, 0.3, 0.17); osc('sine', note(n + 24), 0, t + i * 0.09, 0.2, 0.05); }); },
    world() { if (!ok()) return; const t = ac.currentTime; [0, 4, 7, 12, 7, 12, 16].forEach((n, i) => osc('triangle', note(n + 12), 0, t + i * 0.08, 0.35, 0.18)); osc('sine', 130, 45, t, 0.4, 0.5); },
    best(delay) { if (!ok()) return; const t = ac.currentTime + delay; [0, 2, 4, 5, 7, 10].forEach((n, i) => osc('triangle', note(pent(n) + 12), 0, t + i * 0.08, 0.35, 0.2)); },
    buy() { if (!ok()) return; const t = ac.currentTime; osc('square', 1318, 0, t, 0.1, 0.07); osc('square', 1760, 0, t + 0.08, 0.25, 0.07); osc('triangle', 2637, 0, t + 0.08, 0.3, 0.06); },
    no() { if (!ok()) return; const t = ac.currentTime; osc('square', 180, 120, t, 0.18, 0.08); },
    click() { if (!ok()) return; osc('sine', 900, 600, ac.currentTime, 0.07, 0.12); },
  };
})();
