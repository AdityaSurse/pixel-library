import React, { useState } from 'react';

interface RoomHUDProps {
  roomName: string;
  roomCode: string;
  focusMinutes: number;
  breakMinutes: number;
  showAllNames: boolean;
  isSeated: boolean;
  onToggleNames: () => void;
  onStandUp: () => void;
  onLeave: () => void;
}

export const RoomHUD: React.FC<RoomHUDProps> = ({
  roomName,
  roomCode,
  focusMinutes,
  breakMinutes,
  showAllNames,
  isSeated,
  onToggleNames,
  onStandUp,
  onLeave,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/room/${roomCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback prompt
      window.prompt('Copy room link:', url);
    }
  };

  return (
    <header
      style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        right: '16px',
        zIndex: 30,
        pointerEvents: 'none',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}
    >
      {/* Room Details & Actions Panel */}
      <div
        className="pixel-panel-sm"
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 16px',
          backgroundColor: '#241a2e',
          border: '3px solid #5c3a26',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.85)',
          maxWidth: 'calc(100vw - 32px)',
        }}
      >
        <div>
          <div className="px-20" style={{ color: '#ffe2a0' }}>
            {roomName}
          </div>
          <div className="px-10" style={{ color: '#b9a98a' }}>
            ROOM: {roomCode} • {focusMinutes}/{breakMinutes}m
          </div>
        </div>

        {/* Copy Link Button */}
        <button
          onClick={handleCopyLink}
          className="pixel-btn pixel-btn-secondary"
          style={{
            minHeight: '36px',
            padding: '0 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          title="Copy room link"
        >
          <img
            src="/pixel-library-assets/icons/link.png"
            alt="Link"
            style={{ width: 14, height: 14, imageRendering: 'pixelated' }}
          />
          <span className="px-10">{copied ? 'COPIED!' : 'COPY LINK'}</span>
        </button>

        {/* Show Names Toggle */}
        <button
          onClick={onToggleNames}
          className={`pixel-btn ${showAllNames ? 'pixel-btn-primary' : 'pixel-btn-secondary'}`}
          style={{
            minHeight: '36px',
            padding: '0 10px',
          }}
        >
          <span className="px-10">NAMES: {showAllNames ? 'ON' : 'OFF'}</span>
        </button>

        {/* Stand Up Button (visible when seated) */}
        {isSeated && (
          <button
            onClick={onStandUp}
            className="pixel-btn pixel-btn-secondary"
            style={{
              minHeight: '36px',
              padding: '0 10px',
            }}
          >
            <span className="px-10">STAND UP</span>
          </button>
        )}

        {/* Leave Room Button */}
        <button
          onClick={onLeave}
          className="pixel-btn pixel-btn-danger"
          style={{
            minHeight: '36px',
            padding: '0 10px',
          }}
        >
          <span className="px-10">LEAVE</span>
        </button>
      </div>
    </header>
  );
};
