import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { PixelCanvas } from '../engine/PixelCanvas';
import { renderLandingScene } from '../components/landing/renderLandingScene';
import { RoomCodeInput } from '../components/lobby/RoomCodeInput';
import { ShareRoomModal } from '../components/lobby/ShareRoomModal';
import { RecentRoomsList } from '../components/lobby/RecentRoomsList';
import { PixelStepper } from '../components/common/PixelStepper';
import { ThemeId, getThemeList } from '../engine/themes';
import { getWeeklyGoalsDoneCount } from '../services/goalService';
import { StudyMapCard } from '../components/heatmap/StudyMapCard';
import { BadgesShelf } from '../components/badges/BadgesShelf';
import {
  getAccessoryRow,
  getThemeUnlockProgress,
  checkForNewUnlocks,
  markUnlocksAsSeen,
  evaluateAllUnlocks,
  onNewUnlockCelebration,
  UnlockCelebrationItem,
} from '../lib/unlocks';
import { UnlockCelebrationModal } from '../components/unlocks/UnlockCelebrationModal';

const ALLOWED_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateRandomCode(): string {
  let res = '';
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * ALLOWED_CODE_CHARS.length);
    res += ALLOWED_CODE_CHARS[idx];
  }
  return res;
}

export const LobbyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  useEffect(() => {
    document.title = 'Front Desk · Pixel Library';
  }, []);

  const [weeklyGoalsDone, setWeeklyGoalsDone] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    getWeeklyGoalsDoneCount(user.uid)
      .then((count) => setWeeklyGoalsDone(count))
      .catch((err) => console.error('Failed to load weekly goals:', err));
  }, [user]);

  // Create Room state
  const defaultRoomName = useMemo(() => {
    return profile?.username ? `${profile.username}'s table` : "Reader's table";
  }, [profile?.username]);

  const [createName, setCreateName] = useState(defaultRoomName);
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('classic');
  const [focusMinutes, setFocusMinutes] = useState<number>(25);
  const [breakMinutes, setBreakMinutes] = useState<number>(5);
  const [isCustomFocus, setIsCustomFocus] = useState<boolean>(false);
  const [isCustomBreak, setIsCustomBreak] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdRoomInfo, setCreatedRoomInfo] = useState<{
    code: string;
    name: string;
    theme: ThemeId;
  } | null>(null);

  // Unlock celebration state
  const [celebrationItem, setCelebrationItem] = useState<UnlockCelebrationItem | null>(null);

  useEffect(() => {
    if (!user || !profile) return;
    const items = checkForNewUnlocks(profile);
    if (items.length > 0) {
      setCelebrationItem(items[0]);
    }
  }, [user, profile]);

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

  const themeCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const themeList = getThemeList();

  const handleThemeKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      for (let step = 1; step < themeList.length; step++) {
        const nextIdx = (index + step) % themeList.length;
        const prog = getThemeUnlockProgress(themeList[nextIdx].id, profile?.stats);
        if (prog.isUnlocked) {
          setSelectedTheme(themeList[nextIdx].id);
          themeCardRefs.current[nextIdx]?.focus();
          themeCardRefs.current[nextIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          break;
        }
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      for (let step = 1; step < themeList.length; step++) {
        const prevIdx = (index - step + themeList.length) % themeList.length;
        const prog = getThemeUnlockProgress(themeList[prevIdx].id, profile?.stats);
        if (prog.isUnlocked) {
          setSelectedTheme(themeList[prevIdx].id);
          themeCardRefs.current[prevIdx]?.focus();
          themeCardRefs.current[prevIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          break;
        }
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const prog = getThemeUnlockProgress(themeList[index].id, profile?.stats);
      if (prog.isUnlocked) {
        setSelectedTheme(themeList[index].id);
      }
    }
  };

  // Join Room state
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const handleRender = useCallback((ctx: CanvasRenderingContext2D, timeMs: number) => {
    renderLandingScene(ctx, timeMs);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // CREATE ROOM HANDLER
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isCreating) return;

    setIsCreating(true);
    const finalName = createName.trim() || defaultRoomName;

    try {
      // Find an unused room code
      let code = generateRandomCode();
      let attempts = 0;
      while (attempts < 6) {
        const checkSnap = await getDoc(doc(db, 'rooms', code));
        if (!checkSnap.exists()) {
          break;
        }
        code = generateRandomCode();
        attempts++;
      }

      // 1. Create room document in Firestore
      await setDoc(doc(db, 'rooms', code), {
        code,
        name: finalName,
        ownerUid: user.uid,
        createdAt: serverTimestamp(),
        focusMinutes,
        breakMinutes,
        theme: selectedTheme,
      });

      // 2. Record recent room visit for current user
      await setDoc(doc(db, 'users', user.uid, 'recentRooms', code), {
        code,
        name: finalName,
        theme: selectedTheme,
        lastVisited: serverTimestamp(),
      });

      // 3. Open share modal
      setCreatedRoomInfo({ code, name: finalName, theme: selectedTheme });
    } catch (err: unknown) {
      console.error('Failed to create room:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // JOIN ROOM HANDLER
  const handleJoinRoom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || isJoining) return;

    setJoinError(null);
    const cleanCode = joinCode.trim().toUpperCase();

    if (cleanCode.length !== 6) {
      setJoinError('Please enter a 6-character room code.');
      return;
    }

    setIsJoining(true);

    try {
      const roomSnap = await getDoc(doc(db, 'rooms', cleanCode));
      if (!roomSnap.exists()) {
        setJoinError('No room with that code');
        setIsJoining(false);
        return;
      }

      const roomData = roomSnap.data();
      const roomName = roomData.name || `${cleanCode} Room`;

      // Record in recentRooms
      await setDoc(doc(db, 'users', user.uid, 'recentRooms', cleanCode), {
        code: cleanCode,
        name: roomName,
        lastVisited: serverTimestamp(),
      });

      // Navigate to room
      navigate(`/room/${cleanCode}`);
    } catch (err: unknown) {
      console.error('Failed to check room code:', err);
      setJoinError('Connection error. Please try again.');
      setIsJoining(false);
    }
  };

  const hoursFocused = Math.floor((profile?.stats?.minutesFocused ?? 0) / 60);

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflowX: 'hidden',
        overflowY: 'auto',
        backgroundColor: '#1b1423',
      }}
    >
      {/* Living Pixel Library Canvas Background */}
      <PixelCanvas onRender={handleRender} />

      {/* Main Front Desk UI Container */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '960px',
          padding: '20px 16px',
          boxSizing: 'border-box',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* HEADER PANEL: FRONT DESK & BORROWER PASS */}
        <div
          className="pixel-panel"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '16px 20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.9)',
          }}
        >
          {/* User Avatar + Welcome Greeting */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                position: 'relative',
                width: '36px',
                height: '32px',
                backgroundImage:
                  "url('/pixel-library-assets/sprites/avatars/avatar_heads.png')",
                backgroundPosition: `-${(profile?.presetIndex ?? 0) * 36}px 0px`,
                backgroundSize: '288px 32px',
                imageRendering: 'pixelated',
                border: '2px solid #1b1423',
                backgroundColor: '#241a2e',
              }}
            >
              {profile?.accessory && getAccessoryRow(profile.accessory) >= 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '36px',
                    height: '32px',
                    backgroundImage: "url('/pixel-library-themes/unlockables/accessories_sheet.png')",
                    backgroundPosition: `-${0 * 36}px -${getAccessoryRow(profile.accessory) * 44}px`,
                    backgroundSize: '288px 308px',
                    imageRendering: 'pixelated',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </div>
            <div>
              <div className="px-30" style={{ color: '#1b1423' }}>
                Welcome back, {profile?.username || 'reader'}
              </div>
              <div className="px-10" style={{ color: '#5c3a26', letterSpacing: '0.5px' }}>
                LIBRARY FRONT DESK • BORROWER PASS ACTIVE
              </div>
            </div>
          </div>

          {/* Stats Chips */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {/* Tomato / Pomodoro chip */}
            <div
              className="px-10"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#f6edc8',
                border: '2px solid #1b1423',
                padding: '4px 8px',
                color: '#1b1423',
              }}
            >
              <img
                src="/pixel-library-assets/icons/tomato.png"
                alt=""
                width="14"
                height="14"
                style={{ imageRendering: 'pixelated' }}
              />
              <span>{profile?.stats?.pomodoros ?? 0} Pomodoros</span>
            </div>

            {/* Clock / Hours chip */}
            <div
              className="px-10"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#f6edc8',
                border: '2px solid #1b1423',
                padding: '4px 8px',
                color: '#1b1423',
              }}
            >
              <img
                src="/pixel-library-assets/icons/clock.png"
                alt=""
                width="14"
                height="14"
                style={{ imageRendering: 'pixelated' }}
              />
              <span>{hoursFocused}h focused</span>
            </div>

            {/* Fire / Streak chip */}
            <div
              className="px-10"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#f6edc8',
                border: '2px solid #1b1423',
                padding: '4px 8px',
                color: '#1b1423',
              }}
            >
              <img
                src="/pixel-library-assets/icons/fire.png"
                alt=""
                width="14"
                height="14"
                style={{ imageRendering: 'pixelated' }}
              />
              <span>{profile?.stats?.streakDays ?? 0} day streak</span>
            </div>

            {/* Goals done this week chip */}
            <div
              className="px-10"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#f6edc8',
                border: '2px solid #1b1423',
                padding: '4px 8px',
                color: '#1b1423',
              }}
            >
              <img
                src="/pixel-library-assets/icons/check.png"
                alt=""
                width="14"
                height="14"
                style={{ imageRendering: 'pixelated' }}
              />
              <span>Goals done: {weeklyGoalsDone}</span>
            </div>
          </div>

          {/* User Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link
              to="/setup"
              className="pixel-btn pixel-btn-secondary"
              style={{
                fontSize: '10px',
                minHeight: '38px',
                padding: '0 12px',
              }}
            >
              Edit card
            </Link>
            <button
              onClick={handleSignOut}
              className="pixel-btn pixel-btn-danger"
              style={{
                fontSize: '10px',
                minHeight: '38px',
                padding: '0 12px',
              }}
            >
              Sign out
            </button>
          </div>

          {/* BADGES SHELF ON LIBRARY CARD */}
          <div style={{ width: '100%', marginTop: '4px' }}>
            <BadgesShelf stats={profile?.stats} userBadges={profile?.badges} />
          </div>
        </div>

        {/* STUDY MAP HEATMAP PANEL */}
        <StudyMapCard />

        {/* TWO-COLUMN GRID ON DESKTOP, ONE-COLUMN ON PHONES */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '16px',
            alignItems: 'start',
          }}
        >
          {/* COLUMN 1: CREATE A ROOM PANEL */}
          <div
            className="pixel-panel"
            style={{
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.9)',
            }}
          >
            <div className="px-30" style={{ color: '#1b1423' }}>
              CREATE A ROOM
            </div>

            <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Room Name Input */}
              <div>
                <label
                  htmlFor="room-name-input"
                  className="px-10"
                  style={{ color: '#5c3a26', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}
                >
                  TABLE NAME (MAX 24 CHARS):
                </label>
                <input
                  id="room-name-input"
                  type="text"
                  maxLength={24}
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder={defaultRoomName}
                  style={{
                    width: '100%',
                    fontFamily: 'Quietpage, monospace',
                    fontSize: '20px',
                    padding: '8px 12px',
                    backgroundColor: '#f6edc8',
                    color: '#1b1423',
                    border: '3px solid #1b1423',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Choose Your Library Picker */}
              <div>
                <label
                  className="px-10"
                  style={{
                    color: '#5c3a26',
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 'bold',
                  }}
                >
                  CHOOSE YOUR LIBRARY:
                </label>
                <div
                  role="radiogroup"
                  aria-label="Choose your library"
                  style={{
                    display: 'flex',
                    gap: '10px',
                    overflowX: 'auto',
                    scrollSnapType: 'x mandatory',
                    padding: '4px 2px 8px 2px',
                    scrollbarWidth: 'thin',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  {themeList.map((t, idx) => {
                    const isSelected = selectedTheme === t.id;
                    const progress = getThemeUnlockProgress(t.id, profile?.stats);
                    const isLocked = !progress.isUnlocked;

                    return (
                      <div
                        key={t.id}
                        ref={(el) => {
                          themeCardRefs.current[idx] = el;
                        }}
                        role="radio"
                        aria-checked={isSelected}
                        aria-disabled={isLocked}
                        tabIndex={isLocked ? -1 : 0}
                        onClick={() => {
                          if (!isLocked) {
                            setSelectedTheme(t.id);
                          }
                        }}
                        onKeyDown={(e) => handleThemeKeyDown(e, idx)}
                        style={{
                          flex: '0 0 135px',
                          scrollSnapAlign: 'start',
                          backgroundColor: '#241a2e',
                          border: isSelected ? '3px solid #d9463b' : '3px solid #1b1423',
                          boxShadow: isSelected
                            ? '0 0 0 2px #d9463b, inset 0 0 0 1px #d9463b'
                            : 'none',
                          cursor: isLocked ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          outline: 'none',
                          userSelect: 'none',
                          boxSizing: 'border-box',
                          overflow: 'hidden',
                          position: 'relative',
                          transition: 'border-color 0.1s',
                        }}
                      >
                        <div style={{ position: 'relative', width: '100%', height: '70px', overflow: 'hidden' }}>
                          <img
                            src={`/pixel-library-themes/themes/${t.id}/preview_night@4x.png`}
                            alt={t.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              imageRendering: 'pixelated',
                              display: 'block',
                              filter: isLocked ? 'brightness(0.4)' : 'none',
                            }}
                          />
                          {isLocked && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                width: '18px',
                                height: '18px',
                                backgroundColor: 'rgba(27, 20, 35, 0.85)',
                                border: '1px solid #d9463b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <img
                                src="/pixel-library-themes/badges/lock.png"
                                alt="Locked"
                                width="12"
                                height="14"
                                style={{ imageRendering: 'pixelated' }}
                              />
                            </div>
                          )}
                        </div>
                        {/* Coloured accent bar from themes.json */}
                        <div
                          style={{
                            height: '4px',
                            width: '100%',
                            backgroundColor: isLocked ? '#5c3a26' : t.accent,
                          }}
                        />
                        {/* Theme Name in Quietpage */}
                        <div
                          className="px-10"
                          style={{
                            padding: '4px 4px',
                            textAlign: 'center',
                            color: isSelected ? '#1b1423' : '#f1e3c4',
                            backgroundColor: isSelected ? '#ffe2a0' : '#1b1423',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '10px',
                          }}
                        >
                          {t.name}
                        </div>
                        {/* If locked, requirement label + mini progress bar */}
                        {isLocked && (
                          <div
                            style={{
                              padding: '3px 4px 5px 4px',
                              backgroundColor: '#150f1c',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                          >
                            <span
                              className="px-10"
                              style={{
                                color: '#b9a98a',
                                fontSize: '8px',
                                textAlign: 'center',
                                lineHeight: '10px',
                              }}
                            >
                              {progress.label}
                            </span>
                            <div
                              style={{
                                position: 'relative',
                                width: '64px',
                                height: '8px',
                                imageRendering: 'pixelated',
                                overflow: 'hidden',
                                border: '1px solid #3a2419',
                                backgroundColor: '#1b1423',
                              }}
                            >
                              <img
                                src="/pixel-library-assets/ui/progress_empty.png"
                                alt=""
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '64px',
                                  height: '8px',
                                  imageRendering: 'pixelated',
                                }}
                              />
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: `${Math.round((progress.percent / 100) * 64)}px`,
                                  height: '8px',
                                  overflow: 'hidden',
                                }}
                              >
                                <img
                                  src="/pixel-library-assets/ui/progress_full.png"
                                  alt=""
                                  style={{
                                    width: '64px',
                                    height: '8px',
                                    imageRendering: 'pixelated',
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Focus Length Options */}
              <div>
                <span className="px-10" style={{ color: '#5c3a26', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                  FOCUS LENGTH:
                </span>
                <div style={{ display: 'flex', gap: '8px', marginBottom: isCustomFocus ? '8px' : '0' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setFocusMinutes(25);
                      setIsCustomFocus(false);
                    }}
                    style={{
                      flex: 1,
                      fontFamily: 'Quietpage, monospace',
                      fontSize: '20px',
                      height: '42px',
                      backgroundColor: !isCustomFocus && focusMinutes === 25 ? '#4fa36a' : '#f6edc8',
                      color: '#1b1423',
                      border: '3px solid #1b1423',
                      boxShadow: !isCustomFocus && focusMinutes === 25 ? 'inset 0 -4px #2f7a4f' : 'none',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    25 min
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFocusMinutes(50);
                      setIsCustomFocus(false);
                    }}
                    style={{
                      flex: 1,
                      fontFamily: 'Quietpage, monospace',
                      fontSize: '20px',
                      height: '42px',
                      backgroundColor: !isCustomFocus && focusMinutes === 50 ? '#4fa36a' : '#f6edc8',
                      color: '#1b1423',
                      border: '3px solid #1b1423',
                      boxShadow: !isCustomFocus && focusMinutes === 50 ? 'inset 0 -4px #2f7a4f' : 'none',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    50 min
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomFocus(true)}
                    style={{
                      flex: 1,
                      fontFamily: 'Quietpage, monospace',
                      fontSize: '20px',
                      height: '42px',
                      backgroundColor: isCustomFocus ? '#4fa36a' : '#f6edc8',
                      color: '#1b1423',
                      border: '3px solid #1b1423',
                      boxShadow: isCustomFocus ? 'inset 0 -4px #2f7a4f' : 'none',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    Custom
                  </button>
                </div>
                {isCustomFocus && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
                    <PixelStepper
                      value={focusMinutes}
                      min={1}
                      max={120}
                      onChange={setFocusMinutes}
                      unit="min"
                    />
                  </div>
                )}
              </div>

              {/* Break Length Options */}
              <div>
                <span className="px-10" style={{ color: '#5c3a26', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>
                  BREAK LENGTH:
                </span>
                <div style={{ display: 'flex', gap: '8px', marginBottom: isCustomBreak ? '8px' : '0' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setBreakMinutes(5);
                      setIsCustomBreak(false);
                    }}
                    style={{
                      flex: 1,
                      fontFamily: 'Quietpage, monospace',
                      fontSize: '20px',
                      height: '42px',
                      backgroundColor: !isCustomBreak && breakMinutes === 5 ? '#e0a84a' : '#f6edc8',
                      color: '#1b1423',
                      border: '3px solid #1b1423',
                      boxShadow: !isCustomBreak && breakMinutes === 5 ? 'inset 0 -4px #b07a2c' : 'none',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    5 min
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBreakMinutes(10);
                      setIsCustomBreak(false);
                    }}
                    style={{
                      flex: 1,
                      fontFamily: 'Quietpage, monospace',
                      fontSize: '20px',
                      height: '42px',
                      backgroundColor: !isCustomBreak && breakMinutes === 10 ? '#e0a84a' : '#f6edc8',
                      color: '#1b1423',
                      border: '3px solid #1b1423',
                      boxShadow: !isCustomBreak && breakMinutes === 10 ? 'inset 0 -4px #b07a2c' : 'none',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    10 min
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomBreak(true)}
                    style={{
                      flex: 1,
                      fontFamily: 'Quietpage, monospace',
                      fontSize: '20px',
                      height: '42px',
                      backgroundColor: isCustomBreak ? '#e0a84a' : '#f6edc8',
                      color: '#1b1423',
                      border: '3px solid #1b1423',
                      boxShadow: isCustomBreak ? 'inset 0 -4px #b07a2c' : 'none',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    Custom
                  </button>
                </div>
                {isCustomBreak && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
                    <PixelStepper
                      value={breakMinutes}
                      min={1}
                      max={30}
                      onChange={setBreakMinutes}
                      unit="min"
                    />
                  </div>
                )}
              </div>

              {/* Chosen Values Summary */}
              <div
                className="px-10"
                style={{
                  color: '#7a4d31',
                  textAlign: 'center',
                  padding: '4px',
                  backgroundColor: '#eddcb4',
                  border: '1px solid #c2b189',
                }}
              >
                Focus {focusMinutes} min · Break {breakMinutes} min
              </div>

              {/* Create Room Button */}
              <button
                type="submit"
                disabled={isCreating}
                className="pixel-btn pixel-btn-primary"
                style={{
                  width: '100%',
                  fontSize: '20px',
                  gap: '8px',
                  marginTop: '4px',
                }}
              >
                <img
                  src="/pixel-library-assets/icons/plus.png"
                  alt=""
                  width="14"
                  height="14"
                  style={{ imageRendering: 'pixelated' }}
                />
                {isCreating ? 'CREATING TABLE…' : 'CREATE ROOM'}
              </button>
            </form>
          </div>

          {/* COLUMN 2: JOIN A ROOM + RECENT ROOMS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* JOIN A ROOM PANEL */}
            <div
              className="pixel-panel"
              style={{
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.9)',
              }}
            >
              <div className="px-30" style={{ color: '#1b1423' }}>
                JOIN A ROOM
              </div>

              <div className="px-10" style={{ color: '#5c3a26' }}>
                Enter the 6-character study room code:
              </div>

              {/* 6-Box Pixel Code Input */}
              <RoomCodeInput
                value={joinCode}
                onChange={(val) => {
                  setJoinCode(val);
                  setJoinError(null);
                }}
                onSubmit={handleJoinRoom}
                disabled={isJoining}
              />

              {joinError && (
                <div
                  className="px-10"
                  style={{
                    backgroundColor: '#f4ecd8',
                    border: '2px solid #d9463b',
                    color: '#d9463b',
                    padding: '6px 10px',
                    textAlign: 'center',
                  }}
                >
                  {joinError}
                </div>
              )}

              <button
                onClick={() => handleJoinRoom()}
                disabled={isJoining || joinCode.length !== 6}
                className="pixel-btn pixel-btn-secondary"
                style={{
                  width: '100%',
                  fontSize: '20px',
                  opacity: isJoining || joinCode.length !== 6 ? 0.6 : 1,
                }}
              >
                {isJoining ? 'SEARCHING…' : 'JOIN'}
              </button>
            </div>

            {/* RECENT ROOMS PANEL */}
            <div
              className="pixel-panel"
              style={{
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.9)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div className="px-20" style={{ color: '#1b1423' }}>
                  RECENT STUDY TABLES
                </div>
                <div className="px-10" style={{ color: '#7a4d31' }}>
                  BOOKSHELF
                </div>
              </div>

              {user && <RecentRoomsList uid={user.uid} />}
            </div>
          </div>
        </div>
      </div>

      {/* SHARE SHEET MODAL */}
      {createdRoomInfo && (
        <ShareRoomModal
          code={createdRoomInfo.code}
          roomName={createdRoomInfo.name}
          theme={createdRoomInfo.theme}
          onClose={() => setCreatedRoomInfo(null)}
        />
      )}

      {/* UNLOCK CELEBRATION MODAL */}
      <UnlockCelebrationModal
        isOpen={celebrationItem !== null}
        item={celebrationItem}
        onDismiss={handleDismissCelebration}
      />
    </div>
  );
};
