import { motion, AnimatePresence } from 'framer-motion';
import { Siren, Ambulance, Plane, TriangleAlert } from 'lucide-react';
import { CUE, CUE_INFO } from '../utils/effectDirector';

/**
 * パチンコ演出層
 *
 * 光過敏性発作への配慮：
 *   明滅は 3Hz 未満、全画面の急激な赤フラッシュは使わない。
 *   教室で30人が同時に見るため必須の制約。
 */

function CueIcon({ type, size = 19 }) {
  if (type === CUE.HELI) return <Plane size={size} />;
  if (type === CUE.ALERT) return <TriangleAlert size={size} />;
  if (type === CUE.SIREN) return <Siren size={size} />;
  return <Ambulance size={size} />;
}

/** 予告演出の帯 */
export function CueBanner({ cue }) {
  return (
    <AnimatePresence>
      {cue && (
        <motion.div
          key={cue}
          className={`g-banner t${CUE_INFO[cue].tier}`}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <span className="g-banner-text">
            {/* ランクが上がるほど台数が増える（群れ演出） */}
            {CUE_INFO[cue].tier >= 3 && <CueIcon type={cue} size={15} />}
            {CUE_INFO[cue].tier >= 3 && <CueIcon type={cue} size={17} />}
            <CueIcon type={cue} />
            <span>{CUE_INFO[cue].text}</span>
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
          initial={{ opacity: 0, scale: 0.72 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.22 }}
          transition={{ type: 'spring', stiffness: 300, damping: 17 }}
        >
          <span
            style={{
              color: cutin.tone === 'dim' ? '#8c8076' : '#f5a623',
              textShadow: cutin.tone === 'dim' ? 'none' : '4px 4px 0 #8a5a0c',
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18 }}
    >
      <span className="font-display" style={{ fontSize: '1rem', color: '#f5a623' }}>
        救命RUSH ×5
      </span>
      <span className="g-badge">あと {remainSec}秒</span>
    </motion.div>
  );
}
