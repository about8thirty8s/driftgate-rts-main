# DRIFTGATE STUDIOS
# FIRST PLAYABLE SPRINT PLAN — VERSION 1.1
# Goal: Reach First Playable Skirmish in 4–6 Sessions
# Authored by Marshal, Studio President
# Created: 2026-05-14 | Updated: 2026-05-20
# Status: ACTIVE MISSION

---

## DEFINITION OF DONE

First Playable Skirmish is achieved when a human can:

1. Deploy a Construction Yard (MCV)
2. Build a Power Plant
3. Build a Barracks + War Factory + Refinery
4. Queue and produce infantry and a tank
5. Harvest ore and earn credits
6. Order units to attack an enemy base
7. Enemy AI produces units and attacks back
8. Destroy the enemy Construction Yard to win
9. Lose if your Construction Yard is destroyed

That is the entire scope. Nothing else counts.

---

## GROUND TRUTH — MAY 2026

### Engine Status (driftgate-rts master)
| System               | Status            | Action         |
|----------------------|-------------------|----------------|
| GameLoop.js          | Production ready  | DO NOT TOUCH   |
| SelectionController  | Production ready  | DO NOT TOUCH   |
| IsometricCamera      | Production ready  | DO NOT TOUCH   |
| Pathfinder.js        | Production ready  | DO NOT TOUCH   |
| CombatResolver.js    | Solid             | DO NOT TOUCH   |
| HarvesterSystem.js   | Complete          | DO NOT TOUCH   |
| EnemyAIController    | Complete (3 AI)   | DO NOT TOUCH   |
| VeterancySystem.js   | Complete          | DO NOT TOUCH   |
| BuildSystem.js       | Live              | WIRE UP ONLY   |
| EventBus.js          | Production ready  | DO NOT TOUCH   |
| Unit JSON data layer | Exists            | EXTEND ONLY    |
| Weapon JSON data     | Exists            | EXTEND ONLY    |
| GarrisonSystem.js    | Live              | DEFER          |
| SubterrainSystem.js  | Partial           | DEFER          |
| TrenchSystem.js      | Partial           | DEFER          |

**The engine is largely built. The gap is integration, wiring, and art.**

### Asset Status (as of May 2026)
| Asset                       | Status                          |
|-----------------------------|---------------------------------|
| T-72 tank                   | 6-dir hull + turret generated, needs engine integration |
| General buildings (11)      | Exist, need crop + alpha cleanup |
| Soviet buildings (11)       | Exist, need crop + alpha cleanup |
| Defensive buildings (39)    | Exist, cleaned May 2026, defer to P1 |
| Standalone HTML build       | Working, 216KB, syntax clean    |
| GI Rifleman                 | Not yet created                 |
| Soviet Conscript            | Not yet created                 |
| M60 / Allied tank           | Not yet created                 |
| All FX sprites              | Not yet created                 |

### Environment
- Canonical engine: `driftgate-rts` GitHub repository
- Host environment: Base44 app ID `69c50800b7803bc24570e607`
- Standalone build: `driftgate_standalone.zip` (browser-runnable, no server required via PS1)
- GitHub sync: manual trigger required via Base44 editor

---

## SESSION 1 — ENGINE AUDIT & GAP MAP

**Status: PARTIALLY COMPLETE**
**Time estimate: 1 session**

### Goal
Confirm exactly what works in the running engine and map every gap.

### Tasks
- [x] Pull driftgate-rts master branch
- [x] Confirm GameLoop is ticking
- [x] Confirm camera works
- [x] Confirm SelectionController works
- [x] Confirm HarvesterSystem runs
- [x] Confirm EnemyAIController spawns units
- [ ] Confirm BuildSystem places a building end-to-end
- [ ] Confirm production queue: unit queued → spawns at rally point
- [ ] Confirm combat: unit attacks → HP reduces → death fires
- [ ] Confirm win condition fires when Construction Yard is destroyed
- [ ] Confirm lose condition fires when player Construction Yard is lost
- [ ] Produce written gap list with severities

### Deliverables
- [ ] Gap list: severity P0/P1/P2 for every missing piece
- [ ] Confirm master branch is correct canonical build
- [ ] Archive list: dead/experimental files to remove

### Anti-Drift Check
If any of these tempt you — say no:
- "Let's improve the pathfinder" → No. Test it. Move on.
- "Let's upgrade the AI" → No. Does it attack? Move on.
- "Let's improve the camera" → No. Does it move? Move on.

