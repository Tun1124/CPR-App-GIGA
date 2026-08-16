import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { RotateCcw, Home, AlertTriangle, Zap, Trophy } from 'lucide-react';
import { calcScore } from '../utils/scoring';
import { postScore } from '../utils/gas';

const RANK_COLOR = { S: '#f39c12', A: '#27ae60', B: '#2980b9', C: '#7f8c8d' };

/**
 * リザルトの振り分け
 * PUSH BEAT（リズムゲーム）と、ビデオ評価とで表示を分ける。
 * フックの順序を保つため、実体は別コンポーネントに分けている。
 */
export default function Result() {
  const { state } = useLocation();
  return state?.mode === 'game'
    ? <GameResult state={state} />
    : <VideoResult state={state} />;
}

function VideoResult({ state }) {
  const navigate = useNavigate();
  const sentRef = useRef(false);

  const { bpmValues = [], tiltValues = [], compressions = 0,
          isAborted = false, school = '', className = '', studentNum = '',
          schoolType = 'elementary' } = state ?? {};

  const result = isAborted ? null : calcScore(bpmValues, tiltValues);

  // GAS 送信（1回のみ）
  useEffect(() => {
    if (!result || sentRef.current) return;
    sentRef.current = true;
    postScore({
      score: result.score,
      medianBpm: result.medianBpm,
      medianTilt: result.medianTilt,
      compressions,
      bpmOutOfRange: result.bpmOutOfRange,
      badFrameRate: result.badFrameRate,
      school,
      className,
      studentNum,
      schoolType,
      timestamp: new Date().toISOString(),
    });
  }, []);

  // エキスパート（S ランク）なら紙吹雪
  useEffect(() => {
    if (result?.rank.tier === 'S') {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
    }
  }, [result]);

  // 中断エラー UI
  if (isAborted || !state) {
    return (
      <div className="page result-page center">
        <AlertTriangle size={56} color="#e74c3c" />
        <h2 className="error-title">計測を中断しました</h2>
        <p className="error-msg">動画の読み込みに失敗したか、解析が正常に完了しませんでした。</p>
        <button className="btn btn-primary" onClick={() => navigate('/evaluate')}>
          <RotateCcw size={20} /> もう一度試す
        </button>
        <button className="btn btn-outline" onClick={() => navigate('/')}>
          <Home size={20} /> ホームへ
        </button>
      </div>
    );
  }

  const { score, rank, advice, medianBpm, medianTilt,
          bpmDeduction, tiltDeduction, bpmOutOfRange, badFrameRate } = result;

  return (
    <div className="page result-page">
      {/* スコア表示 */}
      <motion.div
        className="score-card"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 18 }}
      >
        <span className="rank-label" style={{ color: RANK_COLOR[rank.tier] }}>
          {rank.label}
        </span>
        <motion.span
          className="score-number"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {score}<span className="score-unit">点</span>
        </motion.span>
        <span className="rank-name" style={{ color: RANK_COLOR[rank.tier] }}>
          {rank.name}
        </span>
      </motion.div>

      {/* 内訳 */}
      <motion.div
        className="breakdown"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className={`breakdown-item ${bpmDeduction === 0 ? 'ok' : 'ng'}`}>
          <span className="breakdown-label">リズム（BPM）</span>
          <span className="breakdown-value">{medianBpm} 回/分</span>
          <span className="breakdown-detail">
            {bpmDeduction === 0
              ? '✓ 合格'
              : `範囲外 ${bpmOutOfRange}回 → −${bpmDeduction}点`}
          </span>
        </div>
        <div className={`breakdown-item ${tiltDeduction === 0 ? 'ok' : 'ng'}`}>
          <span className="breakdown-label">姿勢（傾き）</span>
          <span className="breakdown-value">{medianTilt}°</span>
          <span className="breakdown-detail">
            {tiltDeduction === 0
              ? '✓ 合格'
              : `不良フレーム ${Math.round(badFrameRate * 100)}% → −${tiltDeduction}点`}
          </span>
        </div>
        <div className="breakdown-item neutral">
          <span className="breakdown-label">圧迫回数</span>
          <span className="breakdown-value">{compressions} 回</span>
        </div>
      </motion.div>

      {/* アドバイス（仕様書§4.3 準拠） */}
      {advice.length > 0 && (
        <motion.div
          className="advice-box"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p className="advice-title">上達のヒント</p>
          {advice.map((a, i) => <p key={i} className="advice-text">• {a}</p>)}
        </motion.div>
      )}

      {/* アクション */}
      <div className="result-actions">
        <button className="btn btn-primary" onClick={() => navigate('/evaluate')}>
          <RotateCcw size={20} /> もう一度評価する
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/ranking')}>
          ランキングを見る
        </button>
        <button className="btn btn-outline" onClick={() => navigate('/')}>
          <Home size={20} /> ホームへ
        </button>
      </div>
    </div>
  );
}

