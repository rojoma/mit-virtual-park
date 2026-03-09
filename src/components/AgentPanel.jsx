import { useState, useEffect } from 'react';
import '../styles/AgentPanel.css';

const QUICK_PRESETS = [
  { emoji: '🦕', label: 'Dinosaurs' },
  { emoji: '🚀', label: 'Space' },
  { emoji: '🧜‍♀️', label: 'Ocean' },
  { emoji: '🏰', label: 'Castle' },
  { emoji: '🎵', label: 'Music' },
  { emoji: '🔢', label: 'Numbers' },
  { emoji: '🌈', label: 'Colors' },
  { emoji: '🐾', label: 'Animals' },
];

const GENERATED_ITEMS = [
  { icon: '🦖', text: 'Dino-themed obstacle course with T-Rex chase' },
  { icon: '🔢', text: 'Count-the-dinosaurs number game (1-10)' },
  { icon: '🎵', text: 'Dino stomp rhythm activity' },
  { icon: '🌋', text: 'Volcano escape jumping game' },
  { icon: '🥚', text: 'Egg hatching dance challenge' },
];

export default function AgentPanel({ onClose }) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setProgress(0);
    setGenerated(false);
  };

  useEffect(() => {
    if (!generating) return;

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setGenerating(false);
          setGenerated(true);
          clearInterval(interval);
          return 100;
        }
        return p + 2;
      });
    }, 60);

    return () => clearInterval(interval);
  }, [generating]);

  const handleQuickPreset = (label) => {
    setPrompt(`My child loves ${label.toLowerCase()} and wants an active game about it.`);
  };

  return (
    <div className="agent-overlay">
      <div className="agent-overlay__backdrop" onClick={onClose} />

      <div className="agent-panel">
        {/* Header */}
        <div className="agent-panel__header">
          <div className="agent-panel__header-left">
            <div className="agent-panel__icon">🤖</div>
            <div>
              <div className="agent-panel__title">AI Game Designer</div>
              <div className="agent-panel__subtitle">Powered by Claude</div>
            </div>
          </div>
          <button className="agent-panel__close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Body */}
        <div className="agent-panel__body">
          {/* Quick presets */}
          <div className="agent-panel__section">
            <div className="agent-panel__label">Quick Themes</div>
            <div className="agent-panel__quick-presets">
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  className="agent-panel__quick-preset"
                  onClick={() => handleQuickPreset(preset.label)}
                >
                  {preset.emoji} {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text input */}
          <div className="agent-panel__section">
            <div className="agent-panel__label">Describe Your Child's Interests</div>
            <textarea
              className="agent-panel__textarea"
              placeholder="e.g., My child loves dinosaurs and numbers. She's 4 years old and very energetic..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          {/* Progress bar */}
          {generating && (
            <div className="agent-panel__section">
              <div className="agent-panel__progress">
                <div className="agent-panel__progress-bar">
                  <div
                    className="agent-panel__progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="agent-panel__progress-text">
                  {progress < 30
                    ? 'Analyzing interests...'
                    : progress < 60
                    ? 'Designing game activities...'
                    : progress < 90
                    ? 'Optimizing for age group...'
                    : 'Finalizing game preset...'}
                </div>
              </div>
            </div>
          )}

          {/* Generated preset */}
          {generated && (
            <div className="agent-panel__section">
              <div className="agent-panel__preset glass-card">
                <div className="agent-panel__preset-header">
                  <span className="agent-panel__preset-icon">🦕</span>
                  <span className="agent-panel__preset-title">Dino Discovery</span>
                  <span className="agent-panel__preset-badge">AI Generated</span>
                </div>
                <div className="agent-panel__preset-items">
                  {GENERATED_ITEMS.map((item, i) => (
                    <div key={i} className="agent-panel__preset-item">
                      <span className="agent-panel__preset-item-icon">{item.icon}</span>
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="agent-panel__footer">
          <button
            className={`btn ${generated ? 'btn-accent' : 'btn-primary'} btn-lg`}
            style={{ width: '100%' }}
            onClick={generated ? onClose : handleGenerate}
            disabled={generating || (!prompt.trim() && !generated)}
          >
            {generating
              ? '⏳ Generating...'
              : generated
              ? '✅ Apply Dino Discovery Preset'
              : '✨ Generate Game Preset'}
          </button>
        </div>
      </div>
    </div>
  );
}
