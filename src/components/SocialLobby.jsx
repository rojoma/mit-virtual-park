import { useState } from 'react';
import '../styles/SocialLobby.css';

const FRIENDS = [
  { id: 1, name: 'Yuki',  emoji: '🐻', color: '#A29BFE', online: true },
  { id: 2, name: 'Aiden', emoji: '🦁', color: '#55EFC4', online: true },
  { id: 3, name: 'Mei',   emoji: '🐰', color: '#FD79A8', online: true },
  { id: 4, name: 'Lucas', emoji: '🐸', color: '#FDCB6E', online: false },
  { id: 5, name: 'Saki',  emoji: '🦋', color: '#74B9FF', online: false },
  { id: 6, name: 'Noah',  emoji: '🐧', color: '#FF7675', online: false },
];

export default function SocialLobby({ onNavigate }) {
  const [selected, setSelected] = useState([]);
  const [copied, setCopied] = useState(false);
  const [roomCode] = useState(
    () => 'PARK-' + Math.random().toString(36).substring(2, 6).toUpperCase()
  );

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleCopy = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  };

  const onlineFriends = FRIENDS.filter((f) => f.online);
  const offlineFriends = FRIENDS.filter((f) => !f.online);

  return (
    <div className="lobby">
      <div className="lobby__bg" />

      {/* Header */}
      <div className="lobby__header">
        <button className="lobby__back" onClick={() => onNavigate('portal')}>← Back</button>
        <div>
          <h2 className="lobby__title"><span className="gradient-text">Lobby: Verified Friends</span></h2>
          <p className="lobby__subtitle">One-tap join with verified MIT Sloan families</p>
        </div>
      </div>

      {/* Room code share */}
      <div className="lobby__room glass-card">
        <div className="lobby__room-left">
          <div className="lobby__room-label">Your Room Code</div>
          <div className="lobby__room-code">{roomCode}</div>
          <div className="lobby__room-hint">
            {`${window.location.origin}/?room=${roomCode}`}
          </div>
        </div>
        <button className="btn btn-secondary lobby__room-copy" onClick={handleCopy}>
          {copied ? '✓ Copied!' : '🔗 Copy Invite Link'}
        </button>
      </div>

      {/* Online friends — one-tap large cards */}
      <div className="lobby__section-title">
        <span className="lobby__online-dot" />
        Online — {onlineFriends.length} friends ready to play
      </div>
      <div className="lobby__friends">
        {onlineFriends.map((friend) => (
          <button
            key={friend.id}
            className={`lobby__friend-card ${selected.includes(friend.id) ? 'lobby__friend-card--selected' : ''}`}
            onClick={() => toggle(friend.id)}
          >
            <div className="lobby__friend-avatar" style={{ background: friend.color + '28' }}>
              <span className="lobby__friend-emoji">{friend.emoji}</span>
              <div className="lobby__online-indicator" />
            </div>
            <span className="lobby__friend-name">{friend.name}</span>
            <span className="lobby__friend-badge">✓ Verified</span>
            {selected.includes(friend.id) && <div className="lobby__check">✓</div>}
          </button>
        ))}
      </div>

      {/* Offline friends */}
      {offlineFriends.length > 0 && (
        <>
          <div className="lobby__section-title lobby__section-title--muted">
            Offline — {offlineFriends.length}
          </div>
          <div className="lobby__friends lobby__friends--offline">
            {offlineFriends.map((friend) => (
              <button
                key={friend.id}
                className="lobby__friend-card lobby__friend-card--offline"
                onClick={() => toggle(friend.id)}
              >
                <div className="lobby__friend-avatar" style={{ background: friend.color + '18' }}>
                  <span className="lobby__friend-emoji">{friend.emoji}</span>
                </div>
                <span className="lobby__friend-name">{friend.name}</span>
                <span className="lobby__friend-badge lobby__friend-badge--offline">Offline</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* CTA */}
      <div className="lobby__actions">
        <button
          className="btn btn-primary btn-lg"
          style={{ flex: 1 }}
          onClick={() => onNavigate('course')}
        >
          🚀{' '}
          {selected.length > 0
            ? `Start with ${selected.length} friend${selected.length > 1 ? 's' : ''}`
            : 'Start Solo'}
        </button>
      </div>
    </div>
  );
}
