import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Loader2, Volume2, VolumeX, CameraOff, PlayCircle } from 'lucide-react';
import { globalPoseLandmarker, modelReady } from '../utils/mediapipe';
import NoteLane from '../components/NoteLane';
import { CueBanner, CutIn } from '../components/StageEffects';
import {
  GAME_DURATION_MS, TARGET_BPM, JUDGE,
  createGameState, applyHit, noteTier, calcRank, calcGameAdvice,
} from '../utils/gameScoring';
import { CUE_INFO, nextCue, CUE_DISPLAY_MS, isMilestone } from '../utils/effectDirector';
import * as sfx from '../utils/sound';

const ELEMENTARY_SCHOOLS = [
  '北小学校', '南小学校', '城東小学校', '今井小学校', '東小学校',
  '西小学校', '羽黒小学校', '楽田小学校', '池野小学校', '栗栖小学校',
];
const JUNIOR_SCHOOLS = ['犬山中学校', '城東中学校', '東部中学校', '南部中学校'];

const BEAT_MS = 60000 / TARGET_BPM;   // ノーツ1個あたりの間隔
const TRAVEL_MS = 2200;               // ノーツが右端から判定リングに届くまで
const HIT_X = 52;                     // 判定リングの中心X

const PHASE = { SETUP: 'setup', COUNTDOWN: 'countdown', PLAYING: 'playing', DENIED: 'denied' };

