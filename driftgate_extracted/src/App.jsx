import React, { useState } from 'react';
import MainMenu from './pages/MainMenu.jsx';
import Game     from './pages/Game.jsx';
import Mission  from './pages/Mission.jsx';

export default function App() {
  const [scene, setScene] = useState('menu');

  if (scene === 'game')    return <Game    onExit={() => setScene('menu')} />;
  if (scene === 'mission') return <Mission onExit={() => setScene('menu')} />;
  return <MainMenu onStartGame={() => setScene('game')} onStartMission={() => setScene('mission')} />;
}
