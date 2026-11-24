import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PixelCanvas } from '../engine/PixelCanvas';
import { getImage } from '../engine/assets';

export const LandingPage: React.FC = () => {
  // Render library_bg.png sharp at 320x192 native size
  const handleRender = useCallback((ctx: CanvasRenderingContext2D) => {
    try {
      const bg = getImage('bg');
      ctx.drawImage(bg, 0, 0);

      const light = getImage('light');
      ctx.drawImage(light, 0, 0);
    } catch {
      // In case assets are still finalizing
    }
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Background Pixel Canvas */}
      <PixelCanvas onRender={handleRender} />

      {/* Floating UI Overlay */}
      <div
        style={{
          position: 'absolute',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        <div
          className="pixel-panel"
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 28px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
          }}
        >
          <div className="px-30" style={{ color: '#1b1423' }}>
            Pixel Library
          </div>
          <div className="px-20" style={{ color: '#5c3a26', maxWidth: '320px' }}>
            A cozy pixel-art library where friends study together.
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
            <Link to="/join" className="pixel-btn pixel-btn-primary">
              Enter Library
            </Link>
            <Link to="/lobby" className="pixel-btn pixel-btn-secondary">
              Lobby
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
