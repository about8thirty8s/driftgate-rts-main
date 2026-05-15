/**
 * GarrisonSystem.js
 * Manages infantry entering/exiting garrisonable buildings.
 *
 * Rules:
 *  - Only infantry category units can garrison.
 *  - Only structures with garrisonable:true accept occupants.
 *  - Max occupants = garrisonSlots (1–4).
 *  - Garrisoned units are removed from the surface layer (hidden, no movement).
 *  - MountPoints define where tracers originate and what arc they can fire into.
 *  - Eviction: units exit to a walkable tile adjacent to the building.
 *  - Building destruction: all occupants are killed.
 *
 * Does NOT touch pathfinding — callers are responsible for cancelling paths before calling enter().
 */

import { EntityState } from '../entities/Entity.js';

// Facing arc constants (8-way, matching UnitEntity._dirToFacing)
// MountPoint.facing is 0–7. Units in that slot can only fire into a ±2 arc.
const FACING_ARC = 2; // sectors either side of mount point facing

export class GarrisonSystem {
  constructor({ entities, grid, eventBus }) {
    this.entities = entities;
    this.grid     = grid;
    this.events   = eventBus;
  }

  // ── Enter ─────────────────────────────────────────────────────────────────

  /**
   * Attempt to garrison `unit` into `structure`.
   * Returns true on success.
   */
  enter(unit, structure) {
    if (!this._canEnter(unit, structure)) return false;

    // Remove from surface tile
    this.grid.removeOccupant(Math.round(unit.col), Math.round(unit.row), unit.id);

    // Stop movement and clear attack
    unit.stopMoving();
    unit.clearAttackTarget();

    // Assign to structure
    unit.garrisonedIn  = structure.id;
    unit.layer         = 'garrisoned';
    unit.state         = EntityState.GARRISONED ?? 'garrisoned';

    // Bind to a mount point (round-robin)
    const slotIndex = structure.garrisonOccupants.length;
    const mp = structure.mountPoints?.[slotIndex % Math.max(1, structure.mountPoints.length)];
    unit.garrisonMountIndex = slotIndex;
    unit.garrisonMountPoint = mp ?? null;

    // Assign facing from mount point
    if (mp?.facing !== undefined) unit.facing = mp.facing;

    structure.garrisonOccupants.push(unit.id);

    this.events.emit('unit_garrisoned', {
      unitId:       unit.id,
      structureId:  structure.id,
      mountIndex:   slotIndex,
      mountPoint:   mp,
    });

    return true;
  }

  // ── Exit ──────────────────────────────────────────────────────────────────

  /**
   * Eject `unit` from its building.
   * Finds nearest walkable tile adjacent to the structure footprint.
   */
  exit(unit) {
    const structure = this.entities.get(unit.garrisonedIn);
    if (!structure) {
      this._forceEjectUnit(unit, null);
      return;
    }

    const exitTile = this._findExitTile(structure);
    this._ejectUnit(unit, structure, exitTile);
  }

  /**
   * Evict ALL occupants from a structure (used on destruction or order).
   */
  evictAll(structure) {
    // Copy array — mutated during loop
    for (const unitId of [...structure.garrisonOccupants]) {
      const unit = this.entities.get(unitId);
      if (unit) this.exit(unit);
    }
  }

  // ── Mount-point firing ────────────────────────────────────────────────────

  /**
   * Called by CombatResolver. Returns the screen/world origin for a garrisoned unit's shot.
   * `unit.garrisonMountPoint` holds { x, y, facing } in tile-offsets from structure top-left.
   * If no mount point, falls back to structure centre.
   */
  getMountOrigin(unit, structure) {
    const mp = unit.garrisonMountPoint;
    if (!mp) {
      return {
        col: structure.col + (structure.footprint?.w ?? 2) / 2,
        row: structure.row + (structure.footprint?.h ?? 2) / 2,
      };
    }
    return {
      col: structure.col + (mp.x ?? 0),
      row: structure.row + (mp.y ?? 0),
    };
  }

  /**
   * Can a garrisoned unit fire at `targetCol/Row` from its mount point?
   * Checks that the target falls within the mount point's facing arc.
   */
  canMountFire(unit, targetCol, targetRow, structureCol, structureRow) {
    const mp = unit.garrisonMountPoint;
    if (!mp) return true; // no restriction

    const originCol = structureCol + (mp.x ?? 0);
    const originRow = structureRow + (mp.y ?? 0);

    const angle = Math.atan2(targetRow - originRow, targetCol - originCol);
    const deg   = ((angle * 180 / Math.PI) + 360) % 360;
    const sector = Math.round(deg / 45) % 8;

    const facingDiff = Math.abs(sector - mp.facing);
    const wrapped    = Math.min(facingDiff, 8 - facingDiff);
    return wrapped <= FACING_ARC;
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  _canEnter(unit, structure) {
    if (!unit || !structure) return false;
    if (!structure.alive) return false;
    if (!structure.garrisonable) return false;
    if (unit.category !== 'infantry') return false;
    if (unit.garrisonedIn) return false; // already garrisoned
    if (unit.layer === 'subterrain') return false;
    if (structure.garrisonOccupants.length >= (structure.garrisonSlots ?? 0)) return false;
    // Must be same faction (player can't garrison enemy buildings without capturing)
    if (unit.faction !== structure.faction) return false;
    // Must be adjacent (within 2 tiles of footprint)
    return this._isAdjacentToStructure(unit, structure);
  }

  _isAdjacentToStructure(unit, structure) {
    const fw = structure.footprint?.w ?? 2;
    const fh = structure.footprint?.h ?? 2;
    const uc = Math.round(unit.col);
    const ur = Math.round(unit.row);
    // Check if unit is within the bounding box + 2 tiles
    return (
      uc >= structure.col - 2 && uc <= structure.col + fw + 1 &&
      ur >= structure.row - 2 && ur <= structure.row + fh + 1
    );
  }

  _ejectUnit(unit, structure, exitTile) {
    // Remove from structure
    if (structure) {
      structure.garrisonOccupants = structure.garrisonOccupants.filter(id => id !== unit.id);
    }

    // Place on surface
    const col = exitTile?.col ?? Math.round(unit.col);
    const row = exitTile?.row ?? Math.round(unit.row);
    unit.col = col;
    unit.row = row;
    unit.garrisonedIn      = null;
    unit.garrisonMountPoint= null;
    unit.garrisonMountIndex= null;
    unit.layer             = 'surface';
    unit.state             = EntityState.IDLE;

    this.grid.addOccupant(col, row, unit.id);

    this.events.emit('unit_exited_garrison', {
      unitId:      unit.id,
      structureId: structure?.id ?? null,
      col, row,
    });
  }

  _forceEjectUnit(unit, structure) {
    // Last-resort: place near where they were
    const col = Math.round(unit.col);
    const row = Math.round(unit.row);
    this._ejectUnit(unit, structure, { col, row });
  }

  _findExitTile(structure) {
    const fw = structure.footprint?.w ?? 2;
    const fh = structure.footprint?.h ?? 2;
    // Search outward from footprint edges
    for (let r = 1; r <= 4; r++) {
      for (let dc = -r; dc <= fw + r; dc++) {
        for (let dr = -r; dr <= fh + r; dr++) {
          if (Math.abs(dc) !== r && Math.abs(dr) !== r) continue;
          const c = structure.col + dc;
          const ro = structure.row + dr;
          if (this.grid.isWalkable(c, ro)) return { col: c, row: ro };
        }
      }
    }
    return { col: structure.col - 1, row: structure.row - 1 };
  }
}
