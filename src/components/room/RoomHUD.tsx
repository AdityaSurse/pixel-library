import React, { useState, useRef } from 'react';
import { TimePreference } from '../../engine/timeOfDay';

const SunIcon: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" style={{ imageRendering: 'pixelated', flexShrink: 0 }}>
    <rect x="5" y="0" width="2" height="2" fill={active ? '#1b1423' : '#e0a84a'} />
    <rect x="5" y="10" width="2" height="2" fill={active ? '#1b1423' : '#e0a84a'} />
    <rect x="0" y="5" width="2" height="2" fill={active ? '#1b1423' : '#e0a84a'} />
    <rect x="10" y="5" width="2" height="2" fill={active ? '#1b1423' : '#e0a84a'} />
    <rect x="2" y="2" width="2" height="2" fill={active ? '#1b1423' : '#e0a84a'} />
    <rect x="8" y="2" width="2" height="2" fill={active ? '#1b1423' : '#e0a84a'} />
    <rect x="2" y="8" width="2" height="2" fill={active ? '#1b1423' : '#e0a84a'} />
    <rect x="8" y="8" width="2" height="2" fill={active ? '#1b1423' : '#e0a84a'} />
    <rect x="4" y="4" width="4" height="4" fill={active ? '#1b1423' : '#ffe2a0'} />
  </svg>
);

const MoonIcon: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" style={{ imageRendering: 'pixelated', flexShrink: 0 }}>
    <rect x="4" y="1" width="4" height="2" fill={active ? '#1b1423' : '#ffe2a0'} />
    <rect x="2" y="3" width="4" height="2" fill={active ? '#1b1423' : '#ffe2a0'} />
    <rect x="1" y="5" width="4" height="2" fill={active ? '#1b1423' : '#ffe2a0'} />
    <rect x="2" y="7" width="4" height="2" fill={active ? '#1b1423' : '#ffe2a0'} />
    <rect x="4" y="9" width="4" height="2" fill={active ? '#1b1423' : '#ffe2a0'} />
  </svg>
);

