import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PixelCanvas } from '../engine/PixelCanvas';
import { renderLandingScene } from '../components/landing/renderLandingScene';
import { HangingSign } from '../components/landing/HangingSign';
import { BayerDitherTransition } from '../components/landing/BayerDitherTransition';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [scale, setScale] = useState<number>(1);
  const [isPressed, setIsPressed] = useState<boolean>(false);
  const [isDithering, setIsDithering] = useState<boolean>(false);

  // User status determines target route and button text
  const isLoggedIn = Boolean(profile);
  const destination = isLoggedIn ? '/lobby' : '/join';

  const handleRender = useCallback((ctx: CanvasRenderingContext2D, timeMs: number) => {
    renderLandingScene(ctx, timeMs);
  }, []);

  const handleScaleChange = useCallback((newScale: number) => {
    setScale(newScale);
  }, []);

  const handleJoinClick = useCallback(() => {
    // 1. Play pressed state
    setIsPressed(true);

    const prefersReducedMotion =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      navigate(destination);
      return;
    }

    // 2. Run 4x4 Bayer dither transition over 400ms
    setIsDithering(true);
  }, [navigate, destination]);

  const handleDitherComplete = useCallback(() => {
    navigate(destination);
  }, [navigate, destination]);

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
      <PixelCanvas onRender={handleRender} onScaleChange={handleScaleChange}>
        {/* Wooden Hanging Signboard Hero with Chains */}
        <HangingSign
          scale={scale}
          isLoggedIn={isLoggedIn}
          isPressed={isPressed}
          onJoinClick={handleJoinClick}
        />
      </PixelCanvas>

      {/* Tiny Cozy Library Footer */}
      <div
        className="px-10"
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'var(--dim)',
          letterSpacing: '0.5px',
          userSelect: 'none',
          pointerEvents: 'none',
          zIndex: 30,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        Shhh… someone is studying.
      </div>

      {/* 4x4 Bayer Pattern Pixel Dither Transition */}
      <BayerDitherTransition
        active={isDithering}
        onComplete={handleDitherComplete}
      />
    </div>
  );
};
