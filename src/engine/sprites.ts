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
  y: number,
  scaleX: number = 1,
  scaleY: number = 1
): void {
  const sheet = getImage('sheet');
  const frameIdx = getFrameIndex(frame);
  const pIdx = Math.max(0, Math.min(layout.presets.length - 1, Math.floor(presetIndex)));

  const frameWidth = layout.avatar_frame.w; // 18
  const frameHeight = layout.avatar_frame.h; // 22

  const sx = frameIdx * frameWidth;
  const sy = pIdx * frameHeight;

  if (scaleX !== 1 || scaleY !== 1) {
    ctx.save();
    const centerX = x + frameWidth / 2;
    const bottomY = y + frameHeight;
    ctx.translate(Math.round(centerX), Math.round(bottomY));
    ctx.scale(scaleX, scaleY);
    ctx.drawImage(
      sheet,
      sx,
      sy,
      frameWidth,
      frameHeight,
      Math.round(-frameWidth / 2),
      Math.round(-frameHeight),
      frameWidth,
      frameHeight
    );
    ctx.restore();
  } else {
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
}

/**
 * Draws the near-seat chair backrest on top of an occupied near seat.
 */
export function drawChairNear(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  chairImg?: HTMLImageElement
): void {
  const chair = chairImg || getImage('chair');
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
 * Draws the zzz status bubble (away reader asleep).
 */
export function drawBubbleZzz(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const bubble = getImage('bubble_zzz');
  ctx.drawImage(bubble, Math.round(x), Math.round(y));
}

/**
 * Draws the book status bubble (study focus start).
 */
export function drawBubbleBook(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const bubble = getImage('bubble_book');
  ctx.drawImage(bubble, Math.round(x), Math.round(y));
}

/**
 * Draws the tomato status bubble (active focus for self).
 */
export function drawBubbleTomato(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const bubble = getImage('bubble_tomato');
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
  name: 'book' | 'clock' | 'coffee' | 'door' | 'fire' | 'link' | 'tomato' | 'user' | 'check' | 'music',
  x: number,
  y: number
): void {
  const icon = getImage(name);
  ctx.drawImage(icon, Math.round(x), Math.round(y));
}
