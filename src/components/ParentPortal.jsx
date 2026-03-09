import { useState, useEffect } from 'react';
import '../styles/ParentPortal.css';
import { speakPrompt, stopSpeech } from '../utils/speech';

const STEPS = [
  { num: 1, icon: '📐', title: 'Verify Space',   desc: '2m × 2m play area' },
  { num: 2, icon: '👥', title: 'Invite Friends', desc: 'MIT Sloan families' },
  { num: 3, icon: '🎮', title: 'Active Play',    desc: '30-min session' },
  { num: 4, icon: '😌', title: 'Cool Down',      desc: 'Guided breathing' },
];

export default function ParentPortal({ onNavigate }) {
  const [spaceReady, setSpaceReady] = useState(false);

  useEffect(() => {
    speakPrompt('Welcome! Verify the play space and launch the session.', 'en-US');
    return () => stopSpeech();
  }, []);

  const handleSpaceCheck = () => {
    setSpaceReady(true);
    speakPrompt('Play space verified! Ready to launch.', 'en-US');
  };

  return (
    <div className="portal">
      <div className="portal__bg-orb portal__bg-orb--1" />
      <div className="portal__bg-orb portal__bg-orb--2" />

      <div className="portal__content">
        {/* Header */}
        <div className="portal__header">
          <div className="portal__logo">🏕️</div>
          <h1 className="portal__title">
            <span className="gradient-text">MIT Virtual Park</span>
          </h1>
          <p className="portal__subtitle">
            The 30-Minute Focus Protocol — turn screen time into active play
          </p>
        </div>

        {/* Space check — one tap */}
        <div
          className={`portal__space-card ${spaceReady ? 'portal__space-card--ready' : ''}`}
          onClick={!spaceReady ? handleSpaceCheck : undefined}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && !spaceReady && handleSpaceCheck()}
        >
          <div className="portal__space-icon">{spaceReady ? '✅' : '📐'}</div>
          <div className="portal__space-info">
            <div className="portal__space-title">
              {spaceReady ? 'Play area verified!' : 'Tap to verify 2m × 2m play space'}
            </div>
            <div className="portal__space-sub">
              {spaceReady
                ? 'Safe zone confirmed — child has room to move freely'
                : 'Ensure your child has enough space to jump and spin'}
            </div>
          </div>
        </div>

        {/* 4-step workflow */}
        <div className="portal__steps">
          {STEPS.map((step) => (
            <div key={step.num} className={`portal__step ${step.num === 1 && spaceReady ? 'portal__step--done' : ''}`}>
              <div className="portal__step-badge">{step.num === 1 && spaceReady ? '✓' : step.num}</div>
              <div className="portal__step-icon">{step.icon}</div>
              <div className="portal__step-title">{step.title}</div>
              <div className="portal__step-desc">{step.desc}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="portal__actions">
          <button
            className="btn btn-primary btn-lg"
            onClick={() => onNavigate('lobby')}
            disabled={!spaceReady}
          >
            🚀 Launch Session
          </button>
          <button
            className="btn btn-secondary btn-lg"
            onClick={() => onNavigate('lobby')}
          >
            👥 Invite Friends First
          </button>
        </div>
      </div>
    </div>
  );
}
