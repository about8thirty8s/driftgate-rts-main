# DRIFTGATE STUDIOS
# RTS SPRITE PRODUCTION BIBLE — VERSION 1.1
# Authored by Marshal, Studio President
# Created: 2026-05-14 | Updated: 2026-05-20
# Status: CANONICAL — supersedes all prior asset standards

---

## PART 0: PRIME DIRECTIVE

A good RTS asset is NOT impressive artwork in isolation.

A good RTS asset is:
- readable at gameplay zoom (128×128 display target)
- correctly angled (45–60° isometric, no deviation)
- correctly scaled relative to other units
- trivial to place in-engine (defined anchor, no guesswork)
- animatable where gameplay requires it
- consistent with faction identity
- useful for gameplay decision-making

Every asset decision is filtered through this lens. Art quality is secondary to gameplay readability.

---

## PART 1: CAMERA STANDARD

### Isometric Angle
- **Projection:** 2:1 isometric (45° horizontal rotation, ~26.57° vertical tilt)
- **Practical render angle:** 45–60° from ground plane
- **All assets must be consistent to this single viewpoint. No exceptions.**
- North = upper-center of screen
- East = right
- South = lower-center
- West = left

### Failure Modes — Reject Immediately
- Any asset with a "portrait" or front-elevation perspective
- Any asset where the top of the unit is not visible
- Any asset where vertical tilt exceeds 35° (looks too side-on)
- Any asset that looks correct when displayed upright like a photo
- Any asset where N and S faces look front-on rather than top-down

### Scale Reference (world units)
| Unit Type       | Display Size (px, 128px tile) | World Footprint |
|----------------|-------------------------------|-----------------|
| Infantry        | ~32×48px                      | 0.5×0.5 tiles   |
| Light vehicle   | ~48×64px                      | 1×1 tiles       |
| Tank (MBT)      | ~64×80px                      | 1.5×1.5 tiles   |
| Large vehicle   | ~80×96px                      | 2×2 tiles       |
| Small building  | ~96×96px                      | 2×2 tiles       |
| Medium building | ~128×128px                    | 3×3 tiles       |
| Large building  | ~160×160px                    | 4×4 tiles       |

---

## PART 2: RENDER LAYER ORDER

All units rendered in this strict order, bottom to top:

```
Layer 0: Terrain / Ground
Layer 1: Decals (tire tracks, craters, blood)
Layer 2: Unit shadow (programmatic or baked)
Layer 3: Unit hull / body base
Layer 4: Unit turret / weapon layer (vehicles)
Layer 5: Team color overlay
Layer 6: Damage overlay
Layer 7: Effects (muzzle flash, smoke, fire)
Layer 8: Selection circle / health bar UI
Layer 9: World-space UI (flags, icons, waypoints)
```

---

## PART 3: VEHICLE ASSET STANDARD

### MVP Layers (required for production)
1. **Hull / chassis** — body, tracks, no turret
2. **Turret + barrel baked together** — one sprite per direction, barrel NOT separated at MVP
3. **Programmatic shadow** — rendered by engine, not baked into sprite
4. **Damage overlay** — scorches, holes, fire FX
5. **Destroyed wreck** — collapsed hull, static

### Deferred (not MVP)
- Separate barrel layer (recoil, elevation)
- Exhaust FX sprite
- Mud/terrain accumulation overlay
- Veteran badge overlay

### Why barrel is NOT separated at MVP
- Prevents anchor drift between hull and barrel
- Prevents lighting/shading mismatch
- Removes transform bugs from pivot misalignment
- Provides zero gameplay value until recoil or elevation is implemented

### Directions Required
8-directional minimum: N, NE, E, SE, S, SW, W, NW
Hull and turret are separate sprite sets, each 8 directions.
Total sprites per vehicle: 8 hull + 8 turret = **16 sprites minimum**

### VEHICLE GENERATION STRATEGY — 6+2 RULE (MANDATORY)

AI diffusion models (DALL-E 3 and equivalents) reliably produce diagonal views
but consistently fail on true cardinal (N/S) directions — generating front-on
portraits instead of top-down isometric.

**Approved production method: Generate 6, derive 2.**

Generate these 6 directions via AI or 3D render:
- NE, E, SE, SW, W, NW (diagonals + true laterals)

Derive these 2 via engine-side direction snapping:
- N → snap to NW sprite
- S → snap to SW sprite

This avoids perspective drift while maintaining 8-direction gameplay.

**Long-term target:** Blender-based 3D render pipeline for all 8 vehicle directions.
Blender eliminates the N/S drift problem entirely. AI generation is a bridge, not a destination.

