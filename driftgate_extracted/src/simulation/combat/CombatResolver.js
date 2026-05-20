/**
 * CombatResolver.js
 * Resolves weapon fire, damage application, and kill events.
 * Reads WeaponDefinitions and ProjectileDefinitions.
 * Emits events on the EventBus — never renders anything.
 */

import { EntityState } from '../entities/Entity.js';

// Armour multiplier table [attackType][targetArmour]
const ARMOUR_TABLE = {
  small_arms: {
    light:     1.0,
    medium:    0.5,
    heavy:     0.2,
    structure: 0.1,
    air:       0.6,
  },
  explosive: {
    light:     2.0,
    medium:    1.2,
    heavy:     0.8,
    structure: 0.6,
    air:       0.4,
  },
  ap: { // armour piercing
    light:     1.5,
    medium:    1.5,
    heavy:     1.2,
    structure: 0.4,
    air:       0.3,
  },
  cannon: {
    light:     2.5,
    medium:    1.8,
    heavy:     1.2,
    structure: 0.8,
    air:       0.2,
  },
  anti_air: {
    light:     0.3,
    medium:    0.2,
    heavy:     0.1,
    structure: 0.1,
    air:       2.5,
  },
  flame: {
    light:     2.0,
    medium:    1.0,
    heavy:     0.5,
    structure: 1.5,
    air:       0.1,
  },
};

export class CombatResolver {
  constructor(entityRegistry, weaponDefs, projectileDefs, eventBus, garrisonSystem = null) {
    this.entities       = entityRegistry;
    this.weaponDefs     = weaponDefs;
    this.projDefs       = projectileDefs;
    this.events         = eventBus;
    this.garrisonSystem = garrisonSystem; // injected after init via setGarrisonSystem()
  }

  setGarrisonSystem(gs) { this.garrisonSystem = gs; }

  // ── Per-tick update ───────────────────────────────────────────────────────

  tick(dt) {
    for (const entity of this.entities.getAll()) {
      if (!entity.alive) continue;
      if (!entity.attackTarget) continue;

      const target = this.entities.get(entity.attackTarget);
      if (!target || !target.alive) {
        entity.clearAttackTarget?.();
        continue;
      }

      // Range check — use mount origin for garrisoned units
      const weapId = entity.weapons?.[0];
      if (!weapId) continue;
      const weapDef = this.weaponDefs[weapId];
      if (!weapDef) continue;

      let fireOriginCol = entity.col;
      let fireOriginRow = entity.row;
      if (entity.layer === 'garrisoned' && entity.garrisonedIn && this.garrisonSystem) {
        const gs = this.entities.get(entity.garrisonedIn);
        if (gs) {
          const o = this.garrisonSystem.getMountOrigin(entity, gs);
          fireOriginCol = o.col;
          fireOriginRow = o.row;
        }
      }
      const drc = target.col - fireOriginCol;
      const drr = target.row - fireOriginRow;
      const dist = Math.sqrt(drc * drc + drr * drr);

      if (dist > weapDef.range) {
        // Too far — if unit can move, it should pathfind closer (handled by AI/orders)
        continue;
      }

      // Cooldown check
      if (entity.tickWeaponCooldowns) entity.tickWeaponCooldowns(dt);
      if (!entity.canFireWeapon?.(weapId)) continue;

      // Fire!
      this._fireWeapon(entity, target, weapDef);
    }
  }

  // ── Fire a weapon ─────────────────────────────────────────────────────────

  _fireWeapon(attacker, target, weapDef) {
    // Apply cooldown immediately
    attacker.triggerWeaponCooldown?.(weapDef.id, weapDef.rateOfFire ?? 1.0);

    // Resolve fire origin — use mount point if garrisoned
    let fromCol = attacker.col;
    let fromRow = attacker.row;
    let garrisonedStructure = null;

    if (attacker.layer === 'garrisoned' && attacker.garrisonedIn && this.garrisonSystem) {
      garrisonedStructure = this.entities.get(attacker.garrisonedIn);
      if (garrisonedStructure) {
        const origin = this.garrisonSystem.getMountOrigin(attacker, garrisonedStructure);
        fromCol = origin.col;
        fromRow = origin.row;

        // Arc check — skip if target outside mount arc
        if (!this.garrisonSystem.canMountFire(attacker, target.col, target.row, garrisonedStructure.col, garrisonedStructure.row)) {
          return; // can't fire in this direction from this mount point
        }
      }
    }

    // Update facing toward target (free rotation for non-garrisoned only)
    if (!garrisonedStructure) {
      const dc = target.col - attacker.col;
      const dr = target.row - attacker.row;
      if (attacker.facing !== undefined) {
        const angle = Math.atan2(dr, dc);
        const deg = ((angle * 180 / Math.PI) + 360) % 360;
        attacker.facing = Math.round(deg / 45) % 8;
      }
    }

    // Emit fire event (presentation layer picks this up for tracers/muzzle FX)
    this.events.emit('weapon_fired', {
      attackerId: attacker.id,
      targetId:   target.id,
      weaponId:   weapDef.id,
      weaponDef: weapDef,
      fromCol,
      fromRow,
      toCol:   target.col,
      toRow:   target.row,
      fromMount: garrisonedStructure !== null,
      mountStructureId: garrisonedStructure?.id ?? null,
    });

    // Resolve projectile
    const projDef = this.projDefs[weapDef.projectile];

    if (projDef && projDef.aoeRadius > 0) {
      // AOE — splash damage
      this._resolveAoe(attacker, target.col, target.row, projDef, weapDef);
    } else {
      // Direct hit
      this._resolveDirect(attacker, target, weapDef, projDef);
    }
  }

