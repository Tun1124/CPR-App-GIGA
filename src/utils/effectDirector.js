// =============================================
// PUSH BEAT — 演出（予告・カットイン）
// =============================================
// 演出はコンボに連動させる。
// 抽選で出すのではなく「コンボが伸びたら出る」ので、
// 上手いほど盛り上がる＝実力と演出が一致する。
// =============================================

/** 予告演出の段階 */
export const CUE = {
  SIREN: 'siren',
  AMBULANCE: 'ambulance',
  FLEET: 'fleet',
  HELI: 'heli',
  ALERT: 'alert',
};

export const CUE_INFO = {
  [CUE.SIREN]:     { tier: 1, text: 'サイレンが鳴った',     badge: '10',  icon: 'siren' },
  [CUE.AMBULANCE]: { tier: 2, text: '救急車が向かっている', badge: '25',  icon: 'ambulance' },
  [CUE.FLEET]:     { tier: 3, text: '救急車の群れ！',       badge: '50',  icon: 'fleet' },
  [CUE.HELI]:      { tier: 4, text: 'ドクターヘリ出動！！', badge: '80',  icon: 'heli' },
  [CUE.ALERT]:     { tier: 4, text: '全隊 出動！！',        badge: '120', icon: 'alert' },
};

/**
 * コンボの節目と、そこで出る演出。
 * 到達した瞬間に確定で出る（運の要素はない）。
 */
export const CUE_STEPS = [
  { combo: 10,  cue: CUE.SIREN },
  { combo: 25,  cue: CUE.AMBULANCE },
  { combo: 50,  cue: CUE.FLEET },
  { combo: 80,  cue: CUE.HELI },
  { combo: 120, cue: CUE.ALERT },
];

/**
 * 現在のコンボで新たに到達した演出を返す。
 * @param {number} combo     現在のコンボ
 * @param {number} lastIndex 直前までに出した段階の番号（-1 なら未発生）
 * @returns {{ cue: string, index: number } | null}
 */
export function nextCue(combo, lastIndex) {
  for (let i = CUE_STEPS.length - 1; i > lastIndex; i--) {
    if (combo >= CUE_STEPS[i].combo) {
      return { cue: CUE_STEPS[i].cue, index: i };
    }
  }
  return null;
}

/** 予告演出の表示時間（ミリ秒） */
export const CUE_DISPLAY_MS = 2600;

/** コンボの節目（全画面演出を出す） */
export const MILESTONES = [50, 100, 150, 200];

export function isMilestone(combo) {
  return MILESTONES.includes(combo);
}
