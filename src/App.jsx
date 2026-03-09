import { useState, useEffect } from 'react';
import './App.css';
import ParentPortal from './components/ParentPortal';
import SocialLobby from './components/SocialLobby';
import CourseSelection from './components/CourseSelection';
import ActivePlay from './components/ActivePlay';
import CoolDown from './components/CoolDown';
import AgentPanel from './components/AgentPanel';

export default function App() {
  const [screen, setScreen] = useState('portal');
  const [showAgent, setShowAgent] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [courseMins, setCourseMins] = useState(15);
  // Session data lifted to App so CoolDown can display stats
  const [sessionData, setSessionData] = useState({ score: 0, time: 0 });

  // URL param ?room=ABCD → skip portal + lobby, go straight to course selection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setRoomId(room.toUpperCase());
      setScreen('course');
    }
  }, []);

  // navigate(target) or navigate('play', { courseMins }) or navigate('cooldown', { score, time })
  const navigate = (target, data = {}) => {
    if (data.score !== undefined) {
      setSessionData({ score: data.score, time: data.time ?? 0 });
    }
    if (data.courseMins !== undefined) {
      setCourseMins(data.courseMins);
    }
    setTransitioning(true);
    setTimeout(() => {
      setScreen(target);
      setTransitioning(false);
    }, 300);
  };

  const isPlay = screen === 'play';

  const renderScreen = () => {
    switch (screen) {
      case 'portal':   return <ParentPortal onNavigate={navigate} />;
      case 'lobby':    return <SocialLobby onNavigate={navigate} />;
      case 'course':   return <CourseSelection onNavigate={navigate} />;
      case 'play':     return <ActivePlay onNavigate={navigate} roomId={roomId} courseMins={courseMins} />;
      case 'cooldown': return <CoolDown onNavigate={navigate} score={sessionData.score} time={sessionData.time} />;
      default:         return <ParentPortal onNavigate={navigate} />;
    }
  };

  return (
    <div className="app">
      {/* AI agent button hidden during play to prevent child taps (Step 2) */}
      {!isPlay && (
        <button
          className="app__agent-btn"
          onClick={() => setShowAgent(true)}
          title="AI Game Designer"
        >
          <span className="app__agent-btn-icon">🤖</span>
          <span className="app__agent-btn-pulse" />
        </button>
      )}

      <div className={`app__screen ${transitioning ? 'app__screen--exit' : 'app__screen--enter'}`}>
        {renderScreen()}
      </div>

      {showAgent && <AgentPanel onClose={() => setShowAgent(false)} />}
    </div>
  );
}
