import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { PixelCanvas, NativePointerCoords } from '../engine/PixelCanvas';
import {
  initRoomPresence,
  subscribeToRoomData,
  RoomPresenceMap,
  RoomSeatsMap,
  RoomPresenceManager,
} from '../services/roomPresence';
import { getSeatAtCoords } from '../components/room/roomGeometry';
import { renderRoomScene } from '../components/room/RoomSceneRenderer';
import { RoomHUD } from '../components/room/RoomHUD';
import { WhosHereDrawer } from '../components/room/WhosHereDrawer';
import { RoomToasts, ToastMessage } from '../components/room/RoomToasts';

interface RoomData {
  code: string;
  name: string;
  ownerUid: string;
  focusMinutes: number;
  breakMinutes: number;
}

export const RoomPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const cleanCode = code ? code.toUpperCase() : '';

  const [room, setRoom] = useState<RoomData | null>(null);
  const [roomNotFound, setRoomNotFound] = useState(false);
  const [loadingRoom, setLoadingRoom] = useState(true);

  // RTDB state
  const [presence, setPresence] = useState<RoomPresenceMap>({});
  const [seats, setSeats] = useState<RoomSeatsMap>({});

  // UI state
  const [showAllNames, setShowAllNames] = useState(false);
  const [hoveredSeatId, setHoveredSeatId] = useState<string | null>(null);
  const [highlightedSeatId, setHighlightedSeatId] = useState<string | null>(null);
  const [highlightUntilMs, setHighlightUntilMs] = useState(0);
  const [doorFlashUntilMs, setDoorFlashUntilMs] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Animation & presence refs
  const squashMapRef = useRef<Map<string, number>>(new Map());
  const presenceManagerRef = useRef<RoomPresenceManager | null>(null);
  const prevPresenceRef = useRef<RoomPresenceMap | null>(null);

  // Add toast helper
  const addToast = useCallback((text: string, icon?: 'door' | 'info') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, icon }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // 1. Fetch Room from Firestore
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
          setLoadingRoom(false);

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
              console.warn('Failed to update recentRooms:', err);
            });
          }
        } else {
          setRoomNotFound(true);
          setLoadingRoom(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching room:', err);
        if (active) {
          setRoomNotFound(true);
          setLoadingRoom(false);
        }
      });

    return () => {
      active = false;
    };
  }, [cleanCode, user]);

  // 2. Realtime Database Presence & Data Subscription
  useEffect(() => {
    if (!cleanCode || !user || !profile || roomNotFound) return;

    // Handle seat conflicts from RTDB transaction
    const handleSeatConflict = () => {
      addToast('Someone just sat there!', 'info');
    };

    // Initialize Presence
    const manager = initRoomPresence(cleanCode, user.uid, profile, handleSeatConflict);
    presenceManagerRef.current = manager;

    // Subscribe to presence and seat updates
    const unsubRoomData = subscribeToRoomData(
      cleanCode,
      (newPresence) => {
        setPresence(newPresence);
      },
      (newSeats) => {
        setSeats(newSeats);
      }
    );

    return () => {
      unsubRoomData();
      manager.cleanup();
      presenceManagerRef.current = null;
    };
  }, [cleanCode, user, profile, roomNotFound, addToast]);

  // 3. Detect arrivals & departures for door window flash and toasts
  useEffect(() => {
    if (!prevPresenceRef.current) {
      prevPresenceRef.current = presence;
      return;
    }

    const prev = prevPresenceRef.current;
    const current = presence;

    // Detect new arrivals
    for (const uid of Object.keys(current)) {
      if (!prev[uid]) {
        // Someone joined!
        const newcomer = current[uid];
        setDoorFlashUntilMs(performance.now() + 100);
        addToast(`${newcomer.username || 'A reader'} walked in`, 'door');
      }
    }

    // Detect departures
    for (const uid of Object.keys(prev)) {
      if (!current[uid]) {
        // Someone left!
        const departed = prev[uid];
        addToast(`${departed.username || 'A reader'} left quietly`, 'door');
      }
    }

    prevPresenceRef.current = current;
  }, [presence, addToast]);

  // 4. Pointer Interaction: Hover over seats
  const handlePointerMoveNative = useCallback((coords: NativePointerCoords | null) => {
    const seat = getSeatAtCoords(coords);
    setHoveredSeatId(seat ? seat.id : null);
  }, []);

  // 5. Pointer Interaction: Click to claim / move seat
  const handlePointerClickNative = useCallback(
    async (coords: NativePointerCoords) => {
      const seat = getSeatAtCoords(coords);
      if (!seat || !presenceManagerRef.current) return;

      // Occupied chair: clicking does nothing
      if (seats[seat.id]) {
        return;
      }

      // Empty chair: claim seat
      const success = await presenceManagerRef.current.claimSeat(seat.id);
      if (success) {
        squashMapRef.current.set(seat.id, performance.now());
      }
    },
    [seats]
  );

  // 6. Action handlers
  const handleStandUp = useCallback(async () => {
    if (presenceManagerRef.current) {
      await presenceManagerRef.current.standUp();
    }
  }, []);

  const handleLeave = useCallback(async () => {
    if (presenceManagerRef.current) {
      await presenceManagerRef.current.leaveRoom();
      presenceManagerRef.current.cleanup();
      presenceManagerRef.current = null;
    }
    navigate('/lobby');
  }, [navigate]);

  const handleSelectReader = useCallback((seatId: string | null) => {
    if (seatId) {
      setHighlightedSeatId(seatId);
      setHighlightUntilMs(performance.now() + 2000);
    }
  }, []);

  // 7. Render Canvas Loop
  const handleRender = useCallback(
    (ctx: CanvasRenderingContext2D, timeMs: number) => {
      renderRoomScene(ctx, timeMs, {
        presence,
        seats,
        currentUid: user?.uid || null,
        hoveredSeatId,
        highlightedSeatId,
        highlightUntilMs,
        showAllNames,
        doorFlashUntilMs,
        squashMap: squashMapRef.current,
      });
    },
    [
      presence,
      seats,
      user,
      hoveredSeatId,
      highlightedSeatId,
      highlightUntilMs,
      showAllNames,
      doorFlashUntilMs,
    ]
  );

  // Closed Room View
  if (roomNotFound) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: '#1b1423',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <div
          className="pixel-panel"
          style={{
            maxWidth: '440px',
            textAlign: 'center',
            backgroundColor: '#f6edc8',
            padding: '24px 20px',
          }}
        >
          <div className="px-30" style={{ color: '#1b1423', marginBottom: '12px' }}>
            THIS ROOM HAS CLOSED
          </div>
          <p className="px-20" style={{ color: '#5c3a26', marginBottom: '24px' }}>
            The study group has packed up their books and closed the doors for tonight.
          </p>
          <Link to="/lobby" className="pixel-btn pixel-btn-primary">
            Return to Front Desk
          </Link>
        </div>
      </div>
    );
  }

  // Loading Room View
  if (loadingRoom) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: '#1b1423',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="pixel-panel-sm px-20" style={{ color: '#ffe2a0', padding: '16px 24px' }}>
          Finding your table...
        </div>
      </div>
    );
  }

  const isCurrentSeated = Boolean(user && presence[user.uid]?.seatId);

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
      {/* 320x192 Living Pixel Canvas */}
      <PixelCanvas
        onRender={handleRender}
        onPointerMoveNative={handlePointerMoveNative}
        onPointerClickNative={handlePointerClickNative}
      />

      {/* Top HUD Bar */}
      <RoomHUD
        roomName={room?.name || `Room: ${cleanCode}`}
        roomCode={cleanCode}
        focusMinutes={room?.focusMinutes || 25}
        breakMinutes={room?.breakMinutes || 5}
        showAllNames={showAllNames}
        isSeated={isCurrentSeated}
        onToggleNames={() => setShowAllNames((prev) => !prev)}
        onStandUp={handleStandUp}
        onLeave={handleLeave}
      />

      {/* Who's Here Panel / Drawer */}
      <WhosHereDrawer
        presence={presence}
        currentUid={user?.uid || null}
        isOpen={isDrawerOpen}
        onToggle={() => setIsDrawerOpen((prev) => !prev)}
        onSelectReader={handleSelectReader}
      />

      {/* Arrival & Departure Toasts */}
      <RoomToasts toasts={toasts} />
    </div>
  );
};
