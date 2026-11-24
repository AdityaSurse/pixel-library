# Pixel Library — Project Rules & Architecture Mandates

> [!IMPORTANT]
> These rules are absolute and mandatory for every subsequent development phase of **Pixel Library**. No pull request, commit, or subagent task may deviate from these specifications.

---

## Mandate 1: Asset Isolation & Sovereign Design System

1. **Exclusive Asset Directory**: ALL visual and audio assets MUST be sourced exclusively from `public/pixel-library-assets/`.
2. **Zero External Visuals**:
   - **NEVER** import or reference external image URLs or CDNs.
   - **NEVER** install third-party icon libraries (e.g., FontAwesome, Lucide, Heroicons, Feather).
   - **NEVER** use emojis as functional UI controls, icons, or buttons. All icons must be drawn from `public/pixel-library-assets/icons/` or `icons_sheet@4x.png`.
   - **NEVER** add stock art, 3D models, SVG icons, or unvetted bitmap graphics.
3. **No CSS Frameworks**:
   - **NEVER** install or use Tailwind CSS, Bootstrap, Chakra UI, Material UI, or any other external CSS framework.
   - Write standard, vanilla CSS or scoped CSS modules utilizing the project's native CSS variables.

---

## Mandate 2: Typography & Font Sizing Law

1. **Single Universal Font**: ALL text in the application—including headers, tooltips, dialogs, buttons, timer displays, and badges—MUST use `fonts/Quietpage.ttf` (`font-family: Quietpage, monospace`).
2. **No Google Fonts or System Fonts**: Never load external web fonts or fall back to system fonts in the live UI.
3. **Fixed Pixel Grid Font Sizes**:
   Quietpage is a handcrafted bitmap font. To prevent sub-pixel blurring, distortion, and misaligned baselines, text size is strictly restricted to these five discrete values:
   - **`10px`**: Status tags, coordinate hints, micro-labels, and metadata badges.
   - **`20px`**: Standard body text, button labels, seat tooltips, and modal messages.
   - **`30px`**: Subheadings, section titles, and modal headers.
   - **`40px`**: Page titles, primary banners, and room title cards.
   - **`60px`**: The primary Pomodoro timer countdown numbers.
4. **Font Smoothing Disable**: Always enforce `-webkit-font-smoothing: none; font-smooth: never; text-rendering: pixelated;` on elements using Quietpage.

---

## Mandate 3: Pixel-Perfect Rendering & Scaling

1. **Canvas Smoothing Disabled**: Every HTML5 `<canvas>` rendering context must explicitly disable smoothing immediately upon acquisition:
   ```typescript
   const ctx = canvas.getContext('2d');
   if (ctx) {
     ctx.imageSmoothingEnabled = false;
   }
   ```
2. **CSS Image Rendering**: All canvases and image tags must enforce crisp nearest-neighbor sampling:
   ```css
   img, canvas {
     image-rendering: pixelated;
     image-rendering: crisp-edges;
   }
   ```
3. **Integer Scaling Only**:
   - The native library reading room resolution is **320 × 192** pixels.
   - The scene must only scale at integer multipliers: **1× (320×192)**, **2× (640×384)**, **3× (960×576)**, or **4× (1280×768)**.
   - Never stretch canvases to fractional or arbitrary aspect ratios that cause pixel shearing or shimmering artifacts.

---

## Mandate 4: Procedural UI & The 68-Color Palette

1. **No Invented Colors**:
   - Every color used in CSS, canvas fills, SVG masks, or borders must originate from `public/pixel-library-assets/ui/palette.json` (extracted from `ui/palette@4x.png`).
   - The foundational semantic tokens are:
     ```css
     :root {
       --bg: #1b1423;     /* Ink-plum night */
       --bg2: #241a2e;    /* Card & drawer panel backdrop */
       --wood: #5c3a26;   /* Warm oak furniture & signboard border */
       --wood-dark: #3a2419;
       --ink: #f1e3c4;    /* Light parchment text */
       --dim: #b9a98a;    /* Muted secondary text & borders */
       --gold: #ffe2a0;   /* Banker's lamp illumination & highlights */
       --red: #d9463b;    /* Tomato focus accent */
       --green: #4fa36a;  /* Break accent & start button */
     }
     ```
