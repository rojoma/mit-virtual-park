import { useState } from 'react';
import '../styles/NameEntry.css';

export default function NameEntry({ onComplete }) {
  const [name, setName] = useState('');

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem('park_user_name', trimmed);
    onComplete(trimmed);
  };

  return (
    <div className="name-entry">
      <div className="name-entry__bg" />
      <div className="name-entry__card">
        <div className="name-entry__tree">🌳</div>
        <h1 className="name-entry__title">MIT Virtual Park</h1>
        <p className="name-entry__subtitle">What's your name?</p>
        <input
          className="name-entry__input"
          placeholder="e.g. Sho"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          autoFocus
          maxLength={20}
        />
        <button
          className="name-entry__btn"
          onClick={submit}
          disabled={!name.trim()}
        >
          Enter the Park →
        </button>
        <p className="name-entry__note">🔒 Closed network — Sloan community only</p>
      </div>
    </div>
  );
}
