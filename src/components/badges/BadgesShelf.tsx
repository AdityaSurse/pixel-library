import React from 'react';
import { BADGES, isBadgeEarned } from '../../lib/unlocks';
import { UserStats } from '../../context/AuthContext';

interface BadgesShelfProps {
  stats?: UserStats;
  userBadges?: Record<string, boolean | string>;
}

export const BadgesShelf: React.FC<BadgesShelfProps> = ({ stats, userBadges }) => {
  return (
    <div
      style={{
        backgroundColor: '#1b1423',
        border: '2px solid #5c3a26',
        padding: '10px 12px',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <span className="px-10" style={{ color: '#b9a98a', letterSpacing: '0.5px' }}>
          READING BADGES & MILESTONES:
        </span>
        <span className="px-10" style={{ color: '#ffe2a0' }}>
          {BADGES.filter((b) => isBadgeEarned(b.id, stats, userBadges)).length} / {BADGES.length}
        </span>
      </div>

      {/* 8 Badges at 3x (14px x 3 = 42px) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(42px, 1fr))',
          gap: '8px',
          alignItems: 'center',
          justifyItems: 'center',
        }}
      >
        {BADGES.map((b) => {
          const earned = isBadgeEarned(b.id, stats, userBadges);
          const earnedDate = userBadges && typeof userBadges[b.id] === 'string' ? userBadges[b.id] : null;
          const tooltip = earned
            ? `${b.name} (Earned${earnedDate ? `: ${earnedDate}` : '!'}) — ${b.description}`
            : `Locked: ${b.name} — ${b.description}`;

          return (
            <div
              key={b.id}
              title={tooltip}
              style={{
                position: 'relative',
                width: '42px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#241a2e',
                border: earned ? '1px solid #ffe2a0' : '1px solid #3a2419',
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              {/* Badge Image at 3x (14px * 3 = 42px) */}
              <img
                src={`/pixel-library-themes/badges/${b.id}@4x.png`}
                alt={b.name}
                width="42"
                height="42"
                style={{
                  imageRendering: 'pixelated',
                  filter: earned ? 'none' : 'brightness(0.15)',
                }}
              />

              {/* Lock Icon for Unearned Badges */}
              {!earned && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <img
                    src="/pixel-library-themes/badges/lock.png"
                    alt="Locked"
                    width="14"
                    height="16"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
