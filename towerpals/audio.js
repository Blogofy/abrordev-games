'use strict';
/* TOWER PALS — ovoz: WebAudio sintez (fayllarsiz). Har bir bobda musiqa tonalligi biroz o'zgaradi. */
const Snd = (() => {
  let ac = null, master = null, sfx = null, mus = null, noiseBuf = null;
  let enabled = true, musicOn = false, nextT = 0, step = 0, key = 0;
  function init() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ac = new AC(); } catch (e) { return; }
    master = ac.createGain(); master.gain.value = enabled ? 0.9 : 0; master.connect(ac.destination);
    sfx = ac.createGain(); sfx.gain.value = 0.8; sfx.connect(master);
    mus = ac.createGain(); mus.gain.value = 0.26; mus.connect(master);
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
  const PENTA = [0, 2, 4, 7, 9];
  const note = i => 261.63 * Math.pow(2, (PENTA[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5) + key) / 12);
  const MEL = [5, -1, 7, 6, 5, -1, 4, -1, 5, 7, 8, -1, 7, -1, -1, -1, 6, -1, 5, 4, 3, -1, 4, -1, 5, 4, 2, -1, 0, -1, -1, -1];
  const BASS = [0, -2, -1, -3];
  const STEP = 60 / 112 / 2;
  const KEYS = [0, 2, -3, 3, -5];
  function playStep(i, t) {
    const m = MEL[i % 32];
    if (m >= 0) { osc('triangle', note(m), 0, t, 0.22, 0.12, mus); osc('sine', note(m) * 2, 0, t, 0.1, 0.03, mus); }
    if (i % 4 === 0) osc('triangle', note(BASS[Math.floor(i / 8) % 4]) / 2, 0, t, STEP * 3, 0.2, mus);
    if (i % 8 === 0) osc('sine', 150, 50, t, 0.18, 0.45, mus);
    if (i % 8 === 4) noise(t, 0.12, 0.18, 'bandpass', 1800, mus, 0.8);
    if (i % 2 === 1) noise(t, 0.03, 0.08, 'highpass', 6000, mus);
  }
  return {
    prepare() { init(); },
    unlock() { init(); if (!ac) return; if (ac.state === 'suspended') ac.resume().catch(() => {}); musicOn = true; },
    setEnabled(v) { enabled = v; if (master) master.gain.setTargetAtTime(v ? 0.9 : 0, ac.currentTime, 0.05); },
    suspend() { if (ac && ac.state === 'running') ac.suspend().catch(() => {}); },
    resume() { if (ac && ac.state === 'suspended') ac.resume().catch(() => {}); },
    duck(v) { if (mus) mus.gain.setTargetAtTime(v, ac.currentTime, 0.2); },
    setChapter(i) { key = KEYS[i % KEYS.length]; },
    tick() {
      if (!ok() || !musicOn) return;
      if (nextT < ac.currentTime) nextT = ac.currentTime + 0.05;
      while (nextT < ac.currentTime + 0.2) { playStep(step++, nextT); nextT += STEP; }
    },
    drop() { if (!ok()) return; noise(ac.currentTime, 0.2, 0.2, 'bandpass', 900, sfx, 0.8); },
    land(f) { if (!ok()) return; const t = ac.currentTime; osc('sine', 170, 80, t, 0.12, 0.35); osc('sine', f, f * 1.6, t + 0.02, 0.16, 0.16); },
    perfect(c) { if (!ok()) return; const t = ac.currentTime, f = note(Math.min(c - 1, 14) + 5); osc('triangle', f, 0, t, 0.22, 0.22); osc('sine', f * 2, 0, t + 0.04, 0.18, 0.08); },
    oops() { if (!ok()) return; osc('sine', 900, 180, ac.currentTime, 0.6, 0.15); },
    crash() { if (!ok()) return; const t = ac.currentTime; noise(t, 0.9, 0.5, 'lowpass', 700); osc('sawtooth', 160, 45, t, 0.7, 0.18); },
    life() { if (!ok()) return; const t = ac.currentTime; [0, 4, 7, 12].forEach((n, i) => osc('triangle', 523.25 * Math.pow(2, n / 12), 0, t + i * 0.07, 0.25, 0.18)); },
    win() { if (!ok()) return; const t = ac.currentTime; [0, 4, 7, 12, 7, 12, 16].forEach((n, i) => osc('triangle', 523.25 * Math.pow(2, n / 12), 0, t + i * 0.09, 0.35, 0.18)); osc('sine', 130, 45, t, 0.4, 0.5); noise(t, 0.6, 0.2, 'highpass', 5000); },
    star(i) { if (!ok()) return; const t = ac.currentTime, f = 659.25 * Math.pow(2, (i * 4) / 12); osc('triangle', f, 0, t, 0.3, 0.2); osc('sine', f * 2, 0, t + 0.03, 0.25, 0.08); noise(t, 0.2, 0.12, 'highpass', 6000); },
    unlock2() { if (!ok()) return; const t = ac.currentTime; [0, 2, 4, 7, 9, 12, 16].forEach((n, i) => { osc('triangle', 523.25 * Math.pow(2, n / 12), 0, t + i * 0.06, 0.3, 0.15); }); },
    fail() { if (!ok()) return; const t = ac.currentTime; [7, 5, 3, 0].forEach((n, i) => osc('triangle', 392 * Math.pow(2, n / 12), 0, t + i * 0.16, 0.3, 0.15)); },
    whoosh() { if (!ok()) return; noise(ac.currentTime, 0.5, 0.2, 'bandpass', 600, sfx, 0.6); },
    click() { if (!ok()) return; osc('sine', 900, 600, ac.currentTime, 0.07, 0.12); },
    no() { if (!ok()) return; osc('square', 180, 120, ac.currentTime, 0.18, 0.08); },
  };
})();
