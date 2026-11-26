import React, { useState } from 'react';
import { RoomTimerData, getTimerUIState } from '../../services/roomTimer';
import { isChimeMuted, setChimeMuted } from '../../services/audioChime';

interface RoomClockPanelProps {
  timer: RoomTimerData | null;
  remainingMs: number;
  readersCount: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSkip: () => void;
  onOpenSettings: () => void;
}

export const RoomClockPanel: React.FC<RoomClockPanelProps> = ({
  timer,
  remainingMs,
  readersCount,
  onStart,
  onPause,
  onResume,
  onReset,
  onSkip,
  onOpenSettings,
}) => {
  const [muted, setMuted] = useState(isChimeMuted());

  const handleToggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    setChimeMuted(nextMuted);
  };

  const uiState = getTimerUIState(timer);
  const isRunning = uiState === 'running';
  const isPaused = uiState === 'paused';
  const isIdle = uiState === 'idle';

  const mode = timer?.mode || 'focus';
  const round = timer?.round || 1;

  // Format time display MM:SS in Quietpage 60px
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // Progress percentage (0% to 100%)
  const totalDuration = timer?.durationMs || 1;
  const elapsed = totalDuration - remainingMs;
  const progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

  // Determine mode display text and color
  let modeLabel = 'FOCUS TIME';
  let modeColor = '#d9463b';

  if (isPaused) {
    modeLabel = 'PAUSED';
    modeColor = '#e0a84a';
  } else if (mode === 'break') {
    modeLabel = 'REST BREAK';
    modeColor = '#4fa36a';
  }

  return (
    <div
      className="pixel-panel-sm room-clock-panel"
      style={{
        backgroundColor: '#241a2e',
        border: '3px solid #5c3a26',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.85)',
      }}
    >
      {/* Header: Mode Label & Utility Buttons */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src={
              mode === 'focus'
                ? '/pixel-library-assets/icons/tomato.png'
                : '/pixel-library-assets/icons/coffee.png'
            }
            alt={mode}
            style={{ width: 16, height: 16, imageRendering: 'pixelated' }}
          />
          <span
            className="px-20"
            style={{ color: modeColor, textTransform: 'uppercase' }}
          >
            {modeLabel}
          </span>
        </div>

        {/* Action icons: Settings & Chime Mute */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="pixel-btn pixel-btn-secondary"
            title="Timer Settings"
            style={{
              padding: '2px 6px',
              minHeight: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src="/pixel-library-assets/icons/clock.png"
              alt="Settings"
              style={{ width: 14, height: 14, imageRendering: 'pixelated' }}
            />
          </button>

          {/* Chime Mute Toggle */}
          <button
            type="button"
            onClick={handleToggleMute}
            className="pixel-btn pixel-btn-secondary"
            title={muted ? 'Unmute chime' : 'Mute chime'}
            style={{
              padding: '2px 8px',
              minHeight: '26px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              opacity: muted ? 0.6 : 1,
            }}
          >
            <img
              src="/pixel-library-assets/icons/music.png"
              alt="Music"
              style={{ width: 14, height: 14, imageRendering: 'pixelated' }}
            />
            <span className="px-10">{muted ? 'OFF' : 'ON'}</span>
          </button>
        </div>
      </div>

      {/* Main 60px Countdown */}
      <div
        className="px-60"
        style={{
          color: isPaused ? '#e0a84a' : '#ffe2a0',
          letterSpacing: '2px',
          lineHeight: '1.1',
          margin: '2px 0',
          textShadow: '2px 2px 0px #1b1423',
        }}
      >
        {timeStr}
      </div>

      {/* Clipped Pixel Progress Bar (64x12 -> 128x24) */}
      <div
        style={{
          position: 'relative',
          width: '128px',
          height: '24px',
          margin: '4px 0',
        }}
      >
        {/* Empty Track */}
        <img
          src="/pixel-library-assets/ui/progress_empty.png"
          alt="Progress Track"
          style={{
            width: '128px',
            height: '24px',
            imageRendering: 'pixelated',
            display: 'block',
          }}
        />

        {/* Full Track Clipped */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${isIdle ? 0 : progressPercent}%`,
            height: '24px',
            overflow: 'hidden',
          }}
        >
          <img
            src="/pixel-library-assets/ui/progress_full.png"
            alt="Progress Fill"
            style={{
              width: '128px',
              height: '24px',
              imageRendering: 'pixelated',
              display: 'block',
            }}
          />
        </div>
      </div>

      {/* Round & Readers Count */}
      <div className="px-10" style={{ color: '#b9a98a', marginBottom: '4px' }}>
        Round {round} · {readersCount} {readersCount === 1 ? 'reader' : 'readers'} together
      </div>

      {/* Controls: Exactly one main button (START / PAUSE / RESUME) + SKIP + RESET */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        {isIdle && (
          <button
            type="button"
            onClick={onStart}
            className="pixel-btn pixel-btn-primary"
            style={{ minHeight: '32px', padding: '0 14px' }}
          >
            <span className="px-10">START</span>
          </button>
        )}

        {isRunning && (
          <button
            type="button"
            onClick={onPause}
            className="pixel-btn pixel-btn-secondary"
            style={{ minHeight: '32px', padding: '0 14px' }}
          >
            <span className="px-10">PAUSE</span>
          </button>
        )}

        {isPaused && (
          <button
            type="button"
            onClick={onResume}
            className="pixel-btn pixel-btn-primary"
            style={{ minHeight: '32px', padding: '0 14px' }}
          >
            <span className="px-10">RESUME</span>
          </button>
        )}

        <button
          type="button"
          onClick={onSkip}
          className="pixel-btn pixel-btn-secondary"
          style={{ minHeight: '32px', padding: '0 10px' }}
          title="Skip to next phase"
        >
          <span className="px-10">SKIP</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="pixel-btn pixel-btn-secondary"
          style={{ minHeight: '32px', padding: '0 10px' }}
          title="Reset timer"
        >
          <span className="px-10">RESET</span>
        </button>
      </div>
    </div>
  );
};
