import React, { useEffect, useRef } from 'react';

const PALETTE_CONFETTI_COLORS = [
  '#ffe2a0', // gold
  '#d9463b', // red / tomato
  '#4fa36a', // green
  '#f1e3c4', // parchment
  '#e0a84a', // amber
  '#8e3a45', // deep rose
  '#5c3a26', // warm wood
];

interface Particle {
  angle: number;
  speed: number;
  color: string;
  size: number;
  spin: number;
}

// Generate static deterministic particles so all 6 frames are crisp and reproducible
const PARTICLES: Particle[] = Array.from({ length: 42 }).map((_, i) => ({
  angle: (i / 42) * Math.PI * 2 + ((i % 5) * 0.2),
  speed: 12 + ((i * 7) % 24),
  color: PALETTE_CONFETTI_COLORS[i % PALETTE_CONFETTI_COLORS.length],
  size: (i % 3 === 0) ? 4 : 3,
  spin: (i % 4),
}));

export const PixelConfettiCanvas: React.FC<{ width?: number; height?: number }> = ({
  width = 220,
  height = 140,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    let frame = 0;
    const totalFrames = 6;
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);

    const interval = setInterval(() => {
      ctx.clearRect(0, 0, width, height);

      // Render the current frame of the 6-frame discrete burst
      // Frames 0 to 5 represent 6 discrete steps of the burst
      PARTICLES.forEach((p) => {
        // Distance expands in 6 discrete stages
        const stageDist = (frame + 1) * p.speed * 0.6;
        const gravity = frame * frame * 1.5; // subtle pixel gravity

        const px = Math.round(centerX + Math.cos(p.angle) * stageDist);
        const py = Math.round(centerY + Math.sin(p.angle) * stageDist * 0.75 + gravity);

        // 6th frame slightly shrinks or drifts
        const pSize = frame === 5 ? Math.max(2, p.size - 1) : p.size;

        ctx.fillStyle = p.color;
        ctx.fillRect(px, py, pSize, pSize);
      });

      frame = (frame + 1) % totalFrames;
    }, 160); // 160ms per frame = 6 distinct steps over ~1 second

    return () => clearInterval(interval);
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        imageRendering: 'pixelated',
        pointerEvents: 'none',
      }}
    />
  );
};
