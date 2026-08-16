import { useEffect, useRef } from 'react';
import { JUDGE_LABEL } from '../utils/gameScoring';

/** 拍動マーク。ノーツにも記章にも使う、このアプリの署名となる形 */
export function PulseMark({ width = 20, color = '#3d0f09', strokeWidth = 2.2 }) {
  return (
    <svg viewBox="0 0 24 12" width={width} height={width / 2} aria-hidden="true">
      <polyline
        points="0,6 7,6 10,1 13,11 16,6 24,6"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}

/** 段階ごとの、拍動マークの線の色（地の色に対して沈める） */
const MARK_COLOR = {
  none: '#2f2925',
  low: '#3d0f09',
  mid: '#3d0f09',
  high: '#2b1b04',
  confirm: '#2b1b04',
};

/**
 * ノーツレーン
 *
 * ノーツは「ペースメーカー」であり、採点には関与しない。
 * 採点は圧迫の間隔（60000/interval）で行うため、MediaPipe の遅延に影響されない。
 * 流れ去ったノーツは減点しない（絶対タイミング判定を裏口から入れないため）。
 */
export default function NoteLane({ notes, laneRef, judge, burstKey }) {
  const wrapRef = useRef(null);

  useEffect(() => {
    if (laneRef) laneRef.current = wrapRef.current;
  }, [laneRef]);

  return (
    <div ref={wrapRef} className="g-lane">
      {/* 背景に走る心電図の線 */}
      <svg
        className="g-lane-ecg"
        viewBox="0 0 420 96"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline
          points="0,48 70,48 78,48 84,28 90,70 96,48 170,48 240,48 248,48 254,28 260,70 266,48 340,48 420,48"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>

      <div className="g-hit-bar" />
      <div className="g-hit-ring" />

      {burstKey > 0 && <div key={burstKey} className="g-burst" />}

      {judge?.type && (
        <span key={judge.key} className={`g-judge ${judge.type}`}>
          {JUDGE_LABEL[judge.type]}
        </span>
      )}

      {notes.map((n) => (
        <div
          key={n.id}
          className={`g-note ${n.color}`}
          style={{ transform: `translate3d(${n.x}px, 0, 0) skewY(2.2deg)` }}
        >
          <PulseMark color={MARK_COLOR[n.color] ?? '#2b2320'} />
        </div>
      ))}
    </div>
  );
}
