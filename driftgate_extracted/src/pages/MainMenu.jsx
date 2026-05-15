import React from 'react';

const BTN_BASE = {
  display: 'block', width: '100%', padding: '14px 48px',
  border: '1px solid',
  fontSize: 15, letterSpacing: 4,
  cursor: 'pointer', fontFamily: 'monospace',
  transition: 'all 0.2s',
  marginBottom: 10,
};

function MenuButton({ label, sublabel, colour, onClick }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        ...BTN_BASE,
        background:   hovered ? `${colour}44` : `${colour}18`,
        borderColor:  colour,
        color:        hovered ? '#fff' : colour,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div>{label}</div>
      {sublabel && (
        <div style={{ fontSize: 9, letterSpacing: 3, opacity: 0.6, marginTop: 3 }}>
          {sublabel}
        </div>
      )}
    </button>
  );
}

export default function MainMenu({ onStartGame, onStartMission }) {
  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'radial-gradient(ellipse at center, #0d1f0d 0%, #050d05 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace', color: '#ccc',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'linear-gradient(#0f0 1px, transparent 1px), linear-gradient(90deg, #0f0 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div style={{
        position: 'relative', textAlign: 'center',
        padding: '48px 64px',
        background: 'rgba(0,0,0,0.5)',
        border: '1px solid rgba(74,122,63,0.4)',
        borderRadius: 8,
        boxShadow: '0 0 60px rgba(74,122,63,0.15)',
        minWidth: 380,
      }}>
        <div style={{ fontSize: 11, letterSpacing: 8, color: '#4a7c3f', marginBottom: 8 }}>
          DRIFTGATE STUDIOS
        </div>
        <h1 style={{
          fontSize: 52, fontWeight: 900, letterSpacing: 4,
          color: '#fff', margin: '0 0 4px',
          textShadow: '0 0 30px rgba(74,200,80,0.4)',
        }}>
          COMMAND ZERO
        </h1>
        <div style={{ fontSize: 13, letterSpacing: 6, color: '#4a7c3f', marginBottom: 40 }}>
          — R T S  E N G I N E  v 0 . 2 —
        </div>

        {/* Mission button — primary */}
        <MenuButton
          label="MISSION: BROKEN CROSSING"
          sublabel="BRIEFING → TACTICAL SLICE → HOLD THE FORD"
          colour="#c9a84c"
          onClick={onStartMission}
        />

        {/* Skirmish button — secondary */}
        <MenuButton
          label="SKIRMISH"
          sublabel="OPEN SANDBOX — NO OBJECTIVES"
          colour="#4a7c3f"
          onClick={onStartGame}
        />

        {/* Controls */}
        <div style={{ marginTop: 32, fontSize: 10, color: '#333', lineHeight: 2 }}>
          <div>W / A / S / D &nbsp;&nbsp; Pan camera</div>
          <div>Scroll wheel &nbsp;&nbsp;&nbsp;&nbsp; Zoom</div>
          <div>Left click &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Select unit</div>
          <div>Right click &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Move / Attack</div>
          <div>ESC &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Return to menu</div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 20, fontSize: 10, color: '#333', letterSpacing: 2 }}>
        © 2026 DRIFTGATE STUDIOS — ALL SYSTEMS OPERATIONAL
      </div>
    </div>
  );
}
