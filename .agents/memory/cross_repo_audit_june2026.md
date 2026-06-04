# Driftgate RTS — Cross-Repo Audit Report
**Date:** 2026-06-04  
**Audited by:** Marshall

---

## REPOS AUDITED

| Repo | Status | Engine Quality | Salvage Value |
|------|--------|---------------|---------------|
| `driftgate-rts` | Canonical master | ★★★★★ | N/A — this IS the engine |
| `iron-curtain-rts` | Full separate engine | ★★★★☆ | **HIGH** — many superior systems |
| `warrts-era-of-conflict` | Experimental lockstep net | ★★★☆☆ | Medium — SimState architecture |
| `trench-war-rts` | Stub only | ★☆☆☆☆ | None |
| `vietnam-the-war-rts` | Stub + AI personality | ★★☆☆☆ | AI personality data only |
| `war-rts` | Campaign data only | ★★☆☆☆ | Campaign mission types |

---

## BUGS FIXED THIS SESSION (driftgate-rts-main)

### Critical
1. ✅ Camera WASD/Arrow keys never called `setPanKey()` — panning was dead
2. ✅ `camera.setMousePosition()` never called — edge-scroll was dead
3. ✅ Credits HUD frozen at 1000 — never subscribed to `credits_changed` event
4. ✅ Initial credits mismatch (UI=1000, engine=1500)

### High
5. ✅ Zoom used direct assignment — now uses `camera.zoomAt()` for zoom-toward-cursor
6. ✅ No `window.resize` handler in Mission.jsx — canvas stayed frozen on resize
7. ✅ `enemyAI.tick()` never called in Mission loop — AI never built or attacked
8. ✅ Player building production never ticked — trained units never spawned
9. ✅ `_dirToFacing()` angle convention wrong — units faced wrong direction when moving

### Medium
10. ✅ Attack-move didn't auto-acquire targets during movement
11. ✅ AOE had no friendly-fire prevention
12. ✅ Pathfinder MAX_NODES=2048 too low — AI attack waves silently failed on long maps (now 8192)
13. ✅ `pruneDeadEntities()` never called — dead entities accumulated forever in registry

### Polish
14. ✅ Build placement preview was screen-axis rectangle — now isometric diamond with cost label
15. ✅ Veterancy check had off-by-one logic error

---

## FEATURES TO IMPORT FROM iron-curtain-rts

### Priority 1 — HIGH VALUE, LOW EFFORT
- **Minimap** (`MinimapRenderer.js`) — full fog-aware minimap with camera viewport rect, unit dots, building squares. Self-contained canvas function. Can be drawn into a corner of the main canvas.
- **Command Feedback** (`CommandFeedbackRenderer.js`) — move marker chevron, attack marker crosshair, attack-move marker. Makes orders feel responsive. ~120 lines.
- **Ghost Renderer** (`GhostRenderer.js`) — proper isometric diamond ghost + build radius arc + invalid reason label. Already ported a version but IC has the canonical clean form.

### Priority 2 — HIGH VALUE, MEDIUM EFFORT
- **SovietDoctrineAI** (`SovietDoctrineAI.js`) — full doctrine AI with 4 difficulty levels, wave templates (probe/infantry/mixed/armour), game phase escalation, harvester harassment. Needs adapting to Driftgate's EntityRegistry + EventBus API but logic is golden.
- **ProductionSystem** (`ProductionSystem.js`) — spawns trained units at building exit, fires alerts. Already partially replaced in our FIX 8, but IC version has cleaner per-building queue logic.
- **Stuck Detection + Recovery** (from MovementSystem MOVEMENT_PASS_REPORT) — unit stuck detection (1.5s threshold), repath pipeline, fallback destination, 3-attempt give-up. Critical for gameplay feel.

### Priority 3 — MEDIUM VALUE, MEDIUM EFFORT
- **Formation Movement** — vehicles-center, infantry-fan formation slot assignment. Makes group moves feel military.
- **EconomySystem** ore-depletion handling — when ore depletes mid-harvest, repath to next ore source. Our HarvesterSystem doesn't handle this.
- **FogRenderer** — proper fog render with FOG_UNSEEN/FOG_EXPLORED/FOG_VISIBLE three states. Our TileGrid only does binary fog.

### Priority 4 — NICE TO HAVE
- **PathfindingDebugRenderer** — blocked tile overlay, path visualization, stuck unit warnings. Dev tool, not gameplay.
- **TechTree** (`techTree.js`) — buildable structures per faction, production mapping. Clean data model for future faction gating.
- **WinLoseSystem** — encapsulated win/lose condition checker. Mission-agnostic.

---

## FEATURES FROM warrts-era-of-conflict WORTH NOTING

- **SimState architecture** — pure serializable game state with weather system, day/night cycle, separate resources (supplies/power/manpower). More sophisticated than our flat credit system. Good long-term reference.
- **NetworkClient/NetworkHost** — lockstep multiplayer skeleton. Not needed now but architecturally interesting.

---

## RECOMMENDED NEXT SPRINT

1. **Import Minimap** → draw in bottom-right corner of canvas. 1 session.
2. **Import CommandFeedback** → move/attack markers. 30min.
3. **Adapt SovietDoctrineAI** → replace current EnemyAIController fallback logic. 1 session.
4. **Stuck Detection** → port from IC MovementSystem notes. 1 session.
5. **Three-state fog** → FOG_UNSEEN/EXPLORED/VISIBLE. 1 session.
6. **Formation movement** → port slot system. 1 session.

---
