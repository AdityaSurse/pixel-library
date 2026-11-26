import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { PixelCanvas, NativePointerCoords } from '../engine/PixelCanvas';
import { ThemeId, loadTheme, normalizeThemeId, getThemeInfo } from '../engine/themes';
import {
  initRoomPresence,
  subscribeToRoomData,
  RoomPresenceMap,
  RoomSeatsMap,
  RoomPresenceManager,
} from '../services/roomPresence';
import {
  subscribeToRoomTimer,
  computeRemainingMs,
  startTimer,
  pauseTimer,
  resumeTimer,
  resetTimer,
  skipTimer,
  advanceTimerPhase,
  updateIdleTimerDuration,
  RoomTimerData,
} from '../services/roomTimer';
import { playPhaseEndChime } from '../services/audioChime';
import { recordPomodoroCompletion } from '../services/userStats';
import { getSeatAtCoords } from '../components/room/roomGeometry';
import { renderRoomScene } from '../components/room/RoomSceneRenderer';
import { RoomHUD } from '../components/room/RoomHUD';
import { WhosHereDrawer } from '../components/room/WhosHereDrawer';
import { RoomClockPanel } from '../components/room/RoomClockPanel';
import { RoomSettingsModal } from '../components/room/RoomSettingsModal';
import { RoomToasts, ToastMessage } from '../components/room/RoomToasts';

