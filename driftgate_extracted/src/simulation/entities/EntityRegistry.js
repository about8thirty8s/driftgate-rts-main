/**
 * EntityRegistry.js
 * Single source of truth for all live entities.
 * Supports fast lookup by id, faction, type, and spatial queries.
 */

export class EntityRegistry {
  constructor() {
    this._entities = new Map(); // id → entity
  }

  add(entity) {
    this._entities.set(entity.id, entity);
    return entity;
  }

  remove(id) {
    this._entities.delete(id);
  }

  get(id) {
    return this._entities.get(id) ?? null;
  }

  getAll() {
    return [...this._entities.values()];
  }

  getLive() {
    return this.getAll().filter(e => e.alive);
  }

  getByFaction(faction) {
    return this.getLive().filter(e => e.faction === faction);
  }

  getPlayerUnits() {
    return this.getLive().filter(e => e.faction === 'player' && e.entityType === 'UNIT');
  }

  getPlayerStructures() {
    return this.getLive().filter(e => e.faction === 'player' && e.entityType === 'STRUCTURE');
  }

  getEnemyUnits() {
    return this.getLive().filter(e => e.faction === 'enemy' && e.entityType === 'UNIT');
  }

  getEnemyStructures() {
    return this.getLive().filter(e => e.faction === 'enemy' && e.entityType === 'STRUCTURE');
  }

  getStructures() {
    return this.getLive().filter(e => e.entityType === 'STRUCTURE');
  }

  getUnits() {
    return this.getLive().filter(e => e.entityType === 'UNIT');
  }

  getProjectiles() {
    return this.getLive().filter(e => e.entityType === 'PROJECTILE');
  }

  // Spatial query: all entities within tile-radius of (col,row)
  getInRadius(col, row, radius) {
    return this.getLive().filter(e => {
      const dc = e.col - col;
      const dr = e.row - row;
      return Math.sqrt(dc * dc + dr * dr) <= radius;
    });
  }

  // Nearest enemy to a position
  getNearestEnemy(col, row, fromFaction) {
    let best = null;
    let bestDist = Infinity;
    for (const e of this.getLive()) {
      if (e.faction === fromFaction) continue;
      if (e.entityType === 'PROJECTILE') continue;
      const dc = e.col - col;
      const dr = e.row - row;
      const dist = Math.sqrt(dc * dc + dr * dr);
      if (dist < bestDist) {
        bestDist = dist;
        best = e;
      }
    }
    return best;
  }

  // Nearest enemy AIR unit to a position
  getNearestEnemyAir(col, row, fromFaction) {
    let best = null;
    let bestDist = Infinity;
    for (const e of this.getLive()) {
      if (e.faction === fromFaction) continue;
      if (!e.isAir) continue;
      const dc = e.col - col;
      const dr = e.row - row;
      const dist = Math.sqrt(dc * dc + dr * dr);
      if (dist < bestDist) {
        bestDist = dist;
        best = e;
      }
    }
    return best;
  }

  purgeDeadEntities() {
    for (const [id, e] of this._entities) {
      if (!e.alive) this._entities.delete(id);
    }
  }

  get count() { return this._entities.size; }
}
