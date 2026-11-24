import React, { useEffect, useRef, useState, useCallback } from 'react';

export const NATIVE_WIDTH = 320;
export const NATIVE_HEIGHT = 192;

export interface NativePointerCoords {
  x: number;
  y: number;
}

export interface PixelCanvasProps {
  onRender?: (ctx: CanvasRenderingContext2D, timeMs: number) => void;
  onPointerMoveNative?: (coords: NativePointerCoords | null) => void;
  onPointerClickNative?: (coords: NativePointerCoords) => void;
  onScaleChange?: (scale: number) => void;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const PixelCanvas: React.FC<PixelCanvasProps> = ({
  onRender,
  onPointerMoveNative,
  onPointerClickNative,
  onScaleChange,
  children,
  className = '',
  style = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState<number>(1);
  const animFrameIdRef = useRef<number>(0);
  const renderRef = useRef(onRender);
  const onScaleChangeRef = useRef(onScaleChange);

  useEffect(() => {
    renderRef.current = onRender;
  }, [onRender]);

  useEffect(() => {
    onScaleChangeRef.current = onScaleChange;
  }, [onScaleChange]);

  // Handle responsive integer scaling and letterboxing
  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth <= 0 || clientHeight <= 0) return;

    const scaleX = Math.floor(clientWidth / NATIVE_WIDTH);
    const scaleY = Math.floor(clientHeight / NATIVE_HEIGHT);
    const newScale = Math.max(1, Math.min(scaleX, scaleY));

    setScale((prev) => {
      if (prev !== newScale) {
        onScaleChangeRef.current?.(newScale);
        return newScale;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    updateScale();
    const container = containerRef.current;
    if (!container) return;

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => updateScale());
      observer.observe(container);
    } else {
      window.addEventListener('resize', updateScale);
    }

    return () => {
      if (observer) observer.disconnect();
      else window.removeEventListener('resize', updateScale);
    };
  }, [updateScale]);

  // RequestAnimationFrame animation render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const loop = (timeMs: number) => {
      ctx.imageSmoothingEnabled = false;
      if (renderRef.current) {
        renderRef.current(ctx, timeMs);
      }
      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  // Convert pointer client coordinates to native 320x192 coordinates
  const getNativeCoords = (e: React.PointerEvent<HTMLCanvasElement>): NativePointerCoords | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * NATIVE_WIDTH);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * NATIVE_HEIGHT);

    if (x < 0 || x >= NATIVE_WIDTH || y < 0 || y >= NATIVE_HEIGHT) {
      return null;
    }
    return { x, y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!onPointerMoveNative) return;
    const coords = getNativeCoords(e);
    onPointerMoveNative(coords);
  };

  const handlePointerLeave = () => {
    if (onPointerMoveNative) {
      onPointerMoveNative(null);
    }
  };

  const handleClick = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!onPointerClickNative) return;
    const coords = getNativeCoords(e);
    if (coords) {
      onPointerClickNative(coords);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`pixel-canvas-container ${className}`}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1b1423', // letterboxed in palette ink
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        width={NATIVE_WIDTH}
        height={NATIVE_HEIGHT}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        style={{
          width: `${NATIVE_WIDTH * scale}px`,
          height: `${NATIVE_HEIGHT * scale}px`,
          imageRendering: 'pixelated',
          display: 'block',
          boxShadow: '0 0 24px rgba(0,0,0,0.85)',
          cursor: onPointerClickNative ? 'pointer' : 'default',
        }}
      />
      {children}
    </div>
  );
};
