/**
 * HarvesterSystem.js
 *
 * Manages collector vehicles that autonomously:
 *   IDLE → DRIVE_TO_ORE → HARVESTING → RETURN_TO_REFINERY → DUMPING → IDLE
 *
 * Each harvester is a UnitEntity with extra fields attached:
 *   unit.cargo        0–1  (fraction of cargo capacity full)
 *   unit.cargoMax     number of harvest ticks to fill
 *   unit.harvesterState  string
 *   unit.assignedRefinery  structure entity id
 *   unit.targetOreCol/Row  tile target while driving to ore
 *   unit._dumpTimer   seconds remaining in dump animation
 *
 * The system calls ResourceFieldSystem.harvest() and handles
 * pathfinding (simple direct approach — tiles grid walk).
 * Credits are added to the game via 'harvester_payout' event.
 */

import { EntityState } from '../entities/Entity.js';

const HARVEST_STATE = {
  IDLE:               'idle',
  DRIVE_TO_ORE:       'drive_to_ore',
  HARVESTING:         'harvesting',
  RETURN_TO_REFINERY: 'return_to_refinery',
  DUMPING:            'dumping',
};

const MOVE_SPEED        = 2.5;   // tiles/sec (slightly faster than infantry)
const HARVEST_RATE      = 0.6;   // richness drained per second while harvesting
const CARGO_CAPACITY    = 1.0;   // full cargo = 1.0
const DUMP_DURATION     = 3.0;   // seconds to dump at refinery
const HARVEST_SEARCH_R  = 10;    // tile radius to look for ore

export class HarvesterSystem {
  /**
   * @param {object} opts
   * @param {EventBus}           opts.eventBus
   * @param {EntityRegistry}     opts.entities
   * @param {ResourceFieldSystem} opts.resourceFields
   * @param {Pathfinder}         opts.pathfinder
   */
  constructor({ eventBus, entities, resourceFields, pathfinder }) {
    this.events         = eventBus;
    this.entities       = entities;
    this.resourceFields = resourceFields;
    this.pathfinder     = pathfinder;

    // Set of unit ids being managed
    this._harvesters = new Set();
  }

  /** Register a unit entity as a harvester linked to a refinery structure. */
  register(unitEntity, refineryEntity) {
    unitEntity.cargo              = 0;
    unitEntity.cargoFull          = false;
    unitEntity.harvesterState     = HARVEST_STATE.IDLE;
    unitEntity.assignedRefinery   = refineryEntity.id;
    unitEntity.targetOreCol       = null;
    unitEntity.targetOreRow       = null;
    unitEntity._dumpTimer         = 0;
    unitEntity._harvestAccum      = 0;
    unitEntity._moveProgress      = 0;
    unitEntity._fromCol           = unitEntity.col;
    unitEntity._fromRow           = unitEntity.row;
    unitEntity.path               = [];
    this._harvesters.add(unitEntity.id);
  }

  tick(dt) {
    for (const id of this._harvesters) {
      const unit = this.entities.get(id);
      if (!unit || !unit.alive) { this._harvesters.delete(id); continue; }
      this._tickHarvester(unit, dt);
    }
  }

  getHarvesters() {
    return [...this._harvesters]
      .map(id => this.entities.get(id))
      .filter(Boolean);
  }

  // ── State machine ─────────────────────────────────────────────────────────

  _tickHarvester(unit, dt) {
    switch (unit.harvesterState) {
      case HARVEST_STATE.IDLE:               this._tickIdle(unit, dt);      break;
      case HARVEST_STATE.DRIVE_TO_ORE:       this._tickDriveToOre(unit, dt); break;
      case HARVEST_STATE.HARVESTING:         this._tickHarvesting(unit, dt); break;
      case HARVEST_STATE.RETURN_TO_REFINERY: this._tickReturn(unit, dt);    break;
      case HARVEST_STATE.DUMPING:            this._tickDumping(unit, dt);   break;
    }
  }

  _tickIdle(unit, _dt) {
    // Find ore → start driving
    const ore = this.resourceFields.findNearestOre(unit.col, unit.row, HARVEST_SEARCH_R);
    if (!ore) return; // no ore nearby — stay idle

    unit.targetOreCol = ore.col;
    unit.targetOreRow = ore.row;
    this._setPath(unit, ore.col, ore.row);
    unit.harvesterState = HARVEST_STATE.DRIVE_TO_ORE;
    unit.state = EntityState.MOVING;
  }