### Required Documentation Per Vehicle
```
unit_id:              (e.g. vehicle_t72)
display_name:         (e.g. T-72 Main Battle Tank)
faction:              (allied | soviet | neutral)
era:                  (e.g. 1973–1991)
sprite_size_px:       (e.g. 128×128 canvas, 80×96 asset bounding box)
scale_factor:         (world units per pixel)
hull_origin:          (center-bottom of hull sprite, world anchor)
turret_pivot:         (pixel offset from hull origin, where turret rotates)
muzzle_flash_origin:  (pixel offset from turret_pivot, tip of barrel)
projectile_spawn:     (same as muzzle_flash_origin + direction vector)
selection_radius:     (world units)
collision_footprint:  (W×H in world units)
render_layer_hull:    3
render_layer_turret:  4
direction_snap_map:   { N: NW, S: SW }  (if using 6+2 strategy)
animation_states:
  - idle (hull: static, turret: static)
  - move (hull: track animation, turret: static)
  - attack (hull: static, turret: fire → muzzle flash → reload)
  - damaged (hull: smoke overlay, all states continue)
  - destroyed (hull: wreck frame, turret: collapsed or absent)
damage_thresholds:
  - healthy:  100–60% HP
  - damaged:  59–25% HP (smoke FX)
  - critical: 24–1%  HP (fire FX)
  - dead:     0 HP   (wreck, no selection)
production_exit_point: (tile offset from structure rally point)
ui_icon:              (64×64 PNG, faction-colored border)
```

### Modularity That Multiplies Value
Same hull chassis supports multiple turret variants:
- Cannon turret (MBT)
- Missile turret (ATGM)
- AA turret (ZSU-style)
- Flame turret
- Artillery turret
- Blank/transport (APC/IFV variant)

Build hull once. Swap turrets. Multiple units for near-zero additional cost.

---

## PART 4: INFANTRY ASSET STANDARD

### MVP Layers (required)
1. **Body sprite / animation frames** — full unit, weapon visible
2. **Weapon read** — weapon type must be identifiable at gameplay zoom
3. **Shadow** — programmatic preferred
4. **Death frame / corpse** — static fallen sprite
5. **Team color zone** — helmet, vest, or armband tinted by faction

### Deferred
- Separate weapon layer
- Prone state
- Garrison (inside building) state
- Wounded crawl state
- Upgraded weapon overlay

### Directions Required
Infantry: 8-directional walk cycle minimum
Frames per direction: 4–6 walk frames, 2–4 attack frames, 1 death frame
Total frames per infantry unit: ~60–80 frames
MVP acceptable: 4-frame walk loop per direction

### Readability Test
At 32×48 display size, player must immediately identify:
- **Role** — rifleman vs rocket vs engineer vs sniper
- **Faction** — color palette, uniform style
- **Direction** — facing vector
- **Weapon type** — rifle vs launcher vs tool vs nothing
- **Threat level** — elite vs conscript vs support

### Required Infantry Units for First Playable
| Unit             | Faction | Weapon Read          | Priority |
|-----------------|---------|----------------------|----------|
| GI Rifleman      | Allied  | M16 rifle            | 🔴 P0    |
| Soviet Conscript | Soviet  | AK-47                | 🔴 P0    |
| Combat Engineer  | Allied  | Tool + pistol        | 🟡 P1    |
| RPG Crew         | Soviet  | RPG-7 tube           | 🟡 P1    |
| Army Ranger      | Allied  | M16 + LAW            | 🟢 P2    |
| Spetsnaz         | Soviet  | AK-74 + RPG          | 🟢 P2    |

### Required Documentation Per Infantry Unit
```
unit_id:
display_name:
faction:
sprite_size_px:       (e.g. 64×96 canvas, 28×44 asset bounding box)
anchor_point:         center-bottom of feet
team_color_zone:      (pixel region that receives faction tint)
animation_states:
  - idle (breathing loop, 2–4 frames)
  - walk (4–6 frames per direction)
  - attack (2–4 frames, weapon fire visible)
  - death (1–2 frames, corpse static)
damage_thresholds:
  - healthy:  no overlay
  - damaged:  blood/dirt sprite
  - dead:     corpse frame, no selection
selection_radius:     0.4 world units
collision_footprint:  0.4×0.4 world units
ui_icon:              64×64 PNG
```

---

## PART 5: BUILDING ASSET STANDARD

### MVP Layers (required)
1. **Base structure** — full building, correct angle
2. **Shadow** — programmatic or separated layer
3. **Active-state overlays** — only if gameplay requires (radar spin, factory door, lights)
4. **Damage overlay** — scorches, holes, partial collapse
5. **Destroyed rubble** — static wreck