---

## SESSION 2 — CONSTRUCTION & PRODUCTION LOOP

**Status: NOT STARTED**
**Time estimate: 1 session**

### Goal
Player can build a base and produce units.

### Tasks

**Construction System**
- [ ] MCV / Construction Yard deploys correctly on map start
- [ ] Player can select Construction Yard and open build menu
- [ ] Build menu shows: Power Plant, Barracks, War Factory, Refinery
- [ ] Clicking a building enters placement mode (ghost preview)
- [ ] Building placed on valid tile begins construction timer
- [ ] Construction completes and building becomes active
- [ ] Power system enforces: no power = buildings go offline
- [ ] Credits deducted correctly on build

**Production Queue**
- [ ] Barracks can produce: GI Rifleman, Soviet Conscript
- [ ] War Factory can produce: M60 Tank, T-72
- [ ] Production queue UI shows: unit icon, progress bar, cancel button
- [ ] Produced unit spawns at rally point
- [ ] Rally point can be set by right-clicking

**Economy**
- [ ] Ore Collector spawns with Refinery
- [ ] Harvester completes full loop (ore → refinery → credits)
- [ ] Credit display updates in HUD
- [ ] Player can build additional Ore Collectors from Refinery

### Deliverables
- [ ] Player can build full base from scratch
- [ ] Player can produce at least one infantry and one tank
- [ ] Economy is running

---

## SESSION 3 — COMBAT & WIN/LOSE

**Status: NOT STARTED**
**Time estimate: 1 session**

### Goal
Combat works. Player can win or lose a full game.

### Tasks

**Combat**
- [ ] Infantry attacks enemy unit when in range
- [ ] Tank attacks enemy unit when in range
- [ ] Projectile spawns at correct muzzle point
- [ ] Hit registers and reduces HP
- [ ] Unit dies when HP reaches 0
- [ ] Death triggers corpse/wreck sprite
- [ ] Attack-move command: unit moves and auto-engages enemies

**Enemy AI**
- [ ] Enemy starts with a Construction Yard
- [ ] Enemy builds base (Barracks + War Factory + Refinery)
- [ ] Enemy produces units on a timer
- [ ] Enemy attacks player base
- [ ] Default difficulty: balanced

**Win / Lose**
- [ ] Destroying enemy Construction Yard → WIN screen
- [ ] Losing all Construction Yards → LOSE screen
- [ ] Win/lose screen: result + play again button

### Deliverables
- [ ] One full skirmish playable start to finish
- [ ] Win condition fires correctly
- [ ] Lose condition fires correctly

---

## SESSION 4 — HUD & READABILITY

**Status: PARTIAL — standalone HTML has basic HUD**
**Time estimate: 1 session**

### Goal
Player can understand the game state at a glance without being told anything.

### Tasks

**HUD**
- [ ] Credit counter visible and updating
- [ ] Power meter visible (generated vs consumed)
- [ ] Selected unit panel: name, HP bar, icon, basic stats
- [ ] Multi-select panel: icons of selected units
- [ ] Minimap: terrain + unit dots (Allied blue, Soviet red)
- [ ] Notification system: attack alerts, production complete

**Unit Feedback**
- [ ] Health bar above selected units
- [ ] Damage flash when hit
- [ ] Death animation / flash plays
- [ ] Selection circle visible under selected units
- [ ] Move order shows waypoint marker

**Building Feedback**
- [ ] Production progress bar on building
- [ ] Power offline indicator
- [ ] Construction progress visual (ghost → complete)

**Readability Test**
Sit 1 meter from screen. Can you tell — without being told:
- [ ] Which units are yours vs enemy?
- [ ] Infantry vs tanks?
- [ ] Healthy vs damaged?
- [ ] Your buildings vs enemy buildings?
- [ ] Where your credits are?

### Deliverables
- [ ] First playable is readable without explanation
- [ ] Player understands game state at a glance

---

## SESSION 5 — ASSET INTEGRATION PASS

**Status: NOT STARTED**
**Time estimate: 1 session**

### Goal
First playable assets are in-engine: correctly scaled, anchored, and rendering.

### Asset Priority List

**Units — must exist and work**
| Asset             | Status             | Action                              |
|-------------------|--------------------|-------------------------------------|
| GI Rifleman       | Not created        | Generate 8-dir walk + death frame   |
| Soviet Conscript  | Not created        | Generate 8-dir walk + death frame   |
| M60 / Allied tank | Not created        | Generate 6-dir hull + turret        |
| T-72              | 6-dir sprites done | Audit anchor, JSON spec, integrate  |
| Ore Collector     | Exists in engine   | Confirm anchor, confirm rendering   |

