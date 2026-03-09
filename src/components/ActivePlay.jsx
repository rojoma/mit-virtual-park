import { useState, useEffect, useRef, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import confetti from 'canvas-confetti';
import '../styles/ActivePlay.css';
import ChildLock from './ChildLock';
import { speakPrompt, stopSpeech } from '../utils/speech';

// ── All prompts in English for course submission ──
const PROMPTS = [
  'Jump!',
  'Dance!',
  'Wave your hands!',
  'Stomp your feet!',
  'Spin around!',
  'Touch the sky!',
  'Clap!',
];

const GAME_OBJECTS = [
  { emoji: '⭐', x: 25, y: 20, delay: 0 },
  { emoji: '🌙', x: 75, y: 15, delay: 1 },
  { emoji: '🦋', x: 50, y: 35, delay: 2 },
  { emoji: '🌺', x: 15, y: 75, delay: 0.5 },
  { emoji: '🍎', x: 80, y: 72, delay: 1.5 },
  { emoji: '🎈', x: 40, y: 25, delay: 3 },
  { emoji: '🐞', x: 65, y: 78, delay: 2.5 },
];

const STARS = Array.from({ length: 30 }, () => ({
  x: Math.random() * 100,
  y: Math.random() * 60,
  size: 1 + Math.random() * 2,
  delay: Math.random() * 3,
}));

const REACTIONS = [
  { emoji: '🙌', label: 'High Five', sfx: 'HIGH FIVE!', color: '#FFB347' },
  { emoji: '👍', label: 'Nice',      sfx: 'NICE!',      color: '#4ECDC4' },
  { emoji: '❤️',  label: 'Love',     sfx: 'LOVE!',      color: '#FF69B4' },
  { emoji: '⭐',  label: 'Super',    sfx: 'SUPER!',     color: '#FFD700' },
  { emoji: '🎉', label: 'Party',     sfx: 'YAY!',       color: '#FF6B6B' },
];

const MOCK_PLAYERS = [
  { name: 'Yuki',  emoji: '🐻', color: '#FF8E8E', bgGradient: 'linear-gradient(135deg, #FFE0E0, #FFB8B8)' },
  { name: 'Aiden', emoji: '🦁', color: '#7EDDD6', bgGradient: 'linear-gradient(135deg, #D0F5F0, #A8E6DB)' },
];

const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  [15, 17], [15, 19], [15, 21],
  [16, 18], [16, 20], [16, 22],
  [27, 29], [27, 31], [28, 30], [28, 32],
];

const GESTURE_RING_C = 163.4; // 2π × 26

// ── Rich Sensory Feedback: Web Audio sound effects ──
function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.13;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  } catch (_) { /* no audio ctx */ }
}

function playReactionSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.28);
  } catch (_) { /* no audio ctx */ }
}

// ── Confetti launcher ──
function launchConfetti(colors) {
  confetti({
    particleCount: 140,
    spread: 80,
    origin: { y: 0.55 },
    colors: colors || ['#00CEC9', '#6C5CE7', '#FDCB6E', '#FF6B6B', '#74B9FF'],
    ticks: 220,
  });
}

function SfxBurst({ text, x, y, color, onDone }) {
  return (
    <div
      className="sfx-burst"
      style={{ left: `${x}%`, top: `${y}%`, color, transform: 'translate(-50%, -50%)' }}
      onAnimationEnd={onDone}
    >
      {text}
    </div>
  );
}

