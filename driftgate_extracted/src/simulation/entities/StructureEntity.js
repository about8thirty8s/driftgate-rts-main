/**
 * StructureEntity.js
 * Static buildings — HQ, barracks, factory, turret, power plant.
 * Reads from StructureDefinition.
 */

import { Entity, EntityType, EntityState } from './Entity.js';

export const StructureState = {
  CONSTRUCTING: 'constructing',
  OPERATIONAL:  'operational',
  DAMAGED:      'damaged',       // < 50% hp
  CRITICAL:     'critical',      // < 25% hp
  DESTROYED:    'destroyed',
  UNPOWERED:    'unpowered',
};

export class StructureEntity extends Entity {
  constructor(def, faction) {
    super(def.id, EntityType.STRUCTURE, faction);

    this.displayName   = def.displayName;
    this.category      = def.category;     // 'hq' | 'production' | 'power' | 'defense' | 'resource'
    this.footprint     = def.footprint;    // {w, h}
    this.powerDraw     = def.powerDraw ?? 0;
    this.powerGen      = def.powerGen ?? 0;
    this.produces      = def.produces ?? [];
    this.weapons       = def.weapons ?? [];
    this.buildCost     = def.cost ?? 0;
    this.buildTime     = def.buildTime ?? 10;

    this.maxHp         = def.hp ?? 500;
    this.hp            = 0; // starts at 0 when being constructed
    this.armour        = def.armour ?? 'structure';

    // Construction
    this.constructionProgress = 0; // 0–1
    this.structureState = StructureState.CONSTRUCTING;

    // Production queue
    this.productionQueue = [];      // [{defId, progress (0–1), buildTime}]
    this.maxQueueSize    = def.maxQueueSize ?? 5;

    // Power state
    this.powered = true;

    // Garrison system
    this.garrisonable      = def.garrisonable ?? false;
    this.garrisonSlots     = def.garrisonSlots ?? 0;
    this.mountPoints       = def.mountPoints ?? [];  // [{x, y, facing}]
    this.garrisonOccupants = [];                     // unit ids currently inside


    // For turrets — attack logic
    this.attackTarget   = null;
    this.weaponCooldowns = {};

    // Capture progress (for engineer units)
    this.captureProgress = 0;      // 0–1
    this.capturingBy     = null;   // faction
  }

  // ── Construction ──────────────────────────────────────────────────────────

  // Called by builder unit every tick while constructing
  advanceConstruction(dt) {
    if (this.structureState !== StructureState.CONSTRUCTING) return false;
    this.constructionProgress += dt / this.buildTime;
    this.hp = Math.floor(this.constructionProgress * this.maxHp);
    if (this.constructionProgress >= 1) {
      this.constructionProgress = 1;
      this.hp = this.maxHp;
      this.structureState = StructureState.OPERATIONAL;
      this.state = EntityState.IDLE;
      return true; // construction complete
    }
    return false;
  }

  // ── Production ────────────────────────────────────────────────────────────

  canQueueUnit(defId) {
    return this.productionQueue.length < this.maxQueueSize &&
           this.structureState === StructureState.OPERATIONAL &&
           this.powered;
  }

  queueUnit(def) {
    if (!this.canQueueUnit(def.id)) return false;
    this.productionQueue.push({
      defId: def.id,
      buildTime: def.buildTime ?? 8,
      progress: 0,
    });
    return true;
  }

  cancelQueue(index) {
    if (index >= 0 && index < this.productionQueue.length) {
      this.productionQueue.splice(index, 1);
    }
  }

  // Returns completed defId or null
  tickProduction(dt) {
    if (!this.powered || this.productionQueue.length === 0) return null;
    if (this.structureState !== StructureState.OPERATIONAL) return null;

    const front = this.productionQueue[0];
    front.progress += dt / front.buildTime;
    if (front.progress >= 1) {
      this.productionQueue.shift();
      return front.defId; // unit ready to spawn
    }
    return null;
  }

  // ── Damage State ──────────────────────────────────────────────────────────

  getStructureState() {
    if (!this.alive) return StructureState.DESTROYED;
    if (!this.powered) return StructureState.UNPOWERED;
    if (this.structureState === StructureState.CONSTRUCTING) return StructureState.CONSTRUCTING;
    const f = this.hpFraction;
    if (f < 0.25) return StructureState.CRITICAL;
    if (f < 0.50) return StructureState.DAMAGED;
    return StructureState.OPERATIONAL;
  }

  // ── Capture ───────────────────────────────────────────────────────────────

  advanceCapture(dt, byFaction) {
    if (this.capturingBy && this.capturingBy !== byFaction) {
      // Different faction — reset
      this.captureProgress = 0;
      this.capturingBy = byFaction;
    } else {
      this.capturingBy = byFaction;
      this.captureProgress += dt / 8; // 8 seconds to capture
      if (this.captureProgress >= 1) {
        this.faction = byFaction;
        this.captureProgress = 0;
        this.capturingBy = null;
        return true; // captured!
      }
    }
    return false;
  }

  interruptCapture() {
    this.captureProgress = Math.max(0, this.captureProgress - 0.2);
  }

  serialize() {
    return {
      ...super.serialize(),
      category: this.category,
      footprint: this.footprint,
      structureState: this.getStructureState(),
      constructionProgress: this.constructionProgress,
      productionQueue: this.productionQueue.map(q => ({ ...q })),
      powered: this.powered,
      captureProgress: this.captureProgress,
    };
  }
}
