import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { layout } from '../engine/assets';
import { TableZoomPreview } from '../components/setup/TableZoomPreview';

const PRESETS = layout.presets; // 8 presets: aditya, meera, kabir, zoya, rohan, tara, ishaan, anya

export const SetupPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  useEffect(() => {
    document.title = 'Library Card · Pixel Library';
  }, []);

  const isEditing = Boolean(profile);

  // Form state (pre-populate if editing)
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(() => {
    return profile?.presetIndex ?? 0;
  });

  const [usernameInput, setUsernameInput] = useState<string>(() => {
    return profile?.username ?? '';
  });

  const [debouncedUsername, setDebouncedUsername] = useState<string>(usernameInput);
  const [availabilityStatus, setAvailabilityStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  // Intended return path
  const returnTarget = useMemo(() => {
    return (location.state as { from?: string })?.from || '/lobby';
  }, [location.state]);

  // Username sanitize & live validation
  const sanitizeUsername = (val: string) => {
    return val.toLowerCase().replace(/[^a-z0-9_]/g, '');
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = sanitizeUsername(raw);
    setUsernameInput(sanitized);

    if (sanitized.length > 0 && (sanitized.length < 3 || sanitized.length > 16)) {
      setValidationError('3–16 characters (lowercase a–z, 0–9, _)');
      setAvailabilityStatus('invalid');
    } else {
      setValidationError(null);
    }
  };

  // Debounce username availability check (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(usernameInput);
    }, 400);

    return () => clearTimeout(timer);
  }, [usernameInput]);

  useEffect(() => {
    const checkAvailability = async () => {
      if (!debouncedUsername || debouncedUsername.length < 3 || debouncedUsername.length > 16) {
        setAvailabilityStatus('idle');
        return;
      }

      // If editing and same username as current, it's immediately valid
      if (isEditing && profile && debouncedUsername === profile.username) {
        setAvailabilityStatus('available');
        return;
      }

      setAvailabilityStatus('checking');

      try {
        const usernameRef = doc(db, 'usernames', debouncedUsername);
        const snap = await getDoc(usernameRef);

        if (snap.exists() && (!user || snap.data().uid !== user.uid)) {
          setAvailabilityStatus('taken');
        } else {
          setAvailabilityStatus('available');
        }
      } catch (err: unknown) {
        console.error('Error checking username availability:', err);
        setAvailabilityStatus('idle');
      }
    };

    checkAvailability();
  }, [debouncedUsername, isEditing, profile, user]);

  // Keyboard navigation for avatar picker (Arrow keys)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedPresetIndex((prev) => (prev + 1) % PRESETS.length);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedPresetIndex((prev) => (prev - 1 + PRESETS.length) % PRESETS.length);
    }
  }, []);

  // Form submit handler with Firestore Transaction
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const cleanUsername = sanitizeUsername(usernameInput);
    if (cleanUsername.length < 3 || cleanUsername.length > 16) {
      setValidationError('Username must be 3–16 characters.');
      return;
    }

    if (availabilityStatus === 'taken') {
      setSubmitError('This username is already taken. Please choose another.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const presetName = PRESETS[selectedPresetIndex];

    try {
      await runTransaction(db, async (tx) => {
        const newUsernameRef = doc(db, 'usernames', cleanUsername);
        const userRef = doc(db, 'users', user.uid);

        const newUsernameSnap = await tx.get(newUsernameRef);
        if (newUsernameSnap.exists() && newUsernameSnap.data().uid !== user.uid) {
          throw new Error('USERNAME_TAKEN');
        }

        const userSnap = await tx.get(userRef);

        // If editing and username changed, release the old username document
        if (userSnap.exists()) {
          const oldUsername = userSnap.data().username;
          if (oldUsername && oldUsername !== cleanUsername) {
            const oldUsernameRef = doc(db, 'usernames', oldUsername);
            tx.delete(oldUsernameRef);
          }
        }

        // Claim new username
        tx.set(newUsernameRef, { uid: user.uid });

        // Create or update user profile
        if (userSnap.exists()) {
          tx.update(userRef, {
            username: cleanUsername,
            preset: presetName,
            presetIndex: selectedPresetIndex,
            updatedAt: serverTimestamp(),
          });
        } else {
          tx.set(userRef, {
            uid: user.uid,
            username: cleanUsername,
            preset: presetName,
            presetIndex: selectedPresetIndex,
            displayName: user.displayName || cleanUsername,
            photoURL: user.photoURL || null,
            createdAt: serverTimestamp(),
            stats: {
              pomodoros: 0,
              minutesFocused: 0,
              streakDays: 0,
              lastStudyDate: null,
            },
          });
        }
      });

      // Play "APPROVED" stamp thump animation
      setIsApproved(true);

      // Navigate to return target after stamp animation finishes (~650ms)
      setTimeout(() => {
        navigate(returnTarget, { replace: true });
      }, 700);
    } catch (err: unknown) {
      setIsSubmitting(false);
      console.error('Transaction error saving library card:', err);
      if ((err as Error)?.message === 'USERNAME_TAKEN') {
        setSubmitError(
          'That username was just claimed by another reader. Please try another.'
        );
        setAvailabilityStatus('taken');
      } else {
        setSubmitError('Failed to record library card. Please try again.');
      }
    }
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflowX: 'hidden',
        overflowY: 'auto',
        backgroundColor: '#1b1423',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          maxWidth: '820px',
          width: '100%',
        }}
      >
        {/* LEFT COLUMN: Zoomed Live Table Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <TableZoomPreview
            presetIndex={selectedPresetIndex}
            username={usernameInput || 'reader'}
          />
        </div>

        {/* RIGHT COLUMN: Library Card Panel Form */}
        <div
          className="pixel-panel"
          style={{
            flex: '1 1 360px',
            maxWidth: '460px',
            padding: '20px 24px',
            position: 'relative',
            boxShadow: '0 12px 36px rgba(0,0,0,0.9)',
          }}
        >
          {/* Punched Hole circle on library card */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#1b1423',
              boxShadow: 'inset 1px 1px 0 #000',
            }}
          />

          {/* Library Card Header */}
          <div style={{ textAlign: 'center', marginBottom: '14px', borderBottom: '2px dashed #b9a98a', paddingBottom: '10px' }}>
            <div className="px-30" style={{ color: '#1b1423' }}>
              PIXEL LIBRARY
            </div>
            <div
              className="px-10"
              style={{
                color: '#7a4d31',
                letterSpacing: '1px',
                marginTop: '2px',
                fontWeight: 'bold',
              }}
            >
              READER BORROWER'S CARD
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* AVATAR PICKER */}
            <div>
              <div
                className="px-10"
                style={{
                  color: '#5c3a26',
                  marginBottom: '6px',
                  fontWeight: 'bold',
                  letterSpacing: '0.5px',
                }}
              >
                CHOOSE YOUR READER (ARROW KEYS):
              </div>

              <div
                tabIndex={0}
                onKeyDown={handleKeyDown}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  outline: 'none',
                  backgroundColor: '#241a2e',
                  padding: '8px',
                  border: '2px solid #1b1423',
                }}
              >
                {PRESETS.map((preset, index) => {
                  const isSelected = index === selectedPresetIndex;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSelectedPresetIndex(index)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px 2px',
                        backgroundColor: isSelected ? '#3a2419' : 'transparent',
                        border: isSelected ? '3px solid #d9463b' : '3px solid transparent',
                        cursor: 'pointer',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '32px',
                          backgroundImage:
                            "url('/pixel-library-assets/sprites/avatars/avatar_heads.png')",
                          backgroundPosition: `-${index * 36}px 0px`,
                          backgroundSize: '288px 32px',
                          imageRendering: 'pixelated',
                        }}
                      />
                      <span
                        className="px-10"
                        style={{
                          color: isSelected ? '#ffe2a0' : '#b9a98a',
                          marginTop: '2px',
                          textTransform: 'capitalize',
                        }}
                      >
                        {preset}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* USERNAME INPUT */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}
              >
                <label
                  htmlFor="reader-username"
                  className="px-10"
                  style={{
                    color: '#5c3a26',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px',
                  }}
                >
                  READER HANDLE:
                </label>

                {/* Live Availability Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {availabilityStatus === 'checking' && (
                    <span className="px-10" style={{ color: '#b9a98a' }}>
                      checking…
                    </span>
                  )}
                  {availabilityStatus === 'available' && (
                    <span
                      className="px-10"
                      style={{
                        color: '#2f7a4f',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      <img
                        src="/pixel-library-assets/icons/check.png"
                        alt=""
                        width="12"
                        height="12"
                        style={{ imageRendering: 'pixelated' }}
                      />
                      available
                    </span>
                  )}
                  {availabilityStatus === 'taken' && (
                    <span className="px-10" style={{ color: '#d9463b' }}>
                      taken
                    </span>
                  )}
                </div>
              </div>

              <input
                id="reader-username"
                type="text"
                value={usernameInput}
                onChange={handleUsernameChange}
                maxLength={16}
                placeholder="e.g. aditya_reader"
                style={{
                  width: '100%',
                  fontFamily: 'Quietpage, monospace',
                  fontSize: '20px',
                  lineHeight: '1.2',
                  padding: '8px 12px',
                  backgroundColor: '#f6edc8',
                  color: '#1b1423',
                  border: '3px solid #1b1423',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />

              {validationError && (
                <div className="px-10" style={{ color: '#d9463b', marginTop: '4px' }}>
                  {validationError}
                </div>
              )}
            </div>

            {/* Submission Error Banner */}
            {submitError && (
              <div
                style={{
                  backgroundColor: '#f4ecd8',
                  border: '2px solid #d9463b',
                  color: '#d9463b',
                  padding: '6px 10px',
                  fontSize: '10px',
                }}
              >
                {submitError}
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isSubmitting || availabilityStatus === 'taken' || !usernameInput}
              className="pixel-btn pixel-btn-primary"
              style={{
                width: '100%',
                fontSize: '20px',
                marginTop: '6px',
                opacity: isSubmitting || availabilityStatus === 'taken' || !usernameInput ? 0.6 : 1,
              }}
            >
              {isSubmitting ? 'ISSUING CARD…' : isEditing ? 'UPDATE CARD' : 'GET MY CARD'}
            </button>
          </form>

          {/* APPROVED STAMP ANIMATION */}
          {isApproved && (
            <div
              style={{
                position: 'absolute',
                top: '40%',
                left: '25%',
                border: '4px solid #d9463b',
                color: '#d9463b',
                padding: '6px 18px',
                fontFamily: 'Quietpage, monospace',
                fontSize: '30px',
                letterSpacing: '3px',
                backgroundColor: 'rgba(244, 236, 216, 0.9)',
                boxShadow: '0 0 0 2px #d9463b',
                userSelect: 'none',
                pointerEvents: 'none',
                animation: 'stamp-thump 0.25s steps(2) forwards',
                zIndex: 50,
              }}
            >
              APPROVED
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
