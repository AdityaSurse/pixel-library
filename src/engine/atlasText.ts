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
  topY: number
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

  // 2. Draw glyphs tinted in palette light (#ffe2a0)
  const tintedAtlas = getTintedAtlas('#ffe2a0');
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
