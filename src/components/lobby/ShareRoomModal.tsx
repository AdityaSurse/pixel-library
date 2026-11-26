import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeId, getThemeInfo } from '../../engine/themes';

interface ShareRoomModalProps {
  code: string;
  roomName: string;
  theme?: ThemeId;
  onClose: () => void;
}

export const ShareRoomModal: React.FC<ShareRoomModalProps> = ({
  code,
  roomName,
  theme = 'classic',
  onClose,
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const themeInfo = getThemeInfo(theme);
  const roomUrl = `${window.location.origin}/room/${code}`;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(roomUrl);
        setCopied(true);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      // Fallback
      if (inputRef.current) {
        inputRef.current.select();
        document.execCommand('copy');
        setCopied(true);
      }
    }

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleEnterRoom = () => {
    navigate(`/room/${code}`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(27, 20, 35, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="pixel-panel"
        style={{
          width: '100%',
          maxWidth: '460px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          padding: '24px 28px',
          textAlign: 'center',
          position: 'relative',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.95)',
        }}
      >
        {/* Close Button at top right */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'none',
            border: 'none',
            fontFamily: 'Quietpage, monospace',
            fontSize: '20px',
            color: '#1b1423',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          X
        </button>

        <div className="px-30" style={{ color: '#1b1423' }}>
          TABLE READY!
        </div>

        <div className="px-20" style={{ color: '#5c3a26' }}>
          {roomName}
        </div>

        {/* Theme Name & Small Preview */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#241a2e',
            border: '2px solid #5c3a26',
            padding: '6px 12px',
            boxSizing: 'border-box',
            maxWidth: '100%',
          }}
        >
          <img
            src={`/pixel-library-themes/themes/${themeInfo.id}/preview_night@4x.png`}
            alt={themeInfo.name}
            style={{
              width: '48px',
              height: '28px',
              objectFit: 'cover',
              imageRendering: 'pixelated',
              border: `1px solid ${themeInfo.accent}`,
              display: 'block',
            }}
          />
          <div style={{ textAlign: 'left' }}>
            <div className="px-10" style={{ color: '#b9a98a', fontSize: '10px' }}>
              LIBRARY THEME
            </div>
            <div className="px-10" style={{ color: themeInfo.accent, fontWeight: 'bold' }}>
              {themeInfo.name}
            </div>
          </div>
        </div>

        {/* Big Room Code in 40px Quietpage */}
        <div
          style={{
            backgroundColor: '#f6edc8',
            border: '4px solid #1b1423',
            padding: '10px 24px',
            width: '100%',
            boxSizing: 'border-box',
            boxShadow: 'inset 0 -4px #d4a24c',
            marginTop: '4px',
          }}
        >
          <div
            className="px-40"
            style={{
              color: '#1b1423',
              textShadow: '1px 1px 0 #d9c69e',
              letterSpacing: '6px',
              textAlign: 'center',
            }}
          >
            {code}
          </div>
        </div>

        {/* Link Input & Copy Area */}
        <div style={{ width: '100%', marginTop: '4px' }}>
          <div className="px-10" style={{ color: '#7a4d31', textAlign: 'left', marginBottom: '4px' }}>
            SHAREABLE ROOM LINK:
          </div>
          <input
            ref={inputRef}
            type="text"
            readOnly
            value={roomUrl}
            style={{
              width: '100%',
              fontFamily: 'Quietpage, monospace',
              fontSize: '10px',
              padding: '6px 8px',
              backgroundColor: '#fff0b0',
              border: '2px solid #1b1423',
              color: '#1b1423',
              boxSizing: 'border-box',
              outline: 'none',
              marginBottom: '10px',
            }}
          />

          <button
            onClick={handleCopy}
            className="pixel-btn pixel-btn-secondary"
            style={{
              width: '100%',
              fontSize: '20px',
              gap: '8px',
              minHeight: '44px',
            }}
          >
            <img
              src="/pixel-library-assets/icons/link.png"
              alt=""
              width="14"
              height="14"
              style={{ imageRendering: 'pixelated' }}
            />
            {copied ? 'COPIED TO CLIPBOARD!' : 'COPY LINK'}
          </button>
        </div>

        {/* Enter Room Button */}
        <button
          onClick={handleEnterRoom}
          className="pixel-btn pixel-btn-primary"
          style={{
            width: '100%',
            fontSize: '20px',
            minHeight: '46px',
            marginTop: '4px',
          }}
        >
          ENTER ROOM
        </button>
      </div>
    </div>
  );
};
