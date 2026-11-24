import { getImage } from '../../engine/assets';
import { drawAvatar, drawChairNear } from '../../engine/sprites';

// Fixed window sky coordinates identified from library_bg.png
const WINDOW_STARS = [
  { x: 132, y: 18 },
  { x: 146, y: 22 },
  { x: 184, y: 16 },
  { x: 198, y: 24 },
  { x: 24, y: 16 },
  { x: 296, y: 18 },
  { x: 126, y: 28 },
  { x: 190, y: 30 },
];

// 8 dust motes floating inside lamp glows
// Lamps: Table 0 (60, 91), Table 1 (160, 91), Table 2 (260, 91), Table 3 (60, 147), Table 4 (160, 147), Table 5 (260, 147)
interface DustMote {
  lampX: number;
  lampY: number;
  offsetX: number;
  height: number;
  speed: number;
  phase: number;
}

const DUST_MOTES: DustMote[] = [
  { lampX: 60, lampY: 91, offsetX: -6, height: 26, speed: 0.007, phase: 0 },
  { lampX: 60, lampY: 91, offsetX: 5, height: 22, speed: 0.009, phase: 1200 },
  { lampX: 160, lampY: 91, offsetX: -7, height: 28, speed: 0.006, phase: 750 },
  { lampX: 160, lampY: 91, offsetX: 6, height: 24, speed: 0.008, phase: 2100 },
  { lampX: 260, lampY: 91, offsetX: -5, height: 25, speed: 0.007, phase: 1500 },
  { lampX: 260, lampY: 91, offsetX: 6, height: 27, speed: 0.010, phase: 450 },
  { lampX: 160, lampY: 147, offsetX: -4, height: 24, speed: 0.008, phase: 1800 },
  { lampX: 260, lampY: 147, offsetX: 5, height: 26, speed: 0.006, phase: 3200 },
];

// Hard 3-step breathing opacity values between 0.85 and 1.0 (never smooth)
const BREATHING_OPACITIES = [0.85, 0.925, 1.0, 0.925];

export function renderLandingScene(ctx: CanvasRenderingContext2D, timeMs: number): void {
  try {
    const bg = getImage('bg');
    const light = getImage('light');

    // 1. Layer 1: Background
    ctx.drawImage(bg, 0, 0);

    // 2. Layer 2: Far-seat Avatars (Presets 1 and 3, facing viewer, 2 fps study frames 0 and 1)
    const farFrameA = Math.floor((timeMs / 500) % 2); // 2 fps = 500ms per frame
    const farFrameB = (farFrameA + 1) % 2; // subtle offset so they don't sync mechanically

    // Reader 1: Preset 1 (meera) at table 0 seat t0s0 (x: 38, y: 71)
    drawAvatar(ctx, 1, farFrameA, 38, 71);

    // Reader 2: Preset 3 (zoya) at table 1 seat t1s1 (x: 164, y: 71)
    drawAvatar(ctx, 3, farFrameB, 164, 71);

    // 3. Layer 3: Near-seat Avatars (Preset 5, facing away, 2 fps study frames 4 and 5)
    const nearFrame = 4 + farFrameA;
    // Reader 3: Preset 5 (tara) at table 2 seat t2s2 (x: 238, y: 91, chair: 238, 108)
    drawAvatar(ctx, 5, nearFrame, 238, 91);

    // 4. Layer 4: Chair Backrest Occlusion (chair_near.png) over occupied near seat
    drawChairNear(ctx, 238, 108);

    // 5. Layer 5: Lighting Overlay with breathing lamp glow in 3 hard steps
    const stepIdx = Math.floor(timeMs / 700) % 4;
    const breatheAlpha = BREATHING_OPACITIES[stepIdx];
    ctx.globalAlpha = breatheAlpha;
    ctx.drawImage(light, 0, 0);
    ctx.globalAlpha = 1.0;

    // 6. Ambient Life: Twinkle 1-2 random pixels in window skies using palette 'star' (#fff0b0)
    const starCycle = Math.floor(timeMs / 400);
    const star1 = WINDOW_STARS[starCycle % WINDOW_STARS.length];
    const star2 = WINDOW_STARS[(starCycle * 3 + 2) % WINDOW_STARS.length];

    ctx.fillStyle = '#fff0b0'; // palette star
    ctx.fillRect(star1.x, star1.y, 1, 1);
    if (starCycle % 2 === 0) {
      ctx.fillRect(star2.x, star2.y, 1, 1);
    }

    // 7. Ambient Life: Float 6-8 single-pixel dust motes in palette 'light' (#ffe2a0)
    ctx.fillStyle = '#ffe2a0'; // palette light / gold
    for (let i = 0; i < DUST_MOTES.length; i++) {
      const mote = DUST_MOTES[i];
      const progress = ((timeMs * mote.speed + mote.phase) % 1000) / 1000;
      const y = mote.lampY - progress * mote.height;
      const sway = Math.sin((timeMs / 800) + mote.phase) * 1.5;
      const x = mote.lampX + mote.offsetX + sway;

      // Draw single crisp pixel
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }

    // 8. Dim scene to ~70% behind the sign so the signboard reads clearly
    ctx.fillStyle = 'rgba(27, 20, 35, 0.32)'; // palette ink veil
    ctx.fillRect(0, 0, 320, 192);
  } catch {
    // Assets still loading
  }
}
