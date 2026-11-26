import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  DaysMap,
  HEATMAP_LEVEL_COLORS,
  getHeatmapLevel,
  getHeatmapStartMonday,
  getLocalDateString,
  loadUserHeatmapDays,
  onHeatmapUpdate,
  calculateHeatmapStats,
} from '../../services/heatmapService';

const NATIVE_COLS = 26;
const NATIVE_ROWS = 7;
const CELL_SIZE = 8;
const CELL_GAP = 1;
const TOP_OFFSET = 13; // Space for month labels
const PADDING = 1;

const NATIVE_WIDTH = PADDING * 2 + NATIVE_COLS * CELL_SIZE + (NATIVE_COLS - 1) * CELL_GAP; // 1 + 208 + 25 + 1 = 235px
const NATIVE_HEIGHT = TOP_OFFSET + NATIVE_ROWS * CELL_SIZE + (NATIVE_ROWS - 1) * CELL_GAP + PADDING; // 13 + 56 + 6 + 1 = 76px

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface HoveredCell {
  dateStr: string;
  tooltipText: string;
  col: number;
  row: number;
}

export const StudyMapCard: React.FC = () => {
  const { user, profile } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [days, setDays] = useState<DaysMap>({});
  const [hoveredCell, setHoveredCell] = useState<HoveredCell | null>(null);
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 768 : true;
  });

  // Today's cell blink animation timestamp
  const [blinkUntilMs, setBlinkUntilMs] = useState<number>(0);
  const animFrameRef = useRef<number>(0);

  // Responsive whole number scaling: 3x on desktop, 2x on phones
  const scale = isDesktop ? 3 : 2;

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load 26 weeks of data from Firestore (cached in session)
  useEffect(() => {
    if (!user) return;
    loadUserHeatmapDays(user.uid).then((data) => {
      setDays({ ...data });
    });

    // Subscribe to new pomodoro events for live update & today's cell outline blink
    const unsub = onHeatmapUpdate((updatedUid, dateStr) => {
      if (updatedUid === user.uid) {
        loadUserHeatmapDays(user.uid).then((updatedData) => {
          setDays({ ...updatedData });
          const today = getLocalDateString();
          if (dateStr === today) {
            setBlinkUntilMs(performance.now() + 1800);
          }
        });
      }
    });

    return () => {
      unsub();
    };
  }, [user]);

  // Heatmap stats
  const stats = useMemo(() => {
    return calculateHeatmapStats(days, profile?.stats);
  }, [days, profile?.stats]);

  // Base dates calculation
  const startMonday = useMemo(() => getHeatmapStartMonday(), []);
  const todayStr = useMemo(() => getLocalDateString(), []);

  // Main canvas render routine
  const renderCanvas = useCallback(
    (nowMs: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.imageSmoothingEnabled = false;

      // Clear canvas background (card backdrop #241a2e)
      ctx.fillStyle = '#241a2e';
      ctx.fillRect(0, 0, NATIVE_WIDTH, NATIVE_HEIGHT);

      // 1. Draw Month Labels
      ctx.font = '10px Quietpage, monospace';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#b9a98a';

      let lastDrawnMonth = -1;
      let lastDrawnX = -100;

      for (let col = 0; col < NATIVE_COLS; col++) {
        // Date of this column's Monday
        const colDate = new Date(startMonday);
        colDate.setDate(startMonday.getDate() + col * 7);
        const month = colDate.getMonth();
        const colX = PADDING + col * (CELL_SIZE + CELL_GAP);

        // Draw month label at first week of month or col 0 (with at least 20px spacing)
        if (month !== lastDrawnMonth && colX - lastDrawnX >= 18) {
          ctx.fillText(MONTH_NAMES[month], colX, 1);
          lastDrawnMonth = month;
          lastDrawnX = colX;
        }
      }

      // 2. Draw Day Cells
      const isBlinking = nowMs < blinkUntilMs;
      const isBlinkOn = isBlinking && Math.floor(nowMs / 200) % 2 === 0;

      for (let col = 0; col < NATIVE_COLS; col++) {
        for (let row = 0; row < NATIVE_ROWS; row++) {
          const cellDate = new Date(startMonday);
          cellDate.setDate(startMonday.getDate() + col * 7 + row);
          const dateStr = getLocalDateString(cellDate);

          const cellX = PADDING + col * (CELL_SIZE + CELL_GAP);
          const cellY = TOP_OFFSET + row * (CELL_SIZE + CELL_GAP);

          const isFuture = cellDate.getTime() > new Date().setHours(23, 59, 59, 999);
          const dayData = days[dateStr];
          const pomos = dayData?.pomodoros || 0;
          const level = isFuture ? 0 : getHeatmapLevel(pomos);

          // Fill cell
          ctx.fillStyle = HEATMAP_LEVEL_COLORS[level];
          ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);

          // Cell outline (subtle dark border)
          ctx.strokeStyle = '#1b1423';
          ctx.lineWidth = 1;
          ctx.strokeRect(cellX + 0.5, cellY + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);

          // Today indicator: dashed/gold outline, or blinking outline on new pomodoro
          if (dateStr === todayStr) {
            if (isBlinkOn) {
              ctx.strokeStyle = '#ffe2a0';
              ctx.lineWidth = 1;
              ctx.strokeRect(cellX - 0.5, cellY - 0.5, CELL_SIZE + 1, CELL_SIZE + 1);
            } else {
              ctx.strokeStyle = '#ffe2a0';
              ctx.lineWidth = 1;
              ctx.strokeRect(cellX + 0.5, cellY + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
            }
          }

          // Hovered cell outline
          if (hoveredCell && hoveredCell.col === col && hoveredCell.row === row) {
            ctx.strokeStyle = '#f1e3c4';
            ctx.lineWidth = 1;
            ctx.strokeRect(cellX - 0.5, cellY - 0.5, CELL_SIZE + 1, CELL_SIZE + 1);
          }
        }
      }
    },
    [startMonday, days, todayStr, blinkUntilMs, hoveredCell]
  );

  // Animation frame loop
  useEffect(() => {
    let active = true;

    const loop = (time: number) => {
      if (!active) return;
      renderCanvas(time);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [renderCanvas]);

  // Pointer interaction (hover or tap on day cell)
  const handlePointerAtNativeCoords = useCallback(
    (nativeX: number, nativeY: number) => {
      if (nativeY < TOP_OFFSET || nativeY >= TOP_OFFSET + NATIVE_ROWS * (CELL_SIZE + CELL_GAP)) {
        setHoveredCell(null);
        return;
      }

      const col = Math.floor((nativeX - PADDING) / (CELL_SIZE + CELL_GAP));
      const row = Math.floor((nativeY - TOP_OFFSET) / (CELL_SIZE + CELL_GAP));

      if (col >= 0 && col < NATIVE_COLS && row >= 0 && row < NATIVE_ROWS) {
        const cellDate = new Date(startMonday);
        cellDate.setDate(startMonday.getDate() + col * 7 + row);
        const dateStr = getLocalDateString(cellDate);

        const dayData = days[dateStr];
        const pomos = dayData?.pomodoros || 0;
        const mins = dayData?.minutes || 0;

        const dayName = DAY_NAMES[row];
        const dayOfMonth = cellDate.getDate();
        const monthName = MONTH_NAMES[cellDate.getMonth()];

        const pomoLabel = pomos === 1 ? '1 pomodoro' : `${pomos} pomodoros`;
        const text = `${dayName} ${dayOfMonth} ${monthName} · ${pomoLabel} · ${mins} min`;

        setHoveredCell({
          dateStr,
          tooltipText: text,
          col,
          row,
        });
      } else {
        setHoveredCell(null);
      }
    },
    [startMonday, days]
  );

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nativeX = (e.clientX - rect.left) / scale;
    const nativeY = (e.clientY - rect.top) / scale;
    handlePointerAtNativeCoords(nativeX, nativeY);
  };

  const handlePointerLeave = () => {
    setHoveredCell(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nativeX = (e.clientX - rect.left) / scale;
    const nativeY = (e.clientY - rect.top) / scale;
    handlePointerAtNativeCoords(nativeX, nativeY);
  };

  return (
    <div
      className="pixel-panel"
      style={{
        padding: '16px 20px',
        backgroundColor: '#241a2e',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.9)',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      {/* Title & Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '14px',
          borderBottom: '2px solid #3a2419',
          paddingBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src="/pixel-library-assets/icons/tomato.png"
            alt=""
            width="16"
            height="16"
            style={{ imageRendering: 'pixelated' }}
          />
          <span className="px-30" style={{ color: '#ffe2a0' }}>
            STUDY MAP
          </span>
          <span className="px-10" style={{ color: '#b9a98a', marginLeft: '4px' }}>
            LAST 26 WEEKS
          </span>
        </div>

        {/* Legend: "Less ■■■■■ More" */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#1b1423',
            border: '1px solid #5c3a26',
            padding: '4px 8px',
          }}
        >
          <span className="px-10" style={{ color: '#b9a98a' }}>
            Less
          </span>
          {HEATMAP_LEVEL_COLORS.map((c, i) => (
            <div
              key={i}
              style={{
                width: '8px',
                height: '8px',
                backgroundColor: c,
                border: '1px solid #1b1423',
                boxSizing: 'border-box',
              }}
              title={`Level ${i}`}
            />
          ))}
          <span className="px-10" style={{ color: '#b9a98a' }}>
            More
          </span>
        </div>
      </div>

      {/* Main Content Area: Heatmap Canvas + Stats Panel */}
      <div
        style={{
          display: 'flex',
          flexDirection: isDesktop ? 'row' : 'column',
          alignItems: isDesktop ? 'flex-start' : 'stretch',
          gap: '16px',
        }}
      >
        {/* Heatmap Canvas Scroll Container */}
        <div style={{ flex: '1 1 auto', minWidth: 0, overflowX: 'auto' }}>
          <div
            style={{
              display: 'inline-block',
              backgroundColor: '#1b1423',
              border: '2px solid #5c3a26',
              padding: '6px',
              boxSizing: 'border-box',
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
                display: 'block',
                imageRendering: 'pixelated',
                cursor: 'pointer',
              }}
            />
          </div>

          {/* Interactive Date Tooltip Banner */}
          <div
            style={{
              marginTop: '8px',
              minHeight: '22px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span
              className="px-10"
              style={{
                color: hoveredCell ? '#ffe2a0' : '#b9a98a',
                letterSpacing: '0.5px',
              }}
            >
              {hoveredCell
                ? hoveredCell.tooltipText
                : 'Hover or tap a day to view sessions'}
            </span>
          </div>
        </div>

        {/* Three Numbers Next To Map: Current Streak, Longest Streak, Total Hours */}
        <div
          style={{
            display: 'flex',
            flexDirection: isDesktop ? 'column' : 'row',
            flexWrap: 'wrap',
            gap: '10px',
            minWidth: isDesktop ? '170px' : 'auto',
          }}
        >
          {/* 1. Current Streak */}
          <div
            style={{
              flex: '1 1 120px',
              backgroundColor: '#1b1423',
              border: '2px solid #5c3a26',
              padding: '8px 12px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <img
                src="/pixel-library-assets/icons/fire.png"
                alt=""
                width="12"
                height="12"
                style={{ imageRendering: 'pixelated' }}
              />
              <span className="px-10" style={{ color: '#b9a98a' }}>
                CURRENT STREAK
              </span>
            </div>
            <div className="px-30" style={{ color: '#ffe2a0', marginTop: '2px' }}>
              {stats.currentStreak} {stats.currentStreak === 1 ? 'day' : 'days'}
            </div>
          </div>

          {/* 2. Longest Streak */}
          <div
            style={{
              flex: '1 1 120px',
              backgroundColor: '#1b1423',
              border: '2px solid #5c3a26',
              padding: '8px 12px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <img
                src="/pixel-library-assets/icons/check.png"
                alt=""
                width="12"
                height="12"
                style={{ imageRendering: 'pixelated' }}
              />
              <span className="px-10" style={{ color: '#b9a98a' }}>
                LONGEST STREAK
              </span>
            </div>
            <div className="px-30" style={{ color: '#4fa36a', marginTop: '2px' }}>
              {stats.longestStreak} {stats.longestStreak === 1 ? 'day' : 'days'}
            </div>
          </div>

          {/* 3. Total Hours */}
          <div
            style={{
              flex: '1 1 120px',
              backgroundColor: '#1b1423',
              border: '2px solid #5c3a26',
              padding: '8px 12px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <img
                src="/pixel-library-assets/icons/clock.png"
                alt=""
                width="12"
                height="12"
                style={{ imageRendering: 'pixelated' }}
              />
              <span className="px-10" style={{ color: '#b9a98a' }}>
                TOTAL HOURS
              </span>
            </div>
            <div className="px-30" style={{ color: '#f1e3c4', marginTop: '2px' }}>
              {stats.totalHours} {stats.totalHours === 1 ? 'hour' : 'hours'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
