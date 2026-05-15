/**
 * SubterrainSystem.js
 * MVP — surface-only pathfinding preserved. No underground world rendered.
 *
 * What this does:
 *  - Tracks entrance/exit points registered on the map.
 *  - When a unit walks onto an entrance tile → triggers subterrain transition.
 *  - Unit switches layer: 'surface' → 'subterrain'.
 *  - On subterrain: unit is invisible on surface, teleported to destination entrance.
 *  - Travel time is simulated as a countdown (not spatial pathing underground).
 *  - On arrival: unit switches back to 'surface', spawns at target entrance.
 *
 * Entrances have:
 *   { id, col, row, linkedId }
 *   - linkedId: the id of the other entrance this one connects to.
 *
 * Travel time = distance(entrance_A, entrance_B) * 0.6 seconds per tile.
 * Minimum 2 seconds, maximum 12 seconds.
 */

import { EntityState } from '../entities/Entity.js';

export class SubterrainSystem {
  constructor({ entities, grid, eventBus }) {
    this.entities  = entities;
    this.grid      = grid;
    this.events    = eventBus;

    // Map of entrance id → entrance data
    this._entrances = new Map();

    // Active tunnel transits: unitId → { targetEntrance, timeRemaining, totalTime }
    this._transits  = new Map();
  }

  // ── Registration ──────────────────────────────────────────────────────────

  /**
   * Register entrances from the map definition.
   * entranceList: [{ id, col, row, linkedId }]
   */
  registerEntrances(entranceList) {
    for (const e of entranceList) {
      this._entrances.set(e.id, { ...e });
      // Mark tile so tick() can detect units stepping on it
      this.grid.setSubterrainEntrance(e.col, e.row, e.id);
    }
  }

  getEntrance(id) {
    return this._entrances.get(id) ?? null;
  }

  getAllEntrances() {
    return [...this._entrances.values()];
  }

  // ── Tick ──────────────────────────────────────────────────────────────────

  /**
   * Called every sim tick.
   * 1. Check if any surface unit stepped on an entrance → send underground.
   * 2. Advance active transits → emerge at destination.
   */
  tick(dt) {
    // --- Check surface units stepping on entrance tiles ---
    for (const unit of this.entities.getUnits()) {
      if (!unit.alive) continue;
      if (unit.layer !== 'surface') continue;
      if (this._transits.has(unit.id)) continue;
      if (!unit.allowedLayers?.includes('subterrain')) continue;

      const col = Math.round(unit.col);
      const row = Math.round(unit.row);
      const entranceId = this.grid.getSubterrainEntranceId(col, row);
      if (!entranceId) continue;

      const entrance = this._entrances.get(entranceId);
      if (!entrance) continue;
      if (!entrance.linkedId) continue;

      const destination = this._entrances.get(entrance.linkedId);
      if (!destination) continue;

      this._beginTransit(unit, entrance, destination);
    }

    // --- Advance active transits ---
    for (const [unitId, transit] of this._transits) {
      transit.timeRemaining -= dt;

      if (transit.timeRemaining <= 0) {
        const unit = this.entities.get(unitId);
        if (unit) this._emerge(unit, transit);
        this._transits.delete(unitId);
      }
    }
  }

  // ── Enter tunnel ──────────────────────────────────────────────────────────

  _beginTransit(unit, fromEntrance, toEntrance) {
    // Remove from surface tile
    this.grid.removeOccupant(Math.round(unit.col), Math.round(unit.row), unit.id);

    unit.stopMoving?.();
    unit.clearAttackTarget?.();
    unit.layer  = 'subterrain';
    unit.state  = EntityState.SUBTERRAIN ?? 'subterrain';

    const dx   = toEntrance.col - fromEntrance.col;
    const dy   = toEntrance.row - fromEntrance.row;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const time = Math.max(2, Math.min(12, dist * 0.6));

    this._transits.set(unit.id, {
      targetEntrance: toEntrance,
      timeRemaining: time,
      totalTime: time,
    });

    this.events.emit('unit_entered_subterrain', {
      unitId:    unit.id,
      fromCol:   fromEntrance.col,
      fromRow:   fromEntrance.row,
      toCol:     toEntrance.col,
      toRow:     toEntrance.row,
      travelTime: time,
    });
  }

  // ── Emerge ────────────────────────────────────────────────────────────────

  _emerge(unit, transit) {
    const dest = transit.targetEntrance;

    // Find walkable spot at or near destination
    const spot = this._findWalkable(dest.col, dest.row);
    unit.col   = spot.col;
    unit.row   = spot.row;
    unit.layer = 'surface';
    unit.state = EntityState.IDLE;

    this.grid.addOccupant(spot.col, spot.row, unit.id);

    this.events.emit('unit_emerged_subterrain', {
      unitId: unit.id,
      col:    spot.col,
      row:    spot.row,
    });
  }

  _findWalkable(col, row) {
    if (this.grid.isWalkable(col, row)) return { col, row };
    for (let r = 1; r <= 4; r++) {
      for (let dc = -r; dc <= r; dc++) {
        for (let dr = -r; dr <= r; dr++) {
          if (Math.abs(dc) !== r && Math.abs(dr) !== r) continue;
          if (this.grid.isWalkable(col + dc, row + dr)) return { col: col + dc, row: row + dr };
        }
      }
    }
    return { col, row }; // fallback
  }

  // ── Query ─────────────────────────────────────────────────────────────────

  getTransit(unitId) {
    return this._transits.get(unitId) ?? null;
  }

  isInTransit(unitId) {
    return this._transits.has(unitId);
  }

  getTransitProgress(unitId) {
    const t = this._transits.get(unitId);
    if (!t) return null;
    return 1 - t.timeRemaining / t.totalTime; // 0→1
  }
}
