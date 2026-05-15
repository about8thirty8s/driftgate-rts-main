/**
 * TileGrid.js
 * The authoritative world map. Pure data — no rendering.
 *
 * Coordinate system:
 *   col = east-west axis (left = 0)
 *   row = north-south axis (top = 0)
 *
 * Isometric screen projection is handled by IsometricCamera.js.
 */

export const TILE_TYPES = {
  GRASS:       { id: 'GRASS',       walkable: true,  buildable: true,  water: false, cover: 0   },
  JUNGLE:      { id: 'JUNGLE',      walkable: true,  buildable: false, water: false, cover: 0.4 },
  JUNGLE_THICK:{ id: 'JUNGLE_THICK',walkable: false, buildable: false, water: false, cover: 0.8 },
  MUD:         { id: 'MUD',         walkable: true,  buildable: true,  water: false, cover: 0,  speedMult: 0.6 },
  DIRT:        { id: 'DIRT',        walkable: true,  buildable: true,  water: false, cover: 0   },
  SAND:        { id: 'SAND',        walkable: true,  buildable: true,  water: false, cover: 0   },
  CLIFF:       { id: 'CLIFF',       walkable: false, buildable: false, water: false, cover: 1.0 },
  WATER_SHALLOW:{ id: 'WATER_SHALLOW', walkable: false, buildable: false, water: true, cover: 0 },
  WATER_DEEP:  { id: 'WATER_DEEP',  walkable: false, buildable: false, water: true,  cover: 0   },
  FORD:        { id: 'FORD',        walkable: true,  buildable: false, water: true,  cover: 0,  speedMult: 0.4 },
  TRENCH:      { id: 'TRENCH',      walkable: true,  buildable: false, water: false, cover: 0.7, isTrench: true },
  ROAD:        { id: 'ROAD',        walkable: true,  buildable: false, water: false, cover: 0,  speedMult: 1.3 },
  CRATER:      { id: 'CRATER',      walkable: true,  buildable: false, water: false, cover: 0.3 },
  RUBBLE:      { id: 'RUBBLE',      walkable: true,  buildable: false, water: false, cover: 0.2 },
};

export const ELEVATION = {
  FLAT:   0,
  LOW:    1,
  MID:    2,
  HIGH:   3,
};

export class TileGrid {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;

    // Subterrain entrance registry: tileIdx → entranceId
    this._subterrainEntranceMap = new Map();

