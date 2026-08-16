// =============================================
// PUSH BEAT — 効果音（Web Audio API の合成音）
// 音声ファイル不要。Chromebook でも軽量に動く
// =============================================

let ctx = null;
let master = null;
let muted = false;

/** 教室で30人が同時に使うため、既定音量は控えめにする */
const MASTER_GAIN = 0.18;

function ensureCtx() {
  if (ctx) return ctx;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  ctx = new AudioCtx();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : MASTER_GAIN;
  master.connect(ctx.destination);
  return ctx;
}

/** ユーザー操作の直後に呼ぶ（自動再生制限の解除） */
export function initAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export function setMuted(v) {
  muted = v;
  if (master) master.gain.value = v ? 0 : MASTER_GAIN;
}

export function isMuted() {
  return muted;
}

export function closeAudio() {
  if (ctx) {
    ctx.close().catch(() => {});
    ctx = null;
    master = null;
  }
}

/**
 * 単発のトーンを鳴らす
 */
function tone({ freq, duration = 0.12, type = 'sine', gain = 1, slideTo = null, delay = 0 }) {
  const c = ensureCtx();
  if (!c || muted) return;
  const t0 = c.currentTime + delay;

  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + duration);
  }

  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  osc.connect(env);
  env.connect(master);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** ノイズ系の打撃音（アタック感を足す） */
function noiseBurst(duration = 0.05, gain = 0.5) {
  const c = ensureCtx();
  if (!c || muted) return;
  const frames = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }
  const src = c.createBufferSource();
  src.buffer = buffer;

  const env = c.createGain();
  env.gain.value = gain;

  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1200;

  src.connect(filter);
  filter.connect(env);
  env.connect(master);
  src.start();
}

/**
 * 良判定：コンボが伸びるほどピッチが上がる
 */
export function playGood(combo = 0) {
  const step = Math.min(combo, 48);
  const freq = 520 * Math.pow(2, step / 48); // 1オクターブ内で上昇
  tone({ freq, duration: 0.11, type: 'triangle', gain: 0.5 });
  tone({ freq: freq * 1.5, duration: 0.08, type: 'sine', gain: 0.25 });
  noiseBurst(0.04, 0.35);
}

/** 可判定：やや低く短い */
export function playOk(combo = 0) {
  const step = Math.min(combo, 48);
  const freq = 380 * Math.pow(2, step / 96);
  tone({ freq, duration: 0.09, type: 'triangle', gain: 0.35 });
  noiseBurst(0.03, 0.2);
}

/** 不可判定：下降する濁った音 */
export function playMiss() {
  tone({ freq: 220, slideTo: 120, duration: 0.18, type: 'sawtooth', gain: 0.22 });
}

/** 予告演出のサイレン（3Hz 未満のゆっくりした揺れ） */
export function playSiren() {
  tone({ freq: 620, slideTo: 880, duration: 0.35, type: 'sine', gain: 0.28 });
  tone({ freq: 880, slideTo: 620, duration: 0.35, type: 'sine', gain: 0.28, delay: 0.35 });
}

/** 予告演出のランクに応じた音 */
export function playCue(tier = 1) {
  if (tier >= 4) {
    // 超激アツ：上昇アルペジオ
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, duration: 0.16, type: 'square', gain: 0.3, delay: i * 0.09 })
    );
  } else if (tier === 3) {
    [523, 784].forEach((f, i) =>
      tone({ freq: f, duration: 0.15, type: 'square', gain: 0.28, delay: i * 0.1 })
    );
  } else {
    playSiren();
  }
}

/** RUSH 突入 */
export function playRushStart() {
  [392, 523, 659, 784, 1047, 1319].forEach((f, i) =>
    tone({ freq: f, duration: 0.22, type: 'square', gain: 0.34, delay: i * 0.07 })
  );
  noiseBurst(0.25, 0.4);
}

/** RUSH 継続 */
export function playContinue() {
  [659, 880, 1047].forEach((f, i) =>
    tone({ freq: f, duration: 0.2, type: 'triangle', gain: 0.36, delay: i * 0.08 })
  );
}

/** RUSH 終了 */
export function playRushEnd() {
  tone({ freq: 440, slideTo: 220, duration: 0.5, type: 'sine', gain: 0.25 });
}

/** コンボの節目 */
export function playMilestone() {
  [784, 988, 1175].forEach((f, i) =>
    tone({ freq: f, duration: 0.18, type: 'square', gain: 0.32, delay: i * 0.06 })
  );
}

/** カウントダウン */
export function playCountdown(isFinal = false) {
  tone({
    freq: isFinal ? 880 : 523,
    duration: isFinal ? 0.35 : 0.14,
    type: 'triangle',
    gain: 0.4,
  });
}

/** 終了ファンファーレ */
export function playFinish() {
  [523, 659, 784, 1047].forEach((f, i) =>
    tone({ freq: f, duration: 0.35, type: 'triangle', gain: 0.38, delay: i * 0.12 })
  );
}
