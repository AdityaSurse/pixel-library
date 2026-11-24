# Pixel Library Assets

The cozy pixel-art asset pack for Pixel Library.

## Specifications
- Native virtual screen size: 320×192
- Recommended integer scale: 4× (1280×768)
- 6 tables, 24 seats (tables 0–5, seats t0s0–t5s3)
- Typography: fonts/Quietpage.ttf (10/20/30/40/60px)
- 68-color palette in ui/palette.json

## Drawing Order
1. `library_bg.png`
2. Far-seat avatars (frames 0–3, facing viewer)
3. Near-seat avatars (frames 4–7, back view)
4. `chair_near.png` drawn over occupied near seats
5. `lighting_overlay.png` blended over room
6. Bubbles and name tags
