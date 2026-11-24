import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { PixelCanvas } from '../engine/PixelCanvas';
import { renderLandingScene } from '../components/landing/renderLandingScene';

interface RoomData {
  code: string;
  name: string;
  ownerUid: string;
  focusMinutes: number;
  breakMinutes: number;
}

export const RoomPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [roomNotFound, setRoomNotFound] = useState(false);

  const cleanCode = code ? code.toUpperCase() : '';

  // Look up room data and record visit in recentRooms
  useEffect(() => {
    if (!cleanCode) return;

    let active = true;
    const roomRef = doc(db, 'rooms', cleanCode);

    getDoc(roomRef)
      .then((snap) => {
        if (!active) return;
        if (snap.exists()) {
          const data = snap.data() as RoomData;
          setRoom(data);

          // Record visit in user's recentRooms
          if (user) {
            setDoc(
              doc(db, 'users', user.uid, 'recentRooms', cleanCode),
              {
                code: cleanCode,
                name: data.name || `${cleanCode} Room`,
                lastVisited: serverTimestamp(),
              },
              { merge: true }
            ).catch((err) => {
              console.warn('Failed to update recentRooms visit:', err);
            });
          }
        } else {
          setRoomNotFound(true);
        }
      })
      .catch((err) => {
        console.error('Error fetching room:', err);
        if (active) setRoomNotFound(true);
      });

    return () => {
      active = false;
    };
  }, [cleanCode, user]);

  const handleRender = useCallback((ctx: CanvasRenderingContext2D, timeMs: number) => {
    renderLandingScene(ctx, timeMs);
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#1b1423',
      }}
    >
      {/* Living Pixel Library Canvas Scene */}
      <PixelCanvas onRender={handleRender} />

      {/* Room Header Overlay */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 20,
        }}
      >
        <div
          className="pixel-panel-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '10px 18px',
            backgroundColor: '#f6edc8',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.85)',
          }}
        >
          <div>
            <div className="px-20" style={{ color: '#1b1423' }}>
              {roomNotFound ? 'ROOM NOT FOUND' : room?.name || `Room: ${cleanCode}`}
            </div>
            <div className="px-10" style={{ color: '#7a4d31' }}>
              Code: {cleanCode} • {room ? `${room.focusMinutes}/${room.breakMinutes} min Pomodoro` : 'Study Room'}
            </div>
          </div>

          <Link
            to="/lobby"
            className="pixel-btn pixel-btn-secondary"
            style={{
              minHeight: '36px',
              padding: '0 12px',
              fontSize: '10px',
            }}
          >
            ← Leave to Lobby
          </Link>
        </div>
      </div>
    </div>
  );
};
