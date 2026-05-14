# DRIFTGATE STUDIOS
# RTS SPRITE PRODUCTION BIBLE — VERSION 1.0
# Authored by Marshal, Studio President
# Date: 2026-05-14
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
Total frames per infantry unit: ~60–80 frames (or simplified 4-frame loop is acceptable for MVP)

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
| Ore Silo              | Both      | 2×2   | 🟡 P1    |
| Pillbox / Bunker      | Both      | 1×1   | 🟡 P1    |
| Radar Dome            | Allied    | 2×2   | 🟢 P2    |
| SAM Site              | Soviet    | 2×2   | 🟢 P2    |

---

## PART 6: AIRCRAFT ASSET STANDARD

### MVP Layers (required)
1. **Body** — full aircraft silhouette
2. **Rotor / propeller** — SEPARATE layer if animated (helicopters)
3. **Programmatic shadow** — altitude-offset ground shadow, engine-controlled
4. **Damage state** — smoke trail
5. **Crash / wreck state** — ground debris

### Key Rule: Aircraft Shadow
Aircraft shadow is ALWAYS programmatic — never baked.
Reason: altitude changes dynamically. A baked shadow is always wrong.
Shadow is rendered at ground-plane level, offset from aircraft world position.

### Helicopters vs Jets
| Type       | Rotor Layer | Shadow Type  | Attack States        |
|-----------|-------------|--------------|----------------------|
| Helicopter | Separate    | Programmatic | Hover + strafe       |
| Jet        | None        | Programmatic | Pass + dive          |
| Bomber     | None        | Programmatic | Pass only            |

### Required Documentation Per Aircraft
```
unit_id:
display_name:
faction:
is_helicopter:        (bool)
is_jet:               (bool)
sprite_size_px:
anchor_point:         center of aircraft body (not ground projected)
shadow_offset:        (world units below aircraft, programmatic)
rotor_pivot:          (if helicopter, pixel center of rotor layer)
weapon_hardpoints:    [list of pixel offsets for missile/bomb spawn]
animation_states:
  - idle (landed or airborne hover)
  - move (banking if jet, hover-translate if helicopter)
  - attack (weapon fire, rotor unchanged)
  - damaged (smoke trail)
  - destroyed (crash sequence → ground debris)
altitude:             (world units above ground, affects shadow offset)
selection_radius:
collision_footprint:
ui_icon:              64×64 PNG
```

---

## PART 7: NAMING CONVENTIONS

### Files
```
{faction}_{type}_{unit}_{layer}_{direction}_{state}.png

Examples:
soviet_vehicle_t72_hull_NE_idle.png
soviet_vehicle_t72_turret_NE_idle.png
soviet_vehicle_t72_hull_SE_move.png
soviet_vehicle_t72_wreck.png
allied_infantry_rifleman_body_S_walk_01.png
allied_building_barracks_base.png
allied_building_barracks_damage_01.png
allied_building_barracks_rubble.png
allied_aircraft_huey_body_NE.png
allied_aircraft_huey_rotor_spin.png
```

### Faction Codes
- `allied` — NATO / US / Western
- `soviet` — Warsaw Pact / Soviet / Proxy
- `neutral` — Civilian / Support / Shared

### Type Codes
- `vehicle` — ground vehicles
- `infantry` — foot soldiers
- `building` — structures
- `aircraft` — air units
- `naval` — sea units
- `fx` — visual effects
- `ui` — interface elements
- `decal` — ground marks

### Directions
N, NE, E, SE, S, SW, W, NW

### States
idle, move, attack, damaged, dead, wreck, ghost, construction_0–3

---

## PART 8: FOLDER STRUCTURE

