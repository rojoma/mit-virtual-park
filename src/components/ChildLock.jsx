import { useState } from 'react';
import '../styles/ChildLock.css';

function generateQuestion() {
  const a = Math.floor(Math.random() * 6) + 1; // 1–6
  const b = Math.floor(Math.random() * 6) + 1;
  return { a, b, answer: a + b };
}

const PAD = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '✓'];

export default function ChildLock({ onUnlock, onCancel }) {
  const [question] = useState(generateQuestion);
  const [input, setInput] = useState('');
  const [shake, setShake] = useState(false);

  const handleKey = (digit) => {
    if (input.length < 2) setInput((prev) => prev + digit);
  };

  const handleSubmit = () => {
    if (parseInt(input, 10) === question.answer) {
      onUnlock();
    } else {
      setShake(true);
      setInput('');
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div className="childlock-overlay">
      <div className={`childlock-modal ${shake ? 'childlock-modal--shake' : ''}`}>
        <div className="childlock-icon">🔒</div>
        <h2 className="childlock-title">保護者の方へ</h2>
        <p className="childlock-subtitle">答えを入力してください</p>
        <div className="childlock-question">
          {question.a} + {question.b} = ?
        </div>
        <div className="childlock-display">{input || '\u00A0'}</div>
        <div className="childlock-keypad">
          {PAD.map((k) => (
            <button
              key={k}
              className={[
                'childlock-key',
                k === 'C' ? 'childlock-key--clear' : '',
                k === '✓' ? 'childlock-key--submit' : '',
              ].join(' ')}
              onClick={() => {
                if (k === 'C') setInput('');
                else if (k === '✓') handleSubmit();
                else handleKey(String(k));
              }}
            >
              {k}
            </button>
          ))}
        </div>
        <button className="childlock-cancel" onClick={onCancel}>
          キャンセル
        </button>
      </div>
    </div>
  );
}
