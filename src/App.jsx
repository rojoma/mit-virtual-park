import { useState, useEffect } from 'react';
import './App.css';
import NameEntry      from './components/NameEntry';
import ParkMap        from './components/ParkMap';
import ActivePlay     from './components/ActivePlay';
import Result         from './components/Result';
// Legacy screens kept for potential direct navigation
import SocialLobby    from './components/SocialLobby';

export default function App() {
  const [screen,      setScreen]      = useState(() =>
    localStorage.getItem('park_user_name') ? 'park' : 'name'
  );
  const [transitioning, setTransitioning] = useState(false);
  const [userName,    setUserName]    = useState(
    () => localStorage.getItem('park_user_name') || ''
  );
  const [gameResult,  setGameResult]  = useState({
    playerScore: 0, cpuScore: 0, playerWon: false,
  });
  const [roomId, setRoomId] = useState(null);

  // ?room=ABCD → multiplayer lobby (future)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room   = params.get('room');
    if (room) {
      setRoomId(room.toUpperCase());
      // If we have a name, go to lobby; otherwise name entry first
      if (localStorage.getItem('park_user_name')) {
        doSetScreen('lobby');
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doSetScreen = (s) => {
    setTransitioning(true);
    setTimeout(() => { setScreen(s); setTransitioning(false); }, 280);
  };

  const navigate = (target, data = {}) => {
    if (data.playerScore !== undefined) {
      setGameResult({
        playerScore: data.playerScore,
        cpuScore:    data.cpuScore   ?? 0,
        playerWon:   data.playerWon  ?? false,
      });
    }
    doSetScreen(target);
  };

  const handleNameComplete = (name) => {
    setUserName(name);
    doSetScreen('park');
  };

  const renderScreen = () => {
    switch (screen) {
      case 'name':   return <NameEntry onComplete={handleNameComplete} />;
      case 'park':   return <ParkMap   userName={userName} onNavigate={navigate} />;
      case 'play':   return <ActivePlay userName={userName} onNavigate={navigate} />;
      case 'result': return (
        <Result
          userName={userName}
          onNavigate={navigate}
          playerScore={gameResult.playerScore}
          cpuScore={gameResult.cpuScore}
          playerWon={gameResult.playerWon}
        />
      );
      // Legacy multiplayer lobby
      case 'lobby':  return <SocialLobby onNavigate={navigate} roomId={roomId} />;
      default:       return <NameEntry onComplete={handleNameComplete} />;
    }
  };

  return (
    <div className="app">
      <div className={`app__screen ${transitioning ? 'app__screen--exit' : 'app__screen--enter'}`}>
        {renderScreen()}
      </div>
    </div>
  );
}
