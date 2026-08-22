# Driftgate RTS — Terrain & Projection North Star

## Camera contract

- Fixed 2:1 dimetric isometric projection.
- Runtime tile: 128×64 px at zoom 1 (`TILE_HW=64`, `TILE_HH=32`).
- Parallel world axes; no perspective convergence or lens distortion.
- Structure ground contact is the south vertex of its full `w×h` footprint.
- Projected footprint width is `(w + h) × TILE_HW`.
- Every production cutout must expose a documented ground pivot and be checked
  over a visible footprint diamond before integration.

## Terrain contract

- Terrain reads as continuous material across tile boundaries.
- Roads, ramps, cliff strata, water edges and trenches follow the same axes.
- Large forms establish navigation; micro-texture supports them without noise.
- Meridian uses white/graphite/teal expeditionary construction.
- Ashen uses black iron, furnace red and orange heat.
- No floating structures, mixed camera angles, transparent foliage, black
  halos, painted-in UI, illegible scale or unguarded asset failure.

## Production gate

1. Verify alpha and dimensions.
2. Draw the footprint calibration diamond beneath the asset.
3. Validate ground pivot at 0.5×, 1× and 2× zoom.
4. Check square and rectangular footprints.
5. Break one asset deliberately and confirm procedural fallback remains.
6. Boot menu → mission → active battlefield before release.