### Buildings must ALWAYS be:
- Bottom-anchored (center-bottom of footprint = world anchor)
- Tightly cropped to bounding box — no padding that causes placement offset
- Bottom-heavy in mass distribution (~60% mass below center line)
- Free of alpha fringing, halos, or colour-bleed edges

### Alpha Quality Standard for Buildings
All building sprites must pass this checklist before integration:
- [ ] True RGBA alpha — no baked background, no checkerboard
- [ ] No magenta fringe (R>180, G<80, B>180 at any alpha)
- [ ] No dark halo (near-black semi-transparent border pixels)
- [ ] No colour-bleed anti-aliasing from previous background
- [ ] 1px Gaussian alpha-feather applied to all edges
- [ ] Visually confirmed clean on BOTH green and white background composites

### Animated Parts — Only Separate When Gameplay Requires
| Part             | Separate Layer? | Reason                          |
|-----------------|-----------------|----------------------------------|
| Radar dish       | YES             | Rotates during active state     |
| Factory door     | YES             | Opens during unit production    |
| Construction      | YES             | Build states progress           |
| Smoke stack      | FX ONLY         | Particle, not sprite layer      |
| Crane            | YES if visible  | Moves during construction       |
| Turret (pillbox) | YES             | Rotates to track enemies        |
| Lights           | FX ONLY         | Shader/blink, not sprite layer  |
| Static walls     | NO              | Never separate                  |
| Roof detail      | NO              | Never separate                  |

### Required Documentation Per Building
```
structure_id:
display_name:
faction:
grid_size:            (e.g. 3×3 tiles)
footprint_px:         (pixel bounding box, tight crop)
anchor_point:         center-bottom
entrance_tile:        (which grid tile has the entrance, for unit pathing)
rally_point_origin:   (tile offset from entrance, where produced units appear)
production_exit_point:(exact pixel/world offset)
selection_bounds:     (W×H world units)
power_usage:          (negative = consumes, positive = generates)
tech_unlocks:         [list of unit IDs this building enables]
build_states:
  - ghost (placement preview, translucent)
  - construction_0 (25% built, scaffolding)
  - construction_1 (50% built)
  - construction_2 (75% built)
  - complete (full structure)
damage_thresholds:
  - healthy:   100–60%
  - damaged:   59–25% (smoke)
  - critical:  24–1%  (fire + smoke)
  - destroyed: rubble only
animated_parts:       [list of separated layers if any]
ui_icon:              64×64 PNG
```

### First Playable Buildings Required
| Building              | Faction   | Grid  | Priority |
|----------------------|-----------|-------|----------|
| Construction Yard     | Both      | 3×3   | 🔴 P0    |
| Power Plant           | Both      | 2×2   | 🔴 P0    |
| Barracks              | Both      | 2×3   | 🔴 P0    |
| War Factory           | Both      | 3×3   | 🔴 P0    |
| Ore Refinery          | Both      | 3×2   | 🔴 P0    |

### Existing Building Inventory (as of May 2026)
| Asset                          | Pack      | Status              | Action          |
|-------------------------------|-----------|---------------------|-----------------|
| building_01_command_center     | General   | Usable              | Crop + integrate|
| building_02_power_plant        | General   | Usable              | Crop + integrate|
| building_03_barracks           | General   | Usable              | Crop + integrate|
| building_04_pillbox            | General   | Usable (defensive)  | Defer           |
| building_05_sandbags           | General   | Regenerate          | Wrong scale     |
| building_06_vehicle_factory    | General   | Usable              | Crop + integrate|
| building_07_tech_center        | General   | Move to Allied      | Rename          |
| building_08_comms_facility     | General   | Usable              | Crop + integrate|
| building_09_airfield           | General   | Defer (post FP)     | Not P0          |
| building_10_naval_yard         | General   | Defer (post FP)     | Not P0          |
| building_11_antitank_bunker    | General   | Usable (defensive)  | Defer           |
| soviet_01–09                   | Soviet    | Usable (most)       | Crop + integrate|
| soviet_06_comms_facility       | Soviet    | Regenerate          | Wrong angle     |
| bunker_01–10                   | Defensive | Clean (May 2026)    | Defer to P1     |
| mg_01–10                       | Defensive | Clean (May 2026)    | Defer to P1     |
| at_gun_01–02                   | Defensive | Clean (May 2026)    | Defer to P1     |
| tower_01–10                    | Defensive | Clean (May 2026)    | Defer to P1     |
| wall_01–05                     | Defensive | Clean (May 2026)    | Defer to P1     |

