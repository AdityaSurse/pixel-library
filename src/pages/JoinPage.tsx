import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signInWithPopup, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { PixelCanvas } from '../engine/PixelCanvas';
import { renderLandingScene } from '../components/landing/renderLandingScene';

export const JoinPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading: authLoading } = useAuth();

  useEffect(() => {
    document.title = 'Sign In · Pixel Library';
  }, []);

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  // Retrieve intended return target
  const intendedUrl = useMemo(() => {
    return (location.state as { from?: string })?.from || '/lobby';
  }, [location.state]);

  // Handle post-sign-in routing
  const handleUserSignedIn = useCallback(
    async (signedInUser: User) => {
      try {
        setIsSigningIn(true);
        const userDocRef = doc(db, 'users', signedInUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          // Existing profile -> Go to intended room or lobby
          navigate(intendedUrl, { replace: true });
        } else {
          // New reader -> Go to setup
          navigate('/setup', { state: { from: intendedUrl }, replace: true });
        }
      } catch (err: unknown) {
        console.error('Error verifying user profile in Firestore:', err);
        // Fallback to setup if profile lookup errored
        navigate('/setup', { state: { from: intendedUrl }, replace: true });
      } finally {
        setIsSigningIn(false);
      }
    },
    [navigate, intendedUrl]
  );

  // If already logged in, route immediately
  useEffect(() => {
    if (!authLoading && user) {
      if (profile) {
        navigate(intendedUrl, { replace: true });
      } else {
        navigate('/setup', { state: { from: intendedUrl }, replace: true });
      }
    }
  }, [authLoading, user, profile, navigate, intendedUrl]);

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsSigningIn(true);

    try {
      const cred = await signInWithPopup(auth, googleProvider);
      if (cred && cred.user) {
        await handleUserSignedIn(cred.user);
      }
    } catch (err: unknown) {
      setIsSigningIn(false);
      console.error('Sign-in error:', err);
      const errCode = (err as { code?: string })?.code;

      if (
        errCode === 'auth/popup-blocked' ||
        errCode === 'auth/cancelled-popup-request'
      ) {
        setErrorMessage(
          'Popup was blocked by your browser. Please allow popups for this site and try again.'
        );
      } else if (errCode === 'auth/popup-closed-by-user') {
        // User voluntarily dismissed popup
        setErrorMessage(null);
      } else if (errCode === 'auth/network-request-failed') {
        setErrorMessage(
          'Network connection interrupted. Please check your internet connection and try again.'
        );
      } else {
        setErrorMessage(
          'Unable to sign in right now. Please try again or check your browser popup settings.'
        );
      }
    }
  };

  const handleCancel = () => {
    setIsSigningIn(false);
    setErrorMessage(null);
  };

  const handleRender = useCallback((ctx: CanvasRenderingContext2D, timeMs: number) => {
    renderLandingScene(ctx, timeMs);
  }, []);

  const borderWidth = Math.max(8, 8 * scale);

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
      {/* Living Pixel Library Canvas Background */}
      <PixelCanvas onRender={handleRender} onScaleChange={setScale} />

      {/* Floating Card Desk Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 20,
          pointerEvents: 'none',
          width: '100%',
          maxWidth: '560px',
          padding: '24px 16px',
          boxSizing: 'border-box',
        }}
      >
        {/* Signboard Header: "LIBRARY CARD DESK" */}
        <div
          style={{
            pointerEvents: 'auto',
            border: `${borderWidth}px solid transparent`,
            borderImage: `url('/pixel-library-assets/ui/panel_9slice.png') 8 fill / ${borderWidth}px`,
            imageRendering: 'pixelated',
            boxShadow: '0 12px 32px rgba(27, 20, 35, 0.95)',
            padding: '10px 24px',
            textAlign: 'center',
            marginBottom: '16px',
            userSelect: 'none',
          }}
        >
          <div
            className="px-30"
            style={{
              color: '#1b1423',
              textShadow: '1px 1px 0 #d9c69e',
              letterSpacing: '1px',
            }}
          >
            LIBRARY CARD DESK
          </div>
        </div>

        {/* The Card Desk Panel */}
        <div
          className="pixel-panel"
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '14px',
            padding: '18px 24px',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.9)',
          }}
        >
          {/* Section Prompt */}
          <div className="px-20" style={{ color: '#1b1423' }}>
            Sign in to take a seat
          </div>

          <div
            className="px-10"
            style={{
              color: '#5c3a26',
              maxWidth: '320px',
              lineHeight: '1.3',
            }}
          >
            A library card saves your custom reader avatar, tracks Pomodoro
            focus streaks, and lets you join study tables with friends.
          </div>

          {/* Friendly Error Speech Bubble */}
          {errorMessage && (
            <div
              style={{
                backgroundColor: '#f4ecd8', // cream fill
                border: '3px solid #1b1423',
                color: '#d9463b', // palette red
                padding: '8px 12px',
                textAlign: 'center',
                boxShadow: '2px 2px 0 #1b1423',
                fontSize: '10px',
                lineHeight: 1.3,
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                Note from the Desk:
              </div>
              {errorMessage}
            </div>
          )}

          {/* Action Area */}
          {!isSigningIn ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <button
                onClick={handleGoogleSignIn}
                className="pixel-btn pixel-btn-primary"
                style={{
                  width: '100%',
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <img
                  src="/pixel-library-assets/icons/user.png"
                  alt=""
                  width="14"
                  height="14"
                  style={{ imageRendering: 'pixelated' }}
                />
                SIGN IN WITH GOOGLE
              </button>

              <Link
                to="/"
                className="px-10"
                style={{
                  color: '#7a4d31',
                  textDecoration: 'none',
                  marginTop: '4px',
                }}
              >
                ← Return to Entrance
              </Link>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
              }}
            >
              <div className="px-20" style={{ color: '#1b1423' }}>
                Checking your library card…
              </div>

              {/* Progress animation */}
              <div
                style={{
                  width: '192px',
                  height: '16px',
                  position: 'relative',
                  imageRendering: 'pixelated',
                }}
              >
                <img
                  src="/pixel-library-assets/ui/progress_empty.png"
                  alt=""
                  width="192"
                  height="16"
                  style={{ position: 'absolute', top: 0, left: 0 }}
                />
                <img
                  src="/pixel-library-assets/ui/progress_full.png"
                  alt=""
                  width="192"
                  height="16"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    animation: 'pulse 1.2s infinite steps(4)',
                  }}
                />
              </div>

              <button
                onClick={handleCancel}
                className="pixel-btn pixel-btn-secondary"
                style={{ fontSize: '10px', minHeight: '36px', padding: '0 16px', marginTop: '6px' }}
              >
                CANCEL
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
