import React, { useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PixelCanvas } from '../engine/PixelCanvas';
import { getImage } from '../engine/assets';

export const RoomPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();

  const handleRender = useCallback((ctx: CanvasRenderingContext2D) => {
    try {
      const bg = getImage('bg');
      ctx.drawImage(bg, 0, 0);

      const light = getImage('light');
      ctx.drawImage(light, 0, 0);
    } catch {
      // Handled during initial load
    }
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <PixelCanvas onRender={handleRender} />

      {/* Room Header Overlay */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 10,
        }}
      >
        <div
          className="pixel-panel-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 16px',
            backgroundColor: '#f1e3c4',
          }}
        >
          <div className="px-20" style={{ color: '#1b1423' }}>
            Room: {code || 'default'}
          </div>
          <Link to="/lobby" className="pixel-btn pixel-btn-secondary" style={{ minHeight: '36px', padding: '0 10px', fontSize: '16px' }}>
            Leave
          </Link>
        </div>
      </div>
    </div>
  );
};
