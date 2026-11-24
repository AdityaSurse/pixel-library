import React, { useRef, useEffect, useCallback } from 'react';
import { getImage } from '../../engine/assets';
import { drawAvatar, drawBubbleHeart } from '../../engine/sprites';
import { drawAtlasNameTag } from '../../engine/atlasText';

interface TableZoomPreviewProps {
  presetIndex: number;
  username: string;
}

const NATIVE_W = 120;
const NATIVE_H = 100;

export const TableZoomPreview: React.FC<TableZoomPreviewProps> = ({
  presetIndex,
  username,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastPresetRef = useRef<number>(presetIndex);
  const heartTriggerTimeRef = useRef<number>(0);

  // Trigger heart bubble pop on avatar preset change
  useEffect(() => {
    if (lastPresetRef.current !== presetIndex) {
      lastPresetRef.current = presetIndex;
      heartTriggerTimeRef.current = performance.now();
    }
  }, [presetIndex]);

  const renderLoop = useCallback(
    (timeMs: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = false;

      try {
        const bg = getImage('bg');
        const light = getImage('light');

        // Zoom view on Table 0:
        // Table 0 in library_bg is at x: 34, y: 88.
        // We offset by sx = -10, sy = -50
        const offsetX = -10;
        const offsetY = -50;

        // 1. Background
        ctx.drawImage(bg, offsetX, offsetY);

        // 2. Avatar sitting at Table 0 far seat (seat t0s0: x = 38, y = 71)
        // Zoom coordinate: x = 38 + offsetX = 28, y = 71 + offsetY = 21
        const avatarX = 28;
        const avatarY = 21;

        // Front break animation frames: 2 and 3 (2 fps = 500ms per frame)
        const breakFrame = 2 + Math.floor((timeMs / 500) % 2);
        drawAvatar(ctx, presetIndex, breakFrame, avatarX, avatarY);

        // 3. Heart Bubble Reaction when preset changes
        const heartElapsed = timeMs - heartTriggerTimeRef.current;
        if (heartElapsed < 800) {
          // 2-frame bounce thump
          const bounce = heartElapsed < 250 ? Math.sin((heartElapsed / 250) * Math.PI) * 4 : 0;
          drawBubbleHeart(ctx, avatarX + 1, avatarY - 20 - bounce);
        }

        // 4. Lighting Overlay
        ctx.globalAlpha = 0.9;
        ctx.drawImage(light, offsetX, offsetY);
        ctx.globalAlpha = 1.0;

        // 5. Name Tag above avatar head using quietpage bitmap atlas
        // Pill is placed at topY: avatarY - 14 (or avatarY - 12)
        drawAtlasNameTag(ctx, username, avatarX + 9, avatarY - 14);
      } catch {
        // Assets still loading
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    },
    [presetIndex, username]
  );

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [renderLoop]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1b1423',
        border: '4px solid #3a2419',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.85)',
        padding: '8px',
        boxSizing: 'border-box',
      }}
    >
      <canvas
        ref={canvasRef}
        width={NATIVE_W}
        height={NATIVE_H}
        style={{
          width: `${NATIVE_W * 2}px`,
          height: `${NATIVE_H * 2}px`,
          imageRendering: 'pixelated',
          display: 'block',
        }}
      />
      <div
        className="px-10"
        style={{
          color: '#b9a98a',
          marginTop: '6px',
          letterSpacing: '0.5px',
        }}
      >
        Table 1 (Reserved Seat)
      </div>
    </div>
  );
};
