import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MatrixRain from './components/MatrixRain';
import HostLobby from './pages/HostLobby';
import HostGame from './pages/HostGame';
import HostScoreboard from './pages/HostScoreboard';
import PlayerJoin from './pages/PlayerJoin';
import PlayerGame from './pages/PlayerGame';
import PlayerResults from './pages/PlayerResults';

function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-display font-bold text-cyber-green mb-4">
        VIRUS BREACH
      </h1>
      <p className="text-cyber-cyan text-lg mb-8">
        Cybercrime Prevention Act Challenge
      </p>
      <div className="flex gap-4">
        <a
          href="/host"
          className="px-6 py-3 border border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-cyber-black transition-colors font-display font-bold"
        >
          HOST GAME
        </a>
        <a
          href="/play"
          className="px-6 py-3 border border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan hover:text-cyber-black transition-colors font-display font-bold"
        >
          JOIN GAME
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <MatrixRain />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/host" element={<HostLobby />} />
          <Route path="/host/game" element={<HostGame />} />
          <Route path="/host/scoreboard" element={<HostScoreboard />} />
          <Route path="/play" element={<PlayerJoin />} />
          <Route path="/play/game" element={<PlayerGame />} />
          <Route path="/play/results" element={<PlayerResults />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}
