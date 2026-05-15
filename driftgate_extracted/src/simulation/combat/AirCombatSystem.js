/**
 * AirCombatSystem.js
 * Handles air unit altitude layers, dogfight engagement,
 * evasion manoeuvres, and flare countermeasures.
 *
 * Altitude model (tile-height units):
 *   NOE   (nap-of-earth)   0–2   — helicopters only, very hard to hit
 *   LOW                    2–5   — helicopters cruise, jets attack run
 *   MEDIUM                 5–10  — jets cruise
 *   HIGH                  10–15  — B-52 strategic
 *
 * Dogfight rules:
 *   - Jet vs jet: both enter DOGFIGHT state, altitude changes during turns
 *   - Jet vs heli: jets have range advantage, helis can NOE to break
 *   - Heli vs ground: standard attack run
 *
 * Flares:
 *   - Air units with flares (flareCount > 0) may deploy when locked
 *   - Flare reduces hit probability by flareMissChance for flareDuration secs
 *   - Flare cooldown prevents spam
 *
 * Events emitted:
 *   air_combat_engage    { attackerId, targetId, mode }
 *   air_combat_disengage { unitId, reason }
 *   altitude_changed     { unitId, fromAlt, toAlt, reason }
 *   flare_deployed       { unitId, col, row }
 *   flare_expired        { unitId }
 */

import { EntityState } from '../entities/Entity.js';

export const AltitudeBand = {
  NOE:    { id: 'noe',    min: 0,  max: 2,  label: 'NOE'    },
  LOW:    { id: 'low',    min: 2,  max: 5,  label: 'Low'    },
  MEDIUM: { id: 'medium', min: 5,  max: 10, label: 'Medium' },
  HIGH:   { id: 'high',   min: 10, max: 15, label: 'High'   },
};

// Altitude accuracy penalties — harder to hit a target at different band than you
const ALT_ACCURACY_PENALTY = {
  same:    0.0,   // no penalty
  one:     0.15,  // one band apart
  two:     0.30,
  three:   0.50,
};

export class AirCombatSystem {
  constructor(entities, eventBus) {
    this.entities = entities;
    this.events   = eventBus;
  }

  // ── Main tick ─────────────────────────────────────────────────────────────

  tick(dt) {
    const airUnits = this.entities.getAll().filter(e => e.alive && e.isAir);

    for (const unit of airUnits) {
      this._tickFlares(unit, dt);
      this._tickAltitudeDrift(unit, dt);
      this._tickDogfight(unit, dt);
    }
  }

  // ── Flares ────────────────────────────────────────────────────────────────

  _tickFlares(unit, dt) {
    // Count down active flare timer
    if (unit._flareActive) {
      unit._flareTimer = (unit._flareTimer ?? 0) - dt;
      if (unit._flareTimer <= 0) {
        unit._flareActive = false;
        unit._flareTimer  = 0;
        this.events.emit('flare_expired', { unitId: unit.id });
      }
    }

    // Count down flare cooldown
    if (unit._flareCooldown > 0) {
      unit._flareCooldown = Math.max(0, unit._flareCooldown - dt);
    }
  }

  /**
   * Called by CombatResolver before applying hit roll.
   * Returns the hit-chance multiplier (0–1) after flare interference.
   */
  getFlareHitMultiplier(target) {
    if (!target.isAir) return 1.0;
    if (target._flareActive) {
      return 1.0 - (target._flareMissChance ?? 0.6);
    }
    return 1.0;
  }

  /**
   * Try to deploy flares on the target unit (called when locked by missile).
   * Returns true if flares deployed.
   */
  tryDeployFlares(unit) {
    if (!unit.isAir) return false;
    if ((unit._flareCount ?? 0) <= 0) return false;
    if (unit._flareActive) return false;
    if ((unit._flareCooldown ?? 0) > 0) return false;

    unit._flareCount--;
    unit._flareActive     = true;
    unit._flareTimer      = unit._flareDuration ?? 4.0;   // seconds active
    unit._flareCooldown   = unit._flareCooldownMax ?? 12.0;

    this.events.emit('flare_deployed', {
      unitId: unit.id,
      col:    unit.col,
      row:    unit.row,
    });

    return true;
  }