2. **Composite UI via 9-Slice**:
   When new dialogue boxes, HUD bars, or card panels are needed, construct them using `public/pixel-library-assets/ui/panel_9slice.png` via CSS `border-image`:
   ```css
   .pixel-panel {
     border: 32px solid transparent;
     border-image: url('/pixel-library-assets/ui/panel_9slice.png') 8 fill / 32px;
     image-rendering: pixelated;
     color: #1b1423;
   }
   ```
   For smaller dialogs, scale down proportionally (e.g., `border: 16px solid transparent; border-image: ... 8 fill / 16px;`).

---

## Mandate 5: Scene Geometry & Strict Z-Order Execution

All spatial positions, tables, chairs, and entrance coordinates must adhere to `public/pixel-library-assets/layout.json`:
- **Native Resolution**: `[320, 192]`
- **Tables**: Exactly 6 tables (ID 0 to 5)
- **Seats**: Exactly 24 seats (4 seats per table: 2 `far`, 2 `near`)

### Sacred Drawing Order
Every frame rendered by the canvas engine MUST follow this sequence without exception:

1. **Layer 1: Background (`library_bg.png`)**
   Draw room walls, floor planks, oak tables, banker's lamps, and empty chairs.
2. **Layer 2: Far-Seat Avatars**
   Render avatars in seats on the `far` side facing the viewer using animation frames `0–3`.
3. **Layer 3: Near-Seat Avatars**
   Render avatars in seats on the `near` side facing away using animation frames `4–7`.
4. **Layer 4: Chair Backrest Occlusion (`chair_near.png`)**
   For EVERY occupied near seat, immediately draw `chair_near.png` on top of the avatar at `seat.chair.x`, `seat.chair.y`. This ensures the oak chair backrest correctly sits in front of the avatar's torso.
5. **Layer 5: Lighting Overlay (`lighting_overlay.png`)**
   Draw across the entire canvas with blend mode to cast warm banker's lamp radiance over tables and scholars.
6. **Layer 6: Interactive Elements & UI Overlay**
   - Click-to-sit hover cursor (`icons/plus.png`).
   - Seated scholar username tags (rendered via `fonts/quietpage_atlas.png` tinted glyphs or crisp bitmap font).
   - Dynamic status bubbles (`bubble_fire.png` for active Pomodoro study, `bubble_coffee.png` for rest breaks).

---

## Mandate 6: Authentication Mandate (Google Only)

1. **Google OAuth Only**:
   - Authentication must use `GoogleAuthProvider` exclusively via `signInWithPopup` or `signInWithRedirect`.
   - **STRICTLY PROHIBITED**: Email/password forms, phone authentication, SMS OTP, or anonymous guest spoofing without Google identity.
2. **Profile Creation**:
   Upon first authentication, users choose:
   - A display username (1–16 characters, sanitized alphanumeric + spaces).
   - One of the 8 avatar presets from `layout.json` (`aditya`, `meera`, `kabir`, `zoya`, `rohan`, `tara`, `ishaan`, `anya`).

---

## Mandate 7: Environment Variables & Secrets Hygiene

1. **No Hard-Coded Keys**:
   - **NEVER** write API keys, Firebase project IDs, or auth secrets directly into source code.
   - All configuration values must be retrieved through Vite environment variables (`import.meta.env.VITE_FIREBASE_*`).
2. **Standard Variable Naming**:
   ```ini
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_DATABASE_URL=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
3. **Template Preservation**:
   Maintain `.env.example` in the project root with placeholder values. Never commit `.env` or `.env.local` to version control.

---

## Mandate 8: TypeScript Rigor & Component Architecture

1. **Strict TypeScript**:
   - `tsconfig.json` must enforce `"strict": true`, `"noImplicitAny": true`, `"noUnusedLocals": true`, and `"noUnusedParameters": true`.
   - No `any` type escapes. Declare explicit interfaces for all state models (`User`, `Seat`, `Room`, `PomodoroTimer`).
2. **Micro-Component Composition**:
   - Keep components concise, focused, and single-purpose (< 150 lines per component where feasible).
   - Separate canvas rendering logic (`CanvasScene.tsx`, `renderLoop.ts`) from React UI overlays and state management hooks.
3. **Clean Code Hygiene**:
   - Delete all unused imports, temporary debugging `console.log` lines, and commented-out dead code before submitting work.
   - Maintain clean modular boundaries between Firebase services (`src/services/firebase.ts`, `src/services/presence.ts`, `src/services/rooms.ts`).

---

*Verified against `public/pixel-library-assets/layout.json` and asset specifications.*
