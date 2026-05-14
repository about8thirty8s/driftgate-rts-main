/**
 * AirCombatSystem.js — AIR FRAMEWORK PATCH
 *
 * LOCATION: src/simulation/combat/AirCombatSystem.js
 * APPEND these methods to the AirCombatSystem class before the closing brace.
 *
 * Adds:
 * - Parachute bail-out stub (fires event, no unit logic yet)
 * - Turret tracking toward attack target
 * - Ammo-depleted RTB handler
 * - Dogfight jitter (fixes deterministic turn interval)
 * - Anti-air ground threat detection stub
 */

// ── Turret tracking ───────────────────────────────────────────────────────

/**
 * Point an air unit's turret toward a world position.
 * Call from Game.jsx targeting block when unit acquires attack target.
 * The actual rotation happens in UnitEntity.tickTurret(dt).
 */
aimTurretAt(unit, targetCol, targetRow) {
  if (!unit.isAir) return;
  const dx = targetCol - unit.col;
  const dy = targetRow - unit.row;
  unit.turretTargetAngle = Math.atan2(dy, dx);
}

// ── Parachute bail-out stub ───────────────────────────────────────────────

/**
 * Called when a jet is destroyed at altitude (HP reaches 0 while isAir && isJet).
 * Fires an event — actual parachute unit spawning is handled by Game.jsx listener.
 *
 * POST-MVP: spawn a ParachuteUnit that drifts toward ground over ~8 seconds.
 * Can be rescued by a Huey (transport pickup). Rescued pilot gives XP bonus.
 */
triggerBailOut(unit) {
  if (!unit.isAir || !unit.isJet) return;
  if (unit._bailedOut) return; // already triggered

  unit._bailedOut = true;
  const alt = unit._altitude ?? 0;

  // Only bail out if at meaningful altitude
  if (alt < 2) return;

  this.events.emit('pilot_bail_out', {
    unitId:   unit.id,
    col:      unit.col,
    row:      unit.row,
    altitude: alt,
    faction:  unit.faction,
    // POST-MVP: listener spawns parachute unit at this position
  });
}

// ── Return-to-base handler ────────────────────────────────────────────────

/**
 * Finds the nearest friendly airfield structure for a unit needing to rearm.
 * Returns the structure entity or null.
 * Call from Game.jsx when air_unit_rtb event fires.
 */
findNearestAirfield(unit, entities) {
  let best = null;
  let bestDist = Infinity;

  for (const s of entities.getAll()) {
    if (s.faction !== unit.faction) continue;
    if (s.entityType !== 'STRUCTURE') continue;
    // Both 'airfield' and 'helipad' count
    if (s.defId !== 'airfield' && s.defId !== 'helipad') continue;
    const dc   = s.col - unit.col;
    const dr   = s.row - unit.row;
    const dist = Math.sqrt(dc * dc + dr * dr);
    if (dist < bestDist) { bestDist = dist; best = s; }
  }
  return best;
}

// ── Dogfight turn jitter fix ──────────────────────────────────────────────
// FIND in _tickDogfight():
//   const turnInterval = unit.isJet ? 3.5 : 5.0;
//
// REPLACE WITH:
//   const turnInterval = unit.isJet
//     ? 3.5 + (unit._dogfightJitter ?? 0)
//     : 5.0 + (unit._dogfightJitter ?? 0);
//
// AND in initAltitude(), ADD:
//   unit._dogfightJitter = (Math.random() - 0.5) * 1.0;  // ±0.5s jitter
//
// This prevents all simultaneous dogfights from syncing up visually.

// ── Ground AA threat detection stub ──────────────────────────────────────

/**
 * Returns the threat level to an air unit from ground AA at its current position.
 * 0 = safe, 1 = moderate threat, 2 = heavy AA zone.
 *
 * POST-MVP: wire to actual SAM/AA gun entities.
 * For now: returns 0 always so air units aren't penalized before AA exists.
 */
getGroundThreatLevel(unit, entities) {
  // TODO: scan for enemy AA structures/units within detection radius
  // and return a threat score based on their range and weapon category.
  // Used by AI to decide whether to suppress AA before committing aircraft.
  return 0;
}

// ── Air unit state summary (useful for HUD and AI) ────────────────────────

getUnitAirStatus(unit) {
  return {
    altitude:     unit._altitude     ?? 0,
    altitudeBand: unit._altitudeBand ?? 'ground',
    flareCount:   unit._flareCount   ?? 0,
    flareActive:  unit._flareActive  ?? false,
    inDogfight:   !!unit._dogfightTarget,
    evading:      unit._evasionActive ?? false,
    ammo:         unit._ammoCount,
    rearming:     unit._rearming ?? false,
    bailedOut:    unit._bailedOut ?? false,
  };
}
