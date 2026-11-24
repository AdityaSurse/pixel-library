import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

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
        boxSizing: 'border-box',
      }}
    >
      <div
        className="pixel-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          padding: '24px 32px',
          maxWidth: '460px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.9)',
        }}
      >
        <div className="px-30" style={{ color: '#1b1423' }}>
          Library Lobby
        </div>

        {/* Reader Profile Badge Card */}
        {profile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: '#f6edc8',
              border: '2px solid #1b1423',
              padding: '8px 14px',
              width: '100%',
              boxSizing: 'border-box',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '32px',
                  backgroundImage:
                    "url('/pixel-library-assets/sprites/avatars/avatar_heads.png')",
                  backgroundPosition: `-${(profile.presetIndex ?? 0) * 36}px 0px`,
                  backgroundSize: '288px 32px',
                  imageRendering: 'pixelated',
                }}
              />
              <div style={{ textAlign: 'left' }}>
                <div className="px-20" style={{ color: '#1b1423', lineHeight: 1 }}>
                  @{profile.username}
                </div>
                <div className="px-10" style={{ color: '#7a4d31', marginTop: '2px' }}>
                  {profile.stats?.pomodoros ?? 0} pomodoros • {profile.stats?.streakDays ?? 0} day streak
                </div>
              </div>
            </div>

            {/* "Edit card" option */}
            <Link
              to="/setup"
              className="pixel-btn pixel-btn-secondary"
              style={{
                fontSize: '10px',
                minHeight: '34px',
                padding: '0 10px',
              }}
            >
              Edit card
            </Link>
          </div>
        )}

        <div className="px-20" style={{ color: '#5c3a26' }}>
          Create a private study chamber or enter a room code from a friend.
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            width: '100%',
            marginTop: '8px',
          }}
        >
          <Link
            to="/room/quiet-oak"
            className="pixel-btn pixel-btn-primary"
            style={{ width: '100%' }}
          >
            Enter Room: quiet-oak
          </Link>

          <button
            onClick={handleSignOut}
            className="pixel-btn pixel-btn-danger"
            style={{ width: '100%', fontSize: '10px', minHeight: '38px' }}
          >
            SIGN OUT ({user?.email || 'READER'})
          </button>

          <Link
            to="/"
            className="px-10"
            style={{
              color: '#7a4d31',
              textDecoration: 'none',
              marginTop: '4px',
            }}
          >
            ← Back to Front Door
          </Link>
        </div>
      </div>
    </div>
  );
};
