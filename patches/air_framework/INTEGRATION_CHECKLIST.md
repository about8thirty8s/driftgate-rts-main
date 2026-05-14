# AIR COMBAT FRAMEWORK — INTEGRATION CHECKLIST
## driftgate-rts | Last Updated: May 14, 2026

Use this checklist when applying the patch files to the engine.
Each item is atomic — apply in order, test after each group.

---

## GROUP 1 — Core wiring (apply all at once, ~20 min)

- [ ] **UnitEntity.js** — append fields from `UnitEntity.patch.js` to constructor
  - Add: turretAngle, turretTargetAngle, _isAirborne, _ammoCount, _rearming, _rearmTimer, _bailedOut
  - Add methods: tickTurret(), consumeAmmo(), isOutOfAmmo (getter), startRearm(), tickRearm()
  - Add: _normalizeAngle() helper function
  - Update serialize() to include turretAngle and _ammoCount

- [ ] **EntityRegistry.js** — append methods from `EntityRegistry.patch.js`
  - Add: getAirUnits(), getGroundUnits(), getAirUnitsByFaction(), getNearestEnemyGround(), getEnemiesInRangeForAir()

- [ ] **CombatResolver.js** — merge from `CombatResolver.patch.js`
  - Add: this.airCombatSystem = null in constructor
  - Add: setAirCombatSystem() method
  - Add: _fireWeaponAirAccuracy() method
  - Modify hit roll to call _fireWeaponAirAccuracy()
  - Add ammo consumption before fire
  - Add air_unit_rtb emit after fire

- [ ] **AirCombatSystem.js** — append from `AirCombatSystem.patch.js`
  - Add: aimTurretAt(), triggerBailOut(), findNearestAirfield(), getGroundThreatLevel(), getUnitAirStatus()
  - Fix dogfight jitter: add _dogfightJitter to initAltitude(), use it in _tickDogfight()

**VERIFY:** No console errors. Existing ground combat still works.

---

## GROUP 2 — Game.jsx wiring (~30 min)

- [ ] Add `combat.setAirCombatSystem(airCombat)` after `combat.setGarrisonSystem(garrison)`
- [ ] Add all new eventBus.on() handlers from `Game.patch.js`:
  - altitude_changed → vapour particles
  - air_combat_engage → debug log
  - air_combat_disengage → debug log
  - air_unit_rtb → find airfield, send unit home
  - pilot_bail_out → ejection FX particles (unit spawn deferred)
- [ ] Add turret tick to sim loop: `if (unit.tickTurret) unit.tickTurret(dt)`
- [ ] Add rearm tick to sim loop
- [ ] Add turret aim call when attack target acquired
- [ ] Add bail-out trigger to entity_killed handler

**VERIFY:** Spawn a Huey, press F → flare particles appear. No errors.

---

## GROUP 3 — Renderer (~20 min)

- [ ] **UnitRenderer.js** — merge `UnitRenderer.patch.js`
  - Add: ALT_Y_SCALE constant
  - Add: _renderAirUnit() method
  - Modify render() loop: `if (unit.isAir) { this._renderAirUnit(...) } else { this._renderUnit(...) }`

**VERIFY:** Spawn an air unit via console or spawner — should appear as a coloured shape floating above ground tile.

---

## GROUP 4 — Content (5 min)

- [ ] Copy `air_mig21.json` → `src/content/units/air_mig21.json`
- [ ] Copy `weapons/r60_missile.json` → `src/content/weapons/r60_missile.json`
- [ ] Copy `weapons/gsh23_cannon.json` → `src/content/weapons/gsh23_cannon.json`
- [ ] Register new defs in `src/content/defs.js`:
  - UNIT_DEFS: add `air_mig21`
  - WEAPON_DEFS: add `r60_missile`, `gsh23_cannon`

**VERIFY:** `UNIT_DEFS['air_mig21']` returns the def in console.

---

## KNOWN GAPS — deferred to post-MVP

| Gap | When to address |
|---|---|
| Air pathfinding (ignores ground grid) | When air feels broken using ground pathfinder |
| Parachute unit (pilot bail-out entity) | After first playtest, great cinematic moment |
| Cloud system | Art pass — renderer only, zero sim cost |
| SAM / AA gun structures | After ground combat is stable |
| Homing missile pursuit curve | After air units are in-engine and feeling good |
| Strafe run (attack along heading) | After basic attack-move works for air |
| Dogfight camera focus option | Polish pass |
| Helicopter NOE terrain masking | Polish pass — helis disappear behind hills at NOE |

---

## WHAT YOU GET AFTER THIS PATCH

- Air units spawn, move (via ground pathfinder temporarily), and fight
- Altitude bands affect accuracy — jets at HIGH are hard to hit from ground
- Flares work — press F on selected air unit to deploy
- Dogfights trigger between air units automatically
- Out-of-ammo jets fly home to airfield and rearm
- Jet death at altitude fires bail-out event (FX, unit spawn deferred)
- MiG-21 added as Soviet air unit — counters Allied F-4
- Close-range cannon added for Soviet air (MiG-21) — used when missiles spent
- Entire system is event-driven — zero rendering coupling
- Debug mode (backtick `) shows altitude bands on air units
