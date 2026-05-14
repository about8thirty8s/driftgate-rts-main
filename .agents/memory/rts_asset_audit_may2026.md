# RTS Archive Audit — May 14, 2026
## MARSHAL — Driftgate Studios Studio President

---

## REPOS CATALOGUED

| Repo | Files | Last Updated | Status |
|---|---|---|---|
| driftgate-rts | 88 | 2026-03-26 | MASTER ENGINE — canonical RTS core |
| driftgate-rts-main | 1899 | 2026-04-14 | ARCHIVE HUB — patches, docs, experiments |
| iron-curtain-rts | 163 | 2026-05-14 | LATEST — strategic war room UI, not playable |
| trench-war-rts | 89 | 2026-03-16 | VOXEL experiment, limited |
| vietnam-the-war-rts | 95 | 2026-03-16 | Origin of AI personalities, minimap |
| warrts-era-of-conflict | ~90 | 2026-03-16 | Unknown detail |
| war-rts | ~90 | 2026-03-16 | Unknown detail |
| WARTS | 0 | 2025-12-17 | Empty/dead |

## CONFIRMED LIVE SYSTEMS (driftgate-rts)
- GameLoop.js: 50hz fixed sim + RAF render — PRODUCTION READY
- SelectionController.js: box select, click select, right-click, control groups — PRODUCTION READY
- IsometricCamera.js: pan, zoom, world↔screen transforms — PRODUCTION READY
- Pathfinder.js: A* 8-dir, octile heuristic, unit type exclusions — PRODUCTION READY
- CombatResolver.js: armour table, AOE, garrison fire arcs — SOLID
- HarvesterSystem.js: full state machine IDLE→ORE→REFINERY — COMPLETE
- EnemyAIController.js: 3 personalities (aggressive/defensive/balanced) — COMPLETE
- VeterancySystem.js: 4-tier kill tracking — COMPLETE
- BuildSystem.js: structure placement, power, credits — LIVE
- GarrisonSystem.js: enter/exit/mount logic — LIVE
- SubterrainSystem.js: entrance/transit/emerge — LIVE
- TrenchSystem.js: partially implemented
- MissionDirector.js: exists
- EventBus.js: pub/sub, zero dependencies — PRODUCTION READY
- Full data layer: units, weapons, structures, missions, factions in JSON

## ASSET AUDIT (May 14 2026)
- 22 building sprites across Soviet + General packs
- All RGBA true alpha, 1024x1024
- 16/22 usable after tight crop
- soviet_06_comms_facility: regenerate (wrong aspect)
- building_05_sandbags: regenerate full emplacement
- building_07_tech_center: move to Allied faction

## NEXT ACTIONS
1. Batch crop all 22 assets
2. Lock iron-curtain-rts as master build or confirm driftgate-rts is the base
3. First unit pass: Soviet conscript, tank, dog
4. Camera/scale/shadow lock document