    this._tiles = new Array(cols * rows).fill(null).map((_, i) => ({
      col: i % cols,
      row: Math.floor(i / cols),
      type: 'GRASS',
      elevation: ELEVATION.FLAT,
      overlays: [],           // ['crater', 'scorch'] etc
      structureId: null,      // entity id of structure occupying this tile
      occupants: [],          // entity ids of surface units on this tile
      trenchOccupants: [],    // entity ids of units currently entrenched on this tile
      fogState: 'hidden',     // 'hidden' | 'explored' | 'visible'
    }));
  }

  idx(col, row) {
    return row * this.cols + col;
  }

  inBounds(col, row) {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  getTile(col, row) {
    if (!this.inBounds(col, row)) return null;
    return this._tiles[this.idx(col, row)];
  }

  setTileType(col, row, typeId) {
    const t = this.getTile(col, row);
    if (t) t.type = typeId;
  }

  setElevation(col, row, elevation) {
    const t = this.getTile(col, row);
    if (t) t.elevation = elevation;
  }

  addOverlay(col, row, overlay) {
    const t = this.getTile(col, row);
    if (t && !t.overlays.includes(overlay)) t.overlays.push(overlay);
  }

  removeOverlay(col, row, overlay) {
    const t = this.getTile(col, row);
    if (t) t.overlays = t.overlays.filter(o => o !== overlay);
  }

  isWalkable(col, row) {
    const t = this.getTile(col, row);
    if (!t) return false;
    const def = TILE_TYPES[t.type];
    if (!def) return false;
    if (t.structureId) return false;
    return def.walkable;
  }

  isBuildable(col, row) {
    const t = this.getTile(col, row);
    if (!t) return false;
    const def = TILE_TYPES[t.type];
    if (!def) return false;
    if (t.structureId) return false;
    if (t.occupants.length > 0) return false;
    return def.buildable;
  }

  getCover(col, row) {
    const t = this.getTile(col, row);
    if (!t) return 0;
    return TILE_TYPES[t.type]?.cover ?? 0;
  }

  getSpeedMult(col, row) {
    const t = this.getTile(col, row);
    if (!t) return 1;
    return TILE_TYPES[t.type]?.speedMult ?? 1;
  }

  isTrench(col, row) {
    const t = this.getTile(col, row);
    return t ? (TILE_TYPES[t.type]?.isTrench ?? false) : false;
  }

  // ── Fog of war ────────────────────────────────────────────────────────────

  revealFog(col, row, radius) {
    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        if (dc * dc + dr * dr <= radius * radius) {
          const t = this.getTile(col + dc, row + dr);
          if (t) t.fogState = 'visible';
        }
      }
    }
  }

  resetFogVisible() {
    for (const t of this._tiles) {
      if (t.fogState === 'visible') t.fogState = 'explored';
    }
  }

  // ── Structure footprint ───────────────────────────────────────────────────

  placeStructure(col, row, w, h, entityId) {
    for (let dc = 0; dc < w; dc++) {
      for (let dr = 0; dr < h; dr++) {
        const t = this.getTile(col + dc, row + dr);
        if (t) t.structureId = entityId;
      }
    }
  }

  removeStructure(col, row, w, h) {
    for (let dc = 0; dc < w; dc++) {
      for (let dr = 0; dr < h; dr++) {
        const t = this.getTile(col + dc, row + dr);
        if (t) {
          t.structureId = null;
          t.type = 'RUBBLE';
        }
      }
    }
  }

  // ── Surface occupants ─────────────────────────────────────────────────────

  addOccupant(col, row, entityId) {
    const t = this.getTile(col, row);
    if (t && !t.occupants.includes(entityId)) t.occupants.push(entityId);
  }

  removeOccupant(col, row, entityId) {
    const t = this.getTile(col, row);
    if (t) t.occupants = t.occupants.filter(id => id !== entityId);
  }

  // ── Trench occupants ──────────────────────────────────────────────────────

  addTrenchOccupant(col, row, entityId) {
    const t = this.getTile(col, row);
    if (t && !t.trenchOccupants.includes(entityId)) t.trenchOccupants.push(entityId);
  }

  removeTrenchOccupant(col, row, entityId) {
    const t = this.getTile(col, row);
    if (t) t.trenchOccupants = t.trenchOccupants.filter(id => id !== entityId);
  }

  getTrenchOccupants(col, row) {
    return this.getTile(col, row)?.trenchOccupants ?? [];
  }

  // ── Placement validation ───────────────────────────────────────────────────

  canPlaceFootprint(col, row, w, h) {
    for (let dc = 0; dc < w; dc++) {
      for (let dr = 0; dr < h; dr++) {
        if (!this.isBuildable(col + dc, row + dr)) return false;
      }
    }
    return true;
  }

  getTilesInRadius(col, row, radius) {
    const result = [];
    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        if (dc * dc + dr * dr <= radius * radius) {
          const t = this.getTile(col + dc, row + dr);
          if (t) result.push(t);
        }
      }
    }
    return result;
  }

  // ── Serialise ─────────────────────────────────────────────────────────────

  serialize() {
    return {
      cols: this.cols,
      rows: this.rows,
      tiles: this._tiles.map(t => ({
        type: t.type,
        elevation: t.elevation,
        overlays: [...t.overlays],
      })),
    };
  }

  static deserialize(data) {
    const grid = new TileGrid(data.cols, data.rows);
    data.tiles.forEach((td, i) => {
      grid._tiles[i].type = td.type;
      grid._tiles[i].elevation = td.elevation;
      grid._tiles[i].overlays = td.overlays;
    });
    return grid;
  }

  // ── Subterrain entrances ──────────────────────────────────────────────────

  setSubterrainEntrance(col, row, entranceId) {
    if (!this.inBounds(col, row)) return;
    this._subterrainEntranceMap.set(this.idx(col, row), entranceId);
  }

  getSubterrainEntranceId(col, row) {
    if (!this.inBounds(col, row)) return null;
    return this._subterrainEntranceMap.get(this.idx(col, row)) ?? null;
  }

  clearSubterrainEntrance(col, row) {
    this._subterrainEntranceMap.delete(this.idx(col, row));
  }
}
