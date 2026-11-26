import React, { useState, useEffect, useRef } from 'react';

interface GoalModalProps {
  isOpen: boolean;
  initialText?: string;
  onSave: (text: string) => void;
  onSkip: () => void;
  onClear?: () => void;
}

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  initialText = '',
  onSave,
  onSkip,
  onClear,
}) => {
  const [text, setText] = useState(initialText);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, initialText]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = text.trim();
    if (clean) {
      onSave(clean);
    } else {
      onSkip();
    }
  };

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
          maxWidth: '420px',
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
        {/* Pinned Goal Card Header Graphic */}
        <div style={{ marginBottom: '12px' }}>
          <img
            src="/pixel-library-themes/goal-card/goal_card_pinned@4x.png"
            alt=""
            width="52"
            height="40"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* Modal Prompt Header */}
        <h2
          className="px-20"
          style={{
            margin: '0 0 16px 0',
            color: '#ffe2a0',
            letterSpacing: '0.5px',
          }}
        >
          What will you finish this session?
        </h2>

        {/* Goal Input Form */}
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div style={{ position: 'relative', width: '100%', marginBottom: '16px' }}>
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 60))}
              placeholder="e.g. Read chapter 4, write 300 words..."
              maxLength={60}
              className="px-20"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 14px',
                backgroundColor: '#f6edc8',
                color: '#1b1423',
                border: '3px solid #1b1423',
                fontFamily: 'Quietpage, monospace',
                fontSize: '20px',
                outline: 'none',
              }}
            />
            <div
              className="px-10"
              style={{
                position: 'absolute',
                right: '8px',
                bottom: '-20px',
                color: text.length >= 55 ? '#d9463b' : '#b9a98a',
              }}
            >
              {text.length}/60
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center',
              marginTop: '28px',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="submit"
              className="pixel-btn pixel-btn-primary"
              disabled={!text.trim()}
              style={{
                minHeight: '40px',
                padding: '0 18px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <img
                src="/pixel-library-assets/icons/check.png"
                alt=""
                width="14"
                height="14"
                style={{ imageRendering: 'pixelated' }}
              />
              <span className="px-20">PIN IT</span>
            </button>

            <button
              type="button"
              onClick={onSkip}
              className="pixel-btn pixel-btn-secondary"
              style={{ minHeight: '40px', padding: '0 16px' }}
            >
              <span className="px-20">SKIP</span>
            </button>

            {initialText && onClear && (
              <button
                type="button"
                onClick={onClear}
                className="pixel-btn pixel-btn-danger"
                style={{ minHeight: '40px', padding: '0 12px' }}
                title="Remove current goal"
              >
                <span className="px-20">CLEAR</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