  _tickDriveToOre(unit, dt) {
    const arrived = this._stepAlongPath(unit, dt);
    if (arrived) {
      unit.harvesterState = HARVEST_STATE.HARVESTING;
      unit.state = EntityState.IDLE;
    }
  }

  _tickHarvesting(unit, dt) {
    // Check ore still here
    const richness = this.resourceFields.getRichness(
      Math.round(unit.col), Math.round(unit.row)
    );
    if (richness < 0.05) {
      // Tile exhausted — look for another
      const ore = this.resourceFields.findNearestOre(unit.col, unit.row, HARVEST_SEARCH_R);
      if (ore) {
        unit.targetOreCol = ore.col;
        unit.targetOreRow = ore.row;
        this._setPath(unit, ore.col, ore.row);
        unit.harvesterState = HARVEST_STATE.DRIVE_TO_ORE;
        unit.state = EntityState.MOVING;
      } else {
        // No ore at all — if cargo > 0 go dump, else idle
        if (unit.cargo > 0.02) {
          this._startReturn(unit);
        } else {
          unit.harvesterState = HARVEST_STATE.IDLE;
        }
      }
      return;
    }

    // Harvest
    const taken = this.resourceFields.harvest(
      Math.round(unit.col), Math.round(unit.row),
      HARVEST_RATE * dt
    );
    unit.cargo = Math.min(CARGO_CAPACITY, unit.cargo + taken);
    unit.cargoFull = unit.cargo >= CARGO_CAPACITY;

    if (unit.cargo >= CARGO_CAPACITY) {
      this._startReturn(unit);
    }
  }

  _startReturn(unit) {
    const refinery = this.entities.get(unit.assignedRefinery);
    if (!refinery) return;
    this._setPath(unit, refinery.col, refinery.row);
    unit.harvesterState = HARVEST_STATE.RETURN_TO_REFINERY;
    unit.state = EntityState.MOVING;
  }

  _tickReturn(unit, dt) {
    const arrived = this._stepAlongPath(unit, dt);
    if (arrived) {
      unit.harvesterState = HARVEST_STATE.DUMPING;
      unit._dumpTimer = DUMP_DURATION;
      unit.state = EntityState.IDLE;
    }
  }

  _tickDumping(unit, dt) {
    unit._dumpTimer -= dt;
    if (unit._dumpTimer <= 0) {
      // Payout
      const refinery = this.entities.get(unit.assignedRefinery);
      const payout = Math.floor(unit.cargo * ResourceFieldSystem_HARVEST_CREDITS);
      this.events.emit('harvester_payout', {
        amount: payout,
        harvesterid: unit.id,
        refineryId: unit.assignedRefinery,
        col: refinery?.col ?? unit.col,
        row: refinery?.row ?? unit.row,
      });
      unit.cargo    = 0;
      unit.cargoFull = false;
      unit._dumpTimer = 0;
      unit.harvesterState = HARVEST_STATE.IDLE;
    }
  }

  // ── Movement helper ───────────────────────────────────────────────────────

  _setPath(unit, targetCol, targetRow) {
    // Use pathfinder if available; fallback: direct line
    if (this.pathfinder?.findPath) {
      const path = this.pathfinder.findPath(
        Math.round(unit.col), Math.round(unit.row),
        targetCol, targetRow
      );
      unit.path = path ?? [{ col: targetCol, row: targetRow }];
    } else {
      unit.path = [{ col: targetCol, row: targetRow }];
    }
    unit._fromCol = unit.col;
    unit._fromRow = unit.row;
    unit._moveProgress = 0;
  }

  _stepAlongPath(unit, dt) {
    if (!unit.path || unit.path.length === 0) return true; // arrived

    const next = unit.path[0];
    const dc = next.col - unit.col;
    const dr = next.row - unit.row;
    const dist = Math.sqrt(dc * dc + dr * dr);

    if (dist < 0.05) {
      unit.col = next.col;
      unit.row = next.row;
      unit.path.shift();
      return unit.path.length === 0;
    }

    const step = MOVE_SPEED * dt;
    const ratio = Math.min(1, step / dist);
    unit.col += dc * ratio;
    unit.row += dr * ratio;

    // Update facing (8 directions)
    const angle = Math.atan2(dr, dc); // -π to π
    unit.facing = Math.round(((angle / Math.PI) * 4 + 8)) % 8;

    return false;
  }
}

// Avoid circular import — inline the constant
const ResourceFieldSystem_HARVEST_CREDITS = 80;

export { HARVEST_STATE };