interface RoomHUDProps {
  roomName: string;
  roomCode: string;
  focusMinutes: number;
  breakMinutes: number;
  showAllNames: boolean;
  isSeated: boolean;
  themeName?: string;
  themeAccent?: string;
  timePreference?: TimePreference;
  onTimePreferenceChange?: (pref: TimePreference) => void;
  onToggleNames: () => void;
  onOpenGoal?: () => void;
  onOpenLeaderboard?: () => void;
  onOpenShortcuts?: () => void;
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
  themeName,
  themeAccent,
  timePreference = 'auto',
  onTimePreferenceChange,
  onToggleNames,
  onOpenGoal,
  onOpenLeaderboard,
  onOpenShortcuts,
  onStandUp,
  onLeave,
}) => {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/room/${roomCode}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setCopyFailed(false);
        setTimeout(() => setCopied(false), 2000);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      setCopyFailed(true);
      setTimeout(() => {
        if (fallbackInputRef.current) {
          fallbackInputRef.current.focus();
          fallbackInputRef.current.select();
        }
      }, 50);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="px-20" style={{ color: '#ffe2a0' }}>
              {roomName}
            </span>
            {themeName && (
              <span
                className="px-10"
                style={{
                  backgroundColor: '#1b1423',
                  color: themeAccent || '#ffe2a0',
                  border: '1px solid #5c3a26',
                  padding: '2px 8px',
                  borderRadius: '2px',
                }}
              >
                {themeName}
              </span>
            )}
          </div>
          <div className="px-10" style={{ color: '#b9a98a', marginTop: '2px' }}>
            ROOM: {roomCode} • {focusMinutes}/{breakMinutes}m
          </div>
        </div>

        {/* Copy Link Button */}
        <div style={{ position: 'relative' }}>
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
              src={copied ? '/pixel-library-assets/icons/check.png' : '/pixel-library-assets/icons/link.png'}
              alt=""
              style={{ width: 14, height: 14, imageRendering: 'pixelated' }}
            />
            <span className="px-10">{copied ? 'COPIED!' : copyFailed ? 'Press Cmd/Ctrl + C' : 'COPY LINK'}</span>
          </button>
          {copyFailed && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                zIndex: 60,
                backgroundColor: '#241a2e',
                border: '2px solid #5c3a26',
                padding: '6px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.85)',
              }}
            >
              <div className="px-10" style={{ color: '#ffe2a0', whiteSpace: 'nowrap' }}>
                Press Cmd/Ctrl + C
              </div>
              <input
                ref={fallbackInputRef}
                type="text"
                readOnly
                value={`${window.location.origin}/room/${roomCode}`}
                style={{
                  fontFamily: 'Quietpage, monospace',
                  fontSize: '10px',
                  padding: '4px 6px',
                  backgroundColor: '#fff0b0',
                  color: '#1b1423',
                  border: '1px solid #1b1423',
                  width: '200px',
                  outline: 'none',
                }}
              />
            </div>
          )}
        </div>

        {/* Sun/Moon Day-Night Toggle */}
        <div
          role="group"
          aria-label="Time of day lighting"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: '#1b1423',
            border: '2px solid #5c3a26',
            height: '36px',
            boxSizing: 'border-box',
          }}
        >
          <button
            type="button"
            onClick={() => onTimePreferenceChange?.('auto')}
            title="Auto (follows local clock: Day 06:00-17:59, Night 18:00-05:59)"
            style={{
              padding: '0 8px',
              height: '100%',
              backgroundColor: timePreference === 'auto' ? '#ffe2a0' : 'transparent',
              color: timePreference === 'auto' ? '#1b1423' : '#b9a98a',
              fontFamily: 'Quietpage, monospace',
              fontSize: '10px',
              border: 'none',
              borderRight: '1px solid #3a2419',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              outline: 'none',
            }}
          >
            <img
              src="/pixel-library-assets/icons/clock.png"
              alt=""
              width="10"
              height="10"
              style={{ imageRendering: 'pixelated' }}
            />
            <span>AUTO</span>
          </button>
          <button
            type="button"
            onClick={() => onTimePreferenceChange?.('day')}
            title="Day lighting"
            style={{
              padding: '0 8px',
              height: '100%',
              backgroundColor: timePreference === 'day' ? '#ffe2a0' : 'transparent',
              color: timePreference === 'day' ? '#1b1423' : '#b9a98a',
              fontFamily: 'Quietpage, monospace',
              fontSize: '10px',
              border: 'none',
              borderRight: '1px solid #3a2419',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              outline: 'none',
            }}
          >
            <SunIcon active={timePreference === 'day'} />
            <span>DAY</span>
          </button>
          <button
            type="button"
            onClick={() => onTimePreferenceChange?.('night')}
            title="Night lighting"
            style={{
              padding: '0 8px',
              height: '100%',
              backgroundColor: timePreference === 'night' ? '#ffe2a0' : 'transparent',
              color: timePreference === 'night' ? '#1b1423' : '#b9a98a',
              fontFamily: 'Quietpage, monospace',
              fontSize: '10px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              outline: 'none',
            }}
          >
            <MoonIcon active={timePreference === 'night'} />
            <span>NIGHT</span>
          </button>
        </div>

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

        {/* Weekly Leaderboard Button */}
        <button
          onClick={onOpenLeaderboard}
          className="pixel-btn pixel-btn-secondary"
          style={{
            minHeight: '36px',
            padding: '0 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
          title="Weekly Leaderboard"
        >
          <img
            src="/pixel-library-assets/icons/fire.png"
            alt=""
            style={{ width: 14, height: 14, imageRendering: 'pixelated' }}
          />
          <span className="px-10">BOARD</span>
        </button>

        {/* Keyboard Shortcuts Help Button */}
        <button
          type="button"
          onClick={onOpenShortcuts}
          className="pixel-btn pixel-btn-secondary"
          style={{
            minHeight: '36px',
            padding: '0 10px',
            fontFamily: 'Quietpage, monospace',
            fontSize: '20px',
            lineHeight: 1,
            color: '#ffe2a0',
          }}
          title="Keyboard Shortcuts (?)"
        >
          ?
        </button>

        {/* Goal Button (visible when seated) */}
        {isSeated && (
          <button
            onClick={onOpenGoal}
            className="pixel-btn pixel-btn-secondary"
            style={{
              minHeight: '36px',
              padding: '0 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Set session goal"
          >
            <img
              src="/pixel-library-assets/icons/book.png"
              alt=""
              style={{ width: 14, height: 14, imageRendering: 'pixelated' }}
            />
            <span className="px-10">GOAL</span>
          </button>
        )}

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