**Buildings — must exist and work**
| Asset             | Status             | Action                              |
|-------------------|--------------------|-------------------------------------|
| Construction Yard | Allied exists      | Soviet variant, crop, integrate     |
| Power Plant       | Both exist         | Crop, alpha clean, integrate        |
| Barracks          | Both exist         | Crop, alpha clean, integrate        |
| War Factory       | Both exist         | Crop, alpha clean, integrate        |
| Ore Refinery      | Both exist         | Crop, alpha clean, integrate        |

**FX — minimum viable**
| Effect            | Status             | Action                              |
|-------------------|--------------------|-------------------------------------|
| Muzzle flash      | Not created        | 3-frame sprite, 32×32               |
| Small explosion   | Not created        | 6-frame sprite, 64×64               |
| Unit death        | Not created        | 4-frame, flash + dust               |
| Smoke loop        | Not created        | 4-frame loop, 32×32                 |

### Integration Checklist Per Asset
- [ ] JSON spec written (see Bible Part 13 format)
- [ ] Anchor point set and tested in engine
- [ ] Scale factor correct vs scale reference table
- [ ] Renders at correct layer
- [ ] No alpha fringing visible (green + white bg test passed)
- [ ] Works at min and max camera zoom

### Deliverables
- [ ] All first-playable units render correctly in-engine
- [ ] All first-playable buildings render correctly in-engine
- [ ] Muzzle flash and explosion visible in combat

---

## SESSION 6 — PLAYTEST & HARDENING

**Status: NOT STARTED**
**Time estimate: 1 session**

### Goal
Someone other than the developer plays it for 5 minutes without asking questions.

### Playtest Protocol
- [ ] Play a full game start to finish without any help
- [ ] Record: where did you get confused?
- [ ] Record: what felt broken?
- [ ] Record: what felt good?

### Bug Severity Triage

**Priority 0 — BLOCKER (fix before anything else)**
- Crash or freeze
- Win/lose condition does not fire
- Economy breaks (credits NaN, stuck, or drains incorrectly)
- Units refuse to move or attack

**Priority 1 — BAD (fix before demo)**
- AI does nothing
- Unit spawns inside building
- Building placement allows invalid tiles
- Harvester gets stuck in infinite loop

**Priority 2 — ANNOYING (fix next sprint)**
- UI not updating correctly
- Minor rendering glitch
- Slow pathfinding on large maps

**Priority 3 — POLISH (later)**
- Animation smoothness
- Audio sync
- Minimap accuracy

### Hardening Pass
- [ ] All P0 bugs resolved
- [ ] All P1 bugs resolved or documented with workaround
- [ ] Performance test: 30+ units on screen, stable FPS

### Deliverables
- [ ] First Playable Skirmish is shippable for internal demo
- [ ] Bug log written with P0/P1/P2 triage
- [ ] Next sprint scope defined

---

## AFTER FIRST PLAYABLE — WHAT COMES NEXT

Only after first playable is shipped. In this order:

1. **Balance pass** — unit costs, HP, damage, speed
2. **Map variety** — 2nd map layout
3. **Second infantry unit** per faction (RPG + Engineer)
4. **Defensive structures** — integrate the 39 cleaned assets
5. **Air unit introduction** — Huey vs Mi-24 (engine already exists)
6. **Naval** — deferred until land skirmish is complete
7. **Mods system** — JSON-driven unit/building data exposure
8. **More factions** — only after mod system works
9. **Campaign** — far future

---

## SPRINT SUMMARY

| Session | Focus                        | Status        | Done When...                              |
|---------|------------------------------|---------------|-------------------------------------------|
| 1       | Engine audit & gap map       | Partial       | Gap list written with P0/P1/P2            |
| 2       | Construction & production    | Not started   | Can build base and produce units          |
| 3       | Combat & win/lose            | Not started   | Can play a full game                      |
| 4       | HUD & readability            | Partial       | Player understands game state at a glance |
| 5       | Asset integration            | Not started   | All first-playable assets in engine       |
| 6       | Playtest & hardening         | Not started   | Internal demo ready                       |

**Target: First Playable in 6 focused sessions.**

---

*End of First Playable Sprint Plan V1.1*
*Driftgate Studios — Internal Document*
*Updated: 2026-05-20*
