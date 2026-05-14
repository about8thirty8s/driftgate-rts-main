# DRIFTGATE STUDIOS
# FIRST PLAYABLE SPRINT PLAN
# Goal: Reach First Playable Skirmish in 4–6 Sessions
# Authored by Marshal, Studio President
# Date: 2026-05-14

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

## CONFIRMED EXISTING SYSTEMS (DO NOT REBUILD)

From driftgate-rts master audit:

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

**The engine is largely built. The gap is integration and art.**

---

## SESSION 1 — ENGINE AUDIT & GAP MAP

**Time estimate: 1 session**

### Goals
- Pull driftgate-rts master branch
- Run it. What actually renders? What breaks?
- Map every gap between existing systems and first playable
- Produce a written gap list with severities

### Tasks
1. Boot driftgate-rts locally or in sandbox
2. Identify what renders (terrain? units? buildings?)
3. Confirm GameLoop is ticking
4. Confirm camera works
5. Confirm one unit can be selected and ordered to move
6. Confirm harvester completes one full loop
7. Confirm enemy AI spawns at least one unit

### Deliverables
- [ ] Gap list: what is missing vs what exists
- [ ] Confirm master branch is the correct build
- [ ] List of files that are dead/experimental (to archive)
- [ ] Confirm BuildSystem can place a building and produce a unit

### Anti-Drift Check
If any of these tempt you — say no:
- "Let's improve the pathfinder" → No. Test it. Move on.
- "Let's upgrade the AI" → No. Does it attack? Good. Move on.
- "Let's improve the camera" → No. Does it move? Good. Move on.

---

## SESSION 2 — CONSTRUCTION & PRODUCTION LOOP

**Time estimate: 1 session**

### Goal
Player can build a base and produce units.

### Prerequisite
Session 1 gap list complete.

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

**Time estimate: 1 session**

### Goal
Combat works. Player can win or lose.

### Tasks

**Combat**
- [ ] Infantry attacks enemy unit when in range
- [ ] Tank attacks enemy unit when in range
- [ ] Projectile spawns at correct muzzle point
- [ ] Hit registers and reduces HP
- [ ] Unit dies when HP reaches 0
- [ ] Death triggers corpse/wreck sprite
- [ ] Attack-move command works: unit moves and auto-engages enemies

**Enemy AI**
- [ ] Enemy starts with a Construction Yard
- [ ] Enemy builds a base (Barracks + War Factory + Refinery)
- [ ] Enemy produces units on a timer
- [ ] Enemy attacks player base
- [ ] AI difficulty is set to "balanced" by default

**Win / Lose**
- [ ] Destroying enemy Construction Yard triggers WIN screen
- [ ] Losing all Construction Yards triggers LOSE screen
- [ ] Win/lose screen shows: result, play again button

### Deliverables
- [ ] One full skirmish can be played start to finish
- [ ] Win condition triggers correctly
- [ ] Lose condition triggers correctly

---

## SESSION 4 — HUD & BASIC READABILITY

**Time estimate: 1 session**

### Goal
Player can understand what is happening on screen.

### Tasks

**HUD**
- [ ] Credit counter visible and updating
- [ ] Power meter visible (power generated vs consumed)
- [ ] Unit count visible (optional but helpful)
- [ ] Selected unit panel: name, HP bar, icon, basic stats
- [ ] Multi-select panel: shows icons of selected units
- [ ] Minimap: shows terrain + unit dots (Allied blue, Soviet red)

**Unit Feedback**
- [ ] Health bar appears above selected units
- [ ] Damage flash when unit is hit
- [ ] Death animation or flash plays
- [ ] Selection circle visible under selected units
- [ ] Move order shows waypoint marker

**Building Feedback**
- [ ] Production progress bar on building
- [ ] Power offline indicator on building
- [ ] Construction progress visual

**Readability Test**
Sit 1 meter from screen. Can you tell:
- [ ] Which units are yours vs enemy?
- [ ] Which units are infantry vs tanks?
- [ ] Which units are healthy vs damaged?
- [ ] Which buildings are yours vs enemy?
- [ ] Where your credits are?

### Deliverables
- [ ] First playable is readable without explanation
- [ ] Player understands the game state at a glance

---

## SESSION 5 — ASSET INTEGRATION PASS

**Time estimate: 1 session**

### Goal
First playable assets are in-engine, correctly scaled, correctly anchored.