```
assets/
  units/
    allied/
      infantry/
        rifleman/
          body/         ← 8-dir walk frames
          death/        ← corpse frame
          icon.png
          rifleman.json ← full spec doc
        engineer/
        ranger/
        grenadier/
        stinger/
        marine/
      vehicles/
        jeep/
        m113/
        m60_tank/
        m1_abrams/
        m270_mlrs/
        hmmwv/
      aircraft/
        huey/
        apache/
        f4_phantom/
        a10_warthog/
        b52/
      naval/
        pbr/
        destroyer/
    soviet/
      infantry/
        conscript/
        vietcong/
        spetsnaz/
        rpg_crew/
        strela_aa/
        north_korean/
      vehicles/
        t34/
        t55/
        t72/
          hull/         ← 8-dir hull sprites
          turret/       ← 8-dir turret sprites
          wreck/
          damage/
          icon.png
          t72.json      ← full spec doc
        btr60/
        bmp1/
        zsu23/
        grad/
      aircraft/
        mig15/
        mig21/
        mig29/
        su25/
        mi24_hind/
    neutral/
      support/
        ore_collector/
  buildings/
    allied/
      construction_yard/
      power_plant/
      barracks/
      war_factory/
      refinery/
      radar/
    soviet/
      construction_yard/
      power_plant/
      barracks/
      war_factory/
      refinery/
      sam_site/
    shared/
      ore_silo/
      sandbags/
  fx/
    explosions/
    muzzle_flash/
    smoke/
    fire/
    craters/
    dust/
  ui/
    icons/
    hud/
    cursors/
  terrain/
    tiles/
    decals/
```

---

## PART 9: ANTI-DRIFT RULES

### Before First Playable, These Are Banned
- New factions
- Naval combat expansion
- Hero units
- Campaign cinematics
- Weather systems
- Superweapons
- Advanced lore documents
- New art packs beyond first playable checklist
- Additional unit rosters

### If Requested, Response Is
> "Great idea. Not now. First playable first."

### What Is NOT Banned
- Fixing broken systems in driftgate-rts
- Improving existing assets to meet production standard
- Writing specs and JSON for units already in first playable scope
- Documenting engine integration requirements
- Sprint planning

### Do NOT Rebuild These Systems
- GameLoop
- Pathfinder
- IsometricCamera
- SelectionController
- HarvesterSystem
- CombatResolver
- EnemyAIController
- VeterancySystem

Touch only to fix bugs or add a required first-playable hook.

---

## PART 10: PRODUCTION READINESS CHECKLIST

An asset is production-ready when ALL of these are true:

### Visual
- [ ] Correct 45–60° isometric angle — no drift
- [ ] True RGBA alpha transparency — no baked background
- [ ] 1px soft-edge anti-aliasing applied
- [ ] Tight bounding box crop (no excessive padding)
- [ ] Readable at 64px and 128px display sizes
- [ ] Silhouette clearly communicates role

### Technical
- [ ] Correct naming convention applied
- [ ] Placed in correct folder structure
- [ ] JSON spec document complete (all fields filled)
- [ ] Anchor point defined and tested
- [ ] Damage states exist (at minimum: healthy + destroyed)
- [ ] UI icon exists (64×64)
- [ ] Engine integration notes written

### Gameplay
- [ ] Role is clear at gameplay zoom
- [ ] Faction identity is visible
- [ ] Direction is readable for 8-directional movement
- [ ] Weapon type is identifiable

---

## PART 11: FIRST PLAYABLE ASSET CHECKLIST

The minimum asset set to reach first playable skirmish:

### Units
- [ ] GI Rifleman — Allied infantry, 8-dir
- [ ] Soviet Conscript — Soviet infantry, 8-dir
- [ ] M60 Patton or M1 Abrams — Allied tank, 8-dir hull + turret
- [ ] T-72 — Soviet tank, 8-dir hull + turret
- [ ] Ore Collector — both factions, 4-dir minimum

### Buildings
- [ ] Construction Yard — Allied + Soviet variants
- [ ] Power Plant — Allied + Soviet variants
- [ ] Barracks — Allied + Soviet variants
- [ ] War Factory — Allied + Soviet variants
- [ ] Ore Refinery — Allied + Soviet variants

### FX
- [ ] Cannon muzzle flash
- [ ] Small explosion
- [ ] Medium explosion
- [ ] Unit death flash
- [ ] Smoke (looping)

### UI
- [ ] Unit icons for all first-playable units (64×64)
- [ ] Building icons for all first-playable buildings (64×64)
- [ ] Health bar sprites
- [ ] Credit counter
- [ ] Basic HUD frame

---

*End of Sprite Production Bible V1.0*
*Driftgate Studios — Internal Document*
*All decisions override prior informal standards*
