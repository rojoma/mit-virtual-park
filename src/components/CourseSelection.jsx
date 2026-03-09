import { useEffect } from 'react';
import '../styles/CourseSelection.css';
import { speakPrompt } from '../utils/speech';

const COURSES = [
  {
    mins: 5,
    label: 'Quick Play',
    sub: '5 minutes',
    emoji: '⚡',
    color: '#FF6B6B',
    bg: 'linear-gradient(135deg, #FFE8E8, #FFB8B8)',
  },
  {
    mins: 15,
    label: 'Standard',
    sub: '15 minutes',
    emoji: '🎮',
    color: '#00B8B2',
    bg: 'linear-gradient(135deg, #E0FFFE, #A8F0EB)',
  },
  {
    mins: 30,
    label: 'Deep Focus',
    sub: '30 minutes',
    emoji: '🏆',
    color: '#6C5CE7',
    bg: 'linear-gradient(135deg, #EEE8FF, #D0C4FF)',
  },
];

export default function CourseSelection({ onNavigate }) {
  useEffect(() => {
    const t = setTimeout(() => speakPrompt('Choose your play time!', 'en-US'), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="course">
      <div className="course__bg" />

      <div className="course__content">
        <div className="course__icon">⏱️</div>
        <h2 className="course__title">Choose Your Play Time!</h2>
        <p className="course__sub">Pick a session length for today's adventure</p>

        <div className="course__cards">
          {COURSES.map((c) => (
            <button
              key={c.mins}
              className="course__card"
              style={{ '--card-color': c.color, background: c.bg }}
              onClick={() => onNavigate('play', { courseMins: c.mins })}
            >
              <span className="course__card-emoji">{c.emoji}</span>
              <span className="course__card-label">{c.label}</span>
              <span className="course__card-time">{c.sub}</span>
            </button>
          ))}
        </div>

        <button className="btn btn-secondary" onClick={() => onNavigate('lobby')}>
          ← Back to Lobby
        </button>
      </div>
    </div>
  );
}