### Asset Priority List (minimum to ship first playable)

**Units — must exist and work**
| Asset                | Status          | Action Needed                     |
|----------------------|-----------------|-----------------------------------|
| GI Rifleman          | Needs creation  | Generate 8-dir + death frame      |
| Soviet Conscript     | Needs creation  | Generate 8-dir + death frame      |
| M60 Patton / M1      | Needs creation  | Generate hull + turret 8-dir      |
| T-72                 | 16 sprites done | Audit perspective, crop, integrate|
| Ore Collector        | Exists          | Confirm anchor, integrate         |

**Buildings — must exist and work**
| Asset              | Status          | Action Needed                     |
|--------------------|-----------------|-----------------------------------|
| Construction Yard  | Allied exists   | Soviet variant needed, integrate  |
| Power Plant        | Both exist      | Audit, crop, integrate            |
| Barracks           | Both exist      | Audit, crop, integrate            |
| War Factory        | Both exist      | Audit, crop, integrate            |
| Ore Refinery       | Both exist      | Audit, crop, integrate            |

**FX — minimum viable**
| Effect             | Status          | Action                            |
|--------------------|-----------------|-----------------------------------|
| Muzzle flash       | Needs creation  | Simple 3-frame sprite             |
| Small explosion    | Needs creation  | 6-frame sprite                    |
| Unit death         | Needs creation  | Flash + dust cloud                |
| Smoke              | Needs creation  | 4-frame loop                      |

### Integration Checklist Per Asset
- [ ] Anchor point set and tested in engine
- [ ] Scale factor correct (matches scale reference table)
- [ ] Renders at correct layer
- [ ] No alpha fringing visible
- [ ] Works at min and max camera zoom

### Deliverables
- [ ] All first-playable units render correctly in-engine
- [ ] All first-playable buildings render correctly in-engine
- [ ] Muzzle flash and explosion visible in combat

---

## SESSION 6 — PLAYTEST & HARDENING

**Time estimate: 1 session**

### Goal
Someone other than the developer plays it for 5 minutes without asking questions.

### Tasks

**Playtest Checklist**
- [ ] Play a full game start to finish without intervention
- [ ] Record: where did you get confused?
- [ ] Record: what felt broken?
- [ ] Record: what felt good?

**Bug Severity Triage**
Priority 0 (blocker — fix immediately):
- Crash or freeze
- Win/lose condition fails to trigger
- Economy breaks (credits NaN or stuck)
- Units refuse to move or attack

Priority 1 (bad — fix before release):
- AI does nothing
- Unit spawns inside building
- Building placement allows invalid spots
- Harvester gets stuck

Priority 2 (annoying — fix soon):
- UI not updating correctly
- Minor rendering glitch
- Slow pathfinding on large maps

Priority 3 (polish — later):
- Animation smoothness
- Audio sync
- Minimap accuracy

**Hardening Pass**
- [ ] All P0 bugs resolved
- [ ] All P1 bugs resolved or documented with workaround
- [ ] Performance test: 30+ units on screen, stable FPS

### Deliverables
- [ ] First Playable Skirmish is shippable for internal demo
- [ ] Bug log written
- [ ] Next sprint scope defined (what comes after first playable)

---

## AFTER FIRST PLAYABLE — WHAT COMES NEXT

Only after first playable is shipped, in this order:

1. **Balance pass** — unit costs, HP, damage, speed
2. **Map variety** — 2nd map layout
3. **Second infantry unit** per faction
4. **Air unit introduction** — Huey vs Mi-24
5. **Naval** — deferred until land skirmish feels complete
6. **Mods system** — JSON-driven, expose unit/building data
7. **More factions** — only after mod system is working
8. **Campaign** — far future

---

## SPRINT SUMMARY

| Session | Focus                        | Done When...                              |
|---------|------------------------------|-------------------------------------------|
| 1       | Engine audit & gap map       | Gap list written, master branch confirmed |
| 2       | Construction & production    | Can build base and produce units          |
| 3       | Combat & win/lose            | Can play a full game                      |
| 4       | HUD & readability            | Player understands game state at a glance |
| 5       | Asset integration            | All first-playable assets in engine       |
| 6       | Playtest & hardening         | Internal demo ready                       |

**Target: First Playable in 6 focused sessions.**

---

*End of First Playable Sprint Plan*
*Driftgate Studios — Internal Document*
*2026-05-14*
