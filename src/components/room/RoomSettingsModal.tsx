import React, { useState, useEffect } from 'react';
import { PixelStepper } from '../common/PixelStepper';

interface RoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOwner: boolean;
  currentFocusMinutes: number;
  currentBreakMinutes: number;
  onSave: (newFocusMinutes: number, newBreakMinutes: number) => Promise<void>;
}

export const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({
  isOpen,
  onClose,
  isOwner,
  currentFocusMinutes,
  currentBreakMinutes,
  onSave,
}) => {
  const [focusVal, setFocusVal] = useState(currentFocusMinutes);
  const [breakVal, setBreakVal] = useState(currentBreakMinutes);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFocusVal(currentFocusMinutes);
      setBreakVal(currentBreakMinutes);
    }
  }, [isOpen, currentFocusMinutes, currentBreakMinutes]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!isOwner || saving) return;
    setSaving(true);
    try {
      await onSave(focusVal, breakVal);
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
          maxWidth: '360px',
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
            TIMER SETTINGS
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
              Changes apply immediately if idle, or from the next phase.
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
                Focus length: <strong style={{ color: '#4fa36a' }}>{currentFocusMinutes} min</strong>
              </div>
              <div className="px-10" style={{ color: '#ffe2a0' }}>
                Break length: <strong style={{ color: '#e0a84a' }}>{currentBreakMinutes} min</strong>
              </div>
            </div>

            <div className="px-10" style={{ color: '#b9a98a', textAlign: 'center' }}>
              Only the room owner can change timer settings.
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