---

## PART 6: AIRCRAFT ASSET STANDARD

### MVP Layers
1. **Body** — full aircraft, correct isometric angle
2. **Rotor / propeller** — separate layer if animated
3. **Programmatic shadow** — independently positioned (altitude-aware)
4. **Weapon hardpoints** — only if visually distinct at gameplay zoom
5. **Damage state** — smoke overlay
6. **Wreck / crash** — debris sprite, ground-level

### Key Differences from Ground Units
- Shadow is altitude-offset from body (must be separate + controllable)
- Rotor must be separate if spinning (helicopters)
- Fixed-wing aircraft may use a single baked sprite if banking is not animated
- Aircraft do NOT use selection circles — use selection rings instead

### Required Documentation Per Aircraft
```
unit_id:
display_name:
faction:
sprite_size_px:
anchor_point:         center of body sprite (not bottom — aircraft floats)
shadow_offset:        (x,y pixel offset from anchor, altitude-dependent)
rotor_pivot:          (if applicable)
weapon_hardpoints:    [pixel offsets for weapon spawn points]
selection_ring_radius:
altitude:             (low | medium | high — affects shadow distance)
animation_states:
  - fly (rotor loop or banking frames)
  - attack (weapon fire)
  - damaged (smoke trail)
  - crash (debris sequence)
```

---

## PART 7: NAVAL ASSET STANDARD

**STATUS: DEFERRED. Do not begin until first land skirmish is playable.**

When the time comes:
- Hull layer
- Turret/weapon layer if applicable
- Wake FX (particle, not sprite)
- Damage state
- Sinking/debris state

---

## PART 8: FX ASSET STANDARD

### First Playable FX (minimum viable)
| Effect          | Frames | Size       | Priority |
|----------------|--------|------------|----------|
| Muzzle flash    | 3      | 32×32      | 🔴 P0    |
| Small explosion | 6      | 64×64      | 🔴 P0    |
| Unit death      | 4      | 48×48      | 🔴 P0    |
| Smoke loop      | 4      | 32×32      | 🔴 P0    |
| Building rubble | 1      | Match bldg | 🔴 P0    |
| Hit flash       | 2      | 16×16      | 🟡 P1    |
| Crater decal    | 1      | 64×64      | 🟡 P1    |
| Blood/dirt      | 1      | 24×24      | 🟡 P1    |

---

## PART 9: ALPHA & EDGE QUALITY STANDARD

All sprites must pass a two-stage cleanup before engine integration:

### Stage 1: Pixel Audit
Using PIL/NumPy or equivalent, scan for:
- Strong magenta: R>180, G<80, B>180 at any alpha → zero alpha
- Soft fringe: R>130, G<110, B>130, alpha 5–200 → zero alpha
- Dark halo: R<60, G<60, B<60, alpha 10–200 → inspect manually

### Stage 2: Visual Audit
Composite every sprite onto:
1. **Bright green background** — reveals colour-bleed halos
2. **White background** — reveals dark border halos

Only sprites that show a clean silhouette on BOTH backgrounds pass.

### Stage 3: 1px Feather
Apply 1px Gaussian alpha feather to all edges after cleanup.
This restores soft anti-aliasing lost during aggressive alpha erosion.

### Cleanup Script Standard
All batch cleanup must use the production PIL script at:
`.agents/skills/alpha_cleanup.py` (create if not exists)

Parameters:
- `erosion_radius`: 1 (default), 2 (aggressive)
- `feather_radius`: 1 (always apply after erosion)
- `magenta_threshold`: R>180, G<80, B>180
- `fringe_threshold`: R>130, G<110, B>130, A<200

---

## PART 10: FOLDER STRUCTURE

```
sprites/
  units/
    allied/
      rifleman/
        rifleman_N.png ... rifleman_NW.png  (8 dirs)
        rifleman_death.png
        rifleman_icon.png
      tank_m60/
        hull/
          m60_hull_NE.png ... m60_hull_NW.png  (6 generated + 2 derived)
        turret/
          m60_turret_NE.png ... m60_turret_NW.png
        m60_wreck.png
        m60_icon.png
    soviet/
      conscript/
      tank_t72/
        hull/
        turret/
  buildings/
    allied/
    soviet/
    defensive/
    neutral/
  fx/
    explosions/
    muzzle/
    smoke/
    death/
    decals/
  ui/
    icons/
    hud/
```

---

## PART 11: NAMING CONVENTIONS

