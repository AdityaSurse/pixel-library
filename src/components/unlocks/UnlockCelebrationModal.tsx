import React from 'react';
import { UnlockCelebrationItem, getAccessoryRow } from '../../lib/unlocks';
import { PixelConfettiCanvas } from './PixelConfettiCanvas';

interface UnlockCelebrationModalProps {
  isOpen: boolean;
  item: UnlockCelebrationItem | null;
  onDismiss: () => void;
}

export const UnlockCelebrationModal: React.FC<UnlockCelebrationModalProps> = ({
  isOpen,
  item,
  onDismiss,
}) => {
  if (!isOpen || !item) return null;

  const accessoryRow = item.type === 'accessory' ? getAccessoryRow(item.id) : -1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="pixel-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#241a2e',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '24px 20px',
          boxSizing: 'border-box',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.95)',
          position: 'relative',
        }}
      >
        {/* Pixel Confetti Burst Canvas Header */}
        <div style={{ position: 'relative', height: '110px', width: '220px', marginBottom: '8px' }}>
          <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
            <PixelConfettiCanvas width={220} height={110} />
          </div>

          {/* Sprite at 4x */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {item.type === 'theme' ? (
              <img
                src={item.spriteSrc}
                alt={item.name}
                style={{
                  width: '144px',
                  height: '84px',
                  objectFit: 'cover',
                  imageRendering: 'pixelated',
                  border: '2px solid #5c3a26',
                  backgroundColor: '#1b1423',
                }}
              />
            ) : item.type === 'badge' ? (
              <img
                src={item.spriteSrc}
                alt={item.name}
                style={{
                  width: '56px',
                  height: '56px',
                  imageRendering: 'pixelated',
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.8))',
                }}
              />
            ) : (
              /* Accessory at 4x: row index of accessories_sheet@4x.png */
              <div
                style={{
                  width: '72px',
                  height: '88px',
                  backgroundImage: "url('/pixel-library-themes/unlockables/accessories_sheet@4x.png')",
                  backgroundPosition: `-${2 * 72}px -${Math.max(0, accessoryRow) * 88}px`,
                  backgroundSize: '576px 616px',
                  imageRendering: 'pixelated',
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.8))',
                }}
              />
            )}
          </div>
        </div>

        {/* Banner Title */}
        <div className="px-30" style={{ color: '#ffe2a0', marginBottom: '6px' }}>
          NEW UNLOCK!
        </div>

        {/* Unlocked Item Title */}
        <div
          className="px-20"
          style={{
            color: '#f1e3c4',
            marginBottom: '14px',
            lineHeight: '1.3',
          }}
        >
          {item.title}
        </div>

        {/* Next Milestone Goal Banner */}
        <div
          style={{
            backgroundColor: '#1b1423',
            border: '2px solid #5c3a26',
            padding: '8px 12px',
            width: '100%',
            boxSizing: 'border-box',
            marginBottom: '20px',
          }}
        >
          <div className="px-10" style={{ color: '#b9a98a', marginBottom: '2px' }}>
            UPCOMING MILESTONE
          </div>
          <div className="px-10" style={{ color: '#ffe2a0' }}>
            {item.nextGoal}
          </div>
        </div>

        {/* Continue Button */}
        <button
          type="button"
          onClick={onDismiss}
          className="pixel-btn pixel-btn-primary"
          style={{
            minHeight: '42px',
            padding: '0 24px',
            fontSize: '20px',
          }}
        >
          AWESOME!
        </button>
      </div>
    </div>
  );
};
