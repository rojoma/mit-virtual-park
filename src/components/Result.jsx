import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import '../styles/Result.css';

const CPU_NAME = 'Taka';
const TARGET   = 20;

export default function Result({ onNavigate, userName = 'You', playerScore = 0, cpuScore = 0, playerWon = false }) {
  const calories = Math.max(1, Math.round(playerScore * 0.9 + Math.random() * 4));
  const words    = Math.max(1, Math.floor(Math.random() * 4) + 1);

  useEffect(() => {
    if (playerWon) {
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.5 },
        colors: ['#ffd700', '#ff6b6b', '#6c5ce7', '#00cec9'] });
    }
  }, [playerWon]);

  const winner  = playerWon ? userName : CPU_NAME;
  const p1      = playerWon
    ? { medal: '🥇', name: `${CPU_NAME}`,         score: cpuScore,    first: false }
    : { medal: '🥇', name: `${CPU_NAME}`,         score: cpuScore,    first: true  };
  const p2      = playerWon
    ? { medal: '🥈', name: `${userName} (You)`,   score: playerScore, first: false }
    : { medal: '🥈', name: `${userName} (You)`,   score: playerScore, first: false };

  // Reorder: winner first
  const rows = playerWon
    ? [
        { medal: '🥇', name: `${userName} (You)`, score: playerScore, you: true },
        { medal: '🥈', name: CPU_NAME,             score: cpuScore,    you: false },
      ]
    : [
        { medal: '🥇', name: CPU_NAME,             score: cpuScore,    you: false },
        { medal: '🥈', name: `${userName} (You)`,  score: playerScore, you: true  },
      ];

  return (
    <div className="result">
      <div className="result__bg" />

      {/* Win / Lose hero */}
      <div className="result__hero">
        <div className="result__emoji">{playerWon ? '🏆' : '😢'}</div>
        <h1 className={`result__headline ${playerWon ? '' : 'result__headline--lose'}`}>
          {playerWon ? 'You Win! 🎉' : 'You Lose...'}
        </h1>
        <p className="result__subtext">{winner} reached the goal first!</p>
      </div>

      {/* Ranking card */}
      <div className="result__card">
        <div className="result__rows">
          {rows.map((r, i) => (
            <div key={i} className={`result__row ${i === 0 ? 'result__row--first' : ''}`}>
              <span className="result__medal">{r.medal}</span>
              <span className={`result__name ${r.you ? 'result__name--you' : ''}`}>{r.name}</span>
              <span className="result__score">{r.score} / {TARGET} 🦬</span>
            </div>
          ))}
        </div>

        <div className="result__divider" />

        <div className="result__stats">
          <div className="result__stat">
            <span>Calories burned</span>
            <span className="result__stat-val">{calories} kcal 🔥</span>
          </div>
          <div className="result__stat">
            <span>Words learned</span>
            <span className="result__stat-val">{words} words 📚</span>
          </div>
        </div>
      </div>

      {/* Parent notified */}
      <div className="result__banner">✅ Parent notified — great session!</div>

      {/* CTA */}
      <button className="result__cta" onClick={() => onNavigate('park')}>
        Back to Park 🌳
      </button>
    </div>
  );
}
