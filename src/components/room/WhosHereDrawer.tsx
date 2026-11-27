import React from 'react';
import { RoomPresenceMap, RoomSeatsMap } from '../../services/roomPresence';
import { layout } from '../../engine/assets';
import { getAccessoryRow } from '../../lib/unlocks';

interface WhosHereDrawerProps {
  presence: RoomPresenceMap;
  seats?: RoomSeatsMap;
  currentUid: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelectReader: (seatId: string | null) => void;
}

export const WhosHereDrawer: React.FC<WhosHereDrawerProps> = ({
  presence,
  seats,
  currentUid,
  isOpen,
  onToggle,
  onSelectReader,
}) => {
  const readers = Object.values(presence);

  const getPresetIndex = (pIndex?: number, pName?: string): number => {
    if (typeof pIndex === 'number' && pIndex >= 0 && pIndex < 8) return pIndex;
    if (pName) {
      const idx = layout.presets.indexOf(pName);
      if (idx >= 0) return idx;
    }
    return 0;
  };

  const getStatusDisplay = (status: string, seatId: string | null, readerUid: string) => {
    const isSeated = Boolean(seatId && (!seats || seats[seatId] === readerUid));
    if (status === 'away') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <img
            src="/pixel-library-assets/ui/bubble_zzz.png"
            alt="Away"
            style={{ width: 14, height: 16, imageRendering: 'pixelated' }}
          />
          <span className="px-10" style={{ color: '#4a5fa8' }}>Away</span>
        </div>
      );
    }
    if (status === 'break') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <img
            src="/pixel-library-assets/icons/coffee.png"
            alt="Break"
            style={{ width: 14, height: 14, imageRendering: 'pixelated' }}
          />
          <span className="px-10" style={{ color: '#e0a84a' }}>Break</span>
        </div>
      );
    }
    if (isSeated) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <img
            src="/pixel-library-assets/icons/book.png"
            alt="Studying"
            style={{ width: 14, height: 14, imageRendering: 'pixelated' }}
          />
          <span className="px-10" style={{ color: '#4fa36a' }}>Studying</span>
        </div>
      );
    }
    return <span className="px-10" style={{ color: '#b9a98a' }}>Browsing shelves</span>;
  };

  return (
    <>
      {/* Mobile Drawer Toggle Pill */}
      <button
        onClick={onToggle}
        className="pixel-btn pixel-btn-secondary whos-here-mobile-toggle"
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          zIndex: 40,
          minHeight: '36px',
          padding: '0 12px',
        }}
      >
        <span className="px-10">READERS ({readers.length})</span>
      </button>

      {/* Main Panel / Drawer */}
      <div
        className={`pixel-panel-sm whos-here-panel ${isOpen ? 'open' : ''}`}
        style={{
          position: 'absolute',
          top: '80px',
          right: '16px',
          width: '240px',
          maxHeight: 'calc(100vh - 100px)',
          backgroundColor: '#241a2e',
          border: '3px solid #5c3a26',
          zIndex: 35,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.85)',
          padding: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #3a2419',
            paddingBottom: '8px',
            marginBottom: '8px',
          }}
        >
          <div className="px-20" style={{ color: '#ffe2a0' }}>
            READERS ({readers.length})
          </div>
          <button
            onClick={onToggle}
            className="pixel-btn pixel-btn-secondary whos-here-close-btn"
            style={{
              padding: '2px 8px',
              minHeight: '26px',
              fontSize: '10px',
            }}
          >
            X
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflowY: 'auto',
            maxHeight: '400px',
            paddingRight: '4px',
          }}
        >
          {readers.map((reader) => {
            const isSelf = reader.uid === currentUid;
            const pIdx = getPresetIndex(reader.presetIndex, reader.preset);

            return (
              <div
                key={reader.uid}
                onClick={() => onSelectReader(reader.seatId)}
                title={reader.seatId ? 'Click to highlight seat' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '6px 8px',
                  backgroundColor: isSelf ? '#352542' : '#1b1423',
                  border: isSelf ? '2px solid #ffe2a0' : '1px solid #3a2419',
                  cursor: reader.seatId ? 'pointer' : 'default',
                  transition: 'background-color 0.1s',
                }}
              >
                {/* 18x16 Head Sprite */}
                <div
                  style={{
                    position: 'relative',
                    width: '36px',
                    height: '32px',
                    minWidth: '36px',
                    backgroundImage: "url('/pixel-library-assets/sprites/avatars/avatar_heads.png')",
                    backgroundPosition: `-${pIdx * 36}px 0px`,
                    backgroundSize: '288px 32px',
                    imageRendering: 'pixelated',
                    border: '1px solid #5c3a26',
                    backgroundColor: '#1b1423',
                  }}
                >
                  {reader.accessory && getAccessoryRow(reader.accessory) >= 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '36px',
                        height: '32px',
                        backgroundImage: "url('/pixel-library-themes/unlockables/accessories_sheet.png')",
                        backgroundPosition: `-${0 * 36}px -${getAccessoryRow(reader.accessory) * 44}px`,
                        backgroundSize: '288px 308px',
                        imageRendering: 'pixelated',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="px-10"
                    style={{
                      color: isSelf ? '#ffe2a0' : '#f1e3c4',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {reader.username || 'reader'} {isSelf && '(you)'}
                  </div>
                  <div>{getStatusDisplay(reader.status, reader.seatId, reader.uid)}</div>
                  {reader.goal?.text && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '2px',
                        overflow: 'hidden',
                      }}
                      title={reader.goal.text}
                    >
                      <img
                        src={
                          reader.goal.status === 'done'
                            ? '/pixel-library-themes/goal-card/note_done.png'
                            : reader.goal.status === 'missed'
                            ? '/pixel-library-themes/goal-card/note_missed.png'
                            : '/pixel-library-themes/goal-card/note.png'
                        }
                        alt=""
                        width="10"
                        height="7"
                        style={{ imageRendering: 'pixelated', flexShrink: 0 }}
                      />
                      <span
                        className="px-10"
                        style={{
                          color:
                            reader.goal.status === 'done'
                              ? '#4fa36a'
                              : reader.goal.status === 'missed'
                              ? '#d9463b'
                              : '#b9a98a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {reader.goal.text}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
