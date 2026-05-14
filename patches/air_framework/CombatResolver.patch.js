/**
 * CombatResolver.js — AIR FRAMEWORK PATCH
 *
 * LOCATION: src/simulation/combat/CombatResolver.js
 *
 * 1. Add airCombatSystem reference via setAirCombatSystem()
 * 2. Inject air accuracy multipliers into _fireWeapon() hit roll
 * 3. Trigger evasion on attacker detection (missile lock)
 * 4. Handle ammo consumption
 *
 * These are SURGICAL additions — merge into existing CombatResolver.
 * Do not replace the constructor or ARMOUR_TABLE.
 */

// ── STEP 1: Add to constructor ────────────────────────────────────────────
// After: this.garrisonSystem = garrisonSystem;
// ADD:
this.airCombatSystem = null;

// ── STEP 2: Add setter method ─────────────────────────────────────────────
setAirCombatSystem(acs) {
  this.airCombatSystem = acs;
}

// ── STEP 3: In Game.jsx, after combat.setGarrisonSystem(garrison), ADD: ──
// combat.setAirCombatSystem(airCombat);

// ── STEP 4: Inside _fireWeapon() — modify the hit roll section ───────────
//
// FIND this block in _fireWeapon():
//   const hitRoll = Math.random();
//   const hit = hitRoll < weapDef.accuracy;
//
// REPLACE WITH:

_fireWeaponAirAccuracy(attacker, target, weapDef) {
  let accuracy = weapDef.accuracy ?? 0.8;

  if (this.airCombatSystem) {
    // Altitude band accuracy penalty
    const altMult   = this.airCombatSystem.getAltitudeAccuracyMult(attacker, target);
    // Flare miss chance
    const flareMult = this.airCombatSystem.getFlareHitMultiplier(target);
    accuracy *= altMult * flareMult;

    // Homing missile — trigger evasion on target when weapon is locked
    if (weapDef.isHoming && target.isAir) {
      this.airCombatSystem.triggerEvasion(target);
      // Flares auto-deploy inside triggerEvasion() if available
    }
  }

  return Math.random() < accuracy;
}

// ── STEP 5: Ammo consumption ──────────────────────────────────────────────
// In _fireWeapon(), BEFORE emitting weapon_fired, ADD:
//
//   if (attacker.consumeAmmo) {
//     const fired = attacker.consumeAmmo(1);
//     if (!fired) return; // out of ammo — abort fire
//   }
//
//   // If air unit is now out of ammo, trigger RTB (return to base) order
//   if (attacker.isAir && attacker.isOutOfAmmo) {
//     this.events.emit('air_unit_rtb', { unitId: attacker.id, reason: 'ammo_depleted' });
//   }

// ── FULL PATCHED _fireWeapon SIGNATURE REFERENCE ─────────────────────────
// The existing _fireWeapon(attacker, target, weapDef) should be updated so
// the hit roll section reads:
//
//   // Consume ammo
//   if (attacker.consumeAmmo && !attacker.consumeAmmo(1)) return;
//
//   // Hit calculation — includes altitude and flare modifiers for air combat
//   const hit = this._fireWeaponAirAccuracy(attacker, target, weapDef);
//   if (!hit) { /* miss FX if desired */ return; }
//
//   // ... rest of existing damage application unchanged ...
//
//   // RTB if out of ammo after firing
//   if (attacker.isAir && attacker.isOutOfAmmo) {
//     this.events.emit('air_unit_rtb', { unitId: attacker.id, reason: 'ammo_depleted' });
//   }
