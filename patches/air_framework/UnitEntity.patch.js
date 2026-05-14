/**
 * UnitEntity.js — AIR FRAMEWORK PATCH
 *
 * ADD these fields to the UnitEntity constructor, after the existing
 * veterancy fields at the bottom. Do not replace anything.
 *
 * LOCATION: src/simulation/entities/UnitEntity.js
 * INSERT AFTER: this.veterancy = 0;
 */

// ── Air-specific fields ───────────────────────────────────────────────────
// _altitude and flareCount already initialised in constructor from def.
// These are the additional fields needed for turret rotation and air rendering.

this.turretAngle      = 0;          // radians. 0 = SE (default RTS facing).
                                     // Updated by AirCombatSystem dogfight turns
                                     // and by player attack orders.

this.turretTargetAngle = 0;         // desired angle — system rotates toward this each tick

this._isAirborne      = this.isAir; // true while in flight. False if landed/crashed.
                                     // Reserved for future landed helicopter states.

this._ammoCount       = def.maxAmmo ?? null;  // null = unlimited
this._rearming        = false;                // true while at airfield rearming
this._rearmTimer      = 0;

// Parachute state — set by AirCombatSystem on jet death at altitude
this._bailedOut       = false;      // true after pilot ejects
this._parachuteTimer  = 0;          // counts down from bail-out altitude
this._parachuteTarget = null;       // {col, row} landing tile

// ── Air turret tick ───────────────────────────────────────────────────────
// ALSO ADD this method to UnitEntity class:

tickTurret(dt) {
  if (!this.isAir && !this.turretTargetAngle) return;

  const TURRET_SPEED = Math.PI / 2; // 90°/sec — feels heavy for a tank
  const AIR_TURRET_SPEED = Math.PI; // 180°/sec — aircraft track faster

  const speed = this.isAir ? AIR_TURRET_SPEED : TURRET_SPEED;
  const diff  = _normalizeAngle(this.turretTargetAngle - this.turretAngle);

  if (Math.abs(diff) < 0.01) {
    this.turretAngle = this.turretTargetAngle;
    return;
  }

  this.turretAngle += Math.sign(diff) * Math.min(Math.abs(diff), speed * dt);
}

// ── Ammo management ───────────────────────────────────────────────────────

consumeAmmo(amount = 1) {
  if (this._ammoCount === null) return true; // unlimited
  if (this._ammoCount <= 0) return false;
  this._ammoCount = Math.max(0, this._ammoCount - amount);
  return true;
}

get isOutOfAmmo() {
  return this._ammoCount !== null && this._ammoCount <= 0;
}

startRearm() {
  this._rearming   = true;
  this._rearmTimer = this.rearmTime ?? 15;
}

tickRearm(dt) {
  if (!this._rearming) return false;
  this._rearmTimer -= dt;
  if (this._rearmTimer <= 0) {
    this._ammoCount = this.maxAmmo ?? null;
    this._rearming  = false;
    this._rearmTimer = 0;
    return true; // rearm complete
  }
  return false;
}

// ── Angle normaliser (module-level helper — add outside class or import) ──
function _normalizeAngle(a) {
  while (a >  Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * ALSO UPDATE serialize() to include turret and ammo state:
 *
 * serialize() {
 *   return {
 *     ...super.serialize(),
 *     category:     this.category,
 *     path:         this.path,
 *     attackTarget: this.attackTarget,
 *     entrenched:   this.entrenched,
 *     veterancy:    this.veterancy,
 *     kills:        this.kills,
 *     turretAngle:  this.turretAngle,   // ADD
 *     _ammoCount:   this._ammoCount,    // ADD
 *   };
 * }
 */