/* =============================================
   PUSH BEAT リザルト
   ============================================= */
function GameResult({ state }) {
  const navigate = useNavigate();
  const sentRef = useRef(false);

  const {
    gameScore = 0, maxCombo = 0, goodCount = 0, okCount = 0, missCount = 0,
    rushCount = 0, rank, advice = [],
    school = '', className = '', studentNum = '', schoolType = 'elementary',
  } = state;

  // GAS 送信（1回のみ）
  // データベースは今後変更予定のため、既存フィールドに無理に合わせず追加項目として送る。
  // 現行の GAS は未知のフィールドを無視するため、既存ランキングは壊れない。
  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    postScore({
      mode: 'game',
      gameScore, maxCombo, goodCount, okCount, missCount, rushCount,
      rank: rank?.tier ?? '',
      school, className, studentNum, schoolType,
      timestamp: new Date().toISOString(),
    });
  }, []);

  // 上位ランクは紙吹雪
  useEffect(() => {
    if (rank?.tier === 'rainbow') {
      confetti({ particleCount: 240, spread: 100, origin: { y: 0.5 } });
    } else if (rank?.tier === 'gold') {
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.5 } });
    }
  }, []);

  const total = goodCount + okCount + missCount;

  return (
    <div className="page result-page game-result">
      <motion.div
        className="score-card game-card"
        initial={{ scale: 0.75, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 18 }}
      >
        <span className="font-display" style={{ fontSize: '2.6rem', color: rank?.color }}>
          {rank?.label}
        </span>
        <motion.span
          className="font-display"
          style={{ fontSize: '3rem', color: '#fff', lineHeight: 1 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {gameScore.toLocaleString()}
        </motion.span>
        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: rank?.color }}>
          {rank?.name}
        </span>
      </motion.div>

      <motion.div
        className="breakdown"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="breakdown-item ok">
          <span className="breakdown-label">最大コンボ</span>
          <span className="breakdown-value">{maxCombo}</span>
        </div>
        <div className="breakdown-item neutral">
          <span className="breakdown-label">救命RUSH</span>
          <span className="breakdown-value">{rushCount} 回</span>
        </div>
        <div className="breakdown-item ok">
          <span className="breakdown-label">良 / 可 / 不可</span>
          <span className="breakdown-value">{goodCount} / {okCount} / {missCount}</span>
          <span className="breakdown-detail">全 {total} 回の圧迫</span>
        </div>
      </motion.div>

      {advice.length > 0 && (
        <motion.div
          className="advice-box"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p className="advice-title">上達のヒント</p>
          {advice.map((a, i) => <p key={i} className="advice-text">• {a}</p>)}
        </motion.div>
      )}

      <div className="result-actions">
        <button className="btn btn-game" onClick={() => navigate('/game')}>
          <Zap size={20} /> もう一度挑戦する
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/ranking')}>
          <Trophy size={20} /> ランキングを見る
        </button>
        <button className="btn btn-outline" onClick={() => navigate('/')}>
          <Home size={20} /> ホームへ
        </button>
      </div>
    </div>
  );
}