export default function ActivePlay({ onNavigate, roomId, courseMins = 15 }) {
  const totalSecs = courseMins * 60;
  const [timer, setTimer] = useState(totalSecs);
  const [score, setScore] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [cameraStatus, setCameraStatus] = useState('loading');
  const [modelStatus, setModelStatus] = useState('loading');
  const [bursts, setBursts] = useState([]);
  const [showLock, setShowLock] = useState(false);
  const [lockTarget, setLockTarget] = useState('cooldown');
  const [gestureHeld, setGestureHeld] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseLandmarkerRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastTimestampRef = useRef(-1);
  const movementRef = useRef({ lastClap: 0, lastStomp: 0 });
  const promptStartTimeRef = useRef(Date.now());
  const hasMetPromptRef = useRef(false);
  const isFirstPromptRef = useRef(true);
  // Step 5: out-of-frame detection timer
  const outOfFrameTimerRef = useRef(null);

  const sessionEndedRef = useRef(false);

  const addBurst = useCallback((text, x, y, color) => {
    const id = Date.now() + Math.random();
    setBursts((prev) => [...prev, { id, text, x, y, color }]);
  }, []);

  const removeBurst = useCallback((id) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // Step 1: English voice prompt on mount (delayed 500ms so speechSynthesis is ready)
  useEffect(() => {
    const timer = setTimeout(() => {
      speakPrompt('Raise your hands to start!', 'en-US');
    }, 500);
    return () => { clearTimeout(timer); stopSpeech(); };
  }, []);

  // Step 1: English voice on each prompt rotation (skip initial)
  useEffect(() => {
    if (isFirstPromptRef.current) { isFirstPromptRef.current = false; return; }
    speakPrompt(PROMPTS[currentPrompt], 'en-US');
  }, [currentPrompt]);

  const requestExit = (target) => {
    setLockTarget(target);
    setShowLock(true);
  };

  const handleGestureComplete = () => {
    setGestureHeld(false);
    requestExit('lobby');
  };

  // Countdown timer — counts down to 0, then auto-transitions to cool down
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-navigate when timer hits 0
  useEffect(() => {
    if (timer === 0 && !sessionEndedRef.current) {
      sessionEndedRef.current = true;
      launchConfetti(['#FFD700', '#FF6B6B', '#00CEC9', '#6C5CE7']);
      speakPrompt("Great job! Time's up!", 'en-US');
      setTimeout(() => {
        onNavigate('cooldown', { score, time: totalSecs });
      }, 1800);
    }
  }, [timer, score, totalSecs, onNavigate]);

  // Rotating prompts — with penalty for missed prompts
  useEffect(() => {
    const interval = setInterval(() => {
      if (!hasMetPromptRef.current && PROMPTS[currentPrompt] !== 'Wave your hands!') {
        addBurst('Miss! -10', 50, 50, '#FF4757');
        setScore((s) => Math.max(0, s - 10));
      }
      setCurrentPrompt((p) => (p + 1) % PROMPTS.length);
      promptStartTimeRef.current = Date.now();
      hasMetPromptRef.current = false;
    }, 6000);
    return () => clearInterval(interval);
  }, [currentPrompt, addBurst]);

  // Simulated multiplayer events
  useEffect(() => {
    const interval = setInterval(() => {
      const player = MOCK_PLAYERS[Math.floor(Math.random() * MOCK_PLAYERS.length)];
      const pts = Math.floor(Math.random() * 50 + 50);
      const shouts = ['WOW!', 'YAY!', 'GO!'];
      if (Math.random() > 0.5) {
        addBurst(`+${pts} ${player.name}!`, 20 + Math.random() * 60, 20 + Math.random() * 40, player.color);
      } else {
        addBurst(`${player.emoji} ${shouts[Math.floor(Math.random() * 3)]}`, 15 + Math.random() * 70, 30 + Math.random() * 30, player.color);
      }
      setScore((s) => s + pts);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [addBurst]);

  // Initialize MediaPipe PoseLandmarker
  useEffect(() => {
    let cancelled = false;
    async function initPose() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        if (cancelled) return;
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
        if (cancelled) return;
        poseLandmarkerRef.current = landmarker;
        setModelStatus('ready');
      } catch (err) {
        console.error('Failed to load PoseLandmarker:', err);
        if (!cancelled) setModelStatus('error');
      }
    }
    initPose();
    return () => { cancelled = true; };
  }, []);

  // Start webcam
  useEffect(() => {
    let stream = null;
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, aspectRatio: 1.777777778, facingMode: 'user' },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraStatus('ready');
        }
      } catch (err) {
        console.error('Camera access denied:', err);
        setCameraStatus('error');
      }
    }
    startCamera();
    return () => { if (stream) stream.getTracks().forEach((t) => t.stop()); };
  }, []);

  // Detection + drawing loop
  const detectPose = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = poseLandmarkerRef.current;

    if (!video || !canvas || !landmarker || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(detectPose);
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const timestamp = performance.now();
    if (timestamp === lastTimestampRef.current) {
      animFrameRef.current = requestAnimationFrame(detectPose);
      return;
    }
    lastTimestampRef.current = timestamp;

    try {
      const results = landmarker.detectForVideo(video, timestamp);

      // Step 5: Graceful Failure — out-of-frame detection
      if (!results.landmarks || results.landmarks.length === 0) {
        if (!outOfFrameTimerRef.current) {
          outOfFrameTimerRef.current = setTimeout(() => {
            speakPrompt('Where did you go? Come back to play!', 'en-US');
            addBurst('👀 Come back!', 50, 40, '#FFD700');
            outOfFrameTimerRef.current = null;
          }, 3000);
        }
      } else {
        // Back in frame — cancel out-of-frame timer
        if (outOfFrameTimerRef.current) {
          clearTimeout(outOfFrameTimerRef.current);
          outOfFrameTimerRef.current = null;
        }

        const landmarks = results.landmarks[0];
        const w = canvas.width;
        const h = canvas.height;

        // Draw skeleton
        ctx.strokeStyle = '#00CEC9';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(0, 206, 201, 0.6)';
        ctx.shadowBlur = 8;

        for (const [a, b] of POSE_CONNECTIONS) {
          if (a < landmarks.length && b < landmarks.length) {
            const la = landmarks[a];
            const lb = landmarks[b];
            if (la.visibility > 0.4 && lb.visibility > 0.4) { // Step 5: lower threshold
              ctx.beginPath();
              ctx.moveTo(la.x * w, la.y * h);
              ctx.lineTo(lb.x * w, lb.y * h);
              ctx.stroke();
            }
          }
        }

        ctx.shadowColor = 'rgba(0, 206, 201, 0.8)';
        ctx.shadowBlur = 12;
        for (let i = 0; i < landmarks.length; i++) {
          const lm = landmarks[i];
          if (lm.visibility > 0.4) { // Step 5: lower threshold
            const radius = i <= 10 ? 4 : 6;
            ctx.beginPath();
            ctx.arc(lm.x * w, lm.y * h, radius, 0, 2 * Math.PI);
            ctx.fillStyle = '#00CEC9';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(lm.x * w, lm.y * h, radius * 0.4, 0, 2 * Math.PI);
            ctx.fillStyle = 'white';
            ctx.fill();
          }
        }

        const now = Date.now();
        const lWrist = landmarks[15];
        const rWrist = landmarks[16];
        const lAnkle = landmarks[27];
        const rAnkle = landmarks[28];

        // Clap detection — Step 5: more forgiving threshold (0.15 vs 0.1)
        if (lWrist.visibility > 0.4 && rWrist.visibility > 0.4) {
          const dist = Math.sqrt(
            Math.pow(lWrist.x - rWrist.x, 2) + Math.pow(lWrist.y - rWrist.y, 2)
          );
          if (dist < 0.15 && now - movementRef.current.lastClap > 1000) {
            movementRef.current.lastClap = now;
            if (PROMPTS[currentPrompt] === 'Clap!') {
              addBurst('100 POINTS!', 50, 40, '#FFD700');
              addBurst('PERFECT! 👏', 50, 55, '#00CEC9');
              setScore((s) => s + 100);
              hasMetPromptRef.current = true;
              launchConfetti(['#FFD700', '#00CEC9', '#FF6B6B']);
              playSuccessSound();
            } else {
              addBurst('CLAP! 👏', 50, 50, 'white');
            }
          }
        }

        // Stomp detection — Step 5: more forgiving (0.03 vs 0.05)
        if (lAnkle.visibility > 0.4 && rAnkle.visibility > 0.4) {
          const stompY = (lAnkle.y + rAnkle.y) / 2;
          if (movementRef.current.prevStompY &&
              Math.abs(stompY - movementRef.current.prevStompY) > 0.03) {
            if (now - movementRef.current.lastStomp > 1000) {
              movementRef.current.lastStomp = now;
              if (PROMPTS[currentPrompt] === 'Stomp your feet!') {
                addBurst('100 POINTS!', 50, 40, '#FFD700');
                addBurst('AWESOME! 👣', 50, 55, '#00CEC9');
                setScore((s) => s + 100);
                hasMetPromptRef.current = true;
                launchConfetti(['#FDCB6E', '#00CEC9', '#6C5CE7']);
                playSuccessSound();
              } else {
                addBurst('STOMP! 👣', 50, 50, 'white');
              }
            }
          }
          movementRef.current.prevStompY = stompY;
        }

        ctx.shadowBlur = 0;
      }
    } catch (_) { /* silently skip frame */ }

    animFrameRef.current = requestAnimationFrame(detectPose);
  }, [currentPrompt, addBurst]);

  // Start detection loop
  useEffect(() => {
    if (cameraStatus === 'ready' && modelStatus === 'ready') {
      animFrameRef.current = requestAnimationFrame(detectPose);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      // Clean up out-of-frame timer on unmount
      if (outOfFrameTimerRef.current) clearTimeout(outOfFrameTimerRef.current);
    };
  }, [cameraStatus, modelStatus, detectPose]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const statusText = () => {
    if (cameraStatus === 'error') return 'Camera denied';
    if (modelStatus === 'error') return 'Model error';
    if (cameraStatus === 'loading' || modelStatus === 'loading') return 'Loading...';
    return 'Tracking';
  };

  const isTracking = cameraStatus === 'ready' && modelStatus === 'ready';

  // Step 3: Reaction buttons — confetti + sound + burst
  const handleReaction = (reaction) => {
    addBurst(reaction.emoji, 45 + Math.random() * 10, 35 + Math.random() * 10, reaction.color);
    addBurst(reaction.sfx, 45 + Math.random() * 10, 50 + Math.random() * 10, reaction.color);
    setScore((s) => s + 50);
    launchConfetti([reaction.color, '#00CEC9', '#6C5CE7']);
    playReactionSound();
  };

  // Step 3: Game object click — confetti + sound
  const handleGameObjectClick = (obj) => {
    setScore((s) => s + 100);
    const sfxTexts = ['POW!', 'BOOM!', 'ZAP!', 'WHAM!', '+100!'];
    const sfxColors = ['#FF6B6B', '#00CEC9', '#FFB347', '#FF69B4', '#FFD700'];
    const idx = Math.floor(Math.random() * sfxTexts.length);
    addBurst(sfxTexts[idx], obj.x, obj.y - 5, sfxColors[idx]);
    launchConfetti([sfxColors[idx], '#00CEC9', '#FFD700']);
    playSuccessSound();
  };

  return (
    <div className="play">
      {/* Top bar */}
      <div className="play__topbar">
        <div className="play__topbar-left">
          <button className="play__back-btn" onClick={() => requestExit('lobby')}>←</button>
          <div className="play__session-info">
            <div className="play__live-dot" />
            <span className="play__session-label">
              LIVE{roomId ? ` · ROOM ${roomId}` : ''}
            </span>
          </div>
          <span className={`play__timer${timer <= 60 && timer > 0 ? ' play__timer--warning' : ''}`}>{formatTime(timer)}</span>
        </div>
        <div className="play__topbar-right">
          <div className="play__score">⭐ {score.toLocaleString()}</div>
          <button className="btn btn-secondary play__end-btn" onClick={() => requestExit('cooldown')}>
            End Session
          </button>
        </div>
      </div>

      {/* Split-screen */}
      <div className="play__main">
        {/* Left: camera feeds */}
        <div className="play__feeds">
          <div className="play__camera play__camera--main">
            <div className="play__camera-container">
              <video ref={videoRef} className="play__video" playsInline muted />
              <canvas ref={canvasRef} className="play__canvas" />

              {!isTracking && (
                <div className="play__camera-loading">
                  <div className="play__camera-loading-spinner" />
                  <span className="play__camera-loading-text">
                    {cameraStatus === 'error'
                      ? '📷 Camera access denied'
                      : modelStatus === 'error'
                        ? '⚠️ Pose model failed'
                        : '🔄 Loading body tracking...'}
                  </span>
                </div>
              )}

              {isTracking && (
                <div className="play__camera-guide">
                  Step back so your whole body is visible!
                </div>
              )}
            </div>
            <div className="play__camera-label">
              <div className={`play__tracking-dot ${isTracking ? '' : 'play__tracking-dot--inactive'}`} />
              You — {statusText()}
            </div>
          </div>

          {/* Mock player feeds */}
          <div className="play__feeds-row">
            {MOCK_PLAYERS.map((player) => (
              <div key={player.name} className="play__camera play__camera--mock">
                <div className="play__mock-feed" style={{ background: player.bgGradient }}>
                  <div className="play__mock-avatar">{player.emoji}</div>
                  <div className="play__mock-live">
                    <div className="play__mock-live-dot" />
                    LIVE
                  </div>
                </div>
                <div className="play__camera-label">
                  <div className="play__tracking-dot" />
                  {player.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: game world */}
        <div className="play__game">
          <div className="play__game-world">
            <div className="play__stars">
              {STARS.map((star, i) => (
                <div
                  key={i}
                  className="play__star"
                  style={{ left: `${star.x}%`, top: `${star.y}%`, width: `${star.size}px`, height: `${star.size}px`, animationDelay: `${star.delay}s` }}
                />
              ))}
            </div>

            <div className="play__ground" />

            {GAME_OBJECTS.map((obj, i) => (
              <div
                key={i}
                className="play__game-object"
                style={{ left: `${obj.x}%`, top: `${obj.y}%`, animationDelay: `${obj.delay}s` }}
                onClick={() => handleGameObjectClick(obj)}
              >
                {obj.emoji}
              </div>
            ))}

            {/* Prompt — English only */}
            <div className="play__prompt" key={currentPrompt}>
              <div className="play__prompt-main">{PROMPTS[currentPrompt]}</div>
            </div>

            <div className="play__players">
              {MOCK_PLAYERS.map((p) => (
                <div key={p.name} className="play__player-tag">
                  <div className="play__player-avatar-sm" style={{ background: `${p.color}30` }}>{p.emoji}</div>
                  {p.name}
                </div>
              ))}
            </div>

            <div className="play__reactions">
              {REACTIONS.map((r) => (
                <button key={r.label} className="play__reaction-btn" onClick={() => handleReaction(r)}>
                  <span className="play__reaction-emoji">{r.emoji}</span>
                  <span className="play__reaction-label">{r.label}</span>
                </button>
              ))}
            </div>

            <div className="play__prompt-bar">
              <span className="play__prompt-bar-text">
                Next: {PROMPTS[(currentPrompt + 1) % PROMPTS.length]}
              </span>
            </div>

            {/* Step 1: Gesture zone — hover 3s to exit */}
            <div
              className="play__gesture-zone"
              onMouseEnter={() => setGestureHeld(true)}
              onMouseLeave={() => setGestureHeld(false)}
              title="Hold here for 3 seconds to exit"
            >
              <svg className="play__gesture-svg" viewBox="0 0 64 64" width="64" height="64">
                <circle className="play__gesture-track" cx="32" cy="32" r="26" />
                <circle
                  className={`play__gesture-progress ${gestureHeld ? 'play__gesture-progress--active' : ''}`}
                  cx="32" cy="32" r="26"
                  style={{ '--ring-c': GESTURE_RING_C }}
                  onAnimationEnd={handleGestureComplete}
                />
              </svg>
              <span className="play__gesture-icon">🏠</span>
              <span className="play__gesture-label">3s hold</span>
            </div>

            {bursts.map((b) => (
              <SfxBurst key={b.id} text={b.text} x={b.x} y={b.y} color={b.color} onDone={() => removeBurst(b.id)} />
            ))}
          </div>
        </div>
      </div>

      {/* Step 2: Parental lock overlay */}
      {showLock && (
        <ChildLock
          onUnlock={() => {
            setShowLock(false);
            // Pass score + time to CoolDown when ending session
            if (lockTarget === 'cooldown') {
              onNavigate('cooldown', { score, time: totalSecs - timer });
            } else {
              onNavigate(lockTarget);
            }
          }}
          onCancel={() => setShowLock(false)}
        />
      )}
    </div>
  );
}
