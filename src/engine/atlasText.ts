import atlasJson from '../../public/pixel-library-assets/fonts/quietpage_atlas.json';
import { getImage } from './assets';

export interface GlyphInfo {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AtlasData {
  cell_height: number;
  baseline: number;
  letter_spacing: number;
  glyphs: Record<string, GlyphInfo>;
}

export const atlasData: AtlasData = atlasJson as AtlasData;

let tintedAtlasCanvas: HTMLCanvasElement | null = null;
let currentTintColor = '';

function getTintedAtlas(color: string): HTMLCanvasElement {
  if (tintedAtlasCanvas && currentTintColor === color) {
    return tintedAtlasCanvas;
  }

  const rawAtlas = getImage('quietpage_atlas');
  const canvas = document.createElement('canvas');
  canvas.width = rawAtlas.naturalWidth || 128;
  canvas.height = rawAtlas.naturalHeight || 60;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(rawAtlas, 0, 0);
    // Tint white pixels to target color using source-in
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  tintedAtlasCanvas = canvas;
  currentTintColor = color;
  return canvas;
}

export function measureAtlasText(text: string): number {
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const glyph = atlasData.glyphs[char] || atlasData.glyphs['?'];
    if (glyph) {
      width += glyph.w + atlasData.letter_spacing;
    } else {
      width += 4 + atlasData.letter_spacing;
    }
  }
  return Math.max(0, width - atlasData.letter_spacing);
}

/**
 * Draws a pixel-perfect username badge above the avatar:
 * Canvas text in palette light (#ffe2a0) on palette ink (#1b1423) with a 1px border.
 */
export function drawAtlasNameTag(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  topY: number,
  textColor: string = '#ffe2a0'
): void {
  const displayText = text.trim() || 'reader';
  const textWidth = measureAtlasText(displayText);
  const paddingX = 3;
  const paddingY = 2;
  const boxW = textWidth + paddingX * 2;
  const boxH = atlasData.cell_height + paddingY * 2;

  const boxX = Math.round(centerX - boxW / 2);
  const boxY = Math.round(topY);

  // 1. Draw badge background (palette ink #1b1423 with dark wood border #3a2419)
  ctx.fillStyle = '#1b1423';
  ctx.fillRect(boxX, boxY, boxW, boxH);

  ctx.strokeStyle = '#3a2419';
  ctx.lineWidth = 1;
  ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, boxH - 1);

  // 2. Draw glyphs tinted in target color (palette light #ffe2a0 or parch #f1e3c4)
  const tintedAtlas = getTintedAtlas(textColor);
  let currentX = boxX + paddingX;
  const textY = boxY + paddingY;

  for (let i = 0; i < displayText.length; i++) {
    const char = displayText[i];
    const glyph = atlasData.glyphs[char] || atlasData.glyphs['?'];
    if (glyph) {
      ctx.drawImage(
        tintedAtlas,
        glyph.x,
        glyph.y,
        glyph.w,
        glyph.h,
        currentX,
        textY,
        glyph.w,
        glyph.h
      );
      currentX += glyph.w + atlasData.letter_spacing;
    } else {
      currentX += 4 + atlasData.letter_spacing;
    }
  }
}

/**
 * Draws a single line of atlas text with an explicit top-left anchor.
 */
export function drawAtlasTextLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  textColor: string = '#f1e3c4'
): void {
  const tintedAtlas = getTintedAtlas(textColor);
  let currentX = Math.round(x);
  const textY = Math.round(y);

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const glyph = atlasData.glyphs[char] || atlasData.glyphs['?'];
    if (glyph) {
      ctx.drawImage(
        tintedAtlas,
        glyph.x,
        glyph.y,
        glyph.w,
        glyph.h,
        currentX,
        textY,
        glyph.w,
        glyph.h
      );
      currentX += glyph.w + atlasData.letter_spacing;
    } else {
      currentX += 4 + atlasData.letter_spacing;
    }
  }
}

/**
 * Word-wraps text based on Quietpage glyph measurements.
 */
export function wrapAtlasText(text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (measureAtlasText(testLine) <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [text];
}

/**
 * Draws a pixel speech-bubble panel pointing down or up to an anchor coordinate.
 */
export function drawGoalSpeechBubble(
  ctx: CanvasRenderingContext2D,
  username: string,
  goalText: string,
  anchorX: number,
  anchorY: number
): void {
  const title = `${username || 'Reader'}'s Goal`;
  const maxWidth = 124;
  const lines = wrapAtlasText(goalText, maxWidth);

  let contentW = measureAtlasText(title);
  for (const l of lines) {
    const lw = measureAtlasText(l);
    if (lw > contentW) contentW = lw;
  }

  const padX = 5;
  const padY = 4;
  const boxW = Math.max(64, contentW + padX * 2);
  const lineH = atlasData.cell_height + 2;
  const boxH = padY * 2 + atlasData.cell_height + 3 + lines.length * lineH;

  let boxX = Math.round(anchorX - boxW / 2);
  boxX = Math.max(4, Math.min(320 - boxW - 4, boxX));

  let boxY = anchorY - boxH - 4;
  let pointerPointsDown = true;
  if (boxY < 4) {
    boxY = anchorY + 10;
    pointerPointsDown = false;
  }

  // Draw background panel in palette ink-plum (#241a2e)
  ctx.fillStyle = '#241a2e';
  ctx.fillRect(boxX, boxY, boxW, boxH);

  // Border in palette gold (#ffe2a0)
  ctx.strokeStyle = '#ffe2a0';
  ctx.lineWidth = 1;
  ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, boxH - 1);

  // Pointer triangle
  ctx.fillStyle = '#241a2e';
  ctx.strokeStyle = '#ffe2a0';
  const px = Math.max(boxX + 5, Math.min(boxX + boxW - 6, anchorX));

  ctx.beginPath();
  if (pointerPointsDown) {
    ctx.moveTo(px - 3, boxY + boxH - 1);
    ctx.lineTo(px, anchorY);
    ctx.lineTo(px + 3, boxY + boxH - 1);
  } else {
    ctx.moveTo(px - 3, boxY + 1);
    ctx.lineTo(px, anchorY);
    ctx.lineTo(px + 3, boxY + 1);
  }
  ctx.fill();
  ctx.stroke();

  // Draw Title in gold (#ffe2a0)
  drawAtlasTextLine(ctx, title, boxX + padX, boxY + padY, '#ffe2a0');

  // Separator divider
  const sepY = boxY + padY + atlasData.cell_height + 1;
  ctx.strokeStyle = '#5c3a26';
  ctx.beginPath();
  ctx.moveTo(boxX + 2, sepY + 0.5);
  ctx.lineTo(boxX + boxW - 2, sepY + 0.5);
  ctx.stroke();

  // Draw Goal Text in parchment (#f1e3c4)
  let curY = sepY + 2;
  for (const line of lines) {
    drawAtlasTextLine(ctx, line, boxX + padX, curY, '#f1e3c4');
    curY += lineH;
  }
}
