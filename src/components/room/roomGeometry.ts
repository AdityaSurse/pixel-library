import { layout, Seat } from '../../engine/assets';
import { RoomPresenceMap, RoomSeatsMap, ReaderPresence } from '../../services/roomPresence';

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface NoteCoords {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Returns desk note coordinates for a seat.
 * Far seats: table surface just right of their hands.
 * Near seats: on table edge above their head, never covering a face.
 */
export function getDeskNoteCoords(seat: Seat): NoteCoords {
  if (seat.side === 'far') {
    return {
      x: seat.avatar.x + 12,
      y: seat.avatar.y + 17,
      w: 10,
      h: 7,
    };
  } else {
    return {
      x: seat.avatar.x + 4,
      y: seat.avatar.y - 7,
      w: 10,
      h: 7,
    };
  }
}

/**
 * Detects if a pointer coordinate is hovering or tapping a desk note.
 */
export function getNoteAtCoords(
  coords: { x: number; y: number } | null,
  presence: RoomPresenceMap,
  seats: RoomSeatsMap
): { seat: Seat; reader: ReaderPresence } | null {
  if (!coords) return null;
  const { x, y } = coords;

  for (const seat of layout.seats) {
    const uid = seats[seat.id];
    if (!uid) continue;
    const reader = presence[uid];
    if (!reader || !reader.goal) continue;
    if (reader.seatId !== seat.id) continue;

    const note = getDeskNoteCoords(seat);
    // Expand hit area by 2px on each side for comfortable hover / tap
    if (
      x >= note.x - 2 &&
      x <= note.x + note.w + 2 &&
      y >= note.y - 2 &&
      y <= note.y + note.h + 2
    ) {
      return { seat, reader };
    }
  }
  return null;
}

export function getSeatBoundingBox(seat: Seat): BoundingBox {
  return {
    x: seat.chair.x - 2,
    y: seat.avatar.y - 2,
    w: 22,
    h: 28,
  };
}

export function getSeatAtCoords(coords: { x: number; y: number } | null): Seat | null {
  if (!coords) return null;
  const { x, y } = coords;

  for (const seat of layout.seats) {
    const box = getSeatBoundingBox(seat);
    if (x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h) {
      return seat;
    }
  }
  return null;
}

export function getUserPhaseOffset(uid: string): number {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 1000;
}
