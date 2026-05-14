/**
 * EntityRegistry.js — AIR FRAMEWORK PATCH
 *
 * LOCATION: src/simulation/entities/EntityRegistry.js
 * APPEND these methods to the EntityRegistry class before the closing brace.
 * Do not replace any existing methods.
 */

// ── Air unit queries ──────────────────────────────────────────────────────

/** All live air units regardless of faction */
getAirUnits() {
  return this.getLive().filter(e => e.isAir && e.entityType === 'UNIT');
}

/** All live ground units (non-air, non-naval, non-projectile) */
getGroundUnits() {
  return this.getLive().filter(e =>
    e.entityType === 'UNIT' && !e.isAir && !e.isNaval
  );
}

/** Air units belonging to a specific faction */
getAirUnitsByFaction(faction) {
  return this.getAirUnits().filter(e => e.faction === faction);
}

/** Nearest enemy ground unit to a position — used by air units for strike targeting */
getNearestEnemyGround(col, row, fromFaction) {
  let best = null;
  let bestDist = Infinity;
  for (const e of this.getLive()) {
    if (e.faction === fromFaction) continue;
    if (e.isAir) continue;
    if (e.entityType === 'PROJECTILE') continue;
    const dc   = e.col - col;
    const dr   = e.row - row;
    const dist = Math.sqrt(dc * dc + dr * dr);
    if (dist < bestDist) { bestDist = dist; best = e; }
  }
  return best;
}

/**
 * Get all enemy units within range that are valid targets for an air unit.
 * Respects weapon category — anti-air weapons only hit air, ground weapons only hit ground.
 * @param {string} faction - attacker faction
 * @param {number} col
 * @param {number} row
 * @param {number} range - tile radius
 * @param {'air'|'ground'|'any'} targetType
 */
getEnemiesInRangeForAir(faction, col, row, range, targetType = 'any') {
  return this.getLive().filter(e => {
    if (e.faction === faction) return false;
    if (e.entityType === 'PROJECTILE') return false;
    if (targetType === 'air'    && !e.isAir) return false;
    if (targetType === 'ground' &&  e.isAir) return false;
    const dc = e.col - col;
    const dr = e.row - row;
    return Math.sqrt(dc * dc + dr * dr) <= range;
  });
}
