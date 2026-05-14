# RTS Asset Audit — May 14, 2026
## Driftgate Studios — MARSHAL Review

### Packs Audited
- `RTS_Soviet_Buildings_Alpha_Ready.zip` — 11 assets
- `RTS_Buildings_Alpha_Ready.zip` — 11 assets

### Summary
- Total assets: 22
- Alpha channel: ALL PASS (RGBA, corners transparent)
- Semi-transparent px: 0% across all — hard edge cutouts (no anti-aliasing)
- Resolution: All 1024x1024 ✅
- Baked backgrounds: NONE DETECTED ✅
- Magenta/green/white BG: NONE DETECTED ✅

### Known Issues
1. Zero semi-transparent pixels = hard cut edges (no anti-aliasing) — will look jagged at gameplay scale
2. Large bottom clearance gaps on most assets (15–33% empty canvas below building)
3. soviet_06_comms_facility has 0.4 aspect ratio — tall/narrow, possible front-facing
4. Soviet palette is mostly grey/teal, not red-dominant — faction identity concern
5. General pack buildings overlap heavily with Soviet in color/palette
6. No damage variants, construction states, or snow variants

### Folder Structure Recommendation
/assets/rts/buildings/soviet/base/
/assets/rts/buildings/soviet/damaged/
/assets/rts/buildings/soviet/construction/
/assets/rts/buildings/general/base/
/assets/rts/units/
/assets/rts/terrain/
/assets/rts/effects/
/assets/rts/ui/
