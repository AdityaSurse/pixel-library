# Pixel Library: themes and feature pack

Put this folder in `public/pixel-library-themes/`, next to `public/pixel-library-assets/`.

## Libraries (`themes/<id>/`)
classic, vampire, renaissance, midnight, cherry, space, cafe, greathall. Each has:
- `library_bg_day.png` and `library_bg_night.png`: the full room with tables, lamps and empty chairs.
- `lighting_day.png` and `lighting_night.png`: drawn last, over everything.
- `chair_near.png`: drawn again over occupied near seats (same draw order as before).
- `table.png`, `desk_lamp.png`, `chair_far.png`, `palette.json`, and previews at @4x.

Every theme uses the same 320×192 grid and the SAME seat coordinates as `pixel-library-assets/layout.json`.
`themes.json` lists them all.

## Unlockables (`unlockables/`)
- `accessories_sheet.png`: 7 accessories (rows) × 8 frames (columns), 18×22 each, aligned
  to `avatars_sheet.png`. Draw accessory frame N right after avatar frame N.
- `unlockables.json`: which themes, accessories and badges unlock at which milestones.

## Other folders
- `badges/`: 8 milestone badges, plus `lock.png` for locked items.
- `goal-card/`: desk notes (`note`, `note_done`, `note_missed`) and `goal_card_pinned.png` for the UI.
- `leaderboard/`: `rank_1`–`rank_3` medals and a chalkboard frame.
- `heatmap/`: 5 colour levels (`heatmap.json`).
