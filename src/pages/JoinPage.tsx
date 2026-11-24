import React from 'react';
import { Link } from 'react-router-dom';

export const JoinPage: React.FC = () => {
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
          maxWidth: '400px',
          textAlign: 'center',
        }}
      >
        <div className="px-30" style={{ color: '#1b1423' }}>
          Card Desk
        </div>
        <div className="px-20" style={{ color: '#5c3a26' }}>
          Sign in with your Google account to receive your scholar borrower card.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '8px' }}>
          <Link to="/setup" className="pixel-btn pixel-btn-primary" style={{ width: '100%' }}>
            Sign in with Google
          </Link>
          <Link to="/" className="pixel-btn pixel-btn-secondary" style={{ width: '100%' }}>
            Back to Entrance
          </Link>
        </div>
      </div>
    </div>
  );
};
