import React, { useState, useEffect } from 'react';
import { PixelStepper } from '../common/PixelStepper';
import { ThemeId, getThemeList, getThemeInfo } from '../../engine/themes';

interface RoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOwner: boolean;
  currentFocusMinutes: number;
  currentBreakMinutes: number;
  currentTheme?: ThemeId;
  onSave: (
    newFocusMinutes: number,
    newBreakMinutes: number,
    newTheme: ThemeId
  ) => Promise<void>;
}

export const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({
  isOpen,
  onClose,
  isOwner,
  currentFocusMinutes,
  currentBreakMinutes,
  currentTheme = 'classic',
  onSave,
}) => {
  const [focusVal, setFocusVal] = useState(currentFocusMinutes);
  const [breakVal, setBreakVal] = useState(currentBreakMinutes);
  const [themeVal, setThemeVal] = useState<ThemeId>(currentTheme);
  const [saving, setSaving] = useState(false);

  const themeList = getThemeList();
  const currentThemeInfo = getThemeInfo(currentTheme);

  useEffect(() => {
    if (isOpen) {
      setFocusVal(currentFocusMinutes);
      setBreakVal(currentBreakMinutes);
      setThemeVal(currentTheme);
    }
  }, [isOpen, currentFocusMinutes, currentBreakMinutes, currentTheme]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!isOwner || saving) return;
    setSaving(true);
    try {
      await onSave(focusVal, breakVal, themeVal);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(27, 20, 35, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
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
          backgroundColor: '#241a2e',
          border: '4px solid #5c3a26',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.9)',
          padding: '20px',
        }}
      >
        {/* Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #3a2419',
            paddingBottom: '8px',
            marginBottom: '16px',
          }}
        >
          <div className="px-20" style={{ color: '#ffe2a0' }}>
            ROOM SETTINGS
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pixel-btn pixel-btn-secondary"
            style={{ padding: '2px 8px', minHeight: '26px' }}
          >
            ✕
          </button>
        </div>

        {isOwner ? (
          /* Owner Editable Form */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Library Theme Picker */}
            <div>
              <span
                className="px-10"
                style={{
                  color: '#ffe2a0',
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: 'bold',
                }}
              >
                LIBRARY THEME:
              </span>
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  paddingBottom: '6px',
                  scrollbarWidth: 'thin',
                }}
              >
                {themeList.map((t) => {
                  const isSelected = themeVal === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setThemeVal(t.id)}
                      style={{
                        flex: '0 0 110px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        backgroundColor: '#1b1423',
                        border: isSelected ? '3px solid #d9463b' : '2px solid #3a2419',
                        boxShadow: isSelected ? '0 0 0 2px #d9463b' : 'none',
                        cursor: 'pointer',
                        padding: 0,
                        overflow: 'hidden',
                        textAlign: 'center',
                      }}
                    >
                      <img
                        src={`/pixel-library-themes/themes/${t.id}/preview_night@4x.png`}
                        alt={t.name}
                        style={{
                          width: '100%',
                          height: '56px',
                          objectFit: 'cover',
                          imageRendering: 'pixelated',
                          display: 'block',
                        }}
                      />
                      <div
                        style={{
                          height: '3px',
                          width: '100%',
                          backgroundColor: t.accent,
                        }}
                      />
                      <div
                        className="px-10"
                        style={{
                          padding: '4px 2px',
                          color: isSelected ? '#ffe2a0' : '#b9a98a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          width: '100%',
                          fontSize: '10px',
                        }}
                      >
                        {t.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Focus Length Stepper */}
            <div>
              <span
                className="px-10"
                style={{
                  color: '#ffe2a0',
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: 'bold',
                }}
              >
                FOCUS LENGTH (1–120 MIN):
              </span>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <PixelStepper
                  value={focusVal}
                  min={1}
                  max={120}
                  onChange={setFocusVal}
                  unit="min"
                />
              </div>
            </div>

            {/* Break Length Stepper */}
            <div>
              <span
                className="px-10"
                style={{
                  color: '#ffe2a0',
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: 'bold',
                }}
              >
                BREAK LENGTH (1–30 MIN):
              </span>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <PixelStepper
                  value={breakVal}
                  min={1}
                  max={30}
                  onChange={setBreakVal}
                  unit="min"
                />
              </div>
            </div>

            {/* Hint */}
            <div
              className="px-10"
              style={{
                color: '#b9a98a',
                textAlign: 'center',
                backgroundColor: '#1b1423',
                padding: '8px',
                border: '1px solid #3a2419',
              }}
            >
              Theme swaps with a 300ms dissolve. Timer changes apply when idle or from next phase.
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="pixel-btn pixel-btn-primary"
                style={{ flex: 1, minHeight: '36px' }}
              >
                <span className="px-10">{saving ? 'SAVING...' : 'SAVE CHANGES'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="pixel-btn pixel-btn-secondary"
                style={{ flex: 1, minHeight: '36px' }}
              >
                <span className="px-10">CANCEL</span>
              </button>
            </div>
          </div>
        ) : (
          /* Non-Owner Read-Only View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                backgroundColor: '#1b1423',
                padding: '12px',
                border: '1px solid #3a2419',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div className="px-10" style={{ color: '#ffe2a0' }}>
                Library theme:{' '}
                <strong style={{ color: currentThemeInfo.accent }}>
                  {currentThemeInfo.name}
                </strong>
              </div>
              <div className="px-10" style={{ color: '#ffe2a0' }}>
                Focus length:{' '}
                <strong style={{ color: '#4fa36a' }}>
                  {currentFocusMinutes} min
                </strong>
              </div>
              <div className="px-10" style={{ color: '#ffe2a0' }}>
                Break length:{' '}
                <strong style={{ color: '#e0a84a' }}>
                  {currentBreakMinutes} min
                </strong>
              </div>
            </div>

            <div className="px-10" style={{ color: '#b9a98a', textAlign: 'center' }}>
              Only the room owner can change room settings.
            </div>

            <button
              type="button"
              onClick={onClose}
              className="pixel-btn pixel-btn-secondary"
              style={{ width: '100%', minHeight: '36px' }}
            >
              <span className="px-10">CLOSE</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
