# DEFENSIVE ASSETS — INTEGRATION GUIDE
## driftgate-rts | May 14, 2026

---

## STEP 1 — Copy sprite files to public folder

Copy all 19 PNGs from the zip into:
```
public/sprites/buildings/defensive/
```

Full file list:
```
at_gun_01_wheeled_sandbags.png
at_gun_02_zis2_concrete_ring.png
mg_post_01_m2_sandbags.png
mg_post_02_pkm_earthwork.png
tower_01_concrete_searchlight.png
tower_02_scaffold_sandbag.png
tower_03_soviet_brutalist.png
tower_04_steel_lattice.png
tower_05_squat_twin_lights.png
tower_06_sniper_tower.png
tower_07_modular_prefab.png
tower_08_stone_repurposed.png
tower_09_bunker_platform.png
tower_10_nato_sensor.png
wall_01_concrete.png
wall_02_hesco.png
wall_03_sandbag.png
wall_04_corrugated_steel.png
wall_05_dragon_teeth.png
```

All 19 verified: TRUE RGBA alpha, no magenta, no ground shadow, 1024x1024.

---

## STEP 2 — Replace SpriteLoader.js

Replace `src/presentation/SpriteLoader.js` with:
```
patches/defensive_assets/SpriteLoader.updated.js
```

This adds:
- All 19 defensive sprite entries in SPRITE_MAP
- cancelToken parameter to loadSprites() (needed for the game load fix)

---

## STEP 3 — Fix the game load bug (async race condition)

This is why the game isn't loading.

### The bug
`Game_patched.jsx` wraps init in an async IIFE but the cleanup function
is assigned INSIDE the IIFE. In React Strict Mode, cleanup fires before
the IIFE resolves — so `cleanupFn` is still null, cleanup does nothing,
and React fires the effect again. Two game loops start on the same canvas.
Result: black screen or frozen render.

### The fix
Apply `patches/defensive_assets/Game.patch.asyncfix.js`:

1. Add a `cancelToken = { cancelled: false }` at the top of useEffect
2. Pass `cancelToken` to `loadSprites()`
3. After `await loadSprites()`, check `if (cancelToken.cancelled) return;`
4. In the cleanup return, set `cancelToken.cancelled = true` BEFORE `loop?.stop()`

This ensures that if React unmounts the component before sprites finish
loading, the entire async init aborts cleanly with no orphaned game loop.

---

## STEP 4 — Wire defensive structures in STRUCT_DEFS

In `src/content/defs.js`, add entries for any defensive structures you want
placeable in-game. Example:

```js
// AT Guns
at_gun_wheeled: {
  id: 'at_gun_wheeled',
  label: 'AT Gun (Wheeled)',
  category: 'defense',
  sprite: 'structure_at_gun_01_wheeled_sandbags',   // matches SPRITE_MAP key
  footprint: { w: 2, h: 2 },
  hp: 200,
  cost: 400,
  powerDraw: 0,
  faction: 'any',
  mountPoints: [{ x: 0.5, y: 0.5, arc: 360 }],
  garrisonSlots: 1,
},

at_gun_zis2: {
  id: 'at_gun_zis2',
  label: 'ZiS-2 AT Gun',
  category: 'defense',
  sprite: 'structure_at_gun_02_zis2_concrete_ring',
  footprint: { w: 2, h: 2 },
  hp: 280,
  cost: 550,
  powerDraw: 0,
  faction: 'soviet',
  mountPoints: [{ x: 0.5, y: 0.5, arc: 360 }],
  garrisonSlots: 1,
},

mg_post_m2: {
  id: 'mg_post_m2',
  label: 'M2 MG Post',
  category: 'defense',
  sprite: 'structure_mg_post_01_m2_sandbags',
  footprint: { w: 1, h: 1 },
  hp: 120,
  cost: 200,
  powerDraw: 0,
  faction: 'player',
  mountPoints: [{ x: 0.5, y: 0.5, arc: 180 }],
  garrisonSlots: 1,
},

// Towers — pick which ones suit each faction
tower_concrete: {
  id: 'tower_concrete',
  label: 'Concrete Watch Tower',
  category: 'defense',
  sprite: 'structure_tower_01_concrete_searchlight',
  footprint: { w: 1, h: 1 },
  hp: 350,
  cost: 600,
  powerDraw: 5,
  faction: 'any',
  mountPoints: [{ x: 0.5, y: 0.0, arc: 360 }],
  garrisonSlots: 1,
},

tower_soviet_brutalist: {
  id: 'tower_soviet_brutalist',
  label: 'Soviet Brutalist Tower',
  category: 'defense',
  sprite: 'structure_tower_03_soviet_brutalist',
  footprint: { w: 1, h: 1 },
  hp: 400,
  cost: 700,
  powerDraw: 0,
  faction: 'soviet',
  mountPoints: [{ x: 0.5, y: 0.0, arc: 360 }],
  garrisonSlots: 2,
},

// Walls
wall_concrete: {
  id: 'wall_concrete',
  label: 'Concrete Wall',
  category: 'wall',
  sprite: 'structure_wall_01_concrete',
  footprint: { w: 1, h: 1 },
  hp: 500,
  cost: 150,
  powerDraw: 0,
  faction: 'any',
  passable: false,
},

wall_hesco: {
  id: 'wall_hesco',
  label: 'HESCO Barrier',
  category: 'wall',
  sprite: 'structure_wall_02_hesco',
  footprint: { w: 1, h: 1 },
  hp: 300,
  cost: 100,
  powerDraw: 0,
  faction: 'any',
  passable: false,
},
```