  // ── Altitude ──────────────────────────────────────────────────────────────

  initAltitude(unit) {
    if (unit._altitude !== undefined) return;

    if (unit.isHelicopter) {
      unit._altitude        = unit.hoverHeight ?? 4;
      unit._targetAltitude  = unit._altitude;
      unit._altitudeBand    = 'low';
    } else if (unit.isJet) {
      unit._altitude        = unit.cruiseHeight ?? 10;
      unit._targetAltitude  = unit._altitude;
      unit._altitudeBand    = 'high';
    } else {
      unit._altitude        = 6;
      unit._targetAltitude  = 6;
      unit._altitudeBand    = 'medium';
    }

    // Flare inventory
    unit._flareCount       = unit.flareCount ?? (unit.isJet ? 6 : unit.isHelicopter ? 3 : 0);
    unit._flareDuration    = 4.0;
    unit._flareCooldownMax = 12.0;
    unit._flareCooldown    = 0;
    unit._flareActive      = false;
    unit._flareMissChance  = unit.isJet ? 0.7 : 0.5;

    // Dogfight state
    unit._dogfightTarget   = null;
    unit._dogfightTimer    = 0;
    unit._evasionTimer     = 0;
    unit._evasionActive    = false;
    unit._evasionHeading   = 0;
  }

  _tickAltitudeDrift(unit, dt) {
    if (unit._altitude === undefined) this.initAltitude(unit);

    const diff = (unit._targetAltitude ?? unit._altitude) - unit._altitude;
    if (Math.abs(diff) < 0.1) {
      unit._altitude = unit._targetAltitude;
      return;
    }

    const climbRate = unit.isJet ? 8.0 : 3.0; // units/sec
    unit._altitude += Math.sign(diff) * Math.min(climbRate * dt, Math.abs(diff));
    unit._altitudeBand = this._getBandId(unit._altitude);
  }

  _getBandId(alt) {
    if (alt <= AltitudeBand.NOE.max)    return 'noe';
    if (alt <= AltitudeBand.LOW.max)    return 'low';
    if (alt <= AltitudeBand.MEDIUM.max) return 'medium';
    return 'high';
  }

  getBandDiff(bandA, bandB) {
    const order = ['noe', 'low', 'medium', 'high'];
    return Math.abs(order.indexOf(bandA) - order.indexOf(bandB));
  }

  /**
   * Accuracy multiplier when attacker at bandA fires at target at bandB.
   */
  getAltitudeAccuracyMult(attacker, target) {
    if (!attacker.isAir && !target.isAir) return 1.0;
    const bandA = attacker._altitudeBand ?? 'medium';
    const bandB = target._altitudeBand   ?? 'medium';
    const diff  = this.getBandDiff(bandA, bandB);
    const key   = ['same', 'one', 'two', 'three'][Math.min(diff, 3)];
    return 1.0 - (ALT_ACCURACY_PENALTY[key] ?? 0);
  }

  // ── Dogfighting ───────────────────────────────────────────────────────────

  /**
   * Attempt to engage target in a dogfight.
   * Call from Game.jsx / AI when an air unit acquires an air target.
   */
  engageDogfight(attacker, target) {
    if (!attacker.isAir || !target.isAir) return;
    if (attacker._dogfightTarget === target.id) return; // already engaged

    attacker._dogfightTarget = target.id;
    attacker._dogfightTimer  = 0;

    this.events.emit('air_combat_engage', {
      attackerId: attacker.id,
      targetId:   target.id,
      mode:       'dogfight',
    });
  }

