// Procedural Web Audio — punchy but not harsh (low thump + filtered noise). No audio files.
export class Audio {
  constructor() { this.ctx = null; }
  _c() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    return this.ctx;
  }
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  boom() {
    const c = this._c(), t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(58, t + 0.28);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.45, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.45);
  }

  tap() {
    const c = this._c(), t = c.currentTime;
    const o = c.createOscillator(); o.type = 'square';
    o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.06);
    const g = c.createGain();
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.09);
  }

  ping() {
    const c = this._c(), t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(880, t); o.frequency.linearRampToValueAtTime(1320, t + 0.18);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.32);
  }

  // Incoming-shell whistle — falling tone, telegraphs danger (fair warning).
  whistle() {
    const c = this._c(), t = c.currentTime;
    const o = c.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(300, t + 1.2);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.1);
    g.gain.setValueAtTime(0.16, t + 1.0); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + 1.32);
  }

  fanfare(win) {
    const c = this._c(), t = c.currentTime;
    const notes = win ? [392, 523, 659, 784] : [392, 330, 262, 196];
    notes.forEach((f, i) => {
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const g = c.createGain();
      const tt = t + i * 0.18;
      g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.2, tt + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.4);
      o.connect(g).connect(c.destination); o.start(tt); o.stop(tt + 0.42);
    });
  }

  // Direct hit on the enemy Keep — a bright, satisfying two-note sting (distinct from crunch).
  keepHit() {
    const c = this._c(), t = c.currentTime;
    const o = c.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(523, t);
    o.frequency.setValueAtTime(784, t + 0.07);
    o.frequency.exponentialRampToValueAtTime(660, t + 0.28);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.37);
  }

  crunch() {
    const c = this._c(), t = c.currentTime, dur = 0.4;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.2);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1000;
    const g = c.createGain(); g.gain.value = 0.5;
    src.connect(f).connect(g).connect(c.destination); src.start(t);
  }
}