### Units
`{faction}_{role}_{variant}_{direction}.png`
- `allied_rifleman_gi_NE.png`
- `soviet_tank_t72_hull_SW.png`
- `soviet_tank_t72_turret_SW.png`

### Buildings
`{faction}_{type}_{id}.png`
- `allied_barracks_01.png`
- `soviet_war_factory_01.png`
- `defensive_bunker_pillbox_01.png`

### FX
`fx_{type}_{frame}.png`
- `fx_explosion_small_00.png` through `fx_explosion_small_05.png`
- `fx_muzzle_tank_00.png`

### Icons
`icon_{unit_id}.png` — always 64×64 PNG

---

## PART 12: PIVOT & ANCHOR CONVENTIONS

### Ground Units (infantry + vehicles)
- **Anchor:** center-bottom of sprite
- **Meaning:** the world tile position maps to the bottom-center of the unit sprite
- **Turret pivot:** pixel offset from hull anchor (x right, y up from anchor)

### Buildings
- **Anchor:** center-bottom of footprint
- **Must be tightly cropped** — any padding shifts the anchor off the grid

### Aircraft
- **Anchor:** center of body sprite
- **Shadow:** separate offset, not anchored to body

### FX
- **Anchor:** center of effect sprite

---

## PART 13: ENGINE INTEGRATION SPEC FORMAT

Every asset must ship with a JSON spec readable by the engine systems.

```json
{
  "id": "vehicle_t72",
  "type": "vehicle",
  "faction": "soviet",
  "displayName": "T-72 Main Battle Tank",
  "spriteSize": [128, 128],
  "anchor": [64, 112],
  "turretPivot": [64, 76],
  "muzzleOffset": [0, -42],
  "selectionRadius": 1.5,
  "collisionFootprint": [1.4, 1.4],
  "renderLayers": {
    "hull": 3,
    "turret": 4,
    "shadow": 2,
    "damage": 6
  },
  "directionSnapMap": { "N": "NW", "S": "SW" },
  "directions": ["NE", "E", "SE", "SW", "W", "NW"],
  "animationStates": ["idle", "move", "attack", "damaged", "destroyed"],
  "damageThresholds": {
    "healthy": 1.0,
    "damaged": 0.59,
    "critical": 0.24,
    "dead": 0
  },
  "spriteFiles": {
    "hull_NE": "sprites/units/soviet/tank_t72/hull/t72_hull_NE.png",
    "turret_NE": "sprites/units/soviet/tank_t72/turret/t72_turret_NE.png"
  },
  "uiIcon": "sprites/ui/icons/icon_vehicle_t72.png"
}
```

---

## PART 14: FIRST PLAYABLE ASSET CHECKLIST

### Minimum asset set to ship first playable skirmish:

**Units**
- [ ] allied_rifleman — 8-dir walk + death frame
- [ ] soviet_conscript — 8-dir walk + death frame
- [ ] allied_tank_m60 — hull 6-dir + turret 6-dir + wreck
- [ ] soviet_tank_t72 — hull 6-dir + turret 6-dir + wreck ← IN PROGRESS
- [ ] harvester — existing, confirm anchor + integrate

**Buildings**
- [ ] Construction Yard — Allied + Soviet
- [ ] Power Plant — Allied + Soviet
- [ ] Barracks — Allied + Soviet
- [ ] War Factory — Allied + Soviet
- [ ] Ore Refinery — Allied + Soviet

**FX**
- [ ] fx_explosion_small (6 frames)
- [ ] fx_muzzle_tank (3 frames)
- [ ] fx_smoke_loop (4 frames)
- [ ] fx_death_infantry (4 frames)

**Icons**
- [ ] icon for every P0 unit
- [ ] icon for every P0 building

**Alpha Quality**
- [ ] All sprites pass green + white background audit
- [ ] All sprites have 1px feather applied
- [ ] No magenta, no dark halos, no colour bleed

---

## PART 15: ANTI-DRIFT RULES

Do not expand scope until first playable skirmish exists.

If these come up — say: **"Great idea. Not now. First playable first."**

- More factions
- Naval combat
- Air combat (beyond what already exists in engine)
- Superweapons
- Campaign cinematics
- Advanced weather
- Hero units
- Full lore expansion
- Additional art packs (beyond first playable scope)
- Multiplayer
- Mod tools
- New game modes

The only valid work before first playable:
1. Engine integration and bug fixing
2. First playable asset set (Part 14)
3. HUD and win/lose condition
4. Enemy AI producing and attacking
5. Alpha cleanup on existing assets

---

*End of Sprite Production Bible V1.1*
*Driftgate Studios — Internal Document*
*Updated: 2026-05-20*