---

## STEP 5 — StructureRenderer sprite draw

`StructureRenderer` already receives the `sprites` Map via constructor.
When a structure has a `sprite` field in its def, the renderer should
draw the sprite image instead of placeholder geometry.

Check that `_drawStructure()` includes this pattern:

```js
_drawStructure(structure) {
  const spriteId = structure.spriteId ?? structure.def?.sprite;
  const spriteImg = this._sprites?.get(spriteId);

  if (spriteImg) {
    // Draw sprite image
    const { x: sx, y: sy } = this.camera.tileToScreen(structure.col, structure.row);
    const fw = structure.footprint?.w ?? 2;
    const fh = structure.footprint?.h ?? 2;
    const drawW = fw * TILE_HW * 2 * this.camera.zoom;
    const drawH = drawW; // sprites are square 1024x1024
    this.ctx.drawImage(
      spriteImg,
      sx - drawW / 2,
      sy - drawH * 0.75,  // anchor bottom of sprite to tile center
      drawW,
      drawH
    );
    // Still draw health bar, selection ring etc. on top
    return;
  }

  // fallback: existing placeholder geometry
  // ... existing code ...
}
```

---

## VERIFICATION CHECKLIST

- [ ] public/sprites/buildings/defensive/ contains all 19 PNGs
- [ ] SpriteLoader.js updated with defensive entries + cancelToken
- [ ] Game.jsx async race condition fixed (cancelToken pattern)
- [ ] STRUCT_DEFS has at least one defensive structure with matching sprite key
- [ ] StructureRenderer draws sprite image when spriteImg is found
- [ ] Game loads without black screen in dev mode
- [ ] Spawning a defensive structure shows the sprite, not placeholder geometry
- [ ] Removing a defensive structure works (no orphaned sprite)

---

## SPRITE → FACTION ASSIGNMENT GUIDE

| Sprite | Best Faction |
|--------|-------------|
| at_gun_01_wheeled_sandbags | Allied / Any |
| at_gun_02_zis2_concrete_ring | Soviet |
| mg_post_01_m2_sandbags | Allied |
| mg_post_02_pkm_earthwork | Soviet |
| tower_01_concrete_searchlight | Any |
| tower_02_scaffold_sandbag | Any |
| tower_03_soviet_brutalist | Soviet |
| tower_04_steel_lattice | Any |
| tower_05_squat_twin_lights | Allied |
| tower_06_sniper_tower | Any |
| tower_07_modular_prefab | Allied |
| tower_08_stone_repurposed | Any / Neutral |
| tower_09_bunker_platform | Soviet |
| tower_10_nato_sensor | Allied |
| wall_01_concrete | Any |
| wall_02_hesco | Allied |
| wall_03_sandbag | Any |
| wall_04_corrugated_steel | Any |
| wall_05_dragon_teeth | Soviet / Any |

---
*Marshall — Driftgate Studios | May 14, 2026*
