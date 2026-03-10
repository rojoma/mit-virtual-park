import { useState } from 'react';
import '../styles/ParkMap.css';

const ZONES = [
  {
    id: 'swings', emoji: '🪀', label: 'Swings', sub: 'Jump game!',
    x: 22, y: 32, active: true,
    cardDesc: 'Be the first!', cardStatus: 'Empty',
  },
  {
    id: 'slide', emoji: '🛝', label: 'Slide', sub: 'Coming soon',
    x: 68, y: 28, active: false,
    cardDesc: null, cardStatus: null,
  },
  {
    id: 'bench', emoji: '🪑', label: 'Bench', sub: 'Coming soon',
    x: 22, y: 58, active: false,
    cardDesc: null, cardStatus: null,
  },
  {
    id: 'sandbox', emoji: '⛱️', label: 'Sandbox', sub: 'Coming soon',
    x: 68, y: 56, active: false,
    cardDesc: null, cardStatus: null,
  },
];

const TREES = [
  { x: 6,  y: 60, s: 1.0 },
  { x: 14, y: 63, s: 1.2 },
  { x: 44, y: 60, s: 1.1 },
  { x: 50, y: 62, s: 0.9 },
  { x: 80, y: 61, s: 1.0 },
  { x: 90, y: 63, s: 1.15 },
];

export default function ParkMap({ userName, onNavigate }) {
  const [avatarPos, setAvatarPos] = useState({ x: 50, y: 72 });
  const [walking, setWalking]     = useState(false);

  const initial = (userName || 'U').charAt(0).toUpperCase();

  const goToZone = (zone) => {
    if (!zone.active) return;
    setAvatarPos({ x: zone.x, y: zone.y + 18 });
    setWalking(true);
    setTimeout(() => {
      setWalking(false);
      onNavigate('play');
    }, 600);
  };

  const handleMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    // Only walk within ground area (y > 55%)
    if (y > 55) {
      setAvatarPos({ x, y });
      setWalking(true);
      setTimeout(() => setWalking(false), 500);
    }
  };

  return (
    <div className="pmap">
      {/* Top bar */}
      <div className="pmap__topbar">
        <div className="pmap__logo-wrap">
          <span className="pmap__logo-icon">🌳</span>
          <div>
            <div className="pmap__logo-title">MIT Virtual Park</div>
            <div className="pmap__logo-sub">Hey {userName}! Pick a spot to play.</div>
          </div>
        </div>
        <div className="pmap__avatar">
          {initial}{(userName || '').charAt(1)?.toUpperCase() || ''}
        </div>
      </div>

      {/* Park scene */}
      <div className="pmap__scene-wrap">
        <div className="pmap__scene" onClick={handleMapClick}>

          {/* Sky elements */}
          <div className="pmap__sun" />
          <div className="pmap__cloud pmap__cloud--1" />
          <div className="pmap__cloud pmap__cloud--2" />

          {/* Ground */}
          <div className="pmap__ground" />
          <div className="pmap__dirt-path" />

          {/* Fence */}
          <div className="pmap__fence">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="pmap__fence-post" />
            ))}
          </div>

          {/* Trees */}
          {TREES.map((t, i) => (
            <div
              key={i}
              className="pmap__tree"
              style={{ left: `${t.x}%`, bottom: `${100 - t.y}%`, '--ts': t.s }}
            >
              <div className="pmap__tree-top" />
              <div className="pmap__tree-trunk" />
            </div>
          ))}

          {/* Activity zones */}
          {ZONES.map((zone) => (
            <button
              key={zone.id}
              className={`pmap__zone ${zone.active ? 'pmap__zone--active' : 'pmap__zone--soon'}`}
              style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
              onClick={(e) => { e.stopPropagation(); goToZone(zone); }}
            >
              <span className="pmap__zone-icon">{zone.emoji}</span>
              <span className="pmap__zone-label">{zone.label}</span>
              {!zone.active && <span className="pmap__zone-soon">Coming soon</span>}
            </button>
          ))}

          {/* User avatar */}
          <div
            className={`pmap__me ${walking ? 'pmap__me--walk' : ''}`}
            style={{ left: `${avatarPos.x}%`, top: `${avatarPos.y}%` }}
          >
            <div className="pmap__me-shadow" />
            <div className="pmap__me-bubble">{userName}</div>
          </div>

        </div>
      </div>

      {/* Activity cards */}
      <div className="pmap__cards">
        {ZONES.map((zone) => (
          <div
            key={zone.id}
            className={`pmap__card ${zone.active ? 'pmap__card--active' : 'pmap__card--soon'}`}
            onClick={() => goToZone(zone)}
          >
            <span className="pmap__card-icon">{zone.emoji}</span>
            <div className="pmap__card-info">
              <div className="pmap__card-label">{zone.label}</div>
              <div className="pmap__card-sub">{zone.sub}</div>
              {zone.cardDesc && <div className="pmap__card-desc">{zone.cardDesc}</div>}
            </div>
            {zone.cardStatus && (
              <span className="pmap__card-badge">{zone.cardStatus}</span>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="pmap__footer">🔒 Closed network — Sloan community only.</div>
    </div>
  );
}
