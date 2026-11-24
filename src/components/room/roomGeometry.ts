import { layout, Seat } from '../../engine/assets';

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
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
