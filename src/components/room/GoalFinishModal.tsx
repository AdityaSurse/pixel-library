import React from 'react';

interface GoalFinishModalProps {
  isOpen: boolean;
  goalText: string;
  onDone: () => void;
  onNotYet: () => void;
}

export const GoalFinishModal: React.FC<GoalFinishModalProps> = ({
  isOpen,
  goalText,
  onDone,
  onNotYet,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="pixel-panel"
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: '#241a2e',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '24px 20px',
          boxSizing: 'border-box',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.95)',
        }}
      >
        {/* Goal Card Note Graphic */}
        <div style={{ marginBottom: '12px' }}>
          <img
            src="/pixel-library-themes/goal-card/note@4x.png"
            alt=""
            width="40"
            height="28"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* Question Header */}
        <h2
          className="px-30"
          style={{
            margin: '0 0 12px 0',
            color: '#ffe2a0',
          }}
        >
          Did you finish it?
        </h2>

        {/* Goal Text Box */}
        <div
          style={{
            width: '100%',
            backgroundColor: '#f6edc8',
            border: '3px solid #1b1423',
            padding: '12px 14px',
            boxSizing: 'border-box',
            marginBottom: '20px',
            wordBreak: 'break-word',
          }}
        >
          <span className="px-20" style={{ color: '#1b1423' }}>
            "{goalText}"
          </span>
        </div>

        {/* 2-Button Choice: DONE (primary, icons/check.png) & NOT YET (secondary) */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <button
            type="button"
            onClick={onDone}
            className="pixel-btn pixel-btn-primary"
            style={{
              flex: 1,
              minHeight: '44px',
              padding: '0 16px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <img
              src="/pixel-library-assets/icons/check.png"
              alt=""
              width="16"
              height="16"
              style={{ imageRendering: 'pixelated' }}
            />
            <span className="px-20">DONE</span>
          </button>

          <button
            type="button"
            onClick={onNotYet}
            className="pixel-btn pixel-btn-secondary"
            style={{
              flex: 1,
              minHeight: '44px',
              padding: '0 16px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="px-20">NOT YET</span>
          </button>
        </div>
      </div>
    </div>
  );
};
