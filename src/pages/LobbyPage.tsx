import React from 'react';
import { Link } from 'react-router-dom';

export const LobbyPage: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: '#1b1423',
        padding: '20px',
      }}
    >
      <div
        className="pixel-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          padding: '24px 32px',
          maxWidth: '440px',
          textAlign: 'center',
        }}
      >
        <div className="px-30" style={{ color: '#1b1423' }}>
          Library Lobby
        </div>
        <div className="px-20" style={{ color: '#5c3a26' }}>
          Create a private study chamber or enter a room code from a friend.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '8px' }}>
          <Link to="/room/quiet-oak" className="pixel-btn pixel-btn-primary" style={{ width: '100%' }}>
            Enter Room: quiet-oak
          </Link>
          <Link to="/" className="pixel-btn pixel-btn-secondary" style={{ width: '100%' }}>
            Back to Front Door
          </Link>
        </div>
      </div>
    </div>
  );
};
