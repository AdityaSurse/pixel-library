import React, { useEffect, useRef } from 'react';

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

interface BayerDitherTransitionProps {
  active: boolean;
  onComplete: () => void;
}

export const BayerDitherTransition: React.FC<BayerDitherTransitionProps> = ({
  active,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!active) return;

    // Check reduced motion
    const prefersReducedMotion =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      onCompleteRef.current();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const width = 320;
    const height = 192;
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    let animId = 0;
    const startTime = performance.now();
    const durationMs = 400; // 400ms duration per specification

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const threshold = Math.floor(progress * 17); // 0 to 16

      // Fill ImageData with Bayer pattern in palette ink (#1b1423 -> [27, 20, 35])
      for (let y = 0; y < height; y++) {
        const rowOffset = y * width * 4;
        const bayerRow = BAYER_4X4[y % 4];
        for (let x = 0; x < width; x++) {
          const idx = rowOffset + x * 4;
          if (bayerRow[x % 4] < threshold) {
            data[idx] = 27; // R (ink)
            data[idx + 1] = 20; // G
            data[idx + 2] = 35; // B
            data[idx + 3] = 255; // A
          } else {
            data[idx + 3] = 0; // Transparent
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      if (elapsed < durationMs) {
        animId = requestAnimationFrame(tick);
      } else {
        // Complete coverage, trigger navigation
        onCompleteRef.current();
      }
    };

    animId = requestAnimationFrame(tick);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={192}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        objectFit: 'cover',
        imageRendering: 'pixelated',
        pointerEvents: 'all',
        zIndex: 9999,
      }}
    />
  );
};
