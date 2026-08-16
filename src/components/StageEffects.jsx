import { motion, AnimatePresence } from 'framer-motion';
import { Siren, Ambulance, Plane, Sparkles } from 'lucide-react';
import { CUE, CUE_INFO } from '../utils/effectDirector';

/**
 * パチンコ演出層
 *
 * 光過敏性発作への配慮：
 *   明滅は 3Hz 未満（この実装では最速でも約 1.7Hz）、
 *   全画面の急激な赤フラッシュは使わず、低コントラストに抑える。
 *   教室で30人が同時に見るため必須の制約。
 */

function CueIcon({ type }) {
  if (type === CUE.HELI) return <Plane size={20} />;
  if (type === CUE.RAINBOW_BG) return <Sparkles size={20} />;
  if (type === CUE.SIREN) return <Siren size={20} />;
  return <Ambulance size={20} />;
}

/** 予告演出バナー */
export function CueBanner({ cue }) {
  return (
    <AnimatePresence>
      {cue && (
        <motion.div
          key={cue}
          className={`g-banner t${CUE_INFO[cue].tier}`}
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* ランクが上がるほど台数が増える（群れ演出） */}
            {CUE_INFO[cue].tier >= 3 && <CueIcon type={cue} />}
            {CUE_INFO[cue].tier >= 3 && <CueIcon type={cue} />}
            <CueIcon type={cue} />
            <span style={{ fontSize: '0.95rem' }}>{CUE_INFO[cue].text}</span>
          </span>
          <span className="g-badge">{CUE_INFO[cue].badge}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** 全画面カットイン（コンボの節目・RUSH 突入・継続/復活） */
export function CutIn({ cutin }) {
  return (
    <AnimatePresence>
      {cutin && (
        <motion.div
          key={cutin.key}
          className="g-cutin"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.25 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        >
          <span
            style={{
              color: cutin.tone === 'dim' ? '#9b8fd9' : '#ffd54a',
              textShadow:
                cutin.tone === 'dim' ? 'none' : '0 0 30px rgba(255,213,74,0.9)',
              padding: '0 16px',
            }}
          >
            {cutin.text}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** RUSH 中の帯 */
export function RushBadge({ isRush, remainSec }) {
  if (!isRush) return null;
  return (
    <motion.div
      className="g-banner t4"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <span className="font-display" style={{ fontSize: '1.05rem', color: '#ffd54a' }}>
        救命RUSH ×5
      </span>
      <span className="g-badge">あと {remainSec}秒</span>
    </motion.div>
  );
}
