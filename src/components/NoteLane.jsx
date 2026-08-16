import { useEffect, useRef } from 'react';
import { Heart } from 'lucide-react';
import { JUDGE_LABEL } from '../utils/gameScoring';

const RAINBOW = ['#ff3d71', '#ffd54a', '#3dffa8', '#22e4ff', '#b47cff'];

/**
 * ノーツレーン
 *
 * ノーツは「ペースメーカー」であり、採点には関与しない。
 * 採点は圧迫の間隔（60000/interval）で行うため、MediaPipe の遅延に影響されない。
 * 流れ去ったノーツは減点しない（絶対タイミング判定を裏口から入れないため）。
 *
 * @param {Array} notes    - [{ id, color, time }] time はヒットゾーン到達予定時刻
 * @param {number} nowRef  - 現在時刻（performance.now()）を持つ ref
 * @param {object} judge   - { type, key } 直近の判定（表示用）
 */
export default function NoteLane({ notes, laneRef, judge, burstKey }) {
  const wrapRef = useRef(null);

  // レーンの実幅を CSS 変数として渡す（ノーツの座標計算に使う）
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !laneRef) return;
    laneRef.current = el;
  }, [laneRef]);

  return (
    <div ref={wrapRef} className="g-glass g-lane">
      <div className="g-hit-zone" />
      <div className="g-hit-ring" />

      {/* 判定リング中央の光 */}
      {burstKey > 0 && (
        <div
          key={burstKey}
          style={{
            position: 'absolute',
            left: 37,
            top: '50%',
            width: 28,
            height: 28,
            marginTop: -14,
            borderRadius: '50%',
            background: '#ffd54a',
            boxShadow: '0 0 22px #ffd54a',
            animation: 'g-burst 320ms ease-out forwards',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* 判定表示 */}
      {judge?.type && (
        <span key={judge.key} className={`g-judge ${judge.type}`}>
          {JUDGE_LABEL[judge.type]}
        </span>
      )}

      {/* ノーツ */}
      {notes.map((n) => (
        <div
          key={n.id}
          className={`g-note ${n.color}`}
          style={{ transform: `translate3d(${n.x}px, 0, 0)` }}
        >
          {n.color === 'rainbow' ? (
            RAINBOW.map((c) => <span key={c} style={{ background: c }} />)
          ) : (
            <Heart
              size={22}
              fill={n.color === 'white' ? 'none' : 'rgba(0,0,0,0.55)'}
              color={n.color === 'white' ? '#cfc7f0' : 'rgba(0,0,0,0.55)'}
            />
          )}
        </div>
      ))}
    </div>
  );
}
