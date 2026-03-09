/**
 * SocialLobby — Real multiplayer presence via Daily.co createCallObject()
 *
 * Phases:
 *   name-entry → joining → lobby
 *
 * Daily is used in audio/video-off mode purely for presence sync:
 *   - participant-joined / participant-left → update online list
 *   - sendAppMessage({ type: 'START_GAME' }) → everyone navigates together
 *
 * Falls back to demo mode (static friends) if VITE_DAILY_DOMAIN is not set.
 * Destroys the call object on unmount so ActivePlay can create its own frame.
 */

import { useState, useEffect, useRef } from 'react';
import '../styles/SocialLobby.css';

const DAILY_DOMAIN  = import.meta.env.VITE_DAILY_DOMAIN;
const DAILY_API_KEY = import.meta.env.VITE_DAILY_API_KEY;

// ── Helpers ────────────────────────────────────────────────
const EMOJIS = ['🐻', '🦁', '🐰', '🐸', '🦋', '🐧', '🐼', '🦊', '🐨', '🦄'];
const COLORS  = ['#A29BFE', '#55EFC4', '#FD79A8', '#FDCB6E', '#74B9FF',
                  '#FF7675', '#A8E6CF', '#FFB347', '#87CEEB', '#DDA0DD'];

function hashStr(s) {
  let h = 0;
  for (const c of (s || '')) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
  return h;
}
const emojiFor = (name) => EMOJIS[hashStr(name) % EMOJIS.length];
const colorFor = (name) => COLORS[hashStr(name)  % COLORS.length];

