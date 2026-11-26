import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getDailyQuote } from '../../data/quotes';

interface HangingSignProps {
  scale: number;
  isLoggedIn: boolean;
  isPressed: boolean;
  onJoinClick: () => void;
}

const FULL_TAGLINE = 'Welcome, reader.';
const PIXEL_LETTERS = 'PIXEL'.split('');
const LIBRARY_LETTERS = 'LIBRARY'.split('');

export const HangingSign: React.FC<HangingSignProps> = ({
  scale,
  isLoggedIn,
  isPressed,
  onJoinClick,
}) => {
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const isMobile = windowWidth < 640;
  const dailyQuote = useMemo(() => getDailyQuote(), []);

  // Animation Stage: 'drop' | 'swing' | 'reveal' | 'typing' | 'button'
  const [stage, setStage] = useState<'drop' | 'swing' | 'reveal' | 'typing' | 'button'>(() =>
    prefersReducedMotion ? 'button' : 'drop'
  );

  const [typedChars, setTypedChars] = useState(() =>
    prefersReducedMotion ? FULL_TAGLINE.length : 0
  );

  const [typedQuoteChars, setTypedQuoteChars] = useState(() =>
    prefersReducedMotion ? dailyQuote.length : 0
  );

  const [swayAngle, setSwayAngle] = useState(0);
  const lastMouseX = useRef(0);
  const lastMouseTime = useRef(0);
  const swayTimeout = useRef<number | null>(null);

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse velocity tracking for 1-degree sway
  useEffect(() => {
    if (prefersReducedMotion) return;

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      const dt = now - lastMouseTime.current;
      if (dt > 16 && dt < 200) {
        const dx = e.clientX - lastMouseX.current;
        const speed = Math.abs(dx) / dt; // px per ms
        if (speed > 1.1) {
          const dir = dx > 0 ? 1 : -1;
          setSwayAngle(dir); // 1 degree discrete step
          if (swayTimeout.current) window.clearTimeout(swayTimeout.current);
          swayTimeout.current = window.setTimeout(() => {
            setSwayAngle(0);
          }, 320);
        }
      }
      lastMouseX.current = e.clientX;
      lastMouseTime.current = now;
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (swayTimeout.current) window.clearTimeout(swayTimeout.current);
    };
  }, [prefersReducedMotion]);

  // Entrance animation orchestrator
  useEffect(() => {
    if (prefersReducedMotion) {
      setStage('button');
      setTypedChars(FULL_TAGLINE.length);
      setTypedQuoteChars(dailyQuote.length);
      return;
    }

    // 1. Drop: 0 to 650ms
    const swingTimer = window.setTimeout(() => {
      setStage('swing');
    }, 650);

    // 2. Swing: 650ms to 1950ms
    const revealTimer = window.setTimeout(() => {
      setStage('reveal');
    }, 1950);

    // 3. Typing: starts after title reveal (~3050ms)
    const typingTimer = window.setTimeout(() => {
      setStage('typing');
    }, 3050);

    return () => {
      clearTimeout(swingTimer);
      clearTimeout(revealTimer);
      clearTimeout(typingTimer);
    };
  }, [prefersReducedMotion]);

  // Typing effect: welcome line at 60ms, then daily quote at 40ms
  useEffect(() => {
    if (stage !== 'typing') return;

    let current = 0;
    let quoteCurrent = 0;
    let quoteInterval: number | null = null;

    const interval = window.setInterval(() => {
      current += 1;
      setTypedChars(current);
      if (current >= FULL_TAGLINE.length) {
        window.clearInterval(interval);
        // Start typing daily quote after a brief pause
        window.setTimeout(() => {
          quoteInterval = window.setInterval(() => {
            quoteCurrent += 1;
            setTypedQuoteChars(quoteCurrent);
            if (quoteCurrent >= dailyQuote.length) {
              if (quoteInterval) window.clearInterval(quoteInterval);
              // Stage 5: Button pop-in
              window.setTimeout(() => {
                setStage('button');
              }, 150);
            }
          }, 40);
        }, 120);
      }
    }, 60);

    return () => {
      window.clearInterval(interval);
      if (quoteInterval) window.clearInterval(quoteInterval);
    };
  }, [stage, dailyQuote.length]);

  // Dimensions
  const borderWidth = Math.max(8, isMobile ? 8 : 8 * scale);
  const titleSize = isMobile ? 40 : 60;
  const chainHeight = isMobile ? 24 : Math.max(48, 16 * scale);

  // Chains links calculation
  const linkPairHeight = 10;
  const numLinks = Math.max(2, Math.floor((chainHeight - 12) / linkPairHeight) * 2);

  const renderChain = (leftPercent: number) => {
    const links = [];
    for (let i = 0; i < numLinks; i++) {
      const isEven = i % 2 === 0;
      links.push(
        <div
          key={i}
          style={{
            width: isEven ? '10px' : '6px',
            height: isEven ? '8px' : '6px',
            margin: '0 auto',
            backgroundColor: isEven ? '#d4a24c' : '#9a6f2e', // brass / brass_dk
            border: '2px solid #1b1423',
            boxSizing: 'border-box',
            boxShadow: isEven ? 'inset 1px 1px 0 #f0c873, inset -1px -1px 0 #9a6f2e' : undefined,
          }}
        />
      );
    }

    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: `${leftPercent}%`,
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          height: `${chainHeight}px`,
          justifyContent: 'space-between',
          zIndex: 5,
        }}
      >
        {/* Ceiling Mount Bracket */}
        <div
          style={{
            width: '18px',
            height: '6px',
            backgroundColor: '#3a2419',
            border: '2px solid #1b1423',
            boxSizing: 'border-box',
          }}
        />
        {/* Alternating Chain Links */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {links}
        </div>
        {/* Eyebolt Hook attaching directly to sign border */}
        <div
          style={{
            width: '12px',
            height: '8px',
            backgroundColor: '#d4a24c',
            border: '2px solid #1b1423',
            boxSizing: 'border-box',
            marginBottom: '-4px',
            position: 'relative',
            zIndex: 10,
          }}
        />
      </div>
    );
  };

  // Determine container animation
  let animationStyle = '';
  let transformStyle = `rotate(${swayAngle}deg)`;

  if (!prefersReducedMotion) {
    if (stage === 'drop') {
      animationStyle = 'sign-drop 0.65s steps(14) forwards';
    } else if (stage === 'swing') {
      animationStyle = 'sign-swing 1.3s steps(14) forwards';
    }
  }

  // Helper to determine letter animation style
  const getLetterStyle = (delayMs: number): React.CSSProperties => {
    if (prefersReducedMotion || stage === 'typing' || stage === 'button') {
      return {
        display: 'inline-block',
        fontFamily: 'Quietpage, monospace',
        fontSize: `${titleSize}px`,
        lineHeight: `${titleSize}px`,
        color: '#1b1423', // palette ink
        textShadow: '1px 1px 0 #d9c69e', // 1px parchment_dk drop shadow
        transform: 'translateY(0%)',
      };
    }

    if (stage === 'reveal') {
      return {
        display: 'inline-block',
        fontFamily: 'Quietpage, monospace',
        fontSize: `${titleSize}px`,
        lineHeight: `${titleSize}px`,
        color: '#1b1423',
        textShadow: '1px 1px 0 #d9c69e',
        animation: `letter-rise 0.24s steps(6) ${delayMs}ms both`,
      };
    }

    // drop or swing: hidden below mask
    return {
      display: 'inline-block',
      fontFamily: 'Quietpage, monospace',
      fontSize: `${titleSize}px`,
      lineHeight: `${titleSize}px`,
      color: '#1b1423',
      textShadow: '1px 1px 0 #d9c69e',
      transform: 'translateY(100%)',
    };
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transformOrigin: '50% 0px',
        animation: animationStyle,
        zIndex: 20,
        pointerEvents: 'none',
      }}
    >
      {/* Hanging Chain Assembly with Sway */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transformOrigin: '50% 0px',
          transform: transformStyle,
          transition: prefersReducedMotion ? 'none' : 'transform 0.15s steps(1)',
        }}
      >
        {/* Left & Right Chains hanging from viewport ceiling */}
        {renderChain(24)}
        {renderChain(76)}

        {/* Space reserved for chains above the sign */}
        <div style={{ height: `${chainHeight}px` }} />

        {/* The Wooden Signboard (9-Slice border image at integer scale) */}
        <div
          className="sign-board"
          style={{
            pointerEvents: 'auto',
            border: `${borderWidth}px solid transparent`,
            borderImage: `url('/pixel-library-assets/ui/panel_9slice.png') 8 fill / ${borderWidth}px`,
            imageRendering: 'pixelated',
            boxShadow: '0 12px 32px rgba(27, 20, 35, 0.95)',
            padding: isMobile ? '6px 10px' : '12px 24px',
            textAlign: 'center',
            width: isMobile ? 'min(300px, 88vw)' : 'auto',
            maxWidth: isMobile ? '300px' : 'min(580px, 90vw)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: isMobile ? '2px' : '8px',
          }}
        >
          {/* Title Row: "PIXEL" & "LIBRARY" */}
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? '0px' : '16px',
              userSelect: 'none',
            }}
          >
            {/* "PIXEL" Word */}
            <div style={{ display: 'inline-flex', height: `${titleSize}px`, overflow: 'hidden' }}>
              {PIXEL_LETTERS.map((char, idx) => (
                <span
                  key={`p-${idx}`}
                  style={{
                    display: 'inline-block',
                    height: `${titleSize}px`,
                    overflow: 'hidden',
                    verticalAlign: 'bottom',
                  }}
                >
                  <span className="letter-char" style={getLetterStyle(idx * 60)}>
                    {char}
                  </span>
                </span>
              ))}
            </div>

            {/* "LIBRARY" Word */}
            <div style={{ display: 'inline-flex', height: `${titleSize}px`, overflow: 'hidden' }}>
              {LIBRARY_LETTERS.map((char, idx) => (
                <span
                  key={`l-${idx}`}
                  style={{
                    display: 'inline-block',
                    height: `${titleSize}px`,
                    overflow: 'hidden',
                    verticalAlign: 'bottom',
                  }}
                >
                  <span className="letter-char" style={getLetterStyle(380 + idx * 60)}>
                    {char}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Tagline: "Welcome, reader." typed in at 20px */}
          <div
            className="px-20"
            style={{
              color: '#3a2419', // palette wood_dark
              minHeight: '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
              marginTop: isMobile ? '2px' : '4px',
            }}
          >
            {stage === 'drop' || stage === 'swing' ? null : (
              <>
                <span>{FULL_TAGLINE.slice(0, typedChars)}</span>
                {typedChars < FULL_TAGLINE.length && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '16px',
                      backgroundColor: '#1b1423',
                      marginLeft: '2px',
                      verticalAlign: 'middle',
                      animation: 'blink-cursor 0.7s steps(1) infinite',
                    }}
                  />
                )}
              </>
            )}
          </div>

          {/* Daily Quote: Quietpage 10px (20px desktop) in palette wd_md (#7a4d31) */}
          {(stage === 'typing' || stage === 'button') && typedChars >= FULL_TAGLINE.length && (
            <div
              className={isMobile ? 'px-10' : 'px-20'}
              style={{
                color: '#7a4d31', // palette wd_md
                minHeight: isMobile ? '16px' : '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
                marginTop: '2px',
                textAlign: 'center',
              }}
            >
              <span>{dailyQuote.slice(0, typedQuoteChars)}</span>
              {stage === 'typing' && typedQuoteChars < dailyQuote.length && (
                <span
                  style={{
                    display: 'inline-block',
                    width: isMobile ? '6px' : '10px',
                    height: isMobile ? '10px' : '16px',
                    backgroundColor: '#7a4d31',
                    marginLeft: '2px',
                    verticalAlign: 'middle',
                    animation: 'blink-cursor 0.7s steps(1) infinite',
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Join Now / Enter Library Button */}
        {(prefersReducedMotion || stage === 'button') && (
          <div
            style={{
              marginTop: isMobile ? '10px' : '18px',
              pointerEvents: 'auto',
              animation: prefersReducedMotion
                ? 'none'
                : 'btn-pop-squash 0.22s steps(2) forwards, btn-pulse 2s steps(2) 0.3s infinite',
            }}
          >
            <button
              onClick={onJoinClick}
              className="pixel-btn pixel-btn-primary"
              style={{
                fontSize: '20px',
                padding: '0 20px',
                height: '46px',
                transform: isPressed ? 'translateY(4px)' : undefined,
                boxShadow: isPressed ? 'none' : undefined,
              }}
            >
              <img
                src="/pixel-library-assets/icons/door.png"
                alt=""
                width="14"
                height="14"
                style={{
                  imageRendering: 'pixelated',
                  marginRight: '8px',
                  display: 'inline-block',
                }}
              />
              {isLoggedIn ? 'ENTER LIBRARY' : 'JOIN NOW'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
