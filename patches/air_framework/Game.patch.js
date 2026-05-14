/**
 * Game.jsx — AIR FRAMEWORK PATCH
 *
 * LOCATION: src/pages/Game.jsx
 *
 * Three changes:
 * 1. Wire combat.setAirCombatSystem(airCombat) after existing setGarrisonSystem call
 * 2. Add new EventBus listeners for air events (particles + HUD notifications)
 * 3. Add turret tick to the sim loop for air units
 * 4. Handle RTB (return to base) for out-of-ammo air units
 * 5. Handle bail-out event stub
 *
 * ALSO: Add 'altitude_changed' and 'air_combat_engage' event handlers
 * to the existing eventBus.on() block (after flare_deployed handler).
 */

// ── CHANGE 1: Wire air combat to CombatResolver ───────────────────────────
// FIND:   combat.setGarrisonSystem(garrison);
// ADD AFTER:
combat.setAirCombatSystem(airCombat);


// ── CHANGE 2: New event handlers — ADD after existing eventBus.on() block ─

eventBus.on('altitude_changed', ({ unitId, fromAlt, toAlt, reason }) => {
  // Visual: brief turbulence particle burst on sharp altitude changes
  const unit = entities.get(unitId);
  if (!unit) return;
  const scr = camera.tileToScreen(unit.col, unit.row);
  const alt = unit._altitude ?? 0;
  const sy  = scr.y - alt * 8; // match ALT_Y_SCALE

  // Small exhaust/vapour puff on altitude change
  for (let i = 0; i < 4; i++) {
    particles.push({
      type:    'smoke',
      x:       scr.x + (Math.random() - 0.5) * 12,
      y:       sy,
      vx:      (Math.random() - 0.5) * 20,
      vy:      -8 - Math.random() * 12,
      life:    0.8 + Math.random() * 0.6,
      maxLife: 1.4,
      r:       4 + Math.random() * 5,
      grow:    3,
      colour:  reason === 'evasion' ? '#aaddff' : '#888',
    });
  }
});

eventBus.on('air_combat_engage', ({ attackerId, targetId, mode }) => {
  // Optional: HUD notification or audio cue
  // For now: log to debug and emit a visual marker
  if (window.__rts_debug) {
    console.log(`[AIR] Dogfight: ${attackerId} vs ${targetId} (${mode})`);
  }
});

eventBus.on('air_combat_disengage', ({ unitId, reason }) => {
  if (window.__rts_debug) {
    console.log(`[AIR] Disengaged: ${unitId} (${reason})`);
  }
});

eventBus.on('air_unit_rtb', ({ unitId, reason }) => {
  // Out-of-ammo or damaged — send unit back to nearest airfield
  const s = stateRef.current;
  if (!s) return;
  const unit     = s.entities.get(unitId);
  if (!unit) return;
  const airfield = s.airCombat.findNearestAirfield(unit, s.entities);
  if (airfield) {
    // Pathfind to airfield tile (air units ignore ground grid — direct path)
    unit.stopMoving?.();
    unit.clearAttackTarget?.();
    // For now: set a move target directly. Air pathfinding (ignores ground
    // obstacles) should be a separate AirPathfinder — deferred post-MVP.
    const path = s.pathfinder.findPath(
      Math.round(unit.col), Math.round(unit.row),
      Math.round(airfield.col), Math.round(airfield.row)
    );
    if (path.length > 0) {
      unit.setPath(path);
      unit.startRearm?.();
    }
  }
  if (window.__rts_debug) {
    console.log(`[AIR] RTB: ${unitId} (${reason})`);
  }
});

eventBus.on('pilot_bail_out', ({ unitId, col, row, altitude, faction }) => {
  // STUB — parachute unit spawn deferred to post-MVP
  // When implemented: spawn a ParachuteUnit entity at (col, row, altitude)
  // that drifts groundward over ~8 seconds and can be rescued by a Huey.
  const scr = camera.tileToScreen(col, row);
  const sy  = scr.y - altitude * 8;

  // Ejection seat burst FX
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2;
    particles.push({
      type:    'debris',
      x:       scr.x, y: sy,
      vx:      Math.cos(a) * (30 + Math.random() * 60),
      vy:      Math.sin(a) * (30 + Math.random() * 60) - 80,
      life:    0.6 + Math.random() * 0.5,
      maxLife: 1.1,
      r:       2 + Math.random() * 3,
      colour:  '#ffcc44',
    });
  }

  if (window.__rts_debug) {
    console.log(`[AIR] Bail out: ${unitId} at alt=${altitude} faction=${faction}`);
  }
});


// ── CHANGE 3: Turret tick in sim loop ─────────────────────────────────────
// FIND in onSimTick, the unit loop block:
//   unit.tickMovement(dt, s.grid);
//   unit.tickWeaponCooldowns(dt);
//
// ADD AFTER tickWeaponCooldowns:
//   if (unit.tickTurret) unit.tickTurret(dt);
//   if (unit._rearming && unit.tickRearm) {
//     const rearmDone = unit.tickRearm(dt);
//     if (rearmDone) {
//       this.events?.emit('air_unit_rearmed', { unitId: unit.id });
//     }
//   }


// ── CHANGE 4: Turret aim when attack target acquired ─────────────────────
// FIND in the targeting block:
//   if (nearest && unit.distanceTo(nearest) <= weapDef.range) unit.setAttackTarget(nearest.id);
//
// ADD AFTER:
//   if (nearest && unit.isAir && s.airCombat) {
//     s.airCombat.aimTurretAt(unit, nearest.col, nearest.row);
//   }


// ── CHANGE 5: Trigger bail-out on air unit death ──────────────────────────
// FIND the entity_killed event handler (already exists in Game.jsx).
// ADD at the start of the handler:
//
// eventBus.on('entity_killed', ({ entityId, col, row, ... }) => {
//   const dead = entities.get(entityId);
//   if (dead?.isJet) {
//     airCombat.triggerBailOut(dead);  // fires pilot_bail_out event if at altitude
//   }
//   // ... rest of existing handler unchanged ...
// });
