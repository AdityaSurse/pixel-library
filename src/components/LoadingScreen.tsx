import React from 'react';

export interface LoadingScreenProps {
  progress: number; // 0 to 1
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress }) => {
  const percentage = Math.min(100, Math.max(0, Math.round(progress * 100)));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#1b1423',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        userSelect: 'none',
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
          maxWidth: '380px',
        }}
      >
        <div
          className="px-30"
          style={{
            color: '#1b1423',
            textAlign: 'center',
            letterSpacing: '1px',
          }}
        >
          Opening the library…
        </div>

        {/* Pixel Progress Bar */}
        <div
          style={{
            position: 'relative',
            width: '256px',
            height: '48px',
            imageRendering: 'pixelated',
          }}
        >
          {/* Empty Bar (Background) */}
          <img
            src="/pixel-library-assets/ui/progress_empty@4x.png"
            alt=""
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '256px',
              height: '48px',
              imageRendering: 'pixelated',
              display: 'block',
            }}
          />

          {/* Full Bar (Clipped based on progress) */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${percentage}%`,
              height: '48px',
              overflow: 'hidden',
              imageRendering: 'pixelated',
            }}
          >
            <img
              src="/pixel-library-assets/ui/progress_full@4x.png"
              alt=""
              style={{
                width: '256px',
                height: '48px',
                imageRendering: 'pixelated',
                display: 'block',
              }}
            />
          </div>
        </div>

        <div
          className="px-20"
          style={{
            color: '#5c3a26',
            marginTop: '4px',
          }}
        >
          {percentage}%
        </div>
      </div>
    </div>
  );
};
