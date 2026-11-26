// Tab icon follows timer state:
// - Focus: tomato.png rendered on 32x32 canvas, 2x scaled centered at (2,2) with imageSmoothingEnabled = false
// - Break: coffee.png
// - Idle / Paused: restore default /favicon.png
// Caches data URLs and provides clean restore helper

let cachedTomatoUrl: string | null = null;
let cachedCoffeeUrl: string | null = null;

function renderFaviconDataUrl(src: string): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(src);
      return;
    }
    const img = new Image();
    img.src = src;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          // 14x14 icon drawn 2x (28x28) centered at (2, 2)
          ctx.drawImage(img, 2, 2, 28, 28);
          resolve(canvas.toDataURL('image/png'));
          return;
        }
      } catch (err) {
        console.error('Failed to create favicon canvas:', err);
      }
      resolve(src);
    };
    img.onerror = () => resolve(src);
  });
}

export async function preloadTimerFavicons(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!cachedTomatoUrl) {
    cachedTomatoUrl = await renderFaviconDataUrl('/pixel-library-assets/icons/tomato.png');
  }
  if (!cachedCoffeeUrl) {
    cachedCoffeeUrl = await renderFaviconDataUrl('/pixel-library-assets/icons/coffee.png');
  }
}

function setFaviconHref(href: string): void {
  if (typeof document === 'undefined') return;
  let link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
  if (!link) {
    link = document.createElement('link');
    link.type = 'image/png';
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = href;
}

export type TimerFaviconState = 'focus' | 'break' | 'idle' | 'paused';

export function updateTimerFavicon(state: TimerFaviconState): void {
  if (state === 'focus') {
    if (cachedTomatoUrl) {
      setFaviconHref(cachedTomatoUrl);
    } else {
      renderFaviconDataUrl('/pixel-library-assets/icons/tomato.png').then((url) => {
        cachedTomatoUrl = url;
        setFaviconHref(url);
      });
    }
  } else if (state === 'break') {
    if (cachedCoffeeUrl) {
      setFaviconHref(cachedCoffeeUrl);
    } else {
      renderFaviconDataUrl('/pixel-library-assets/icons/coffee.png').then((url) => {
        cachedCoffeeUrl = url;
        setFaviconHref(url);
      });
    }
  } else {
    // idle or paused: restore default /favicon.png
    setFaviconHref('/favicon.png');
  }
}

export function restoreDefaultFavicon(): void {
  setFaviconHref('/favicon.png');
}