function toRoomName(code) {
  return (code || 'mit-park-demo').toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

async function ensureRoomUrl(roomName) {
  const domain   = DAILY_DOMAIN || '';
  const fallback = `https://${domain}.daily.co/${roomName}`;
  if (!DAILY_API_KEY) return fallback;
  try {
    const res  = await fetch('https://api.daily.co/v1/rooms', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DAILY_API_KEY}` },
      body:    JSON.stringify({
        name: roomName,
        properties: { max_participants: 10, exp: Math.floor(Date.now() / 1000) + 7200 },
      }),
    });
    const data = await res.json();
    return data.url || fallback;
  } catch {
    return fallback;
  }
}

// Convert Daily participants map → array of { id, name, emoji, color, local }
function parsePeers(participants) {
  return Object.entries(participants || {}).map(([id, p]) => {
    const name = (p.user_name || 'Guest').trim() || 'Guest';
    return { id, name, emoji: emojiFor(name), color: colorFor(name), local: !!p.local };
  });
}

// Demo friends shown when Daily is not configured
const DEMO_FRIENDS = [
  { id: 'd1', name: 'Yuki',  emoji: '🐻', color: '#A29BFE' },
  { id: 'd2', name: 'Aiden', emoji: '🦁', color: '#55EFC4' },
  { id: 'd3', name: 'Mei',   emoji: '🐰', color: '#FD79A8' },
];

// ── Component ───────────────────────────────────────────────
export default function SocialLobby({ onNavigate, roomId: inviteRoomId }) {
  const isConfigured = !!(DAILY_DOMAIN && DAILY_DOMAIN !== 'your-subdomain');

  // Room code: guest reuses invite code; host generates one
  const [roomCode] = useState(
    () => inviteRoomId || ('PARK-' + Math.random().toString(36).substring(2, 6).toUpperCase())
  );

  // Name persisted in localStorage
  const [nameInput, setNameInput] = useState('');
  const savedName = () => localStorage.getItem('park_user_name') || '';

  // phase: 'name-entry' | 'joining' | 'lobby' | 'error'
  const [phase, setPhase] = useState(() => (savedName() ? 'joining' : 'name-entry'));
  const [userName, setUserName] = useState(savedName);

  // Real participants from Daily
  const [peers, setPeers] = useState([]);

  const [copied, setCopied] = useState(false);

  const callRef       = useRef(null);
  const connectedRef  = useRef(false); // prevent double-connect
  const navigatedRef  = useRef(false); // prevent double-navigate on START_GAME

  // ── Daily connection ────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'joining') return;
    if (!userName)          return;
    if (connectedRef.current) return;
    connectedRef.current = true;

    if (!isConfigured) {
      // No Daily config — skip to demo lobby immediately
      setPhase('lobby');
      return;
    }

    (async () => {
      try {
        const { default: DailyIframe } = await import('@daily-co/daily-js');
        const call = DailyIframe.createCallObject();
        callRef.current = call;

        const refresh = () => setPeers(parsePeers(call.participants()));

        call.on('joined-meeting',      () => { refresh(); setPhase('lobby'); });
        call.on('participant-joined',  refresh);
        call.on('participant-updated', refresh);
        call.on('participant-left',    refresh);
        call.on('app-message', (evt) => {
          // Received START_GAME broadcast from the host
          if (evt.data?.type === 'START_GAME' && !navigatedRef.current) {
            navigatedRef.current = true;
            onNavigate('course');
          }
        });
        call.on('error', () => setPhase('error'));

        const url = await ensureRoomUrl(toRoomName(roomCode));
        await call.join({ url, userName, startVideoOff: true, startAudioOff: true });
      } catch (err) {
        console.error('[Daily Lobby]', err);
        callRef.current    = null;
        connectedRef.current = false;
        setPhase('error');
      }
    })();
  }, [phase, userName]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      if (callRef.current) {
        callRef.current.leave().catch(() => {});
        callRef.current.destroy().catch(() => {});
        callRef.current = null;
      }
    };
  }, []);

  // ── Handlers ────────────────────────────────────────────────
  const submitName = () => {
    const name = nameInput.trim();
    if (!name) return;
    localStorage.setItem('park_user_name', name);
    setUserName(name);
    setPhase('joining');
  };

  const handleCopy = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  };

  const handleStart = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    // Broadcast to all peers so everyone navigates together
    callRef.current?.sendAppMessage({ type: 'START_GAME' }, '*');
    onNavigate('course');
  };

  const handleRetry = () => {
    connectedRef.current = false;
    callRef.current      = null;
    setPhase('joining');
  };

  // ── RENDER: name entry ──────────────────────────────────────
  if (phase === 'name-entry') {
    return (
      <div className="lobby lobby--centered">
        <div className="lobby__bg" />
        <div className="lobby__name-card glass-card">
          <div className="lobby__name-emoji">🌟</div>
          <h2 className="lobby__name-title">What's your name?</h2>
          <p className="lobby__name-hint">Your friends will see this in the lobby</p>
          <input
            className="lobby__name-input"
            placeholder="e.g. Yuki"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitName()}
            autoFocus
            maxLength={20}
          />
          <button
            className="btn btn-primary btn-lg lobby__name-btn"
            onClick={submitName}
            disabled={!nameInput.trim()}
          >
            Join Lobby →
          </button>
        </div>
      </div>
    );
  }

  // ── RENDER: joining (spinner) ──────────────────────────────
  if (phase === 'joining') {
    return (
      <div className="lobby lobby--centered">
        <div className="lobby__bg" />
        <div className="lobby__spinner-card glass-card">
          <div className="lobby__spinner" />
          <p className="lobby__spinner-text">Connecting to lobby…</p>
        </div>
      </div>
    );
  }

  // ── RENDER: error ──────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="lobby lobby--centered">
        <div className="lobby__bg" />
        <div className="lobby__spinner-card glass-card">
          <div style={{ fontSize: '2.5rem' }}>⚠️</div>
          <p className="lobby__spinner-text">Couldn't connect to room</p>
          <button className="btn btn-secondary" onClick={handleRetry}>Retry</button>
        </div>
      </div>
    );
  }

  // ── RENDER: lobby ──────────────────────────────────────────
  // In connected mode: show real Daily participants
  // In demo mode: show "You" + static friends
  const displayPeers = isConfigured ? peers : [
    { id: 'you', name: userName, emoji: emojiFor(userName), color: colorFor(userName), local: true },
    ...DEMO_FRIENDS.map((f) => ({ ...f, local: false })),
  ];

  const onlineCount  = displayPeers.length;
  const startLabel   = onlineCount > 1
    ? `Start Together (${onlineCount} 👥)`
    : 'Start Solo';

  return (
    <div className="lobby">
      <div className="lobby__bg" />

      {/* Header */}
      <div className="lobby__header">
        <button className="lobby__back" onClick={() => onNavigate('portal')}>← Back</button>
        <div>
          <h2 className="lobby__title">
            <span className="gradient-text">Lobby: {roomCode}</span>
          </h2>
          <p className="lobby__subtitle">
            {isConfigured ? 'Waiting for friends…' : 'Demo mode — invite your friends!'}
          </p>
        </div>
      </div>

      {/* Room code + invite link */}
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

      {/* Online list */}
      <div className="lobby__section-title">
        <span className="lobby__online-dot" />
        Online — {onlineCount} {onlineCount === 1 ? 'player' : 'players'} in this room
        {!isConfigured && <span className="lobby__demo-tag">demo</span>}
      </div>

      <div className="lobby__friends">
        {displayPeers.map((peer) => (
          <div
            key={peer.id}
            className={`lobby__friend-card${peer.local ? ' lobby__friend-card--you' : ''}`}
          >
            <div className="lobby__friend-avatar" style={{ background: peer.color + '28' }}>
              <span className="lobby__friend-emoji">{peer.emoji}</span>
              <div className="lobby__online-indicator" />
            </div>
            <span className="lobby__friend-name">{peer.name}</span>
            <span className={`lobby__friend-badge${peer.local ? ' lobby__friend-badge--you' : ''}`}>
              {peer.local ? '👋 You' : (isConfigured ? '✓ Online' : '✓ Demo')}
            </span>
          </div>
        ))}

        {isConfigured && peers.length === 0 && (
          <p className="lobby__empty">Waiting for players to join…</p>
        )}
      </div>

      {/* CTA */}
      <div className="lobby__actions">
        <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handleStart}>
          🚀 {startLabel}
        </button>
      </div>
    </div>
  );
}
