import { useState, useEffect } from 'react';
import '../styles/CoolDown.css';
import { speakPrompt, stopSpeech } from '../utils/speech';

// Variable-duration breathing cycle: in(4s) → hold(2s) → out(4s) = 10s total
const BREATHE = [
  { text: 'Breathe in...', ms: 4000, phase: 'in' },
  { text: 'Hold...', ms: 2000, phase: 'hold' },
  { text: 'Breathe out...', ms: 4000, phase: 'out' },
];

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export default function CoolDown({ onNavigate, score = 0, time = 0 }) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [showToast, setShowToast] = useState(false);

  // Variable-duration breathing phases using setTimeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPhaseIdx((p) => (p + 1) % BREATHE.length);
    }, BREATHE[phaseIdx].ms);
    return () => clearTimeout(timeout);
  }, [phaseIdx]);

  // Voice prompt on each breathing phase change
  useEffect(() => {
    speakPrompt(BREATHE[phaseIdx].text, 'en-US');
  }, [phaseIdx]);

  // Stop speech on unmount
  useEffect(() => {
    return () => stopSpeech();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setShowToast(true), 2500);
    return () => clearTimeout(timeout);
  }, []);

  const movementScore = score > 0 ? Math.min(100, Math.round(score / 15)) : 88;
  const currentPhase = BREATHE[phaseIdx];

  return (
    <div className="cooldown">
      <div className="cooldown__bg">
        <div className="cooldown__bg-orb cooldown__bg-orb--1" />
        <div className="cooldown__bg-orb cooldown__bg-orb--2" />
      </div>

      <div className="cooldown__content">
        <div className="cooldown__label">Session Complete ✨</div>

        {/* Breathing guide — phase-synced expanding circle */}
        <div className="cooldown__breathe">
          <div className={`cooldown__breathe-ring cooldown__breathe-ring--${currentPhase.phase}`} />
          <div className={`cooldown__breathe-ring cooldown__breathe-ring--mid cooldown__breathe-ring--${currentPhase.phase}`} />
          <div className={`cooldown__breathe-ring cooldown__breathe-ring--inner cooldown__breathe-ring--${currentPhase.phase}`} />
          <span className="cooldown__breathe-text">{currentPhase.text}</span>
        </div>

        <h2 className="cooldown__instruction">Great session! Time to wind down.</h2>
        <p className="cooldown__instruction-sub">Your child is calm and ready to rest 🌟</p>

        {/* Session stats */}
        <div className="cooldown__stats">
          <div className="cooldown__stat glass-card">
            <div className="cooldown__stat-value">{formatTime(time)}</div>
            <div className="cooldown__stat-label">Active Time</div>
          </div>
          <div className="cooldown__stat glass-card">
            <div className="cooldown__stat-value">{score.toLocaleString()}</div>
            <div className="cooldown__stat-label">Stars Earned</div>
          </div>
          <div className="cooldown__stat glass-card">
            <div className="cooldown__stat-value">{movementScore}%</div>
            <div className="cooldown__stat-label">Movement Score</div>
          </div>
        </div>

        <div className="cooldown__actions">
          <button className="btn cooldown__btn-zen btn-lg" onClick={() => onNavigate('portal')}>
            🏠 Return Home
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => onNavigate('play')}>
            🔄 Play Again
          </button>
        </div>
      </div>

      {/* Parent notification toast */}
      {showToast && (
        <div className="cooldown__toast glass-card">
          <span className="cooldown__toast-icon">🔔</span>
          <div className="cooldown__toast-content">
            <div className="cooldown__toast-title">30-min Focus Session Complete</div>
            <div className="cooldown__toast-message">
              {formatTime(time)} active play · {score.toLocaleString()} stars · {movementScore}% movement score
            </div>
          </div>
          <button className="cooldown__toast-close" onClick={() => setShowToast(false)}>×</button>
        </div>
      )}
    </div>
  );
}