export default function RhythmGame() {
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const laneRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  const [school, setSchool] = useState('');
  const [className, setClassName] = useState('');
  const [studentNum, setStudentNum] = useState('');
  const [phase, setPhase] = useState(PHASE.SETUP);
  const [modelLoaded, setModelLoaded] = useState(modelReady);
  const [muted, setMutedState] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [detected, setDetected] = useState(false);

  // HUD 表示用（毎フレームではなく間引いて更新する）
  const [hud, setHud] = useState({
    score: 0, combo: 0, bpm: 0, remainSec: 120,
  });
  const [notes, setNotes] = useState([]);
  const [judge, setJudge] = useState(null);
  const [burstKey, setBurstKey] = useState(0);
  const [cue, setCue] = useState(null);
  const [cutin, setCutin] = useState(null);

  // 毎フレーム更新する値は ref で保持（再レンダリングを避ける）
  const stateRef = useRef(createGameState());
  const notesRef = useRef([]);
  const recentJudgesRef = useRef([]);
  const noteIdRef = useRef(0);
  const nextSpawnRef = useRef(0);
  const startedAtRef = useRef(0);
  const cueIndexRef = useRef(-1);   // 直前までに出した予告演出の段階
  const cueTimerRef = useRef(null);
  const cutinTimerRef = useRef([]);
  const phaseOffsetRef = useRef(0);   // ノーツの位相（プレイヤーに追従させる）
  const finishedRef = useRef(false);
  const lastBpmRef = useRef(0);       // 直近の瞬間BPM（表示用）

  // モデル読み込み監視
  useEffect(() => {
    if (modelReady) { setModelLoaded(true); return; }
    const id = setInterval(() => {
      if (modelReady) { setModelLoaded(true); clearInterval(id); }
    }, 500);
    return () => clearInterval(id);
  }, []);

  // 後始末：カメラ・ループ・音・タイマーを必ず止める
  const cleanup = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (cueTimerRef.current) clearTimeout(cueTimerRef.current);
    cutinTimerRef.current.forEach(clearTimeout);
    cutinTimerRef.current = [];
    sfx.closeAudio();
  }, []);

  useEffect(() => cleanup, [cleanup]);

  // 準備画面 → プレイ画面で video 要素が作り直されるため、
  // ストリームを新しい要素に繋ぎ直す
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !streamRef.current) return;
    if (v.srcObject !== streamRef.current) {
      v.srcObject = streamRef.current;
      v.play().catch(() => {});
    }
  }, [phase]);

  function toggleMute() {
    const next = !muted;
    setMutedState(next);
    sfx.setMuted(next);
  }

  /** カットインを順番に表示する */
  function showCutinSteps(steps) {
    let delay = 0;
    steps.forEach((s) => {
      const t1 = setTimeout(() => setCutin({ ...s, key: `${s.text}-${Date.now()}` }), delay);
      const t2 = setTimeout(() => setCutin(null), delay + s.ms);
      cutinTimerRef.current.push(t1, t2);
      delay += s.ms;
    });
  }

  /** コンボの節目に達したら予告演出を出す */
  function updateCue(combo) {
    // コンボが切れたら、また最初から出せるようにする
    if (combo === 0) { cueIndexRef.current = -1; return; }

    const hit = nextCue(combo, cueIndexRef.current);
    if (!hit) return;

    cueIndexRef.current = hit.index;
    setCue(hit.cue);
    sfx.playCue(CUE_INFO[hit.cue].tier);
    if (cueTimerRef.current) clearTimeout(cueTimerRef.current);
    cueTimerRef.current = setTimeout(() => setCue(null), CUE_DISPLAY_MS);
  }

  async function startGame() {
    if (!school) { alert('学校を選択してください'); return; }
    if (!className.trim()) { alert('クラスを入力してください'); return; }
    if (!studentNum.trim()) { alert('出席番号を入力してください'); return; }
    if (!modelLoaded) return;

    sfx.initAudio();

    // カメラ取得
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      v.srcObject = stream;
      await v.play();
    } catch {
      setPhase(PHASE.DENIED);
      return;
    }

    // 状態初期化
    stateRef.current = createGameState();
    notesRef.current = [];
    recentJudgesRef.current = [];
    noteIdRef.current = 0;
    finishedRef.current = false;
    phaseOffsetRef.current = 0;
    cueIndexRef.current = -1;

    setPhase(PHASE.COUNTDOWN);
    runCountdown();
  }

  function runCountdown() {
    let n = 3;
    setCountdown(n);
    sfx.playCountdown(false);
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(id);
        sfx.playCountdown(true);
        beginPlay();
      } else {
        setCountdown(n);
        sfx.playCountdown(false);
      }
    }, 1000);
    cutinTimerRef.current.push(id);
  }

  function beginPlay() {
    const now = performance.now();
    startedAtRef.current = now;
    nextSpawnRef.current = now + 600;
    setPhase(PHASE.PLAYING);
    loop();
  }

  /** 圧迫を1回検知したときの処理 */
  function onCompression(bpm) {
    const st = stateRef.current;
    lastBpmRef.current = Math.round(bpm);

    const { judge: j } = applyHit(st, bpm);

    recentJudgesRef.current.push(j);
    if (recentJudgesRef.current.length > 40) recentJudgesRef.current.shift();

    // コンボが伸びると救急車が流れる
    updateCue(st.combo);

    // 判定表示・音
    setJudge({ type: j, key: Date.now() });
    if (j === JUDGE.GOOD) { sfx.playGood(st.combo); setBurstKey((k) => k + 1); }
    else if (j === JUDGE.OK) { sfx.playOk(st.combo); setBurstKey((k) => k + 1); }
    else sfx.playMiss();

    // 直近のノーツを1つ消費（見た目上ヒットしたことにする）
    if (notesRef.current.length > 0) notesRef.current.shift();

    // コンボの節目
    if (j !== JUDGE.MISS && isMilestone(st.combo)) {
      sfx.playMilestone();
      showCutinSteps([{ text: `${st.combo} COMBO!!`, ms: 1100, tone: 'gold' }]);
    }
  }

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const st = stateRef.current;
    sfx.playFinish();
    cleanup();

    const schoolType = JUNIOR_SCHOOLS.includes(school) ? 'junior' : 'elementary';
    navigate('/result', {
      state: {
        mode: 'game',
        gameScore: st.score,
        maxCombo: st.maxCombo,
        goodCount: st.goodCount,
        okCount: st.okCount,
        missCount: st.missCount,
        rank: calcRank(st),
        advice: calcGameAdvice(st),
        school, className, studentNum, schoolType,
      },
    });
  }

  // ============================================================
  // メインループ
  // 圧迫検知は仕様書§3 完全準拠（VideoEvaluation.jsx と同一・変更禁止）
  // ============================================================
  function loop() {
    let smoothedY = null;
    let lastSmoothedY = null;
    let isMovingDown = false;
    let lastCompressionTime = null;
    let hudTick = 0;

    function frame() {
      const video = videoRef.current;
      if (!video || finishedRef.current) return;

      const now = performance.now();
      const elapsed = now - startedAtRef.current;

      if (elapsed >= GAME_DURATION_MS) { finish(); return; }

      const st = stateRef.current;

      // --- 姿勢検知（§3 準拠） ---
      if (video.readyState >= 2 && globalPoseLandmarker) {
        let result;
        try {
          result = globalPoseLandmarker.detectForVideo(video, now);
        } catch {
          result = null;
        }

        if (result?.landmarks?.length > 0) {
          if (!detected) setDetected(true);
          const landmarks = result.landmarks[0];

          // ② ランドマーク選択（visibility が高い側を自動採用）
          const wrist =
            landmarks[15].visibility > landmarks[16].visibility
              ? landmarks[15]
              : landmarks[16];

          // ③ EMA スムージング（仕様書準拠: α=0.4）
          if (smoothedY === null) smoothedY = wrist.y;
          const newSmoothedY = 0.4 * wrist.y + 0.6 * smoothedY;
          const diff = lastSmoothedY !== null ? newSmoothedY - lastSmoothedY : 0;
          lastSmoothedY = newSmoothedY;
          smoothedY = newSmoothedY;

          // ④ 圧迫検知（仕様書準拠）
          if (diff > 0.003) isMovingDown = true;
          if (isMovingDown && diff < -0.001) {
            if (lastCompressionTime !== null) {
              const interval = now - lastCompressionTime;
              if (interval > 400) {
                onCompression(60000 / interval); // 150BPM 超は除外
                // ノーツの位相をプレイヤーに追従（1拍あたり最大15%）
                const target = now % BEAT_MS;
                const delta = target - phaseOffsetRef.current;
                phaseOffsetRef.current += delta * 0.15;
              }
            }
            lastCompressionTime = now;
            isMovingDown = false;
          }
        }
      }

      // --- ノーツの生成と移動 ---
      const laneW = laneRef.current?.clientWidth ?? 600;
      while (nextSpawnRef.current < now + TRAVEL_MS) {
        // ノーツの見た目はコンボから決まる（抽選しない）
        //   〜24 → 赤 ／ 25〜79 → アンバー ／ 80〜 → ハザード縞
        notesRef.current.push({
          id: noteIdRef.current++,
          color: noteTier(st.combo),
          hitAt: nextSpawnRef.current,
        });
        nextSpawnRef.current += BEAT_MS;
      }
      // 判定リングを大きく過ぎたノーツは捨てる（減点はしない）
      notesRef.current = notesRef.current.filter((n) => n.hitAt > now - 900);

      const visible = notesRef.current.map((n) => {
        const remain = n.hitAt - now;
        const x = HIT_X + (remain / TRAVEL_MS) * (laneW - HIT_X);
        return { ...n, x };
      }).filter((n) => n.x < laneW + 40);

      // --- HUD 更新（3フレームに1回に間引く） ---
      hudTick++;
      if (hudTick % 3 === 0) {
        setNotes(visible);
        setHud({
          score: st.score,
          combo: st.combo,
          bpm: lastBpmRef.current,
          remainSec: Math.max(0, Math.ceil((GAME_DURATION_MS - elapsed) / 1000)),
        });
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
  }
  // ============================================================

  const mm = Math.floor(hud.remainSec / 60);
  const ss = String(hud.remainSec % 60).padStart(2, '0');

  // ---------- カメラ拒否 ----------
  if (phase === PHASE.DENIED) {
    return (
      <div className="page result-page center">
        <CameraOff size={56} color="#e74c3c" />
        <h2 className="error-title">カメラを使えませんでした</h2>
        <p className="error-msg">
          カメラの使用が許可されていないか、この端末では利用できません。<br />
          「ビデオで評価する」なら、撮影済みの動画でも判定できます。
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/evaluate')}>
          <span className="btn-label">ビデオで評価する</span>
          <span className="btn-num">02</span>
        </button>
        <button className="btn btn-outline" onClick={() => navigate('/')}>
          <span className="btn-label">ホームへ</span>
        </button>
      </div>
    );
  }

  // ---------- 準備画面 ----------
  if (phase === PHASE.SETUP) {
    return (
      <div className="page evaluate-page">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ChevronLeft size={20} /> ホームへ戻る
        </button>
        <h2 className="page-title">PUSH BEAT に挑戦</h2>

        <div className="guidance-box">
          <p className="guidance-title">🎮 あそびかた</p>
          <p>2分間、<strong>1分間に100〜120回</strong>のリズムで胸骨圧迫を続けよう。</p>
          <p>端末を<strong>横に置いて</strong>、体の上半身が映るようにしてください。</p>
        </div>

        <div className="form-group">
          <label>学校を選択</label>
          <select value={school} onChange={(e) => setSchool(e.target.value)}>
            <option value="">学校を選択</option>
            <optgroup label="小学校">
              {ELEMENTARY_SCHOOLS.map((s) => <option key={s} value={s}>{s}</option>)}
            </optgroup>
            <optgroup label="中学校">
              {JUNIOR_SCHOOLS.map((s) => <option key={s} value={s}>{s}</option>)}
            </optgroup>
          </select>
        </div>

        <div className="form-group">
          <label>クラスを入力</label>
          <input
            type="text"
            placeholder={JUNIOR_SCHOOLS.includes(school) ? '例: 2年1組' : '例: 5年1組'}
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>出席番号</label>
          <input
            type="number" min="1" max="40" placeholder="例: 12"
            value={studentNum}
            onChange={(e) => setStudentNum(e.target.value)}
          />
        </div>

        <motion.button
          className={`btn btn-primary ${!modelLoaded ? 'disabled' : ''}`}
          whileTap={modelLoaded ? { scale: 0.97 } : {}}
          onClick={startGame}
          disabled={!modelLoaded}
        >
          {modelLoaded ? (
            <>
              <span className="btn-label"><PlayCircle size={19} /> 訓練を開始する</span>
              <span className="btn-num">START</span>
            </>
          ) : (
            <>
              <span className="btn-label"><Loader2 size={19} className="spin" /> AIモデルを準備中</span>
              <span className="btn-num">WAIT</span>
            </>
          )}
        </motion.button>

        <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
      </div>
    );
  }

  // ---------- プレイ画面 ----------
  return (
    <div className="game-page">
      {/* 上段：計器の読み取り */}
      <div className="g-readout">
        <div className="g-tempo brk">
          <div className="cap">TEMPO</div>
          <div className="g-tempo-num">{hud.bpm || '---'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="cap">SCORE</div>
          <div className="g-score">
            {hud.score.toLocaleString()}
            <span className="g-score-unit">pts</span>
          </div>
        </div>
      </div>

      {/* 予告演出 */}
      <CueBanner cue={cue} />

      {/* ノーツレーン */}
      <NoteLane notes={notes} laneRef={laneRef} judge={judge} burstKey={burstKey} />

      {/* コンボ ＋ 残り時間 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div className="g-combo-row">
          <motion.span
            key={hud.combo}
            className="g-combo-num"
            initial={{ scale: 1.16 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 15 }}
          >
            {hud.combo}
          </motion.span>
          <span className="cap">COMBO</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div className="cap">TIME</div>
            <div className="g-time">{mm}:{ss}</div>
          </div>
          <button className="g-mute" onClick={toggleMute} aria-label={muted ? '音を出す' : '音を消す'}>
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
        </div>
      </div>

      {/* カメラサムネイル */}
      <div className="g-cam-row">
        <div className="g-cam">
          <video ref={videoRef} playsInline muted />
        </div>
        <span className={`g-cam-state ${detected ? 'on' : 'off'}`}>
          {detected ? '検出中' : '体が映るように調整してください'}
        </span>
      </div>

      {/* カウントダウン */}
      {phase === PHASE.COUNTDOWN && (
        <div className="g-cutin" style={{ background: 'rgba(18,12,11,0.82)' }}>
          <motion.span
            key={countdown}
            initial={{ scale: 1.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ color: 'var(--amber)', fontSize: '4.6rem', textShadow: '5px 5px 0 var(--amber-deep)' }}
          >
            {countdown}
          </motion.span>
        </div>
      )}

      {/* カットイン */}
      <CutIn cutin={cutin} />
    </div>
  );
}
