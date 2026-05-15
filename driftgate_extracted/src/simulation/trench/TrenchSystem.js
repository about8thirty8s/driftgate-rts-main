/**
 * TrenchSystem.js
 * Manages infantry entering and exiting trench tiles.
 *
 * Rules:
 *  - Only units with canEnterTrench: true can entrench.
 *  - Entrenching is automatic — when unit stops on a TRENCH tile, they dig in.
 *  - Exiting a trench is automatic — when unit starts moving, they stand up.
 *  - Entrenched units gain cover: _trenchCover = 0.7 (read by CombatResolver).
 *  - Vehicles and air units cannot entrench (canEnterTrench: false in their defs).
 *  - On unit death in trench: tile's trenchOccupants cleaned automatically.
 *  - If a TRENCH tile is converted to CRATER by artillery: all occupants force-exit.
 *
 * TileGrid additions expected:
 *  - tile.trenchOccupants []
 *  - grid.addTrenchOccupant(col, row, id)
 *  - grid.removeTrenchOccupant(col, row, id)
 *  - grid.getTrenchOccupants(col, row)
 */

import { EntityState } from '../entities/Entity.js';

export class TrenchSystem {
  constructor({ entities, grid, eventBus }) {
    this.entities = entities;
    this.grid     = grid;
    this.events   = eventBus;

    // Listen for unit deaths so we can clean up trench occupancy
    this.events.on('entity_killed', ({ entityId }) => {
      const unit = this.entities.get(entityId);
      if (unit && unit.entrenched) {
        this._exitTrench(unit, false); // silent exit — unit is dead
      }
    });
  }

  // ── Tick ──────────────────────────────────────────────────────────────────

  /**
   * Called every sim tick.
   * Checks for:
   *   1. Units that have stopped on a TRENCH tile and should dig in.
   *   2. Units that have started moving and should stand up.
   *   3. TRENCH tiles that have been destroyed (converted to CRATER) — evict occupants.
   */
  tick(dt) {
    for (const unit of this.entities.getUnits()) {
      if (!unit.alive) continue;
      if (!unit.canEnterTrench) continue;
      if (unit.layer !== 'surface') continue; // garrisoned / subterrain units skip

      const col = Math.round(unit.col);
      const row = Math.round(unit.row);
      const onTrench = this.grid.isTrench(col, row);

      if (!unit.entrenched && onTrench && unit.state === EntityState.IDLE) {
        // Unit arrived and stopped on trench tile — dig in
        this._enterTrench(unit, col, row);
      } else if (unit.entrenched && unit.state === EntityState.MOVING) {
        // Unit started moving — stand up
        this._exitTrench(unit, true);
      } else if (unit.entrenched && !onTrench) {
        // Unit walked off trench (e.g. mid-path correction) — exit quietly
        this._exitTrench(unit, true);
      } else if (unit.entrenched) {
        // Check if the tile under them is still a trench
        // (Artillery can convert TRENCH → CRATER)
        const tile = this.grid.getTile(col, row);
        if (tile && tile.type !== 'TRENCH') {
          this._forceEvict(unit, col, row);
        }
      }
    }
  }

  // ── Enter ─────────────────────────────────────────────────────────────────

  _enterTrench(unit, col, row) {
    unit.entrenched    = true;
    unit._trenchCover  = 0.7;  // read by CombatResolver._calcDamage
    unit.state         = EntityState.ENTRENCHED ?? EntityState.IDLE;

    this.grid.addTrenchOccupant(col, row, unit.id);

    this.events.emit('unit_entrenched', {
      unitId: unit.id,
      col, row,
    });
  }

  // ── Exit ──────────────────────────────────────────────────────────────────

  /**
   * @param {boolean} emitEvent — false when unit is dead (skip event spam)
   */
  _exitTrench(unit, emitEvent) {
    const col = Math.round(unit.col);
    const row = Math.round(unit.row);

    unit.entrenched   = false;
    unit._trenchCover = 0;

    this.grid.removeTrenchOccupant(col, row, unit.id);

    if (emitEvent) {
      this.events.emit('unit_exited_trench', {
        unitId: unit.id,
        col, row,
      });
    }
  }

  // ── Force evict (tile destroyed) ──────────────────────────────────────────

  _forceEvict(unit, col, row) {
    unit.entrenched   = false;
    unit._trenchCover = 0;
    unit.state        = EntityState.IDLE;

    this.grid.removeTrenchOccupant(col, row, unit.id);

    this.events.emit('unit_exited_trench', {
      unitId: unit.id,
      col, row,
      reason: 'trench_destroyed',
    });
  }

  // ── Query ─────────────────────────────────────────────────────────────────

  /** How many units are entrenched on a specific tile */
  getOccupancyCount(col, row) {
    return this.grid.getTrenchOccupants(col, row).length;
  }

  /** Is this tile a trench with at least one unit in it? */
  isOccupied(col, row) {
    return this.getOccupancyCount(col, row) > 0;
  }
}
