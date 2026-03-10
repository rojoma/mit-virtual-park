/**
 * ActivePlay — Jump game with MediaPipe pose detection
 * CPU opponent (Taka) races the player to TARGET_SCORE jumps.
 *
 * Jump detection: tracks hip midpoint Y; when hips rise above
 * a rolling floor baseline (threshold 3.5%), counts a jump.
 * Very forgiving for kids — debounce 600 ms only.
 */

import { useState, useEffect, useRef } from 'react';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import '../styles/ActivePlay.css';

const TARGET_SCORE  = 20;
const CPU_NAME      = 'Taka';
const JUMP_THRESH   = 0.035;   // 3.5 % of frame height — very forgiving
const DEBOUNCE_MS   = 600;
const WASM_URL      = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_URL     = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

const POSE_CONNECTIONS = [
  [11,12],[11,13],[13,15],[12,14],[14,16],
  [11,23],[12,24],[23,24],
  [23,25],[25,27],[24,26],[26,28],
  [0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],[9,10],
];

const INSTRUCTION_EN = ['Jump!', 'Jump!', 'Higher!', 'Jump!', 'Go!'];
const INSTRUCTION_JA = ['ジャンプ！', 'ジャンプ！', 'もっと高く！', 'ジャンプ！', 'ゴー！'];

