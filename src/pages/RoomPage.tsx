import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { PixelCanvas, NativePointerCoords } from '../engine/PixelCanvas';
import { ThemeId, preloadTheme, normalizeThemeId, getThemeInfo } from '../engine/themes';
import { TimeOfDay, useTimeOfDay } from '../engine/timeOfDay';
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
import { playPhaseEndChime, playNudgeTick, isChimeMuted, setChimeMuted } from '../services/audioChime';
import { preloadTimerFavicons, updateTimerFavicon, restoreDefaultFavicon } from '../engine/faviconManager';
import { KeyboardShortcutsModal } from '../components/room/KeyboardShortcutsModal';
import { recordPomodoroCompletion } from '../services/userStats';
import { getSeatAtCoords, getNoteAtCoords } from '../components/room/roomGeometry';
import { renderRoomScene } from '../components/room/RoomSceneRenderer';
import { RoomHUD } from '../components/room/RoomHUD';
import { WhosHereDrawer } from '../components/room/WhosHereDrawer';
import { RoomClockPanel } from '../components/room/RoomClockPanel';
import { RoomSettingsModal } from '../components/room/RoomSettingsModal';
import { RoomToasts, ToastMessage } from '../components/room/RoomToasts';
import { GoalModal } from '../components/room/GoalModal';
import { GoalFinishModal } from '../components/room/GoalFinishModal';
import { RoomLeaderboardModal } from '../components/room/RoomLeaderboardModal';
import {
  recordRoomMemberFocus,
  subscribeToRoomLeaderboard,
  RoomMemberRecord,
} from '../services/leaderboardService';
import {
  setReaderGoal,
  updateReaderGoalStatus,
  clearReaderGoal,
  saveCompletedGoalToFirestore,
} from '../services/goalService';
import {
  onNewUnlockCelebration,
  checkForNewUnlocks,
  markUnlocksAsSeen,
  evaluateAllUnlocks,
  UnlockCelebrationItem,
} from '../lib/unlocks';
import { UnlockCelebrationModal } from '../components/unlocks/UnlockCelebrationModal';

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
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isClockNudging, setIsClockNudging] = useState(false);
  const lastNudgedPhaseRef = useRef<string | null>(null);

  // Preload timer favicons and restore default on leaving room
  useEffect(() => {
    preloadTimerFavicons().catch(console.error);
    return () => {
      restoreDefaultFavicon();
    };
  }, []);

  // Weekly Leaderboard state
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboardMembers, setLeaderboardMembers] = useState<RoomMemberRecord[]>([]);
  const [topLeaderUid, setTopLeaderUid] = useState<string | null>(null);
  const prevLeaderUidRef = useRef<string | null>(null);
  const isInitialLeaderboardLoadRef = useRef(true);

  // Goal & desk note state
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isGoalFinishModalOpen, setIsGoalFinishModalOpen] = useState(false);
  const [pendingFinishGoal, setPendingFinishGoal] = useState<{ text: string } | null>(null);
  const [heartBubbleUntilMs, setHeartBubbleUntilMs] = useState(0);
  const [activeNoteTooltip, setActiveNoteTooltip] = useState<{
    seatId: string;
    username: string;
    text: string;
  } | null>(null);

  // Unlock celebration state
  const [celebrationItem, setCelebrationItem] = useState<UnlockCelebrationItem | null>(null);

  useEffect(() => {
    const unsub = onNewUnlockCelebration((item) => {
      setCelebrationItem(item);
    });
    return unsub;
  }, []);

  const handleDismissCelebration = async () => {
    if (!user || !profile) {
      setCelebrationItem(null);
      return;
    }
    const currentAll = evaluateAllUnlocks(profile.stats, profile.badges);
    await markUnlocksAsSeen(user.uid, currentAll);
    const remaining = checkForNewUnlocks(profile);
    if (remaining.length > 1) {
      setCelebrationItem(remaining[1]);
    } else {
      setCelebrationItem(null);
    }
  };

  // Time of Day (Auto / Day / Night) and 2-second crossfade
  const { timeOfDay, preference: timePreference, setPreference: setTimePreference } = useTimeOfDay();
  const [timeCrossfade, setTimeCrossfade] = useState<{
    fromTime: TimeOfDay;
    toTime: TimeOfDay;
    startMs: number;
    durationMs: number;
  } | null>(null);
  const prevTimeOfDayRef = useRef<TimeOfDay | null>(null);

  // Theme transition state (4x4 Bayer dither)
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

  // Detect Day / Night transition (crosses 06:00 / 18:00 or user toggles)
  useEffect(() => {
    if (prevTimeOfDayRef.current && prevTimeOfDayRef.current !== timeOfDay) {
      // 2-second crossfade in 4 hard steps (25/50/75/100%)
      setTimeCrossfade({
        fromTime: prevTimeOfDayRef.current,
        toTime: timeOfDay,
        startMs: performance.now(),
        durationMs: 2000,
      });
      setTimeout(() => {
        setTimeCrossfade((cur) => (cur && cur.toTime === timeOfDay ? null : cur));
      }, 2050);
    }
    prevTimeOfDayRef.current = timeOfDay;
  }, [timeOfDay]);

  // Add toast helper
  const addToast = useCallback((text: string, icon?: 'door' | 'info') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, icon }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // Live weekly leaderboard listener with #1 spot change toast
  useEffect(() => {
    if (!cleanCode) return;
    const unsub = subscribeToRoomLeaderboard(cleanCode, (members, topUid) => {
      setLeaderboardMembers(members);
      setTopLeaderUid(topUid);

      if (members.length > 0 && topUid) {
        if (
          !isInitialLeaderboardLoadRef.current &&
          prevLeaderUidRef.current &&
          prevLeaderUidRef.current !== topUid
        ) {
          const newLeader = members[0];
          addToast(`${newLeader.username} leads the library this week!`, 'info');
        }
        prevLeaderUidRef.current = topUid;
      }
      isInitialLeaderboardLoadRef.current = false;
    });

    return unsub;
  }, [cleanCode, addToast]);

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

          // Preload both day and night theme assets so transitions never flicker
          preloadTheme(currentTheme).catch(() => {});

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

        // Goal prompt on focus -> break
        if (prev && prev.mode === 'focus' && newTimer.mode === 'break') {
          if (user) {
            const myPresence = presence[user.uid];
            if (myPresence?.seatId && myPresence.goal && myPresence.goal.status === 'open') {
              setPendingFinishGoal({ text: myPresence.goal.text });
              setIsGoalFinishModalOpen(true);
            }
          }
        }

        // Break ended, next focus starting: break -> focus
        if (prev && prev.mode === 'break' && newTimer.mode === 'focus') {
          if (user && pendingFinishGoal) {
            // Auto-mark missed if unanswered during break
            saveCompletedGoalToFirestore(user.uid, {
              text: pendingFinishGoal.text,
              status: 'missed',
              roomCode: cleanCode,
              theme: room?.theme || 'classic',
            }).catch(console.error);
            updateReaderGoalStatus(cleanCode, user.uid, 'missed').catch(console.error);
            setIsGoalFinishModalOpen(false);
            setPendingFinishGoal(null);
          }

          // Clear desk note when next focus phase starts
          if (user) {
            clearReaderGoal(cleanCode, user.uid).catch(console.error);
            const myPresence = presence[user.uid];
            if (myPresence?.seatId) {
              setIsGoalModalOpen(true);
            }
          }
        }
      }

      prevTimerRef.current = newTimer;
      setTimer(newTimer);
    });

    return () => {
      unsubTimer();
    };
  }, [cleanCode, roomNotFound, profile, addToast, user, presence, pendingFinishGoal, room?.theme]);

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
        const modeLabel = timer.mode === 'focus' ? 'Focus' : 'Break';
        const formatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        document.title = `${modeLabel} ${formatted} · Pixel Library`;
        updateTimerFavicon(timer.mode === 'focus' ? 'focus' : 'break');
      } else if (timer && timer.startedAt === null && timer.pausedRemainingMs !== null) {
        // Paused
        const secs = Math.max(0, Math.ceil(rem / 1000));
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        const formatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        document.title = `Paused ${formatted} · Pixel Library`;
        updateTimerFavicon('idle');
      } else {
        // Idle
        document.title = `${room.name || 'Study Room'} · Pixel Library`;
        updateTimerFavicon('idle');
      }

      // "5 Minutes Left" Nudge:
      // When focus timer crosses 5:00 remaining (<= 300000ms), blink clock panel border in #d9463b 3 times
      // and play single soft square-wave tick via Web Audio API. Fire only once per focus phase; do not fire if total duration <= 5 min.
      if (
        timer &&
        timer.mode === 'focus' &&
        timer.startedAt !== null &&
        timer.pausedRemainingMs === null &&
        timer.durationMs > 300000 &&
        rem <= 300000 &&
        rem > 0
      ) {
        const phaseKey = `${cleanCode}_${timer.round}_${timer.startedAt}`;
        if (lastNudgedPhaseRef.current !== phaseKey) {
          lastNudgedPhaseRef.current = phaseKey;
          playNudgeTick();
          const reducedMotion =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (!reducedMotion) {
            setIsClockNudging(true);
            setTimeout(() => setIsClockNudging(false), 900);
          }
        }
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

          if (profile) {
            recordRoomMemberFocus(
              cleanCode,
              user.uid,
              {
                username: profile.username,
                preset: profile.preset,
                accessory: profile.accessory,
              },
              room.focusMinutes
            ).catch((err) => console.error('Failed to record member focus session:', err));
          }
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
  }, [timer, room, cleanCode, user, presence, profile, addToast]);

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
  const handlePointerMoveNative = useCallback(
    (coords: NativePointerCoords | null) => {
      // Check for desk note hover first
      const noteTarget = getNoteAtCoords(coords, presence, seats);
      if (noteTarget) {
        setActiveNoteTooltip({
          seatId: noteTarget.seat.id,
          username: noteTarget.reader.username || 'Reader',
          text: noteTarget.reader.goal?.text || '',
        });
        setHoveredSeatId(null);
        return;
      } else {
        setActiveNoteTooltip(null);
      }

      const seat = getSeatAtCoords(coords);
      setHoveredSeatId(seat ? seat.id : null);
    },
    [presence, seats]
  );

  const handlePointerClickNative = useCallback(
    async (coords: NativePointerCoords) => {
      // Check for desk note tap
      const noteTarget = getNoteAtCoords(coords, presence, seats);
      if (noteTarget) {
        setActiveNoteTooltip({
          seatId: noteTarget.seat.id,
          username: noteTarget.reader.username || 'Reader',
          text: noteTarget.reader.goal?.text || '',
        });
        return;
      } else {
        setActiveNoteTooltip(null);
      }

      const seat = getSeatAtCoords(coords);
      if (!seat || !presenceManagerRef.current) return;

      if (seats[seat.id]) return;

      const success = await presenceManagerRef.current.claimSeat(seat.id);
      if (success) {
        squashMapRef.current.set(seat.id, performance.now());
      }
    },
    [presence, seats]
  );

  // 7. HUD Actions
  const handleStandUp = useCallback(async () => {
    if (presenceManagerRef.current) {
      await presenceManagerRef.current.standUp();
    }
    if (user) {
      clearReaderGoal(cleanCode, user.uid).catch(console.error);
    }
    setIsGoalFinishModalOpen(false);
    setIsGoalModalOpen(false);
    setPendingFinishGoal(null);
  }, [cleanCode, user]);

  const handleLeave = useCallback(async () => {
    if (presenceManagerRef.current) {
      await presenceManagerRef.current.leaveRoom();
      presenceManagerRef.current.cleanup();
      presenceManagerRef.current = null;
    }
    if (user) {
      clearReaderGoal(cleanCode, user.uid).catch(console.error);
    }
    navigate('/lobby');
  }, [cleanCode, user, navigate]);

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

    // Prompt seated reader if no open goal
    if (user && presence[user.uid]?.seatId) {
      const myGoal = presence[user.uid]?.goal;
      if (!myGoal || myGoal.status !== 'open') {
        setIsGoalModalOpen(true);
      }
    }
  }, [cleanCode, room, profile, addToast, user, presence]);

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

  // 8b. Keyboard Shortcuts (Room page only)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore all shortcuts when typing in input, textarea, or contentEditable
      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName.toLowerCase();
        if (
          tagName === 'input' ||
          tagName === 'textarea' ||
          (activeEl as HTMLElement).isContentEditable
        ) {
          return;
        }
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (timer && timer.startedAt !== null) {
          handlePauseTimer();
        } else if (timer && timer.startedAt === null && timer.pausedRemainingMs !== null) {
          handleResumeTimer();
        } else {
          handleStartTimer();
        }
      } else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setIsGoalModalOpen((prev) => !prev);
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        setIsLeaderboardOpen((prev) => !prev);
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setShowAllNames((prev) => !prev);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        const nextMuted = !isChimeMuted();
        setChimeMuted(nextMuted);
        window.dispatchEvent(new CustomEvent('chime-mute-changed', { detail: nextMuted }));
        addToast(nextMuted ? 'Chime muted' : 'Chime unmuted', 'info');
      } else if (e.key === 'Escape') {
        setIsShortcutsOpen(false);
        setIsLeaderboardOpen(false);
        setIsGoalModalOpen(false);
        setIsGoalFinishModalOpen(false);
        setIsSettingsOpen(false);
        setIsDrawerOpen(false);
        setActiveNoteTooltip(null);
      } else if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    timer,
    handlePauseTimer,
    handleResumeTimer,
    handleStartTimer,
    addToast,
  ]);

  // Goal actions
  const handleSaveGoal = useCallback(
    async (goalText: string) => {
      if (!user) return;
      try {
        await setReaderGoal(cleanCode, user.uid, goalText);
        setIsGoalModalOpen(false);
        addToast('Goal pinned to desk', 'info');
      } catch (err) {
        console.error('Failed to pin goal:', err);
        addToast('Failed to pin goal', 'info');
      }
    },
    [user, cleanCode, addToast]
  );

  const handleClearGoal = useCallback(async () => {
    if (!user) return;
    try {
      await clearReaderGoal(cleanCode, user.uid);
      setIsGoalModalOpen(false);
      addToast('Goal removed from desk', 'info');
    } catch (err) {
      console.error('Failed to clear goal:', err);
    }
  }, [user, cleanCode, addToast]);

  const handleGoalDone = useCallback(async () => {
    if (!user || !pendingFinishGoal) return;
    const goalText = pendingFinishGoal.text;
    try {
      await saveCompletedGoalToFirestore(user.uid, {
        text: goalText,
        status: 'done',
        roomCode: cleanCode,
        theme: room?.theme || 'classic',
      });
      await updateReaderGoalStatus(cleanCode, user.uid, 'done');
      setHeartBubbleUntilMs(performance.now() + 3000);
      setIsGoalFinishModalOpen(false);
      setPendingFinishGoal(null);
      addToast('Goal accomplished!', 'info');
    } catch (err) {
      console.error('Failed to mark goal done:', err);
    }
  }, [user, pendingFinishGoal, cleanCode, room?.theme, addToast]);

  const handleGoalNotYet = useCallback(async () => {
    if (!user || !pendingFinishGoal) return;
    const goalText = pendingFinishGoal.text;
    try {
      await saveCompletedGoalToFirestore(user.uid, {
        text: goalText,
        status: 'missed',
        roomCode: cleanCode,
        theme: room?.theme || 'classic',
      });
      await updateReaderGoalStatus(cleanCode, user.uid, 'missed');
      setIsGoalFinishModalOpen(false);
      setPendingFinishGoal(null);
      addToast('Goal logged for later', 'info');
    } catch (err) {
      console.error('Failed to mark goal missed:', err);
    }
  }, [user, pendingFinishGoal, cleanCode, room?.theme, addToast]);

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
        heartBubbleUntilMs,
        heartBubbleUid: user?.uid || null,
        topReaderUid: topLeaderUid,
        activeNoteTooltip,
        themeId: room?.theme || 'classic',
        timeOfDay,
        transition: themeTransition,
        timeCrossfade,
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
      heartBubbleUntilMs,
      topLeaderUid,
      activeNoteTooltip,
      room?.theme,
      timeOfDay,
      themeTransition,
      timeCrossfade,
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
        timePreference={timePreference}
        onTimePreferenceChange={setTimePreference}
        onToggleNames={() => setShowAllNames((prev) => !prev)}
        onOpenGoal={() => setIsGoalModalOpen(true)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen((prev) => !prev)}
        onStandUp={handleStandUp}
        onLeave={handleLeave}
      />

      {/* Clock Panel */}
      <RoomClockPanel
        timer={timer}
        remainingMs={remainingMs}
        readersCount={Object.keys(presence).length}
        isNudging={isClockNudging}
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

      {/* Session Goal Writing Modal */}
      <GoalModal
        isOpen={isGoalModalOpen}
        initialText={user ? presence[user.uid]?.goal?.text || '' : ''}
        onSave={handleSaveGoal}
        onSkip={() => setIsGoalModalOpen(false)}
        onClear={handleClearGoal}
      />

      {/* Goal Completion Evaluation Modal */}
      <GoalFinishModal
        isOpen={isGoalFinishModalOpen}
        goalText={pendingFinishGoal?.text || ''}
        onDone={handleGoalDone}
        onNotYet={handleGoalNotYet}
      />

      {/* Unlock Celebration Modal */}
      <UnlockCelebrationModal
        isOpen={celebrationItem !== null}
        item={celebrationItem}
        onDismiss={handleDismissCelebration}
      />

      {/* Weekly Leaderboard Modal */}
      <RoomLeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        members={leaderboardMembers}
        currentUid={user?.uid || null}
      />

      {/* Keyboard Shortcuts Modal */}
      {isShortcutsOpen && (
        <KeyboardShortcutsModal onClose={() => setIsShortcutsOpen(false)} />
      )}
    </div>
  );
};
