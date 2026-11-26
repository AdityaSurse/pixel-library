export type ThemeId =
  | 'classic'
  | 'vampire'
  | 'renaissance'
  | 'midnight'
  | 'cherry'
  | 'space'
  | 'cafe'
  | 'greathall';

export type ThemeTime = 'day' | 'night';

export interface ThemeInfo {
  id: ThemeId;
  name: string;
  folder: string;
  accent: string;
}

export interface LoadedTheme {
  id: ThemeId;
  time: ThemeTime;
  bg: HTMLImageElement;
  light: HTMLImageElement;
  chair: HTMLImageElement;
  bgData?: Uint32Array;
  lightData?: Uint32Array;
}

export const THEME_IDS: ThemeId[] = [
  'classic',
  'vampire',
  'renaissance',
  'midnight',
  'cherry',
  'space',
  'cafe',
  'greathall',
];

export const DEFAULT_THEME: ThemeId = 'classic';

export const FALLBACK_THEMES: ThemeInfo[] = [
  { id: 'classic', name: 'Classic Library', folder: 'themes/classic', accent: '#ffe2a0' },
  { id: 'vampire', name: 'Vampire Archive', folder: 'themes/vampire', accent: '#ff8a4a' },
  { id: 'renaissance', name: 'Renaissance Study', folder: 'themes/renaissance', accent: '#ffd890' },
  { id: 'midnight', name: 'Midnight Dark Mode', folder: 'themes/midnight', accent: '#7ae8f0' },
  { id: 'cherry', name: 'Cherry Blossom Reading Room', folder: 'themes/cherry', accent: '#ffe6b0' },
  { id: 'space', name: 'Space Station Library', folder: 'themes/space', accent: '#7ae8f0' },
  { id: 'cafe', name: 'Rainy Café Library', folder: 'themes/cafe', accent: '#ffc070' },
  { id: 'greathall', name: 'Great Hall', folder: 'themes/greathall', accent: '#ffd080' },
];

let cachedThemesConfig: ThemeInfo[] = FALLBACK_THEMES;
let themesConfigPromise: Promise<ThemeInfo[]> | null = null;

/**
 * Loads themes.json at runtime via fetch('/pixel-library-themes/themes.json').
 */
export async function fetchThemesConfig(): Promise<ThemeInfo[]> {
  if (themesConfigPromise) return themesConfigPromise;

  themesConfigPromise = (async () => {
    try {
      const res = await fetch('/pixel-library-themes/themes.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.themes)) {
        cachedThemesConfig = data.themes as ThemeInfo[];
      }
      return cachedThemesConfig;
    } catch (err) {
      console.warn('Failed to fetch themes.json, falling back to static config:', err);
      return cachedThemesConfig;
    }
  })();

  return themesConfigPromise;
}

// Start fetching themes.json immediately in background
if (typeof window !== 'undefined') {
  fetchThemesConfig().catch(() => {});
}

export function getThemeList(): ThemeInfo[] {
  return cachedThemesConfig;
}

export function isValidThemeId(id: string): id is ThemeId {
  return THEME_IDS.includes(id as ThemeId);
}

export function normalizeThemeId(id?: string | null): ThemeId {
  if (id && isValidThemeId(id)) return id;
  return DEFAULT_THEME;
}

export function getThemeInfo(id?: string | null): ThemeInfo {
  const safeId = normalizeThemeId(id);
  const found = cachedThemesConfig.find((t) => t.id === safeId);
  return found || FALLBACK_THEMES.find((t) => t.id === safeId) || FALLBACK_THEMES[0];
}

// Memory cache for HTMLImageElements and loaded themes
const imageCache: Map<string, HTMLImageElement> = new Map();
const loadedThemesCache: Map<string, LoadedTheme> = new Map();
const themeLoadingPromises: Map<string, Promise<LoadedTheme>> = new Map();

