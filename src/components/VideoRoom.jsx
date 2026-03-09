/**
 * VideoRoom — Daily.co real-time video component
 *
 * Architecture:
 *  - Uses @daily-co/daily-js (no iframe, full control over layout)
 *  - Local camera stays with MediaPipe; this component shows REMOTE participants only
 *    (local audio is still sent so friends can hear you)
 *  - Room is auto-created via Daily REST API if VITE_DAILY_API_KEY is provided,
 *    otherwise assumes the room already exists in your Daily dashboard.
 *
 * Setup: copy .env.example → .env.local and fill in your Daily credentials.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/VideoRoom.css';

const DAILY_DOMAIN  = import.meta.env.VITE_DAILY_DOMAIN;
const DAILY_API_KEY = import.meta.env.VITE_DAILY_API_KEY;

// ── Derive a valid Daily room name from the park room code ──
// "PARK-AB12" → "park-ab12"
function toRoomName(roomId) {
  return (roomId || 'mit-park-demo').toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

// ── Create or get an existing Daily room via REST API ──
async function ensureRoom(roomName) {
  const domain = DAILY_DOMAIN;
  const baseUrl = `https://${domain}.daily.co/${roomName}`;
  if (!DAILY_API_KEY) return baseUrl; // assume room pre-exists

  try {
    const res = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          max_participants: 10,
          // Room expires 2 h after creation (auto-cleanup)
          exp: Math.floor(Date.now() / 1000) + 7200,
          enable_screenshare: false,
          enable_chat: false,
        },
      }),
    });
    const data = await res.json();
    // data.url is set on success; on 409 (already exists) it's absent
    return data.url || baseUrl;
  } catch {
    return baseUrl; // fall through to pre-existing room
  }
}

// ── Single remote-participant tile ──
function ParticipantTile({ participant }) {
  const videoRef = useRef(null);

  // Attach/re-attach tracks whenever they change
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const vTrack = participant.tracks?.video?.persistentTrack;
    const aTrack = participant.tracks?.audio?.persistentTrack;
    const tracks  = [vTrack, aTrack].filter(Boolean);
    if (tracks.length === 0) return;

    // Only update srcObject when track IDs actually changed
    const existing = el.srcObject;
    if (existing) {
      const existIds = existing.getTracks().map((t) => t.id).sort().join(',');
      const newIds   = tracks.map((t) => t.id).sort().join(',');
      if (existIds === newIds) return;
    }
    el.srcObject = new MediaStream(tracks);
    el.play().catch(() => {});
  }, [
    participant.tracks?.video?.persistentTrack?.id,
    participant.tracks?.audio?.persistentTrack?.id,
  ]);

  return (
    <div className="vroom__tile">
      <video ref={videoRef} autoPlay playsInline className="vroom__video" />
      <div className="vroom__tile-label">
        <div className="vroom__tile-dot" />
        {participant.user_name || '🎮 Friend'}
      </div>
    </div>
  );
}

// ── Main VideoRoom component ──
export default function VideoRoom({ roomId }) {
  const [status, setStatus] = useState('idle'); // idle | joining | joined | error
  const [participants, setParticipants] = useState({});
  const callRef = useRef(null);

  const isConfigured = DAILY_DOMAIN && DAILY_DOMAIN !== 'your-subdomain';

  // Sync participants state from the call object
  const syncParticipants = useCallback(() => {
    if (callRef.current) {
      setParticipants({ ...callRef.current.participants() });
    }
  }, []);

  // ── Join the Daily room ──
  const joinRoom = useCallback(async () => {
    setStatus('joining');
    try {
      // Lazy-load @daily-co/daily-js to keep initial bundle lean
      const { default: DailyIframe } = await import('@daily-co/daily-js');
      const roomName = toRoomName(roomId);
      const url = await ensureRoom(roomName);

      const call = DailyIframe.createCallObject({
        // We send our local audio so friends hear us.
        // We DON'T send our local video here — MediaPipe already shows it.
        audioSource: true,
        videoSource: true,
        // Lower Daily's output gain slightly so game SFX remain audible
        dailyConfig: {
          userMediaAudioConstraints: { noiseSuppression: true, echoCancellation: true },
        },
      });
      callRef.current = call;

      call.on('joined-meeting',     syncParticipants);
      call.on('participant-joined', syncParticipants);
      call.on('participant-updated', syncParticipants);
      call.on('participant-left',   syncParticipants);
      call.on('error', (err) => {
        console.error('[Daily] error:', err);
        setStatus('error');
      });

      await call.join({ url });
      setStatus('joined');
    } catch (err) {
      console.error('[Daily] join failed:', err);
      setStatus('error');
    }
  }, [roomId, syncParticipants]);

  // ── Cleanup: leave & destroy on unmount (or when navigating away) ──
  useEffect(() => {
    return () => {
      if (callRef.current) {
        callRef.current.leave().catch(() => {});
        callRef.current.destroy().catch(() => {});
        callRef.current = null;
      }
    };
  }, []);

  // ── Derived remote-only participant list ──
  const remotes = Object.values(participants).filter((p) => !p.local);

  // ── Render ──

  if (status === 'idle') {
    return (
      <div className="vroom vroom--cta">
        <div className="vroom__cta-icon">📹</div>
        {isConfigured ? (
          <>
            <p className="vroom__cta-hint">
              Please allow camera &amp; mic<br />to play with friends!
            </p>
            <button className="btn btn-primary vroom__cta-btn" onClick={joinRoom}>
              Join Video Room
            </button>
          </>
        ) : (
          <>
            <p className="vroom__cta-hint">
              Add your Daily credentials<br />in <code>.env.local</code> to enable live video.
            </p>
            <p className="vroom__cta-sub">See <code>.env.example</code> for setup.</p>
          </>
        )}
      </div>
    );
  }

  if (status === 'joining') {
    return (
      <div className="vroom vroom--cta">
        <div className="vroom__spinner" />
        <p className="vroom__cta-hint">Connecting to video room…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="vroom vroom--cta vroom--error">
        <div className="vroom__cta-icon">⚠️</div>
        <p className="vroom__cta-hint">Couldn't join video room</p>
        <button className="btn btn-secondary vroom__cta-btn" onClick={joinRoom}>
          Try Again
        </button>
      </div>
    );
  }

  // status === 'joined'
  return (
    <div className="vroom">
      {remotes.length === 0 ? (
        <div className="vroom vroom--cta">
          <div className="vroom__cta-icon">👋</div>
          <p className="vroom__cta-hint">
            Connected! Waiting for friends…<br />
            <span className="vroom__cta-sub">Share your invite link!</span>
          </p>
        </div>
      ) : (
        <div className="vroom__tiles">
          {remotes.map((p) => (
            <ParticipantTile key={p.session_id} participant={p} />
          ))}
        </div>
      )}
    </div>
  );
}
