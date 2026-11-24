import { getImage, layout } from '../../engine/assets';
import {
  drawAvatar,
  drawChairNear,
  drawBubbleCoffee,
  drawBubbleFire,
  drawBubbleZzz,
  drawPlus,
} from '../../engine/sprites';
import { drawAtlasNameTag } from '../../engine/atlasText';
import { RoomPresenceMap, RoomSeatsMap } from '../../services/roomPresence';
import { getUserPhaseOffset } from './roomGeometry';

export interface RoomRenderParams {
  presence: RoomPresenceMap;
  seats: RoomSeatsMap;
  currentUid: string | null;
  hoveredSeatId: string | null;
  highlightedSeatId: string | null;
  highlightUntilMs: number;
  showAllNames: boolean;
  doorFlashUntilMs: number;
  squashMap: Map<string, number>;
}

export function renderRoomScene(
  ctx: CanvasRenderingContext2D,
  timeMs: number,
  params: RoomRenderParams
): void {
  const {
    presence,
    seats,
    currentUid,
    hoveredSeatId,
    highlightedSeatId,
    highlightUntilMs,
    showAllNames,
    doorFlashUntilMs,
    squashMap,
  } = params;

  ctx.imageSmoothingEnabled = false;

  // Layer 1: Background (library_bg.png)
  const bg = getImage('bg');
  ctx.drawImage(bg, 0, 0);

  // Helper: calculate squash scale
  const getSquashScale = (seatId: string): { scaleX: number; scaleY: number } => {
    const claimTime = squashMap.get(seatId);
    if (!claimTime) return { scaleX: 1, scaleY: 1 };
    const elapsed = timeMs - claimTime;
    if (elapsed < 35) {
      return { scaleX: 1.2, scaleY: 0.8 };
    }
    if (elapsed < 70) {
      return { scaleX: 0.9, scaleY: 1.1 };
    }
    return { scaleX: 1, scaleY: 1 };
  };

  // Layer 2: Far-Seat Avatars (frames 0-3, facing viewer)
  for (const seat of layout.seats) {
    if (seat.side !== 'far') continue;
    const uid = seats[seat.id];
    if (!uid) continue;
    const reader = presence[uid];
    if (!reader) continue;

    const { scaleX, scaleY } = getSquashScale(seat.id);
    let frame = 0;

    if (reader.status === 'away') {
      frame = 0; // front_study_a frozen
    } else {
      const offset = getUserPhaseOffset(uid);
      const step = Math.floor((timeMs + offset) / 500) % 2;
      if (reader.status === 'break') {
        frame = 2 + step; // front_break_a (2) or front_break_b (3)
      } else {
        frame = 0 + step; // front_study_a (0) or front_study_b (1)
      }
    }

    const pIdx =
      typeof reader.presetIndex === 'number'
        ? reader.presetIndex
        : layout.presets.indexOf(reader.preset) >= 0
        ? layout.presets.indexOf(reader.preset)
        : 0;

    drawAvatar(ctx, pIdx, frame, seat.avatar.x, seat.avatar.y, scaleX, scaleY);
  }

  // Layer 3: Near-Seat Avatars (frames 4-7, back view)
  for (const seat of layout.seats) {
    if (seat.side !== 'near') continue;
    const uid = seats[seat.id];
    if (!uid) continue;
    const reader = presence[uid];
    if (!reader) continue;

    const { scaleX, scaleY } = getSquashScale(seat.id);
    let frame = 4;

    if (reader.status === 'away') {
      frame = 4; // back_study_a frozen
    } else {
      const offset = getUserPhaseOffset(uid);
      const step = Math.floor((timeMs + offset) / 500) % 2;
      if (reader.status === 'break') {
        frame = 6 + step; // back_break_a (6) or back_break_b (7)
      } else {
        frame = 4 + step; // back_study_a (4) or back_study_b (5)
      }
    }

    const pIdx =
      typeof reader.presetIndex === 'number'
        ? reader.presetIndex
        : layout.presets.indexOf(reader.preset) >= 0
        ? layout.presets.indexOf(reader.preset)
        : 0;

    drawAvatar(ctx, pIdx, frame, seat.avatar.x, seat.avatar.y, scaleX, scaleY);
  }

  // Layer 4: Chair Backrest Occlusion over every occupied near seat
  for (const seat of layout.seats) {
    if (seat.side !== 'near') continue;
    if (seats[seat.id]) {
      drawChairNear(ctx, seat.chair.x, seat.chair.y);
    }
  }

  // Layer 5: Lighting Overlay
  const overlay = getImage('light');
  ctx.drawImage(overlay, 0, 0);

  // Layer 6: Status Bubbles & Name Tags
  for (const seat of layout.seats) {
    const uid = seats[seat.id];
    if (!uid) continue;
    const reader = presence[uid];
    if (!reader) continue;

    // Status bubble placement
    const bubbleX = seat.avatar.x + 8;
    const bubbleY = seat.avatar.y - 15;

    if (reader.status === 'away') {
      drawBubbleZzz(ctx, bubbleX, bubbleY);
    } else if (reader.status === 'break') {
      drawBubbleCoffee(ctx, bubbleX, bubbleY);
    } else if (reader.status === 'studying') {
      drawBubbleFire(ctx, bubbleX, bubbleY);
    }

    // Name tag: show if hovered, if current user, or if showAllNames is true
    const isHovered = seat.id === hoveredSeatId;
    const isSelf = uid === currentUid;

    if (isHovered || isSelf || showAllNames) {
      const textColor = isSelf ? '#ffe2a0' : '#f1e3c4';
      drawAtlasNameTag(
        ctx,
        reader.username || 'reader',
        seat.avatar.x + 9,
        seat.avatar.y - 10,
        textColor
      );
    }
  }

  // Layer 7: Interactive Overlays
  // 1. Door window flash on arrival (x: 16, y: 22, w: 14, h: 12)
  if (timeMs < doorFlashUntilMs) {
    ctx.fillStyle = '#ffe2a0';
    ctx.fillRect(16, 22, 14, 12);
  }

  // 2. Empty chair hover: bobbing plus icon 2px above seat
  if (hoveredSeatId && !seats[hoveredSeatId]) {
    const emptySeat = layout.seats.find((s) => s.id === hoveredSeatId);
    if (emptySeat) {
      const bob = Math.floor(Math.sin(timeMs * 0.01) * 1.5);
      drawPlus(ctx, emptySeat.chair.x + 5, emptySeat.chair.y - 7 + bob);
    }
  }

  // 3. Blinking gold outline around highlighted seat
  if (highlightedSeatId && timeMs < highlightUntilMs) {
    const isBlinkOn = Math.floor(timeMs / 250) % 2 === 0;
    if (isBlinkOn) {
      const seat = layout.seats.find((s) => s.id === highlightedSeatId);
      if (seat) {
        ctx.strokeStyle = '#ffe2a0';
        ctx.lineWidth = 1;
        ctx.strokeRect(seat.chair.x - 1.5, seat.avatar.y - 1.5, 21, 28);
      }
    }
  }
}
