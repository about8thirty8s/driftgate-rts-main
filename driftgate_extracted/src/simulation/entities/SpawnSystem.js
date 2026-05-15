/**
 * SpawnSystem.js
 * Centralised helper for placing units and structures into the world.
 *
 * Used by: Mission.jsx, Game.jsx, MissionDirector, any future scenario script.
 * Never duplicate spawn logic in page files.
 */

import { UnitEntity }     from './UnitEntity.js';
import { StructureEntity } from './StructureEntity.js';

export class SpawnSystem {
  /**
   * @param {object} deps
   * @param {EntityRegistry} deps.entities
   * @param {TileGrid}        deps.grid
   * @param {object}          deps.unitDefs    — UNIT_DEFS map
   * @param {object}          deps.structDefs  — STRUCT_DEFS map
   */
  constructor({ entities, grid, unitDefs, structDefs }) {
    this.entities   = entities;
    this.grid       = grid;
    this.unitDefs   = unitDefs;
    this.structDefs = structDefs;
  }

  // ── Structures ─────────────────────────────────────────────────────────────

  /**
   * Place a structure on the grid at (col, row) and register it.
   * @param {object|string} defOrId — def object or key into structDefs
   * @param {string}        faction
   * @param {number}        col
   * @param {number}        row
   * @param {object}        [opts]  — { scriptId }
   * @returns {StructureEntity|null}
   */
  spawnStructure(defOrId, faction, col, row, opts = {}) {
    const def = typeof defOrId === 'string' ? this.structDefs[defOrId] : defOrId;
    if (!def) {
      console.warn('[SpawnSystem] Unknown structure def:', defOrId);
      return null;
    }

    const s = new StructureEntity(def, faction);
    s.col = col;
    s.row = row;
    s.hp  = s.maxHp;
    s.constructionProgress = 1;
    s.structureState = 'operational';
    if (opts.scriptId) s.scriptId = opts.scriptId;

    this.grid.placeStructure(col, row, def.footprint.w, def.footprint.h, s.id);
    this.entities.add(s);
    return s;
  }

  // ── Units ──────────────────────────────────────────────────────────────────

  /**
   * Spawn a unit at (col, row) and register it.
   * @param {object|string} defOrId — def object or key into unitDefs
   * @param {string}        faction
   * @param {number}        col
   * @param {number}        row
   * @returns {UnitEntity|null}
   */
  spawnUnit(defOrId, faction, col, row) {
    const def = typeof defOrId === 'string' ? this.unitDefs[defOrId] : defOrId;
    if (!def) {
      console.warn('[SpawnSystem] Unknown unit def:', defOrId);
      return null;
    }

    const u = new UnitEntity(def, faction);
    u.col = col;
    u.row = row;
    this.grid.addOccupant(col, row, u.id);
    this.entities.add(u);
    return u;
  }

  /**
   * MissionDirector callback — spawn a unit from a scripted order.
   * Applies a small random jitter to avoid all reinforcements stacking on one tile.
   * @param {{ defId: string, faction: string, col: number, row: number }} order
   * @returns {UnitEntity|null}
   */
  missionSpawnFn(order) {
    const def = this.unitDefs[order.defId];
    if (!def) {
      console.warn('[SpawnSystem] missionSpawnFn — unknown defId:', order.defId);
      return null;
    }
    const jitter = Math.round((Math.random() - 0.5) * 2);
    return this.spawnUnit(def, order.faction, order.col + jitter, order.row);
  }
}