function loadImage(src: string): Promise<HTMLImageElement> {
  const existing = imageCache.get(src);
  if (existing && existing.complete && existing.naturalWidth > 0) {
    return Promise.resolve(existing);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to load theme asset: ${src}`));
    img.src = src;
  });
}

/**
 * Extracts 32-bit pixel array for 320x192 image for fast Bayer dithering.
 */
function extractUint32Pixels(img: HTMLImageElement): Uint32Array {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 192;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return new Uint32Array(320 * 192);
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, 320, 192);
  return new Uint32Array(data.data.buffer);
}

/**
 * Loads a theme by ID and time (defaults to 'night').
 * Returns the theme's background, lighting overlay, and chair_near images.
 * Cached in memory so switching back is instant.
 */
export async function loadTheme(
  id: string = 'classic',
  time: ThemeTime = 'night'
): Promise<LoadedTheme> {
  const safeId: ThemeId = normalizeThemeId(id);
  const cacheKey = `${safeId}_${time}`;

  const cached = loadedThemesCache.get(cacheKey);
  if (cached) return cached;

  const existingPromise = themeLoadingPromises.get(cacheKey);
  if (existingPromise) return existingPromise;

  const promise = (async () => {
    const bgUrl = `/pixel-library-themes/themes/${safeId}/library_bg_${time}.png`;
    const lightUrl = `/pixel-library-themes/themes/${safeId}/lighting_${time}.png`;
    const chairUrl = `/pixel-library-themes/themes/${safeId}/chair_near.png`;

    try {
      const [bg, light, chair] = await Promise.all([
        loadImage(bgUrl),
        loadImage(lightUrl),
        loadImage(chairUrl),
      ]);

      const loaded: LoadedTheme = {
        id: safeId,
        time,
        bg,
        light,
        chair,
      };

      // Extract pixel buffers for dither transitions in browser
      if (typeof window !== 'undefined') {
        try {
          loaded.bgData = extractUint32Pixels(bg);
          loaded.lightData = extractUint32Pixels(light);
        } catch {
          // Ignore if canvas extraction fails
        }
      }

      loadedThemesCache.set(cacheKey, loaded);
      return loaded;
    } catch (err) {
      console.error(`Error loading theme "${safeId}", falling back to classic:`, err);
      if (safeId !== DEFAULT_THEME) {
        return loadTheme(DEFAULT_THEME, time);
      }
      throw err;
    } finally {
      themeLoadingPromises.delete(cacheKey);
    }
  })();

  themeLoadingPromises.set(cacheKey, promise);
  return promise;
}

/**
 * Synchronous getter for already loaded theme images.
 * Returns null if not loaded yet.
 */
export function getCachedTheme(
  id: string = 'classic',
  time: ThemeTime = 'night'
): LoadedTheme | null {
  const safeId: ThemeId = normalizeThemeId(id);
  return loadedThemesCache.get(`${safeId}_${time}`) || null;
}

// ---------------------------------------------------------------------------
// 4x4 BAYER DITHER ENGINE (320x192)
// ---------------------------------------------------------------------------

const BAYER_4X4 = [
   0,  8,  2, 10,
  12,  4, 14,  6,
   3, 11,  1,  9,
  15,  7, 13,  5,
];

// Precompute 320x192 Bayer matrix thresholds (0..15)
const BAYER_GRID = new Uint8Array(320 * 192);
for (let y = 0; y < 192; y++) {
  const rowOffset = y * 320;
  const bayerRow = (y & 3) << 2;
  for (let x = 0; x < 320; x++) {
    BAYER_GRID[rowOffset + x] = BAYER_4X4[bayerRow | (x & 3)];
  }
}

let ditherCanvas: HTMLCanvasElement | null = null;
let ditherCtx: CanvasRenderingContext2D | null = null;
let ditherImageData: ImageData | null = null;
let ditherUint32: Uint32Array | null = null;

function ensureDitherContext(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!ditherCanvas) {
    ditherCanvas = document.createElement('canvas');
    ditherCanvas.width = 320;
    ditherCanvas.height = 192;
    ditherCtx = ditherCanvas.getContext('2d', { willReadFrequently: true });
    if (ditherCtx) {
      ditherImageData = ditherCtx.createImageData(320, 192);
      ditherUint32 = new Uint32Array(ditherImageData.data.buffer);
    }
  }
  return ditherCtx;
}

/**
 * Draws a 4x4 Bayer dither cross-dissolve between two 320x192 layers onto the target canvas.
 * @param ctx Target rendering context
 * @param fromImg Old image (or pixel array)
 * @param toImg New image (or pixel array)
 * @param progress 0.0 (100% from) to 1.0 (100% to)
 */
export function drawBayerDitherDissolve(
  ctx: CanvasRenderingContext2D,
  fromPixels: Uint32Array | undefined,
  toPixels: Uint32Array | undefined,
  fromFallbackImg: HTMLImageElement,
  toFallbackImg: HTMLImageElement,
  progress: number
): void {
  const clampedProgress = Math.max(0, Math.min(1, progress));

  if (clampedProgress <= 0) {
    ctx.drawImage(fromFallbackImg, 0, 0);
    return;
  }
  if (clampedProgress >= 1) {
    ctx.drawImage(toFallbackImg, 0, 0);
    return;
  }

  const actx = ensureDitherContext();
  if (!actx || !ditherCanvas || !ditherImageData || !ditherUint32 || !fromPixels || !toPixels) {
    // Graceful fallback if buffers unavailable
    ctx.drawImage(clampedProgress < 0.5 ? fromFallbackImg : toFallbackImg, 0, 0);
    return;
  }

  // Threshold: 0 to 16
  const threshold = Math.round(clampedProgress * 16);
  const out = ditherUint32;
  const count = 320 * 192;

  for (let i = 0; i < count; i++) {
    out[i] = BAYER_GRID[i] < threshold ? toPixels[i] : fromPixels[i];
  }

  actx.putImageData(ditherImageData, 0, 0);
  ctx.drawImage(ditherCanvas, 0, 0);
}
