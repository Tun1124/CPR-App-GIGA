// =============================================
// PUSH BEAT — 判定・コンボ・チャンスゲージ・スコア
// 解析ロジック（仕様書§3）とは完全分離
// 既存 scoring.js（ビデオ評価の減点方式）にも影響しない
// =============================================

/** ゲーム時間（ミリ秒） */
export const GAME_DURATION_MS = 120000;

/** 目標テンポ（ノーツの流れる速さ） */
export const TARGET_BPM = 110;

/** RUSH の継続時間（ミリ秒） */
export const RUSH_DURATION_MS = 20000;

/** RUSH 中の得点倍率 */
export const RUSH_MULTIPLIER = 5;

/** 判定の種類 */
export const JUDGE = {
  GOOD: 'good', // 良
  OK: 'ok',     // 可
  MISS: 'miss', // 不可
};

export const JUDGE_LABEL = {
  [JUDGE.GOOD]: '良!',
  [JUDGE.OK]: '可',
  [JUDGE.MISS]: '不可',
};

const BASE_POINT = {
  [JUDGE.GOOD]: 300,
  [JUDGE.OK]: 100,
  [JUDGE.MISS]: 0,
};

const GAUGE_DELTA = {
  [JUDGE.GOOD]: 1.5,
  [JUDGE.OK]: 0.7,
  [JUDGE.MISS]: -2.5,
};

/**
 * 瞬間BPMから判定を返す
 * 良: 105〜115 / 可: 100〜120 / 不可: それ以外
 */
export function judgeBpm(bpm) {
  if (bpm >= 105 && bpm <= 115) return JUDGE.GOOD;
  if (bpm >= 100 && bpm <= 120) return JUDGE.OK;
  return JUDGE.MISS;
}

/**
 * 1回の圧迫で得られる点数
 * 獲得点 = (基礎点 + min(コンボ, 100) × 10) × 倍率
 */
export function calcHitPoints(judge, combo, isRush) {
  if (judge === JUDGE.MISS) return 0;
  const base = BASE_POINT[judge];
  const comboBonus = Math.min(combo, 100) * 10;
  return (base + comboBonus) * (isRush ? RUSH_MULTIPLIER : 1);
}

/** チャンスゲージの増減量（保留の色が濃いほどボーナス） */
export function calcGaugeDelta(judge, holdBonus = 0) {
  const delta = GAUGE_DELTA[judge];
  return delta > 0 ? delta + holdBonus : delta;
}

/** ゲージを 0〜100 に収める */
export function clampGauge(v) {
  return Math.max(0, Math.min(100, v));
}

/**
 * ゲーム状態の初期値
 * 毎フレーム更新するため useRef に入れて使う
 */
export function createGameState() {
  return {
    score: 0,
    combo: 0,
    maxCombo: 0,
    gauge: 0,
    goodCount: 0,
    okCount: 0,
    missCount: 0,
    rushCount: 0,
    isRush: false,
    rushEndsAt: 0,
  };
}

/**
 * 1回の圧迫を状態に反映する（破壊的更新）
 * @returns {{ judge: string, points: number, rushStarted: boolean }}
 */
export function applyHit(state, bpm, { holdBonus = 0, forceRush = false } = {}) {
  const judge = judgeBpm(bpm);

  if (judge === JUDGE.MISS) {
    state.combo = 0;
    state.missCount++;
  } else {
    state.combo++;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;
    if (judge === JUDGE.GOOD) state.goodCount++;
    else state.okCount++;
  }

  const points = calcHitPoints(judge, state.combo, state.isRush);
  state.score += points;
  state.gauge = clampGauge(state.gauge + calcGaugeDelta(judge, holdBonus));

  // RUSH 突入判定（ゲージ満タン、または虹保留による確定）
  let rushStarted = false;
  if (!state.isRush && (state.gauge >= 100 || forceRush)) {
    startRush(state);
    rushStarted = true;
  }

  return { judge, points, rushStarted };
}

/** RUSH を開始する */
export function startRush(state, now = performance.now()) {
  state.isRush = true;
  state.rushCount++;
  state.gauge = 0;
  state.rushEndsAt = now + RUSH_DURATION_MS;
}

/** RUSH を延長する（継続演出） */
export function extendRush(state, now = performance.now()) {
  state.rushCount++;
  state.rushEndsAt = now + RUSH_DURATION_MS;
}

/** RUSH を終了する */
export function endRush(state) {
  state.isRush = false;
  state.rushEndsAt = 0;
}

/**
 * RUSH 継続の可否を実力で判定する
 * 直近のリズムが安定していれば継続（運任せにしない）
 */
export function shouldContinueRush(recentJudges) {
  if (recentJudges.length < 8) return false;
  const window = recentJudges.slice(-12);
  const hits = window.filter((j) => j !== JUDGE.MISS).length;
  return hits / window.length >= 0.75;
}

/**
 * 終了ランクを判定する
 * 虹（フルコンボ）／金／銀／銅／完走
 */
export function calcRank(state) {
  const totalHits = state.goodCount + state.okCount;
  if (state.missCount === 0 && totalHits >= 30) {
    return { tier: 'rainbow', label: '虹', name: 'フルコンボ！', color: '#ffd54a' };
  }
  if (state.score >= 300000) return { tier: 'gold', label: '金', name: 'ゴールド', color: '#ffd54a' };
  if (state.score >= 150000) return { tier: 'silver', label: '銀', name: 'シルバー', color: '#d7dce6' };
  if (state.score >= 50000) return { tier: 'bronze', label: '銅', name: 'ブロンズ', color: '#e0a163' };
  return { tier: 'clear', label: '完', name: '完走', color: '#9b8fd9' };
}

/** アドバイス（リズムに特化） */
export function calcGameAdvice(state) {
  const advice = [];
  const totalHits = state.goodCount + state.okCount;
  if (state.missCount > totalHits * 0.3) {
    advice.push('テンポが安定していません。1分間に100〜120回の一定のリズムを意識しましょう。');
  }
  if (state.maxCombo < 20) {
    advice.push('連続して同じ速さで押し続けると、コンボが伸びて得点が大きく上がります。');
  }
  if (advice.length === 0) {
    advice.push('とても安定したリズムです。この感覚を覚えておきましょう。');
  }
  return advice;
}
