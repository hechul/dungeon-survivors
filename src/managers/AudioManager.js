// WebAudio 기반 절차적 사운드 매니저
// PNG 에셋과 동일한 패턴: 코드에 진성 데이터, 외부 wav는 추후 옵션
class AudioManagerSingleton {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.masterGain = null;
    this.lastPlay = new Map();
  }

  _ensure() {
    if (this.ctx) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.4;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      this.ctx = null;
    }
  }

  setMuted(v) {
    this.muted = !!v;
    if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : 0.4;
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // 톤 한 발 — 빈도, 길이, 형태, 시작/끝 게인
  _tone(freq, dur, type = 'sine', g0 = 0.6, g1 = 0.0, freqEnd = null) {
    this._ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + dur);
    gain.gain.setValueAtTime(g0, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, g1 || 0.0001), t + dur);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // 노이즈 한 발 (피격감)
  _noise(dur, g0 = 0.5, filterFreq = 800) {
    this._ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(g0, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt);
    filt.connect(gain);
    gain.connect(this.masterGain);
    src.start(t);
  }

  _throttle(key, ms) {
    const now = performance.now();
    const last = this.lastPlay.get(key) || 0;
    if (now - last < ms) return false;
    this.lastPlay.set(key, now);
    return true;
  }

  // 효과음 매핑
  hit() { if (this._throttle('hit', 30)) this._tone(440, 0.06, 'square', 0.25, 0.001, 280); }
  enemyKill() { if (this._throttle('kill', 20)) this._tone(220, 0.1, 'sawtooth', 0.3, 0.001, 80); }
  playerHurt() { this._noise(0.18, 0.45, 600); this._tone(140, 0.18, 'square', 0.4, 0.001, 60); }
  pickup() { if (this._throttle('pickup', 30)) this._tone(880, 0.06, 'triangle', 0.25, 0.001, 1200); }
  levelUp() {
    [523, 659, 784].forEach((f, i) => setTimeout(() => this._tone(f, 0.18, 'triangle', 0.5, 0.001), i * 90));
  }
  bossSpawn() {
    this._tone(80, 0.4, 'sawtooth', 0.6, 0.05, 50);
    setTimeout(() => this._tone(120, 0.4, 'sawtooth', 0.5, 0.001, 60), 200);
  }
  bossKill() {
    this._tone(660, 0.15, 'square', 0.6, 0.001);
    setTimeout(() => this._tone(880, 0.15, 'square', 0.6, 0.001), 100);
    setTimeout(() => this._tone(1100, 0.3, 'square', 0.6, 0.001), 200);
  }
  uiClick() { this._tone(660, 0.04, 'square', 0.2, 0.001); }
  achievement() {
    this._tone(880, 0.1, 'triangle', 0.5, 0.001);
    setTimeout(() => this._tone(1100, 0.1, 'triangle', 0.5, 0.001), 80);
    setTimeout(() => this._tone(1320, 0.2, 'triangle', 0.5, 0.001), 160);
  }
  fire() { if (this._throttle('fire', 80)) this._tone(660, 0.05, 'sawtooth', 0.18, 0.001, 880); }
  explode() { this._noise(0.3, 0.6, 200); this._tone(60, 0.3, 'sawtooth', 0.5, 0.001, 30); }
}

const AudioManager = new AudioManagerSingleton();
export default AudioManager;
