import { getImage, layout } from './assets';

export type AvatarFrameName =
  | 'front_study_a'
  | 'front_study_b'
  | 'front_break_a'
  | 'front_break_b'
  | 'back_study_a'
  | 'back_study_b'
  | 'back_break_a'
  | 'back_break_b';

export const AVATAR_FRAME_NAMES = layout.avatar_frame.frames as AvatarFrameName[];

export function getFrameIndex(frame: number | AvatarFrameName): number {
  if (typeof frame === 'number') {
    return Math.max(0, Math.min(7, Math.floor(frame)));
  }
  const idx = AVATAR_FRAME_NAMES.indexOf(frame);
  return idx >= 0 ? idx : 0;
}

/**
 * Draws an avatar from avatars_sheet.png at the native 18x22 pixel size.
 */
export function drawAvatar(
  ctx: CanvasRenderingContext2D,
  presetIndex: number,
  frame: number | AvatarFrameName,
  x: number,
  y: number
): void {
  const sheet = getImage('sheet');
  const frameIdx = getFrameIndex(frame);
  const pIdx = Math.max(0, Math.min(layout.presets.length - 1, Math.floor(presetIndex)));

  const frameWidth = layout.avatar_frame.w; // 18
  const frameHeight = layout.avatar_frame.h; // 22

  const sx = frameIdx * frameWidth;
  const sy = pIdx * frameHeight;

  ctx.drawImage(
    sheet,
    sx,
    sy,
    frameWidth,
    frameHeight,
    Math.round(x),
    Math.round(y),
    frameWidth,
    frameHeight
  );
}

/**
 * Draws the near-seat chair backrest on top of an occupied near seat.
 */
export function drawChairNear(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const chair = getImage('chair');
  ctx.drawImage(chair, Math.round(x), Math.round(y));
}

/**
 * Draws the fire status bubble (active Pomodoro focus).
 */
export function drawBubbleFire(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const bubble = getImage('bubble_fire');
  ctx.drawImage(bubble, Math.round(x), Math.round(y));
}

/**
 * Draws the coffee cup status bubble (active Pomodoro break).
 */
export function drawBubbleCoffee(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const bubble = getImage('bubble_coffee');
  ctx.drawImage(bubble, Math.round(x), Math.round(y));
}

/**
 * Draws the heart status bubble (avatar selection celebratory reaction).
 */
export function drawBubbleHeart(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const bubble = getImage('bubble_heart');
  ctx.drawImage(bubble, Math.round(x), Math.round(y));
}

/**
 * Draws the plus icon for empty chair hovering.
 */
export function drawPlus(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const plus = getImage('plus');
  ctx.drawImage(plus, Math.round(x), Math.round(y));
}

/**
 * Draws a status or UI icon.
 */
export function drawIcon(
  ctx: CanvasRenderingContext2D,
  name: 'book' | 'clock' | 'coffee' | 'door' | 'fire' | 'link' | 'tomato' | 'user' | 'check',
  x: number,
  y: number
): void {
  const icon = getImage(name);
  ctx.drawImage(icon, Math.round(x), Math.round(y));
}
