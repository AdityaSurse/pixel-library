import layoutJson from '../../public/pixel-library-assets/layout.json';
import paletteJson from '../../public/pixel-library-assets/ui/palette.json';

export interface Table {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  lamp: {
    x: number;
    y: number;
  };
}

export interface Seat {
  id: string;
  table: number;
  side: 'far' | 'near';
  facing: 'viewer' | 'away';
  avatar: {
    x: number;
    y: number;
  };
  chair: {
    x: number;
    y: number;
  };
}

export interface Layout {
  native_size: [number, number];
  recommended_scale: number;
  tables: Table[];
  seats: Seat[];
  entrance: {
    x: number;
    y: number;
  };
  avatar_frame: {
    w: number;
    h: number;
    frames: string[];
    fps: number;
  };
  draw_order: string[];
  presets: string[];
}

export interface Palette {
  colors: string[];
}

export const layout: Layout = layoutJson as Layout;
export const palette: Palette = paletteJson as Palette;

export type ImageKey =
  | 'bg'
  | 'light'
  | 'sheet'
  | 'heads'
  | 'avatar_heads'
  | 'chair'
  | 'table'
  | 'lamp'
  | 'panel'
  | 'bubble_fire'
  | 'bubble_coffee'
  | 'bubble_heart'
  | 'bubble_zzz'
  | 'plus'
  | 'book'
  | 'clock'
  | 'coffee'
  | 'door'
  | 'fire'
  | 'link'
  | 'tomato'
  | 'user'
  | 'check'
  | 'quietpage_atlas'
  | 'progress_empty'
  | 'progress_full';

const IMAGE_PATHS: Record<ImageKey, string> = {
  bg: '/pixel-library-assets/backgrounds/library_bg.png',
  light: '/pixel-library-assets/backgrounds/lighting_overlay.png',
  sheet: '/pixel-library-assets/sprites/avatars/avatars_sheet.png',
  heads: '/pixel-library-assets/sprites/avatars/avatar_heads@4x.png',
  avatar_heads: '/pixel-library-assets/sprites/avatars/avatar_heads.png',
  chair: '/pixel-library-assets/sprites/furniture/chair_near.png',
  table: '/pixel-library-assets/sprites/furniture/table@4x.png',
  lamp: '/pixel-library-assets/sprites/furniture/desk_lamp@4x.png',
  panel: '/pixel-library-assets/ui/panel_9slice.png',
  bubble_fire: '/pixel-library-assets/ui/bubble_fire.png',
  bubble_coffee: '/pixel-library-assets/ui/bubble_coffee.png',
  bubble_heart: '/pixel-library-assets/ui/bubble_heart.png',
  bubble_zzz: '/pixel-library-assets/ui/bubble_zzz.png',
  plus: '/pixel-library-assets/icons/plus.png',
  book: '/pixel-library-assets/icons/book.png',
  clock: '/pixel-library-assets/icons/clock.png',
  coffee: '/pixel-library-assets/icons/coffee.png',
  door: '/pixel-library-assets/icons/door.png',
  fire: '/pixel-library-assets/icons/fire.png',
  link: '/pixel-library-assets/icons/link.png',
  tomato: '/pixel-library-assets/icons/tomato.png',
  user: '/pixel-library-assets/icons/user.png',
  check: '/pixel-library-assets/icons/check.png',
  quietpage_atlas: '/pixel-library-assets/fonts/quietpage_atlas.png',
  progress_empty: '/pixel-library-assets/ui/progress_empty.png',
  progress_full: '/pixel-library-assets/ui/progress_full.png',
};

export const images: Partial<Record<ImageKey, HTMLImageElement>> = {};
let loaded = false;
let loadingPromise: Promise<void> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load asset image: ${src}`));
    img.src = src;
  });
}

export async function loadAssets(
  onProgress?: (progressFraction: number) => void
): Promise<void> {
  if (loaded) {
    if (onProgress) onProgress(1);
    return;
  }
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    // 1. Load Font
    try {
      const font = new FontFace(
        'Quietpage',
        'url(/pixel-library-assets/fonts/Quietpage.ttf)'
      );
      const loadedFont = await font.load();
      document.fonts.add(loadedFont);
    } catch (e) {
      console.warn('FontFace loading error, fallback might be used:', e);
    }

    // 2. Load Images
    const keys = Object.keys(IMAGE_PATHS) as ImageKey[];
    const total = keys.length;
    let completed = 0;

    await Promise.all(
      keys.map(async (key) => {
        const img = await loadImage(IMAGE_PATHS[key]);
        images[key] = img;
        completed += 1;
        if (onProgress) {
          onProgress(completed / total);
        }
      })
    );

    loaded = true;
  })();

  return loadingPromise;
}

export function getImage(key: ImageKey): HTMLImageElement {
  const img = images[key];
  if (!img) {
    throw new Error(`Asset '${key}' not loaded yet. Call loadAssets() first.`);
  }
  return img;
}
