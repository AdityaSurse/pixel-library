import React from 'react';

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'Space', desc: 'Start / Pause / Resume timer' },
  { key: 'G', desc: 'Open session goal panel' },
  { key: 'L', desc: 'Open weekly leaderboard' },
  { key: 'N', desc: 'Toggle reader name tags' },
  { key: 'M', desc: 'Mute / Unmute audio chime' },
  { key: '?', desc: 'Toggle keyboard shortcuts' },
  { key: 'Esc', desc: 'Close open panel' },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ onClose }) => {
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="pixel-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          padding: '24px 28px',
          textAlign: 'center',
          position: 'relative',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.95)',
        }}
      >
        {/* Close Button */}
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

        {/* Title */}
        <div className="px-30" style={{ color: '#1b1423' }}>
          KEYBOARD SHORTCUTS
        </div>

        <div className="px-10" style={{ color: '#7a4d31' }}>
          PRESS KEYS ANY TIME OUTSIDE OF TEXT BOXES
        </div>

        {/* Shortcuts List */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '4px',
          }}
        >
          {SHORTCUTS.map((item) => (
            <div
              key={item.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                backgroundColor: '#241a2e',
                border: '2px solid #5c3a26',
                boxSizing: 'border-box',
              }}
            >
              <kbd
                style={{
                  fontFamily: 'Quietpage, monospace',
                  fontSize: '10px',
                  backgroundColor: '#f6edc8',
                  color: '#1b1423',
                  border: '2px solid #1b1423',
                  padding: '2px 8px',
                  boxShadow: '0 2px #d4a24c',
                  display: 'inline-block',
                  minWidth: '40px',
                  textAlign: 'center',
                }}
              >
                {item.key}
              </kbd>
              <span
                className="px-10"
                style={{
                  color: '#ffe2a0',
                  textAlign: 'right',
                }}
              >
                {item.desc}
              </span>
            </div>
          ))}
        </div>

        {/* Got It Button */}
        <button
          onClick={onClose}
          className="pixel-btn pixel-btn-primary"
          style={{
            width: '100%',
            fontSize: '20px',
            minHeight: '44px',
            marginTop: '8px',
          }}
        >
          GOT IT
        </button>
      </div>
    </div>
  );
};
