import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { db, rtdb } from '../../lib/firebase';
import { getThemeInfo } from '../../engine/themes';

interface RecentRoom {
  code: string;
  name: string;
  theme?: string;
  lastVisited?: unknown;
}

interface RecentRoomsListProps {
  uid: string;
}

// 5 classic book spine palette colors
const SPINE_COLORS = [
  { bg: '#5c3a26', border: '#3a2419', foil: '#ffe2a0' }, // Oak wood
  { bg: '#2f4a44', border: '#1b1423', foil: '#f6edc8' }, // Banker's green
  { bg: '#283a6a', border: '#141a33', foil: '#f3e6b0' }, // Midnight blue
  { bg: '#7e4a8a', border: '#2a1f36', foil: '#ffe2a0' }, // Velvet plum
  { bg: '#9a6f2e', border: '#3a2419', foil: '#fff0b0' }, // Antique brass
];

// Sub-component to listen to live RTDB presence for a single room
const BookSpineCard: React.FC<{
  room: RecentRoom;
  index: number;
  onClick: () => void;
}> = ({ room, index, onClick }) => {
  const [presenceCount, setPresenceCount] = useState<number>(0);
  const color = SPINE_COLORS[index % SPINE_COLORS.length];
  const themeInfo = getThemeInfo(room.theme);

  useEffect(() => {
    const presenceRef = ref(rtdb, `rooms/${room.code}/presence`);
    const unsubscribe = onValue(
      presenceRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const count = typeof val === 'object' ? Object.keys(val).length : 0;
          setPresenceCount(count);
        } else {
          setPresenceCount(0);
        }
      },
      (error) => {
        console.warn(`Presence fetch warning for room ${room.code}:`, error);
        setPresenceCount(0);
      }
    );

    return () => unsubscribe();
  }, [room.code]);

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: color.bg,
        border: `3px solid ${color.border}`,
        boxShadow: 'inset 0 2px rgba(255,255,255,0.15), inset 0 -3px rgba(0,0,0,0.4)',
        padding: '8px 12px',
        cursor: 'pointer',
        boxSizing: 'border-box',
        transition: 'transform 0.1s steps(1)',
        userSelect: 'none',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <img
          src={`/pixel-library-themes/themes/${themeInfo.id}/preview_night@4x.png`}
          alt={themeInfo.name}
          style={{
            width: '44px',
            height: '26px',
            objectFit: 'cover',
            imageRendering: 'pixelated',
            border: `1px solid ${themeInfo.accent}`,
            display: 'block',
            flexShrink: 0,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', gap: '2px', minWidth: 0 }}>
          <div
            className="px-20"
            style={{
              color: color.foil,
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '180px',
            }}
          >
            {room.name || room.code}
          </div>
          <div
            className="px-10"
            style={{
              color: '#b9a98a',
              display: 'flex',
              gap: '6px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <span>{room.code}</span>
            <span>•</span>
            <span style={{ color: themeInfo.accent }}>{themeInfo.name}</span>
          </div>
        </div>
      </div>

      <div
        className="px-10"
        style={{
          backgroundColor: '#1b1423',
          color: presenceCount > 0 ? '#4fa36a' : '#b9a98a',
          padding: '4px 8px',
          border: '1px solid #3a2419',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {presenceCount > 0 ? `${presenceCount} reading now` : '0 reading now'}
      </div>
    </div>
  );
};

export const RecentRoomsList: React.FC<RecentRoomsListProps> = ({ uid }) => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RecentRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const recentRef = collection(db, 'users', uid, 'recentRooms');
    const q = query(recentRef, orderBy('lastVisited', 'desc'), limit(5));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: RecentRoom[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            code: docSnap.id,
            name: data.name || docSnap.id,
            lastVisited: data.lastVisited,
          });
        });
        setRooms(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Recent rooms listener error:', err);
        setRooms([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  if (loading) {
    return (
      <div className="px-10" style={{ color: '#b9a98a', textAlign: 'center', padding: '12px' }}>
        Checking book shelves…
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div
        style={{
          backgroundColor: '#241a2e',
          border: '2px dashed #5c3a26',
          padding: '16px',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
      >
        <div className="px-10" style={{ color: '#b9a98a' }}>
          No rooms yet — start one and invite a friend
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {rooms.map((room, idx) => (
        <BookSpineCard
          key={room.code}
          room={room}
          index={idx}
          onClick={() => navigate(`/room/${room.code}`)}
        />
      ))}
    </div>
  );
};
