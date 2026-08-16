// =============================================
// PUSH BEAT — 演出抽選（パチンコ演出層）
// =============================================
// 設計の大原則：運ゲーにしない
//   実力（リズム精度）→ RUSH に入れるか・何点取れるか を決める
//   抽選（ランダム）  → どの演出で盛り上げるか（味付け）だけを決める
// つまり「当たるかどうか」は実力、「どう当たるか」は演出。
// =============================================

import { JUDGE } from './gameScoring';

/**
 * 保留（NEXT）の段階。下にいくほど信頼度が高い。
 * 見た目は 灰 → 深赤 → 赤 → アンバー → ハザード縞 の順に熱くなる。
 */
export const HOLD = {
  NONE: 'none',       // 通常
  LOW: 'low',         // 微アツ
  MID: 'mid',         // アツい
  HIGH: 'high',       // 激アツ
  CONFIRM: 'confirm', // 確定（ハザード縞）
};

/** 段階ごとのチャンスゲージ加算ボーナス */
export const HOLD_BONUS = {
  [HOLD.NONE]: 0,
  [HOLD.LOW]: 0.3,
  [HOLD.MID]: 0.7,
  [HOLD.HIGH]: 1.4,
  [HOLD.CONFIRM]: 3.0,
};

/** 保留の本数 */
export const HOLD_SLOTS = 4;

/** 予告演出の段階 */
export const CUE = {
  SIREN: 'siren',
  AMBULANCE: 'ambulance',
  FLEET: 'fleet',
  HELI: 'heli',
  ALERT: 'alert',
};

export const CUE_INFO = {
  [CUE.SIREN]:      { tier: 1, text: 'サイレン…',        badge: '微アツ',   icon: 'siren' },
  [CUE.AMBULANCE]:  { tier: 2, text: '救急車が向かっている', badge: 'アツい',   icon: 'ambulance' },
  [CUE.FLEET]:      { tier: 3, text: '救急車の群れ！',      badge: '激アツ',   icon: 'fleet' },
  [CUE.HELI]:       { tier: 4, text: 'ドクターヘリ出動！！', badge: '超激アツ', icon: 'heli' },
  [CUE.ALERT]:      { tier: 4, text: '全隊 出動！！',      badge: '確定',     icon: 'alert' },
};

/**
 * 直近の判定履歴から「調子」を 0〜1 で算出する。
 * これが演出ランクの土台。上手いほど赤・虹が出る。
 */
export function calcMomentum(recentJudges) {
  if (recentJudges.length === 0) return 0;
  const window = recentJudges.slice(-16);
  let point = 0;
  for (const j of window) {
    if (j === JUDGE.GOOD) point += 1;
    else if (j === JUDGE.OK) point += 0.5;
  }
  return Math.min(1, point / window.length);
}

/** ハザード縞の保留（RUSH 確定）が出現できるチャンスゲージの下限 */
export const CONFIRM_GAUGE_MIN = 75;

/**
 * 次の保留の段階を抽選する。
 * 調子が良いほど上位の段階が出やすい（運だけで確定は出ない）。
 *
 * 確定（ハザード縞）は「ゲージが十分溜まっている」ときにしか出さない。
 * こうすることで「縞＝確定」という演出の約束を守りつつ、
 * RUSH に入れるかどうかは実力（ゲージの積み上げ）で決まるようにしている。
 * 確定をいつでも抽選対象にすると、運だけでスコアが数倍ブレてランキングが壊れる。
 */
export function rollHoldColor(momentum, combo, gauge = 0) {
  // 調子と現在のコンボから「熱さ」を決める
  const heat = Math.min(1, momentum * 0.75 + Math.min(combo, 60) / 60 * 0.25);

  // 熱さが低いうちは上位色を抽選対象にしない
  const r = Math.random();
  if (heat >= 0.9) {
    if (r < 0.1 && gauge >= CONFIRM_GAUGE_MIN) return HOLD.CONFIRM;
    if (r < 0.4) return HOLD.HIGH;
    if (r < 0.7) return HOLD.MID;
    return HOLD.LOW;
  }
  if (heat >= 0.7) {
    if (r < 0.12) return HOLD.HIGH;
    if (r < 0.42) return HOLD.MID;
    if (r < 0.75) return HOLD.LOW;
    return HOLD.NONE;
  }
  if (heat >= 0.45) {
    if (r < 0.1) return HOLD.MID;
    if (r < 0.4) return HOLD.LOW;
    return HOLD.NONE;
  }
  if (r < 0.15) return HOLD.LOW;
  return HOLD.NONE;
}

/** ハザード縞の保留は RUSH 突入確定 */
export function isConfirmedHold(color) {
  return color === HOLD.CONFIRM;
}

/**
 * 予告演出を抽選する。
 * ゲージの溜まり具合と調子で「出せる最高ランク」が決まり、
 * その中でどれが出るかだけがランダム。
 */
export function rollCue(gauge, momentum) {
  const heat = gauge / 100 * 0.6 + momentum * 0.4;

  // 熱くないときは演出を出さない（出しすぎると価値が下がる）
  if (heat < 0.35) return null;

  const r = Math.random();
  if (heat >= 0.88) {
    if (r < 0.22) return CUE.HELI;
    if (r < 0.55) return CUE.FLEET;
    if (r < 0.8) return CUE.AMBULANCE;
    return CUE.SIREN;
  }
  if (heat >= 0.65) {
    if (r < 0.18) return CUE.FLEET;
    if (r < 0.55) return CUE.AMBULANCE;
    return CUE.SIREN;
  }
  if (r < 0.35) return CUE.AMBULANCE;
  return CUE.SIREN;
}

/** 予告演出を出す間隔の下限（ミリ秒）。連発を防ぐ */
export const CUE_COOLDOWN_MS = 7000;

/** 予告演出の表示時間（ミリ秒） */
export const CUE_DISPLAY_MS = 2600;

/**
 * RUSH 終了時の演出パターンを決める。
 * 継続するかどうかは実力（continues）で決まっており、
 * ここで抽選するのは「どう見せるか」だけ。
 */
export function rollRushOutro(continues) {
  if (continues) {
    // 3回に1回は「終了…」と見せてから復活させる
    return Math.random() < 0.35 ? 'revive' : 'continue';
  }
  return 'end';
}

/** RUSH 終了演出のセリフ */
export const OUTRO_STEPS = {
  continue: [{ text: '継続！', ms: 1400, tone: 'gold' }],
  revive: [
    { text: '終了…', ms: 1100, tone: 'dim' },
    { text: '復活！！', ms: 1500, tone: 'gold' },
  ],
  end: [{ text: 'RUSH 終了', ms: 1200, tone: 'dim' }],
};

/** コンボの節目（全画面演出を出す） */
export const MILESTONES = [50, 100, 150, 200];

export function isMilestone(combo) {
  return MILESTONES.includes(combo);
}