interface RoomData {
  code: string;
  name: string;
  ownerUid: string;
  focusMinutes: number;
  breakMinutes: number;
  theme?: ThemeId;
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
  const [timer, setTimer] = useState<RoomTimerData | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);

  // UI state
  const [showAllNames, setShowAllNames] = useState(false);
  const [hoveredSeatId, setHoveredSeatId] = useState<string | null>(null);
  const [highlightedSeatId, setHighlightedSeatId] = useState<string | null>(null);
  const [highlightUntilMs, setHighlightUntilMs] = useState(0);
  const [doorFlashUntilMs, setDoorFlashUntilMs] = useState(0);
  const [focusStartMs, setFocusStartMs] = useState(0);
  const [streakFireUntilMs, setStreakFireUntilMs] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Theme transition state
  const [themeTransition, setThemeTransition] = useState<{
    fromThemeId: ThemeId;
    toThemeId: ThemeId;
    startMs: number;
    durationMs: number;
  } | null>(null);
  const prevThemeRef = useRef<ThemeId | null>(null);

  // Animation & presence refs
  const squashMapRef = useRef<Map<string, number>>(new Map());
  const presenceManagerRef = useRef<RoomPresenceManager | null>(null);
  const prevPresenceRef = useRef<RoomPresenceMap | null>(null);
  const prevTimerRef = useRef<RoomTimerData | null>(null);
  const isAdvancingRef = useRef(false);

  // Add toast helper
  const addToast = useCallback((text: string, icon?: 'door' | 'info') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, icon }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // 1. Real-time Room Snapshot from Firestore
  useEffect(() => {
    if (!cleanCode) return;

    const roomRef = doc(db, 'rooms', cleanCode);
    const unsubRoom = onSnapshot(
      roomRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as RoomData;
          const currentTheme = normalizeThemeId(data.theme);
          data.theme = currentTheme;

          // Preload theme assets so transition is instant
          loadTheme(currentTheme, 'night').catch(() => {});

          if (prevThemeRef.current && prevThemeRef.current !== currentTheme) {
            // Trigger 300ms 4x4 Bayer dither transition
            const fromTheme = prevThemeRef.current;
            setThemeTransition({
              fromThemeId: fromTheme,
              toThemeId: currentTheme,
              startMs: performance.now(),
              durationMs: 300,
            });
            setTimeout(() => {
              setThemeTransition((cur) =>
                cur && cur.toThemeId === currentTheme ? null : cur
              );
            }, 350);
          }
          prevThemeRef.current = currentTheme;

          setRoom(data);
          setLoadingRoom(false);

          // Record visit in user's recentRooms
          if (user) {
            setDoc(
              doc(db, 'users', user.uid, 'recentRooms', cleanCode),
              {
                code: cleanCode,
                name: data.name || `${cleanCode} Room`,
                theme: currentTheme,
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
      },
      (err) => {
        console.error('Error listening to room doc:', err);
        setRoomNotFound(true);
        setLoadingRoom(false);
      }
    );

    return () => {
      unsubRoom();
    };
  }, [cleanCode, user]);

  // 2. Realtime Database Presence & Seats Subscription
  useEffect(() => {
    if (!cleanCode || !user || !profile || roomNotFound) return;

    const handleSeatConflict = () => {
      addToast('Someone just sat there!', 'info');
    };

    const manager = initRoomPresence(cleanCode, user.uid, profile, handleSeatConflict);
    presenceManagerRef.current = manager;

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

  // 3. Shared Pomodoro Timer Subscription
  useEffect(() => {
    if (!cleanCode || roomNotFound) return;

    const unsubTimer = subscribeToRoomTimer(cleanCode, (newTimer) => {
      const prev = prevTimerRef.current;

      if (newTimer) {
        // Detect action toasts from other users
        if (prev && prev.startedAt === null && newTimer.startedAt !== null) {
          if (newTimer.updatedBy !== profile?.username) {
            addToast(`${newTimer.updatedBy} started the timer`, 'info');
          }
          if (newTimer.mode === 'focus') {
            setFocusStartMs(performance.now());
          }
        } else if (prev && prev.startedAt !== null && newTimer.startedAt === null) {
          if (newTimer.updatedBy !== profile?.username) {
            addToast(`${newTimer.updatedBy} paused the timer`, 'info');
          }
        } else if (prev && (prev.mode !== newTimer.mode || prev.round !== newTimer.round)) {
          if (newTimer.mode === 'focus') {
            setFocusStartMs(performance.now());
          }
        }
      }

      prevTimerRef.current = newTimer;
      setTimer(newTimer);
    });

    return () => {
      unsubTimer();
    };
  }, [cleanCode, roomNotFound, profile, addToast]);

  // 4. Timer Countdown Loop & Auto-Advancement
  useEffect(() => {
    if (!room) return;

    const interval = setInterval(async () => {
      const rem = computeRemainingMs(timer);
      setRemainingMs(rem);

      // Dynamic Tab Title
      if (timer && timer.startedAt !== null) {
        // Running
        const secs = Math.max(0, Math.ceil(rem / 1000));
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        const icon = timer.mode === 'focus' ? '🍅' : '☕';
        const formatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        document.title = `${icon} ${formatted} · Pixel Library`;
      } else if (timer && timer.startedAt === null && timer.pausedRemainingMs !== null) {
        // Paused
        const secs = Math.max(0, Math.ceil(rem / 1000));
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        const formatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        document.title = `⏸ ${formatted} · Pixel Library`;
      } else {
        // Idle
        document.title = `${room.name || 'Study Room'} · Pixel Library`;
      }

      // Check for Phase End (Auto-Advance). NEVER fire while paused or idle!
      if (
        timer &&
        timer.startedAt !== null &&
        timer.pausedRemainingMs === null &&
        rem <= 0 &&
        !isAdvancingRef.current
      ) {
        isAdvancingRef.current = true;

        // Play 3-note synthesized chime
        playPhaseEndChime();

        // Award Pomodoro stats if seated during completed focus
        if (timer.mode === 'focus' && user && presence[user.uid]?.seatId && presence[user.uid]?.status !== 'away') {
          const roundId = `${cleanCode}_r${timer.round}_focus`;
          recordPomodoroCompletion(user.uid, roundId, room.focusMinutes)
            .then((res) => {
              if (res.streakIncreased) {
                setStreakFireUntilMs(performance.now() + 5000);
                addToast(`Study streak increased to ${res.newStreak} days!`, 'info');
              }
            })
            .catch(() => {});
        }

        // Concurrency-safe phase advance
        await advanceTimerPhase(
          cleanCode,
          timer.round,
          timer.mode,
          room.focusMinutes,
          room.breakMinutes
        );

        setTimeout(() => {
          isAdvancingRef.current = false;
        }, 1500);
      }
    }, 150);

    return () => {
      clearInterval(interval);
    };
  }, [timer, room, cleanCode, user, presence, addToast]);

  // 5. Detect arrivals & departures
  useEffect(() => {
    if (!prevPresenceRef.current) {
      prevPresenceRef.current = presence;
      return;
    }

    const prev = prevPresenceRef.current;
    const current = presence;

    for (const uid of Object.keys(current)) {
      if (!prev[uid]) {
        const newcomer = current[uid];
        setDoorFlashUntilMs(performance.now() + 100);
        addToast(`${newcomer.username || 'A reader'} walked in`, 'door');
      }
    }

    for (const uid of Object.keys(prev)) {
      if (!current[uid]) {
        const departed = prev[uid];
        addToast(`${departed.username || 'A reader'} left quietly`, 'door');
      }
    }

    prevPresenceRef.current = current;
  }, [presence, addToast]);

  // 6. Pointer interaction
  const handlePointerMoveNative = useCallback((coords: NativePointerCoords | null) => {
    const seat = getSeatAtCoords(coords);
    setHoveredSeatId(seat ? seat.id : null);
  }, []);

  const handlePointerClickNative = useCallback(
    async (coords: NativePointerCoords) => {
      const seat = getSeatAtCoords(coords);
      if (!seat || !presenceManagerRef.current) return;

      if (seats[seat.id]) return;

      const success = await presenceManagerRef.current.claimSeat(seat.id);
      if (success) {
        squashMapRef.current.set(seat.id, performance.now());
      }
    },
    [seats]
  );

  // 7. HUD Actions
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

  // 8. Timer Controls
  const handleStartTimer = useCallback(async () => {
    if (!room || !profile) return;
    await startTimer(cleanCode, room.focusMinutes, profile.username);
    addToast(`${profile.username} started the timer`, 'info');
    setFocusStartMs(performance.now());
  }, [cleanCode, room, profile, addToast]);

  const handlePauseTimer = useCallback(async () => {
    if (!profile) return;
    await pauseTimer(cleanCode, profile.username);
    addToast(`${profile.username} paused the timer`, 'info');
  }, [cleanCode, profile, addToast]);

  const handleResumeTimer = useCallback(async () => {
    if (!profile) return;
    await resumeTimer(cleanCode, profile.username);
    addToast(`${profile.username} resumed the timer`, 'info');
  }, [cleanCode, profile, addToast]);

  const handleResetTimer = useCallback(async () => {
    if (!room || !profile) return;
    await resetTimer(cleanCode, room.focusMinutes, profile.username);
    addToast(`${profile.username} reset the timer`, 'info');
  }, [cleanCode, room, profile, addToast]);

  const handleSkipTimer = useCallback(async () => {
    if (!room || !profile) return;
    await skipTimer(cleanCode, room.focusMinutes, room.breakMinutes, profile.username);
    addToast(`${profile.username} skipped to next phase`, 'info');
  }, [cleanCode, room, profile, addToast]);

  const handleSaveSettings = useCallback(
    async (newFocus: number, newBreak: number, newTheme: ThemeId) => {
      if (!cleanCode) return;
      try {
        await updateDoc(doc(db, 'rooms', cleanCode), {
          focusMinutes: newFocus,
          breakMinutes: newBreak,
          theme: newTheme,
        });
        setRoom((prev) =>
          prev
            ? { ...prev, focusMinutes: newFocus, breakMinutes: newBreak, theme: newTheme }
            : null
        );
        // If timer is idle/reset, apply new focus duration immediately
        if (timer?.startedAt == null && timer?.pausedRemainingMs == null) {
          await updateIdleTimerDuration(cleanCode, newFocus);
        }
        addToast('Room settings updated', 'info');
      } catch (err) {
        console.error('Failed to update room settings:', err);
        addToast('Failed to update settings', 'info');
      }
    },
    [cleanCode, timer, addToast]
  );

  // 9. Canvas Scene Render Loop
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
        timerMode: timer?.mode || 'focus',
        isTimerRunning: Boolean(timer && timer.startedAt !== null),
        focusStartMs,
        streakFireUntilMs,
        themeId: room?.theme || 'classic',
        transition: themeTransition,
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
      timer,
      focusStartMs,
      streakFireUntilMs,
      room?.theme,
      themeTransition,
    ]
  );

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
        themeName={getThemeInfo(room?.theme).name}
        themeAccent={getThemeInfo(room?.theme).accent}
        onToggleNames={() => setShowAllNames((prev) => !prev)}
        onStandUp={handleStandUp}
        onLeave={handleLeave}
      />

      {/* Clock Panel */}
      <RoomClockPanel
        timer={timer}
        remainingMs={remainingMs}
        readersCount={Object.keys(presence).length}
        onStart={handleStartTimer}
        onPause={handlePauseTimer}
        onResume={handleResumeTimer}
        onReset={handleResetTimer}
        onSkip={handleSkipTimer}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Room Settings Modal (Owner editable, non-owner read-only) */}
      <RoomSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isOwner={Boolean(user && room && room.ownerUid === user.uid)}
        currentFocusMinutes={room?.focusMinutes || 25}
        currentBreakMinutes={room?.breakMinutes || 5}
        currentTheme={room?.theme || 'classic'}
        onSave={handleSaveSettings}
      />

      {/* Who's Here Drawer */}
      <WhosHereDrawer
        presence={presence}
        currentUid={user?.uid || null}
        isOpen={isDrawerOpen}
        onToggle={() => setIsDrawerOpen((prev) => !prev)}
        onSelectReader={handleSelectReader}
      />

      {/* Arrival, Departure & Timer Toasts */}
      <RoomToasts toasts={toasts} />
    </div>
  );
};
