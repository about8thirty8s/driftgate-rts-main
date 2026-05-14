# AIR COMBAT FRAMEWORK PATCH
## driftgate-rts — May 14, 2026

### What already exists (DO NOT TOUCH)
- AirCombatSystem.js — complete. Altitude bands, dogfight, flares, evasion. ✅
- airCombat instantiated in Game.jsx ✅
- airCombat.tick(dt) called in sim loop ✅
- engageDogfight() called in targeting block ✅
- F key → tryDeployFlares() wired ✅
- flare_deployed particle FX wired ✅
- getNearestEnemyAir() in EntityRegistry ✅
- UnitEntity: isAir, isJet, isHelicopter, _altitude fields ✅
- Unit defs: air_f4_phantom, air_b52, air_huey ✅
- Weapon defs: aim7_sparrow, rocket_pod_2_75, mk82_bomb_carpet ✅

### What this patch adds
1. UnitEntity.js — turretAngle field + tickTurret() stub
2. CombatResolver.js — air accuracy multiplier hook (altitude + flare)
3. EntityRegistry.js — getAirUnits(), getGroundUnits() convenience queries
4. AirCombatSystem.js — parachute bail-out stub (fires event, no logic yet)
5. UnitRenderer.js — air unit render stub (draws placeholder, ready for sprites)
6. Game.jsx — altitude_changed and air_combat_engage event handlers (particles)
7. content/units/air_mig21.json — Soviet air unit to mirror F-4
8. INTEGRATION_CHECKLIST.md — what to do when sprites are ready

### What is deliberately NOT in this patch
- Cloud system (renderer only, zero sim cost — add with art pass)
- Parachute unit logic (needs bail-out unit def + fall physics — post-MVP)
- Homing missile pursuit curve (CombatResolver extension — post-MVP)
- Air movement pathfinding (air units ignore ground grid — separate system)
- Strafe run logic (jets attack along a heading vector — post-MVP)

### Patch files
- patches/air_framework/UnitEntity.patch.js        → append to UnitEntity.js
- patches/air_framework/CombatResolver.patch.js    → merge into CombatResolver.js
- patches/air_framework/EntityRegistry.patch.js    → append to EntityRegistry.js
- patches/air_framework/AirCombatSystem.patch.js   → append to AirCombatSystem.js
- patches/air_framework/UnitRenderer.patch.js      → merge into UnitRenderer.js
- patches/air_framework/Game.patch.js              → merge event handlers into Game.jsx
- patches/air_framework/air_mig21.json             → new file in content/units/
- patches/air_framework/INTEGRATION_CHECKLIST.md   → reference doc