  _tickDogfight(unit, dt) {
    if (!unit._dogfightTarget) return;

    const target = this.entities.get(unit._dogfightTarget);
    if (!target || !target.alive) {
      this._disengageDogfight(unit, 'target_dead');
      return;
    }

    unit._dogfightTimer += dt;

    // Every 3–6 seconds, both aircraft change altitude to gain advantage
    const turnInterval = unit.isJet ? 3.5 : 5.0;
    if (unit._dogfightTimer >= turnInterval) {
      unit._dogfightTimer = 0;
      this._executeDogfightTurn(unit, target);
    }

    // Evasion manoeuvre
    if (unit._evasionActive) {
      unit._evasionTimer -= dt;
      if (unit._evasionTimer <= 0) {
        unit._evasionActive = false;
        // Return to preferred altitude after evasion
        this._setTargetAltitude(unit, unit._preferredAltitude ?? unit._altitude);
      }
    }
  }

  _executeDogfightTurn(unit, target) {
    const myBand     = unit._altitudeBand    ?? 'medium';
    const theirBand  = target._altitudeBand  ?? 'medium';
    const bandOrder  = ['noe', 'low', 'medium', 'high'];
    const myIdx      = bandOrder.indexOf(myBand);
    const theirIdx   = bandOrder.indexOf(theirBand);

    const prevBand = myBand;

    if (unit.isJet) {
      // Jets try to get altitude advantage — one band above the enemy
      const preferredIdx = Math.min(3, theirIdx + 1);
      const preferredAlt = [1.5, 4, 7.5, 12][preferredIdx];
      this._setTargetAltitude(unit, preferredAlt);
    } else {
      // Helicopters try to NOE to break lock
      if (myIdx > 0 && Math.random() < 0.5) {
        this._setTargetAltitude(unit, 1.5); // dive to NOE
      } else {
        this._setTargetAltitude(unit, 3.5); // return to low
      }
    }

    if (unit._altitudeBand !== prevBand) {
      this.events.emit('altitude_changed', {
        unitId:  unit.id,
        fromAlt: prevBand,
        toAlt:   unit._altitudeBand,
        reason:  'dogfight_turn',
      });
    }
  }

  /**
   * Trigger an evasion burst — used when the unit takes a hit or is targeted.
   * Temporarily changes altitude and heading.
   */
  triggerEvasion(unit) {
    if (!unit.isAir) return;
    if (unit._evasionActive) return;

    unit._preferredAltitude = unit._altitude;
    unit._evasionActive     = true;
    unit._evasionTimer      = unit.isJet ? 2.5 : 3.5;

    // Jets climb or dive sharply; helis dive to NOE
    if (unit.isJet) {
      const evadeAlt = unit._altitude > 7
        ? unit._altitude - 4  // dive
        : unit._altitude + 4; // climb
      this._setTargetAltitude(unit, Math.max(2, Math.min(14, evadeAlt)));
    } else {
      this._setTargetAltitude(unit, 1.5); // NOE evasion
    }

    // Try flares during evasion
    this.tryDeployFlares(unit);

    this.events.emit('altitude_changed', {
      unitId: unit.id,
      fromAlt: unit._altitudeBand,
      toAlt:   this._getBandId(unit._targetAltitude),
      reason:  'evasion',
    });
  }

  _setTargetAltitude(unit, alt) {
    unit._targetAltitude = Math.max(0.5, alt);
  }

  _disengageDogfight(unit, reason) {
    unit._dogfightTarget = null;
    unit._dogfightTimer  = 0;
    this.events.emit('air_combat_disengage', { unitId: unit.id, reason });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Snapshot altitude info for HUD / renderer.
   */
  getAltitudeInfo(unit) {
    if (!unit.isAir) return null;
    return {
      altitude: unit._altitude ?? 0,
      band:     unit._altitudeBand ?? 'low',
      flares:   unit._flareCount ?? 0,
      flareActive: unit._flareActive ?? false,
      dogfighting: !!unit._dogfightTarget,
      evading:  unit._evasionActive ?? false,
    };
  }
}
