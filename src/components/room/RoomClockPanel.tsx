import React, { useState } from 'react';
import { RoomTimerData } from '../../services/roomTimer';
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
}) => {
  const [muted, setMuted] = useState(isChimeMuted());

  const handleToggleMute = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    setChimeMuted(nextMuted);
  };

  const isRunning = Boolean(timer && timer.startedAt !== null);
  const isPaused = Boolean(timer && timer.startedAt === null && timer.pausedRemainingMs !== null);
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
      {/* Header: Mode Label & Mute Button */}
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
            style={{ color: mode === 'focus' ? '#d9463b' : '#4fa36a', textTransform: 'uppercase' }}
          >
            {mode === 'focus' ? 'FOCUS TIME' : 'REST BREAK'}
          </span>
        </div>

        {/* Chime Mute Toggle */}
        <button
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

      {/* Main 60px Countdown */}
      <div
        className="px-60"
        style={{
          color: '#ffe2a0',
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
            width: `${progressPercent}%`,
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

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        {!isRunning && !isPaused && (
          <button
            onClick={onStart}
            className="pixel-btn pixel-btn-primary"
            style={{ minHeight: '32px', padding: '0 12px' }}
          >
            <span className="px-10">START</span>
          </button>
        )}

        {isRunning && (
          <button
            onClick={onPause}
            className="pixel-btn pixel-btn-secondary"
            style={{ minHeight: '32px', padding: '0 12px' }}
          >
            <span className="px-10">PAUSE</span>
          </button>
        )}

        {isPaused && (
          <button
            onClick={onResume}
            className="pixel-btn pixel-btn-primary"
            style={{ minHeight: '32px', padding: '0 12px' }}
          >
            <span className="px-10">RESUME</span>
          </button>
        )}

        <button
          onClick={onSkip}
          className="pixel-btn pixel-btn-secondary"
          style={{ minHeight: '32px', padding: '0 10px' }}
          title="Skip to next phase"
        >
          <span className="px-10">SKIP</span>
        </button>

        <button
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
