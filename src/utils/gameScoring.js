// =============================================
// PUSH BEAT — 判定・コンボ・スコア
// 解析ロジック（仕様書§3）とは完全分離
// 既存 scoring.js（ビデオ評価の減点方式）にも影響しない
// =============================================

/** ゲーム時間（ミリ秒） */
export const GAME_DURATION_MS = 120000;

/** 目標テンポ（ノーツの流れる速さ） */
export const TARGET_BPM = 110;

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

/** コンボ1につき加算される点数 */
const COMBO_STEP = 10;

/**
 * ノーツの見た目が変わるコンボ数。
 * 予告演出（救急車）の節目と揃えてあるため、
 * 「演出が出る」と「ノーツが熱くなる」が同時に起きる。
 */
export const NOTE_TIER_NEAR = 25;
export const NOTE_TIER_HOT = 80;

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
 *   獲得点 = 基礎点 + コンボ × 10
 * コンボ補正に上限はない。続けるほど1回の価値が上がる。
 */
export function calcHitPoints(judge, combo) {
  if (judge === JUDGE.MISS) return 0;
  return BASE_POINT[judge] + combo * COMBO_STEP;
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
    goodCount: 0,
    okCount: 0,
    missCount: 0,
  };
}

/**
 * 1回の圧迫を状態に反映する（破壊的更新）
 * @returns {{ judge: string, points: number }}
 */
export function applyHit(state, bpm) {
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

  const points = calcHitPoints(judge, state.combo);
  state.score += points;

  return { judge, points };
}

/** コンボに応じたノーツの見た目 */
export function noteTier(combo) {
  if (combo >= NOTE_TIER_HOT) return 'hot';
  if (combo >= NOTE_TIER_NEAR) return 'near';
  return 'normal';
}

/**
 * 終了ランクを判定する
 * 特級（ノーミス）／一級／二級／三級／修了
 *
 * しきい値は実測で決めている（2分・約220回の想定）:
 *   理論最大（全て良）  約 309,000
 *   精度97%            約 90,000〜209,000
 *   精度80%            約  54,000〜 68,000
 *   精度45%            約  26,000〜 33,000
 */
export function calcRank(state) {
  const totalHits = state.goodCount + state.okCount;
  if (state.missCount === 0 && totalHits >= 30) {
    return { tier: 'perfect', label: '特級', name: 'ノーミス達成', color: '#f5a623' };
  }
  if (state.score >= 150000) return { tier: 'first', label: '一級', name: '極めて優秀', color: '#f5a623' };
  if (state.score >= 80000) return { tier: 'second', label: '二級', name: '優秀', color: '#e03a2b' };
  if (state.score >= 35000) return { tier: 'third', label: '三級', name: '良好', color: '#f2ede6' };
  return { tier: 'clear', label: '修了', name: '完走', color: '#8c8076' };
}

/** アドバイス（リズムに特化） */
export function calcGameAdvice(state) {
  const advice = [];
  const totalHits = state.goodCount + state.okCount;
  if (state.missCount > totalHits * 0.3) {
    advice.push('テンポが安定していません。1分間に100〜120回の一定のリズムを意識しましょう。');
  }
  if (state.maxCombo < 20) {
    advice.push('連続して同じ速さで押し続けると、コンボが伸びて1回あたりの点が大きく上がります。');
  }
  if (advice.length === 0) {
    advice.push('とても安定したリズムです。この感覚を覚えておきましょう。');
  }
  return advice;
}
