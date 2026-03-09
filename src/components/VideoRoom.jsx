/**
 * VideoRoom — Daily Prebuilt via DailyIframe.createFrame()
 *
 * Uses Daily's fully-managed Prebuilt UI embedded in a div container.
 * Handles local + remote video, audio, permissions automatically.
 *
 * Setup: copy .env.example → .env.local, fill in VITE_DAILY_DOMAIN + VITE_DAILY_API_KEY.
 *
 * Flow:
 *  idle   → user clicks "Join Video Room"
 *  joining → DailyIframe.createFrame() + frame.join(url) called
 *  joined  → Daily Prebuilt UI visible inside container (handled by Daily)
 *  error   → join failed, retry button shown
 *
 * Cleanup: frame.leave() + frame.destroy() on component unmount.
 */

import { useState, useEffect, useRef } from 'react';
import '../styles/VideoRoom.css';

const DAILY_DOMAIN  = import.meta.env.VITE_DAILY_DOMAIN;
const DAILY_API_KEY = import.meta.env.VITE_DAILY_API_KEY;

// "PARK-AB12" → "park-ab12"  (valid Daily room name)
function toRoomName(roomId) {
  return (roomId || 'mit-park-demo').toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

// Create the Daily room via REST API (idempotent — safe to call even if it exists already).
// Falls back silently to a constructed URL on any error.
async function ensureRoomUrl(roomName) {
  const domain = DAILY_DOMAIN || '';
  const fallback = `https://${domain}.daily.co/${roomName}`;
  if (!DAILY_API_KEY) return fallback;

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
          exp: Math.floor(Date.now() / 1000) + 7200, // expires in 2 h
          enable_screenshare: false,
          enable_chat: false,
        },
      }),
    });
    const data = await res.json();
    // 201 Created  → data.url present
    // 409 Duplicate → data.url absent; fall back to constructed URL
    return data.url || fallback;
  } catch {
    return fallback;
  }
}

export default function VideoRoom({ roomId }) {
  const containerRef = useRef(null);
  const frameRef     = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | joining | joined | error

  const isConfigured = !!(DAILY_DOMAIN && DAILY_DOMAIN !== 'your-subdomain');

  // ── Join: create Daily Prebuilt frame inside the container div ──
  const joinRoom = async () => {
    if (!containerRef.current || frameRef.current) return;
    setStatus('joining');

    try {
      // Lazy-load so Daily's 250 KB chunk only ships when the user clicks
      const { default: DailyIframe } = await import('@daily-co/daily-js');
      const roomName = toRoomName(roomId);
      const url      = await ensureRoomUrl(roomName);

      const frame = DailyIframe.createFrame(containerRef.current, {
        showLeaveButton: false,       // we handle exit via ActivePlay's End Session
        showFullscreenButton: false,
        showParticipantsBar: false,   // keep UI minimal inside the PiP
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '0',
        },
      });
      frameRef.current = frame;

      frame.on('joined-meeting', () => setStatus('joined'));
      frame.on('left-meeting',   () => setStatus('idle'));
      frame.on('error', (err) => {
        console.error('[Daily]', err);
        setStatus('error');
      });

      await frame.join({ url });
    } catch (err) {
      console.error('[Daily] join failed:', err);
      setStatus('error');
    }
  };

  // ── Cleanup: leave + destroy on unmount ──
  // This fires when the user navigates to CoolDown, closes the tab, etc.
  useEffect(() => {
    return () => {
      if (frameRef.current) {
        frameRef.current.leave().catch(() => {});
        frameRef.current.destroy().catch(() => {});
        frameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="vroom">
      {/* Daily Prebuilt iframe mounts here once joinRoom() is called */}
      <div ref={containerRef} className="vroom__frame" />

      {/* ── CTA overlay (idle state) ── */}
      {status === 'idle' && (
        <div className="vroom__overlay">
          <div className="vroom__overlay-icon">📹</div>
          {isConfigured ? (
            <>
              <p className="vroom__overlay-hint">
                Please allow camera &amp; mic<br />to play with friends!
              </p>
              <button className="btn btn-primary vroom__join-btn" onClick={joinRoom}>
                Join Video Room
              </button>
            </>
          ) : (
            <p className="vroom__overlay-hint">
              Set <code>VITE_DAILY_DOMAIN</code> in<br />
              <code>.env.local</code> to enable live video.
            </p>
          )}
        </div>
      )}

      {/* ── Spinner overlay (joining state) ── */}
      {status === 'joining' && (
        <div className="vroom__overlay">
          <div className="vroom__spinner" />
          <p className="vroom__overlay-hint">Connecting…</p>
        </div>
      )}

      {/* ── Error overlay ── */}
      {status === 'error' && (
        <div className="vroom__overlay vroom__overlay--error">
          <div className="vroom__overlay-icon">⚠️</div>
          <p className="vroom__overlay-hint">Couldn't join video room</p>
          <button className="btn btn-secondary vroom__join-btn" onClick={joinRoom}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
