import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Video, Trophy, ClipboardList } from 'lucide-react';

/** 心電図の罫。全画面に通す共通モチーフ */
function EcgRule() {
  return (
    <svg className="ecg-rule" viewBox="0 0 300 22" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points="0,11 40,11 48,11 54,3 60,19 66,11 100,11 140,11 148,11 154,3 160,19 166,11 200,11 250,11 258,11 264,3 270,19 276,11 300,11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

const MENU = [
  { num: '01', label: '訓練を開始する', to: '/game', icon: Zap, primary: true },
  { num: '02', label: 'ビデオで評価する', to: '/evaluate', icon: Video },
  { num: '03', label: '記録と順位', to: '/ranking', icon: Trophy },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="page home-page">
      <EcgRule />

      {/* 記章 ＋ 名称 */}
      <div className="home-header">
        <motion.div
          className="emblem"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg viewBox="0 0 24 22" width="26" height="24" aria-hidden="true">
            <path
              d="M12 20.5C12 20.5 2.5 14.5 2.5 8.2 2.5 5 5 3 7.6 3c1.9 0 3.4 1 4.4 2.4C13 4 14.5 3 16.4 3 19 3 21.5 5 21.5 8.2c0 6.3-9.5 12.3-9.5 12.3z"
              fill="#f2ede6"
            />
          </svg>
        </motion.div>
        <div>
          <h1 className="app-title">犬山ジュニア<br />救命士</h1>
          <p className="app-subtitle">RESCUE TRAINING PROGRAM</p>
        </div>
      </div>

      {/* メニュー */}
      <div className="home-buttons">
        {MENU.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.button
              key={m.num}
              className={`btn ${m.primary ? 'btn-game' : ''}`}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * (i + 1) }}
              onClick={() => navigate(m.to)}
            >
              <span className="btn-label"><Icon size={19} /> {m.label}</span>
              <span className="btn-num">{m.num}</span>
            </motion.button>
          );
        })}

        <motion.a
          className="btn"
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          href="#"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="btn-label"><ClipboardList size={19} /> アンケートに回答する</span>
          <span className="btn-num">04</span>
        </motion.a>
      </div>

      <p className="home-note">JRC 蘇生ガイドライン 2020 準拠</p>
      <EcgRule />
    </div>
  );
}
