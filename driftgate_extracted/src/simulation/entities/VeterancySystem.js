/**
 * VeterancySystem.js
 * Tracks unit kill counts and promotes units through veterancy tiers.
 * Ported and adapted from vietnam-the-war-rts.
 *
 * Tiers:
 *   0 — Rookie   (0 kills)
 *   1 — Veteran  (3 kills) — +25% dmg, +25% armour, +15% speed
 *   2 — Elite    (8 kills) — +50% dmg, +50% armour, +30% speed
 *   3 — Legendary(15 kills)— +75% dmg, +75% armour, +50% speed
 *
 * Usage:
 *   VeterancySystem.onKill(unit)       — call when unit scores a kill
 *   VeterancySystem.getBonus(unit)     — returns { dmgMult, armourMult, speedMult, tier, label, stars }
 *   VeterancySystem.applyBonus(unit)   — mutates unit stats in-place
 */

export const VETERANCY_TIERS = [
  { tier: 0, label: 'Rookie',    kills: 0,  dmgBonus: 0,    armourBonus: 0,    speedBonus: 0,    stars: 0 },
  { tier: 1, label: 'Veteran',   kills: 3,  dmgBonus: 0.25, armourBonus: 0.25, speedBonus: 0.15, stars: 1 },
  { tier: 2, label: 'Elite',     kills: 8,  dmgBonus: 0.50, armourBonus: 0.50, speedBonus: 0.30, stars: 2 },
  { tier: 3, label: 'Legendary', kills: 15, dmgBonus: 0.75, armourBonus: 0.75, speedBonus: 0.50, stars: 3 },
];

export class VeterancySystem {
  /**
   * Call whenever a unit scores a confirmed kill.
   * Returns { promoted: bool, newTier: TierDef } if a promotion occurred.
   */
  static onKill(unit) {
    if (!unit || unit.kills === undefined) return null;

    unit.kills = (unit.kills ?? 0) + 1;

    const prevTier = VeterancySystem.getTier(unit.kills - 1);
    const newTier  = VeterancySystem.getTier(unit.kills);

    if (newTier.tier > prevTier.tier) {
      VeterancySystem.applyBonus(unit);
      return { promoted: true, newTier };
    }

    return { promoted: false, newTier };
  }

  /**
   * Get the tier definition for a given kill count.
   */
  static getTier(kills = 0) {
    let current = VETERANCY_TIERS[0];
    for (const tier of VETERANCY_TIERS) {
      if (kills >= tier.kills) current = tier;
    }
    return current;
  }

  /**
   * Get current bonus multipliers for a unit.
   * Returns { dmgMult, armourMult, speedMult, tier, label, stars }
   */
  static getBonus(unit) {
    const tier = VeterancySystem.getTier(unit.kills ?? 0);
    return {
      dmgMult:    1 + tier.dmgBonus,
      armourMult: 1 + tier.armourBonus,
      speedMult:  1 + tier.speedBonus,
      tier:       tier.tier,
      label:      tier.label,
      stars:      tier.stars,
    };
  }

  /**
   * Apply veterancy bonuses to a unit's base stats in-place.
   * Safe to call on promotion — recalculates from base stats each time.
   */
  static applyBonus(unit) {
    const tier = VeterancySystem.getTier(unit.kills ?? 0);
    if (tier.tier === 0) return; // no bonus at rookie

    // Preserve base stats on first application
    if (unit._baseSpeed   === undefined) unit._baseSpeed   = unit.speed;
    if (unit._baseDamage  === undefined) unit._baseDamage  = unit.damage ?? (unit.weaponDef?.damage ?? 0);
    if (unit._baseArmour  === undefined) unit._baseArmour  = unit.armourRating ?? 1.0;

    unit.speed       = unit._baseSpeed   * (1 + tier.speedBonus);
    unit.armourRating = unit._baseArmour  * (1 + tier.armourBonus);
    // Damage bonus is read at combat resolution via VeterancySystem.getBonus()
    // so we tag the tier on the unit for CombatResolver to pick up
    unit.veterancyTier  = tier.tier;
    unit.veterancyLabel = tier.label;
    unit.veterancyStars = tier.stars;
  }
}
