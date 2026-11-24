import React from 'react';

export interface ToastMessage {
  id: string;
  text: string;
  icon?: 'door' | 'info';
}

interface RoomToastsProps {
  toasts: ToastMessage[];
}

export const RoomToasts: React.FC<RoomToastsProps> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pixel-panel-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 14px',
            backgroundColor: '#241a2e',
            color: '#f1e3c4',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.75)',
            border: '2px solid #5c3a26',
            pointerEvents: 'auto',
          }}
        >
          {toast.icon === 'door' && (
            <img
              src="/pixel-library-assets/icons/door.png"
              alt="Door"
              style={{ width: 14, height: 14, imageRendering: 'pixelated' }}
            />
          )}
          <span className="px-10" style={{ color: '#ffe2a0' }}>
            {toast.text}
          </span>
        </div>
      ))}
    </div>
  );
};
