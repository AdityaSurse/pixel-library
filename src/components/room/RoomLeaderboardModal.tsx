import React, { useMemo } from 'react';
import { RoomMemberRecord, getISOWeekNumber } from '../../services/leaderboardService';
import { layout } from '../../engine/assets';
import { getAccessoryRow } from '../../lib/unlocks';

interface RoomLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: RoomMemberRecord[];
  currentUid: string | null;
}

export const RoomLeaderboardModal: React.FC<RoomLeaderboardModalProps> = ({
  isOpen,
  onClose,
  members,
  currentUid,
}) => {
  const weekNumber = useMemo(() => getISOWeekNumber(new Date()), []);

  const top10 = useMemo(() => members.slice(0, 10), [members]);

  const userRankIndex = useMemo(() => {
    if (!currentUid) return -1;
    return members.findIndex((m) => m.uid === currentUid);
  }, [members, currentUid]);

  const isUserOutsideTop10 = userRankIndex >= 10;
  const userMember = isUserOutsideTop10 ? members[userRankIndex] : null;

  if (!isOpen) return null;

  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <img
          src="/pixel-library-themes/leaderboard/rank_1@4x.png"
          alt="1st"
          width="16"
          height="18"
          style={{ imageRendering: 'pixelated', display: 'block' }}
        />
      );
    }
    if (rank === 2) {
      return (
        <img
          src="/pixel-library-themes/leaderboard/rank_2@4x.png"
          alt="2nd"
          width="16"
          height="18"
          style={{ imageRendering: 'pixelated', display: 'block' }}
        />
      );
    }
    if (rank === 3) {
      return (
        <img
          src="/pixel-library-themes/leaderboard/rank_3@4x.png"
          alt="3rd"
          width="16"
          height="18"
          style={{ imageRendering: 'pixelated', display: 'block' }}
        />
      );
    }
    return (
      <span
        className="px-10"
        style={{
          color: '#e0a84a',
          width: '16px',
          textAlign: 'center',
          display: 'inline-block',
        }}
      >
        #{rank}
      </span>
    );
  };

  const renderMemberRow = (member: RoomMemberRecord, rank: number, isSelf: boolean) => {
    const pIdx =
      layout.presets.indexOf(member.preset) >= 0
        ? layout.presets.indexOf(member.preset)
        : 0;
    const accRow = member.accessory ? getAccessoryRow(member.accessory) : -1;

    return (
      <div
        key={member.uid}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 10px',
          backgroundColor: isSelf ? 'rgba(255, 226, 160, 0.12)' : 'rgba(27, 36, 29, 0.6)',
          border: isSelf ? '1px solid #ffe2a0' : '1px solid rgba(122, 77, 49, 0.4)',
          borderRadius: '2px',
        }}
      >
        {/* Medal / Rank Number */}
        <div
          style={{
            width: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {renderRankBadge(rank)}
        </div>

        {/* Avatar Head Sprite + Accessory */}
        <div
          style={{
            position: 'relative',
            width: '28px',
            height: '24px',
            flexShrink: 0,
            backgroundImage: "url('/pixel-library-assets/sprites/avatars/avatar_heads.png')",
            backgroundPosition: `-${pIdx * 36 * (28 / 36)}px 0px`,
            backgroundSize: `${288 * (28 / 36)}px ${32 * (24 / 32)}px`,
            imageRendering: 'pixelated',
            border: '1px solid #5c3a26',
            backgroundColor: '#1b1423',
          }}
        >
          {accRow >= 0 && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '28px',
                height: '24px',
                backgroundImage: "url('/pixel-library-themes/unlockables/accessories_sheet.png')",
                backgroundPosition: `-${0 * 36 * (28 / 36)}px -${accRow * 44 * (24 / 32)}px`,
                backgroundSize: `${288 * (28 / 36)}px ${308 * (24 / 32)}px`,
                imageRendering: 'pixelated',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>

        {/* Username in chalk cream */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            className="px-10"
            style={{
              color: isSelf ? '#ffe2a0' : '#f4ecdc',
              fontWeight: isSelf ? 'bold' : 'normal',
            }}
          >
            {member.username}
            {isSelf && ' (You)'}
          </span>
        </div>

        {/* Minutes and Pomodoros in chalk mustard */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          <span
            className="px-10"
            style={{ color: '#ffe2a0' }}
            title={`${member.weekMinutes} minutes focused this week`}
          >
            {member.weekMinutes}m
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title={`${member.weekPomodoros} Pomodoro sessions`}
          >
            <img
              src="/pixel-library-assets/icons/tomato.png"
              alt=""
              width="12"
              height="12"
              style={{ imageRendering: 'pixelated' }}
            />
            <span className="px-10" style={{ color: '#ffe2a0' }}>
              {member.weekPomodoros}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          border: '16px solid transparent',
          borderImage: "url('/pixel-library-themes/leaderboard/chalkboard@4x.png') 16 fill / 16px",
          imageRendering: 'pixelated',
          boxSizing: 'border-box',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.95)',
          overflow: 'hidden',
        }}
      >
        {/* Chalkboard Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '4px 6px 12px 6px',
            borderBottom: '2px solid rgba(244, 236, 220, 0.25)',
            marginBottom: '10px',
          }}
        >
          <div>
            <div
              className="px-20"
              style={{
                color: '#f4ecdc',
                letterSpacing: '1px',
              }}
            >
              WEEKLY LEADERBOARD
            </div>
            <div
              className="px-10"
              style={{
                color: '#ffe2a0',
                marginTop: '4px',
              }}
            >
              Week {weekNumber} · resets Monday
            </div>
          </div>
          <button
            onClick={onClose}
            className="pixel-btn pixel-btn-secondary"
            style={{
              padding: '2px 8px',
              minHeight: '26px',
              fontSize: '10px',
            }}
          >
            X
          </button>
        </div>

        {/* Member Rows List */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            overflowY: 'auto',
            maxHeight: '440px',
            paddingRight: '4px',
          }}
        >
          {top10.length === 0 ? (
            <div
              style={{
                padding: '28px 16px',
                textAlign: 'center',
                color: '#f4ecdc',
              }}
            >
              <div className="px-10" style={{ color: '#ffe2a0', marginBottom: '6px' }}>
                THE BOARD IS FRESH
              </div>
              <div className="px-10" style={{ color: '#b9a98a', lineHeight: '16px' }}>
                No study sessions recorded yet this week. Complete a Pomodoro to claim the #1 spot!
              </div>
            </div>
          ) : (
            top10.map((member, idx) =>
              renderMemberRow(member, idx + 1, member.uid === currentUid)
            )
          )}

          {/* User Row if outside Top 10 */}
          {isUserOutsideTop10 && userMember && (
            <>
              <div
                style={{
                  borderTop: '1px dashed rgba(244, 236, 220, 0.4)',
                  margin: '4px 0',
                }}
              />
              {renderMemberRow(userMember, userRankIndex + 1, true)}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