  _resolveDirect(attacker, target, weapDef, projDef) {
    // Miss chance based on accuracy
    const accuracy = weapDef.accuracy ?? 0.9;
    if (Math.random() > accuracy) {
      this.events.emit('weapon_miss', {
        attackerId: attacker.id,
        targetId:   target.id,
        weaponId:   weapDef.id,
        toCol: target.col,
        toRow: target.row,
      });
      return;
    }

    const damage = this._calcDamage(
      weapDef.damage ?? projDef?.damage ?? 10,
      weapDef.category ?? 'small_arms',
      target.armour ?? 'light',
      target.entrenched ? target._trenchCover ?? 0.5 : 0,
    );

    const actualDamage = target.takeDamage(damage);

    this.events.emit('unit_hit', {
      attackerId: attacker.id,
      targetId:   target.id,
      weaponId:   weapDef.id,
      damage:     actualDamage,
      col: target.col,
      row: target.row,
      impactFX: weapDef.impactFX ?? projDef?.impactFX ?? 'impact_dirt',
    });

    if (!target.alive) {
      this._handleKill(attacker, target, weapDef, projDef);
    }
  }

  _resolveAoe(attacker, centreCol, centreRow, projDef, weapDef) {
    const radius = projDef.aoeRadius ?? 2;

    // Find all entities in radius
    const targets = this.entities.getAll().filter(e => {
      if (!e.alive) return false;
      if (e.id === attacker.id) return false; // no self-damage for now
      const dc = e.col - centreCol;
      const dr = e.row - centreRow;
      return Math.sqrt(dc * dc + dr * dr) <= radius;
    });

    // Emit explosion event
    this.events.emit('explosion', {
      col: centreCol,
      row: centreRow,
      projDef,
      weapDef,
      size: projDef.explosionSize ?? 'large',
      craterOnImpact: projDef.craterOnImpact ?? false,
      craterRadius: projDef.craterRadius ?? 1,
      screenShake: projDef.screenShake ?? { intensity: 0.5, duration: 0.3 },
    });

    for (const target of targets) {
      const dist = Math.sqrt(
        (target.col - centreCol) ** 2 + (target.row - centreRow) ** 2
      );
      const falloffMult = projDef.aoeFalloff === 'linear'
        ? Math.max(0, 1 - dist / radius)
        : 1;

      const damage = this._calcDamage(
        (projDef.damage ?? 100) * falloffMult,
        weapDef.category ?? 'explosive',
        target.armour ?? 'light',
        target.entrenched ? 0.3 : 0, // trenches absorb AOE too
      );

      const actualDamage = target.takeDamage(damage);

      this.events.emit('unit_hit', {
        attackerId: attacker.id,
        targetId:   target.id,
        weaponId:   weapDef.id,
        damage:     actualDamage,
        col: target.col,
        row: target.row,
        impactFX: projDef.impactFX ?? 'explosion_large',
        aoe: true,
      });

      if (!target.alive) {
        this._handleKill(attacker, target, weapDef, projDef);
      }
    }
  }

  _calcDamage(baseDamage, attackCategory, targetArmour, coverFraction) {
    const armourRow = ARMOUR_TABLE[attackCategory] ?? ARMOUR_TABLE.small_arms;
    const armourMult = armourRow[targetArmour] ?? 1.0;
    const coverMult  = 1 - Math.min(coverFraction, 0.9);
    // Small random variance ±10%
    const variance = 0.9 + Math.random() * 0.2;
    return Math.max(1, Math.round(baseDamage * armourMult * coverMult * variance));
  }

  _handleKill(attacker, target, weapDef, projDef) {
    // Award kill to attacker
    if (attacker.kills !== undefined) {
      attacker.kills++;
      this._checkVeterancy(attacker);
    }

    // Gore FX for infantry killed by explosives
    const goreEligible =
      target.category === 'infantry' &&
      target.crushable &&
      (weapDef.category === 'explosive' || weapDef.category === 'cannon' || weapDef.category === 'flame') &&
      (projDef?.goreOnInfantryKill ?? false);

    this.events.emit('entity_killed', {
      entityId:   target.id,
      attackerId: attacker.id,
      weaponId:   weapDef.id,
      col:        target.col,
      row:        target.row,
      category:   target.category,
      gore:       goreEligible,
      deathFX:    goreEligible ? 'gore_infantry' : `death_${target.category ?? 'infantry'}`,
    });
  }

  _checkVeterancy(entity) {
    const thresholds = [3, 8, 15];
    for (let i = 2; i >= 0; i--) {
      if (entity.kills >= thresholds[i] && entity.veterancy <= i) {
        entity.veterancy = i + 1;
        this.events.emit('veterancy_gained', { entityId: entity.id, level: entity.veterancy });
        break;
      }
    }
  }
}
