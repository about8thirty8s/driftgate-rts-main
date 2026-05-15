/**
 * Entity.js
 * Base class for all simulation objects — units, structures, projectiles.
 * Pure data + logic. Zero rendering.
 */

let _nextId = 1;

export function generateEntityId() {
  return `e_${_nextId++}`;
}

export const EntityType = {
  UNIT:       'UNIT',
  STRUCTURE:  'STRUCTURE',
  PROJECTILE: 'PROJECTILE',
  EFFECT:     'EFFECT',
};

export const Faction = {
  PLAYER:   'player',
  ENEMY:    'enemy',
  ALLY:     'ally',
  NEUTRAL:  'neutral',
};

export const EntityState = {
  IDLE:       'idle',
  MOVING:     'moving',
  ATTACKING:  'attacking',
  BUILDING:   'building',
  REPAIRING:  'repairing',
  GARRISONED:  'garrisoned',
  SUBTERRAIN:  'subterrain',
  ENTRENCHED: 'entrenched',
  DEAD:       'dead',
  CONSTRUCTING: 'constructing', // structure being built
};

export class Entity {
  constructor(defId, entityType, faction) {
    this.id = generateEntityId();
    this.defId = defId;           // references content definition id
    this.entityType = entityType;
    this.faction = faction;

    // Position in tile-space (float for smooth movement)
    this.col = 0;
    this.row = 0;

    // HP
    this.hp = 100;
    this.maxHp = 100;
    this.alive = true;

    // State
    this.state = EntityState.IDLE;

    // Facing (0–7, N NE E SE S SW W NW)
    this.facing = 4; // south

    // Selection
    this.selected = false;

    // Tags for queries
    this.tags = new Set();

    // Arbitrary extra data bag (used by subclasses)
    this._data = {};
  }

  get hpFraction() {
    return this.maxHp > 0 ? this.hp / this.maxHp : 0;
  }

  takeDamage(amount) {
    if (!this.alive) return 0;
    const actual = Math.min(this.hp, amount);
    this.hp -= actual;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.state = EntityState.DEAD;
    }
    return actual;
  }

  heal(amount) {
    if (!this.alive) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  hasTag(tag) { return this.tags.has(tag); }
  addTag(tag) { this.tags.add(tag); }
  removeTag(tag) { this.tags.delete(tag); }

  distanceTo(other) {
    const dc = this.col - other.col;
    const dr = this.row - other.row;
    return Math.sqrt(dc * dc + dr * dr);
  }

  // Override in subclasses
  tick(dt, context) {}

  serialize() {
    return {
      id: this.id,
      defId: this.defId,
      entityType: this.entityType,
      faction: this.faction,
      col: this.col,
      row: this.row,
      hp: this.hp,
      maxHp: this.maxHp,
      alive: this.alive,
      state: this.state,
      facing: this.facing,
    };
  }
}
