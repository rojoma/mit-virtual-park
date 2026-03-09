import { useState, useEffect } from 'react';
import '../styles/SocialLobby.css';

const FRIENDS = [
  { id: 1, name: 'Yuki',  emoji: '🐻', color: '#A29BFE', online: true },
  { id: 2, name: 'Aiden', emoji: '🦁', color: '#55EFC4', online: true },
  { id: 3, name: 'Mei',   emoji: '🐰', color: '#FD79A8', online: true },
  { id: 4, name: 'Lucas', emoji: '🐸', color: '#FDCB6E', online: false },
  { id: 5, name: 'Saki',  emoji: '🦋', color: '#74B9FF', online: false },
  { id: 6, name: 'Noah',  emoji: '🐧', color: '#FF7675', online: false },
];

// "You" card — shown after a brief delay when joining via invite link
const YOU_CARD = { id: 'you', name: 'You', emoji: '🌟', color: '#FFD700', isYou: true };

export default function SocialLobby({ onNavigate, roomId: inviteRoomId }) {
  const [selected, setSelected] = useState([]);
  const [copied, setCopied] = useState(false);

  // Host generates a new code; guest reuses the invite roomId
  const [roomCode] = useState(
    () => inviteRoomId || ('PARK-' + Math.random().toString(36).substring(2, 6).toUpperCase())
  );

  // Guest join: "You" card slides in after 1.2 s to simulate joining the room
  const [youJoined, setYouJoined] = useState(false);
  // Pulse the online count label once "You" appears
  const [countPulse, setCountPulse] = useState(false);

  useEffect(() => {
    if (!inviteRoomId) return;
    const t = setTimeout(() => {
      setYouJoined(true);
      setCountPulse(true);
      setTimeout(() => setCountPulse(false), 800);
    }, 1200);
    return () => clearTimeout(t);
  }, [inviteRoomId]);

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

  const onlineFriends  = FRIENDS.filter((f) => f.online);
  const offlineFriends = FRIENDS.filter((f) => !f.online);

  // If the user joined via invite, prepend "You" once the delay fires
  const displayedOnline = youJoined ? [YOU_CARD, ...onlineFriends] : onlineFriends;

  const startLabel = youJoined
    ? `Start Together 🎉`
    : selected.length > 0
      ? `Start with ${selected.length} friend${selected.length > 1 ? 's' : ''}`
      : 'Start Solo';

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
          <div className="lobby__room-label">
            {inviteRoomId ? 'Joined Room' : 'Your Room Code'}
          </div>
          <div className="lobby__room-code">{roomCode}</div>
          <div className="lobby__room-hint">
            {`${window.location.origin}/?room=${roomCode}`}
          </div>
        </div>
        <button className="btn btn-secondary lobby__room-copy" onClick={handleCopy}>
          {copied ? '✓ Copied!' : '🔗 Copy Invite Link'}
        </button>
      </div>

      {/* "You just joined!" banner — guest mode only */}
      {youJoined && (
        <div className="lobby__joined-banner">
          🎉 You joined the room! Your friends can see you're online.
        </div>
      )}

      {/* Online friends */}
      <div className={`lobby__section-title${countPulse ? ' lobby__section-title--pulse' : ''}`}>
        <span className="lobby__online-dot" />
        Online — {displayedOnline.length} {displayedOnline.length === 1 ? 'friend' : 'friends'} ready to play
      </div>
      <div className="lobby__friends">
        {displayedOnline.map((friend) => (
          <button
            key={friend.id}
            className={[
              'lobby__friend-card',
              friend.isYou ? 'lobby__friend-card--you' : '',
              selected.includes(friend.id) ? 'lobby__friend-card--selected' : '',
            ].join(' ').trim()}
            onClick={() => !friend.isYou && toggle(friend.id)}
          >
            <div className="lobby__friend-avatar" style={{ background: friend.color + '28' }}>
              <span className="lobby__friend-emoji">{friend.emoji}</span>
              <div className="lobby__online-indicator" />
            </div>
            <span className="lobby__friend-name">{friend.name}</span>
            <span className={`lobby__friend-badge${friend.isYou ? ' lobby__friend-badge--you' : ''}`}>
              {friend.isYou ? '👋 You' : '✓ Verified'}
            </span>
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
          🚀 {startLabel}
        </button>
      </div>
    </div>
  );
}