export default function ActivePlay({ onNavigate, userName = 'You' }) {
  const [playerScore, setPlayerScore] = useState(0);
  const [cpuScore,    setCpuScore]    = useState(0);
  const [poseOk,      setPoseOk]      = useState(false);
  const [calibVal,    setCalibVal]    = useState('--');
  const [promptIdx,   setPromptIdx]   = useState(0);

  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef        = useRef(null);
  const lastTsRef     = useRef(-1);

  // Jump detection refs (no state — updated in RAF)
  const floorYRef     = useRef(null);
  const airborneRef   = useRef(false);
  const lastJumpRef   = useRef(0);
  const playerScoreRef = useRef(0);
  const cpuScoreRef    = useRef(0);
  const gameEndedRef   = useRef(false);

  const initial = (userName || 'U').charAt(0).toUpperCase();

  // Rotate instruction text every 4 seconds
  useEffect(() => {
    const t = setInterval(() => setPromptIdx((i) => (i + 1) % INSTRUCTION_EN.length), 4000);
    return () => clearInterval(t);
  }, []);

  // CPU simulation — jumps randomly every ~4-8 seconds
  useEffect(() => {
    const tick = () => {
      if (gameEndedRef.current) return;
      if (Math.random() < 0.55) {
        setCpuScore((s) => {
          const next = Math.min(s + 1, TARGET_SCORE);
          cpuScoreRef.current = next;
          return next;
        });
      }
      cpuTimerRef.current = setTimeout(tick, 3500 + Math.random() * 4000);
    };
    cpuTimerRef.current = setTimeout(tick, 4000);
    return () => clearTimeout(cpuTimerRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const cpuTimerRef = useRef(null);

  // Game-over check for player
  useEffect(() => {
    if (playerScore >= TARGET_SCORE && !gameEndedRef.current) {
      gameEndedRef.current = true;
      setTimeout(() => onNavigate('result', {
        playerScore, cpuScore: cpuScoreRef.current, playerWon: true,
      }), 1200);
    }
  }, [playerScore]); // eslint-disable-line react-hooks/exhaustive-deps

  // Game-over check for CPU
  useEffect(() => {
    if (cpuScore >= TARGET_SCORE && !gameEndedRef.current) {
      gameEndedRef.current = true;
      setTimeout(() => onNavigate('result', {
        playerScore: playerScoreRef.current, cpuScore, playerWon: false,
      }), 1200);
    }
  }, [cpuScore]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── MediaPipe init ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Model
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        if (cancelled) return;
        const lm = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
        if (cancelled) { lm.close(); return; }
        landmarkerRef.current = lm;

        // Start RAF loop
        const loop = () => {
          if (cancelled) return;
          const video  = videoRef.current;
          const canvas = canvasRef.current;
          if (video?.readyState >= 2 && lm && canvas) {
            if (canvas.width !== video.videoWidth)  canvas.width  = video.videoWidth  || 640;
            if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight || 480;

            const ts = performance.now();
            if (ts !== lastTsRef.current) {
              lastTsRef.current = ts;
              const res = lm.detectForVideo(video, ts);
              processFrame(res, canvas);
            }
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      } catch (err) {
        console.error('[ActivePlay pose]', err);
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
      if (landmarkerRef.current) { landmarkerRef.current.close(); landmarkerRef.current = null; }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pose processing (runs every frame) ─────────────────
  const processFrame = (results, canvas) => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!results.landmarks?.length) {
      setPoseOk(false);
      return;
    }
    setPoseOk(true);
    const lms = results.landmarks[0];
    const w   = canvas.width;
    const h   = canvas.height;

    // Draw skeleton
    ctx.strokeStyle = '#00e676';
    ctx.lineWidth   = 3;
    ctx.lineCap     = 'round';
    for (const [a, b] of POSE_CONNECTIONS) {
      const la = lms[a], lb = lms[b];
      if (la && lb && la.visibility > 0.35 && lb.visibility > 0.35) {
        ctx.beginPath();
        ctx.moveTo(la.x * w, la.y * h);
        ctx.lineTo(lb.x * w, lb.y * h);
        ctx.stroke();
      }
    }

    // Draw dots
    for (const lm of lms) {
      if (lm.visibility > 0.35) {
        ctx.beginPath();
        ctx.arc(lm.x * w, lm.y * h, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ff4444';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Jump detection using hip midpoint
    const lh = lms[23], rh = lms[24];
    if (!lh || !rh || lh.visibility < 0.3 || rh.visibility < 0.3) return;

    const hipY = (lh.y + rh.y) / 2;
    setCalibVal(hipY.toFixed(2));

    if (floorYRef.current === null) {
      floorYRef.current = hipY;
      return;
    }
    // Slowly drift floor up when hips are at rest (person standing)
    if (hipY > floorYRef.current) {
      floorYRef.current = floorYRef.current * 0.97 + hipY * 0.03;
    }

    const isHigh = hipY < floorYRef.current - JUMP_THRESH;
    if (!airborneRef.current && isHigh) {
      airborneRef.current = true;
    }
    if (airborneRef.current && !isHigh) {
      const now = Date.now();
      if (now - lastJumpRef.current > DEBOUNCE_MS && !gameEndedRef.current) {
        lastJumpRef.current = now;
        setPlayerScore((s) => {
          const next = Math.min(s + 1, TARGET_SCORE);
          playerScoreRef.current = next;
          return next;
        });
      }
      airborneRef.current = false;
    }
  };

  // ── Layout helpers ──────────────────────────────────────
  const playerPct = Math.min(100, (playerScore / TARGET_SCORE) * 100);
  const cpuPct    = Math.min(100, (cpuScore    / TARGET_SCORE) * 100);

  return (
    <div className="aplay">

      {/* Header */}
      <div className="aplay__header">
        <button className="aplay__quit" onClick={() => onNavigate('park')}>Quit</button>
        <div className="aplay__title">🌳 MIT Virtual Park · swings</div>
        <div className="aplay__goal">Jump to Win! 🔥</div>
      </div>

      {/* Progress bars */}
      <div className="aplay__bars">
        <div className="aplay__bar-sub">Race to {TARGET_SCORE} jumps!</div>
        <div className="aplay__bar-row">
          <span className="aplay__bar-name">
            <span className="aplay__dot" style={{ background: '#ff9800' }}>{initial}</span>
            {userName}
          </span>
          <div className="aplay__track">
            <div className="aplay__fill aplay__fill--player" style={{ width: `${playerPct}%` }} />
          </div>
          <span className="aplay__flag">🏴</span>
          <span className="aplay__bar-ct">{playerScore}/{TARGET_SCORE}</span>
        </div>
        <div className="aplay__bar-row">
          <span className="aplay__bar-name">
            <span className="aplay__dot" style={{ background: '#7c4dff' }}>🤖</span>
            CPU
          </span>
          <div className="aplay__track">
            <div className="aplay__fill aplay__fill--cpu" style={{ width: `${cpuPct}%` }} />
          </div>
          <span className="aplay__flag">🏴</span>
          <span className="aplay__bar-ct">{cpuScore}/{TARGET_SCORE}</span>
        </div>
      </div>

      {/* Main panels */}
      <div className="aplay__main">

        {/* Left: camera */}
        <div className="aplay__cam-wrap">
          <video ref={videoRef} className="aplay__video" playsInline muted autoPlay />
          <canvas ref={canvasRef} className="aplay__canvas" />

          {/* Instruction overlay */}
          <div className="aplay__instruction">
            <div className="aplay__instruction-en">{INSTRUCTION_EN[promptIdx]}</div>
            <div className="aplay__instruction-ja">{INSTRUCTION_JA[promptIdx]}</div>
          </div>

          {/* Calib value */}
          <div className="aplay__calib">{calibVal}</div>

          {/* Player badge */}
          <div className="aplay__player-badge">
            <span className="aplay__badge-dot" style={{ background: '#ff9800' }}>{initial}</span>
            {userName} · {playerScore} 🦬
          </div>

          {!poseOk && (
            <div className="aplay__no-pose">Step back so your body is visible 👟</div>
          )}
        </div>

        {/* Right: CPU */}
        <div className="aplay__cpu-panel">
          <div className="aplay__cpu-avatar">🤖</div>
          <div className="aplay__cpu-name">{CPU_NAME} 🤖</div>
          <div className="aplay__cpu-badge">
            <span className="aplay__badge-dot" style={{ background: '#7c4dff' }}>🤖</span>
            CPU · {cpuScore} 🦬
          </div>
          <div className="aplay__cpu-status">
            {cpuScore >= TARGET_SCORE ? '🏆 Done!' : 'Calculating...'}
          </div>
        </div>

      </div>

      {/* Score bar */}
      <div className="aplay__scorebar">
        <div className="aplay__sb-left">
          <div className="aplay__sb-score" style={{ color: '#ff9800' }}>{playerScore}</div>
          <div className="aplay__sb-name">{userName}</div>
        </div>
        <div className="aplay__sb-center">→ {TARGET_SCORE} to Win!</div>
        <div className="aplay__sb-right">
          <div className="aplay__sb-score" style={{ color: '#a29bfe' }}>{cpuScore}</div>
          <div className="aplay__sb-name">CPU</div>
        </div>
      </div>

    </div>
  );
}
