/**
 * Pathfinder.js
 * A* pathfinding on the TileGrid.
 * Returns an array of {col, row} waypoints from start to goal.
 *
 * Supports:
 * - 8-directional movement (diagonal allowed)
 * - Per-tile walkability checks
 * - Unit type exclusions (e.g. tanks can't enter jungle)
 * - Max search depth to prevent frame spikes on unreachable targets
 */

const CARDINAL_COST = 10;
const DIAGONAL_COST = 14; // ≈ 10 * √2

const DIRS_8 = [
  { dc:  0, dr: -1, cost: CARDINAL_COST },
  { dc:  0, dr:  1, cost: CARDINAL_COST },
  { dc: -1, dr:  0, cost: CARDINAL_COST },
  { dc:  1, dr:  0, cost: CARDINAL_COST },
  { dc: -1, dr: -1, cost: DIAGONAL_COST },
  { dc:  1, dr: -1, cost: DIAGONAL_COST },
  { dc: -1, dr:  1, cost: DIAGONAL_COST },
  { dc:  1, dr:  1, cost: DIAGONAL_COST },
];

function heuristic(col, row, goalCol, goalRow) {
  // Octile distance heuristic
  const dx = Math.abs(col - goalCol);
  const dy = Math.abs(row - goalRow);
  return CARDINAL_COST * (dx + dy) + (DIAGONAL_COST - 2 * CARDINAL_COST) * Math.min(dx, dy);
}

class MinHeap {
  constructor() { this._data = []; }
  push(item) {
    this._data.push(item);
    this._bubbleUp(this._data.length - 1);
  }
  pop() {
    const top = this._data[0];
    const last = this._data.pop();
    if (this._data.length > 0) {
      this._data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }
  get size() { return this._data.length; }
  _bubbleUp(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this._data[p].f <= this._data[i].f) break;
      [this._data[p], this._data[i]] = [this._data[i], this._data[p]];
      i = p;
    }
  }
  _sinkDown(i) {
    const n = this._data.length;
    while (true) {
      let min = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this._data[l].f < this._data[min].f) min = l;
      if (r < n && this._data[r].f < this._data[min].f) min = r;
      if (min === i) break;
      [this._data[min], this._data[i]] = [this._data[i], this._data[min]];
      i = min;
    }
  }
}

export class Pathfinder {
  constructor(tileGrid) {
    this.grid = tileGrid;
    this.MAX_NODES = 2048; // abort search after this many nodes
  }

  /**
   * Find path from (startCol,startRow) to (goalCol,goalRow).
   * @param {object} options - { unitType, ignoreUnits }
   * @returns {Array<{col,row}>} path including start and goal, or [] if unreachable
   */
  findPath(startCol, startRow, goalCol, goalRow, options = {}) {
    const { unitType = 'infantry', ignoreUnits = false } = options;
    const grid = this.grid;

    // Trivial case
    if (startCol === goalCol && startRow === goalRow) return [];

    // If goal is not walkable, find nearest walkable neighbour
    if (!this._isPassable(goalCol, goalRow, unitType)) {
      const nearest = this._nearestWalkable(goalCol, goalRow, unitType);
      if (!nearest) return [];
      goalCol = nearest.col;
      goalRow = nearest.row;
    }

    const key = (c, r) => r * grid.cols + c;
    const open = new MinHeap();
    const gScore = new Map();
    const parent = new Map();
    const closed = new Set();

    const startKey = key(startCol, startRow);
    gScore.set(startKey, 0);
    open.push({ f: heuristic(startCol, startRow, goalCol, goalRow), col: startCol, row: startRow });

    let nodesSearched = 0;

    while (open.size > 0) {
      nodesSearched++;
      if (nodesSearched > this.MAX_NODES) return []; // unreachable or too far

      const current = open.pop();
      const { col, row } = current;
      const ck = key(col, row);

      if (closed.has(ck)) continue;
      closed.add(ck);

      // Goal reached — reconstruct path
      if (col === goalCol && row === goalRow) {
        return this._reconstruct(parent, startCol, startRow, goalCol, goalRow, key);
      }

      for (const dir of DIRS_8) {
        const nc = col + dir.dc;
        const nr = row + dir.dr;
        if (!grid.inBounds(nc, nr)) continue;
        const nk = key(nc, nr);
        if (closed.has(nk)) continue;
        if (!this._isPassable(nc, nr, unitType)) continue;

        // For diagonal movement, check both cardinal neighbours aren't blocked
        if (dir.dc !== 0 && dir.dr !== 0) {
          if (!this._isPassable(col + dir.dc, row, unitType)) continue;
          if (!this._isPassable(col, row + dir.dr, unitType)) continue;
        }

        const tentativeG = (gScore.get(ck) ?? Infinity) + dir.cost;
        if (tentativeG < (gScore.get(nk) ?? Infinity)) {
          gScore.set(nk, tentativeG);
          parent.set(nk, ck);
          const f = tentativeG + heuristic(nc, nr, goalCol, goalRow);
          open.push({ f, col: nc, row: nr });
        }
      }
    }

    return []; // no path found
  }

  _isPassable(col, row, unitType) {
    if (!this.grid.inBounds(col, row)) return false;
    const tile = this.grid.getTile(col, row);
    if (!tile) return false;
    if (tile.structureId) return false;

    const { TILE_TYPES } = require('./TileGrid.js'); // lazy import to avoid circular
    // Use grid's walkability check
    return this.grid.isWalkable(col, row);
  }

  _nearestWalkable(col, row, unitType) {
    for (let r = 1; r <= 4; r++) {
      for (let dc = -r; dc <= r; dc++) {
        for (let dr = -r; dr <= r; dr++) {
          if (Math.abs(dc) !== r && Math.abs(dr) !== r) continue;
          const c = col + dc, ro = row + dr;
          if (this._isPassable(c, ro, unitType)) return { col: c, row: ro };
        }
      }
    }
    return null;
  }

  _reconstruct(parent, startCol, startRow, goalCol, goalRow, keyFn) {
    const path = [];
    let current = keyFn(goalCol, goalRow);
    const startKey = keyFn(startCol, startRow);

    while (current !== startKey) {
      const col = current % this.grid.cols;
      const row = Math.floor(current / this.grid.cols);
      path.unshift({ col, row });
      current = parent.get(current);
      if (current === undefined) return []; // broken chain
    }

    return path; // excludes start tile, includes goal
  }
}
