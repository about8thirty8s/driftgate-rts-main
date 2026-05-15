/**
 * ResourceFieldSystem.js
 *
 * Manages alluvial mineral/ore fields that:
 *   - Originate from a fixed ore source point (col, row)
 *   - Slowly grow outward in radius over time
 *   - Track harvest depletion per tile cell
 *   - Emit 'ore_field_changed' on EventBus each tick for the renderer
 *
 * Ore fields are pure data — rendering is handled by TileRenderer.
 */

const ORE_GROWTH_RATE     = 0.004; // radius tiles per second
const ORE_MAX_RADIUS      = 3.5;   // max spread (tiles)
const ORE_REGROW_RATE     = 0.01;  // richness regrowth per second per depleted cell
const ORE_HARVEST_AMOUNT  = 0.35;  // richness taken per harvest tick
const ORE_HARVEST_CREDITS = 80;    // base credits per full cargo load

export class ResourceFieldSystem {
  /**
   * @param {object} opts
   * @param {EventBus} opts.eventBus
   * @param {Array}   opts.oreSources  – [{col, row, label}]
   */
  constructor({ eventBus, oreSources = [] }) {
    this.events = eventBus;

    // Each field: { id, sourceCol, sourceRow, radius, label, cells: Map<"c,r", richness 0-1> }
    this.fields = oreSources.map((src, i) => ({
      id:        `ore_field_${i}`,
      sourceCol: src.col,
      sourceRow: src.row,
      label:     src.label ?? `Ore Field ${i + 1}`,
      radius:    0.8,               // start tiny
      cells:     new Map(),         // populated by _grow()
    }));
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Called by Mission.jsx game loop every frame. */
  tick(dt) {
    for (const field of this.fields) {
      this._grow(field, dt);
      this._regrow(field, dt);
    }
    this.events.emit('ore_fields_updated', { fields: this.fields });
  }

  /**
   * Attempt to harvest ore at (col, row).
   * Returns amount harvested (0 if not on a field).
   * @param {number} col
   * @param {number} row
   * @param {number} amount  richness to remove (0–1)
   */
  harvest(col, row, amount = ORE_HARVEST_AMOUNT) {
    const key = `${col},${row}`;
    for (const field of this.fields) {
      const richness = field.cells.get(key);
      if (richness !== undefined && richness > 0) {
        const taken = Math.min(richness, amount);
        field.cells.set(key, richness - taken);
        return taken;   // caller uses this to fill cargo
      }
    }
    return 0;
  }

  /**
   * Find the richest ore tile within (radius) tiles of (col, row).
   * Returns {col, row} or null.
   */
  findNearestOre(col, row, searchRadius = 8) {
    let best = null;
    let bestScore = -Infinity;

    for (const field of this.fields) {
      for (const [key, richness] of field.cells) {
        if (richness < 0.05) continue;
        const [fc, fr] = key.split(',').map(Number);
        const dc = fc - col;
        const dr = fr - row;
        const dist = Math.sqrt(dc * dc + dr * dr);
        if (dist > searchRadius) continue;
        const score = richness - dist * 0.1;
        if (score > bestScore) {
          bestScore = score;
          best = { col: fc, row: fr };
        }
      }
    }
    return best;
  }

  /** Returns richness of tile (0–1), or 0 if not an ore tile. */
  getRichness(col, row) {
    const key = `${col},${row}`;
    for (const field of this.fields) {
      const r = field.cells.get(key);
      if (r !== undefined) return r;
    }
    return 0;
  }

  /** All fields array (for renderer). */
  getFields() {
    return this.fields;
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  _grow(field, dt) {
    if (field.radius >= ORE_MAX_RADIUS) return;
    field.radius = Math.min(ORE_MAX_RADIUS, field.radius + ORE_GROWTH_RATE * dt);

    // Re-scan tiles within new radius and add them if not already present
    const r = Math.ceil(field.radius);
    for (let dc = -r; dc <= r; dc++) {
      for (let dr = -r; dr <= r; dr++) {
        const dist = Math.sqrt(dc * dc + dr * dr);
        if (dist > field.radius) continue;
        const col = field.sourceCol + dc;
        const row = field.sourceRow + dr;
        if (col < 0 || row < 0) continue;
        const key = `${col},${row}`;
        if (!field.cells.has(key)) {
          // Richness falls off from center: 1.0 at source → 0.3 at edge
          const richness = Math.max(0.3, 1.0 - (dist / ORE_MAX_RADIUS) * 0.7);
          field.cells.set(key, richness);
        }
      }
    }
  }

  _regrow(field, dt) {
    for (const [key, richness] of field.cells) {
      if (richness < 1.0) {
        field.cells.set(key, Math.min(1.0, richness + ORE_REGROW_RATE * dt));
      }
    }
  }

  static get HARVEST_CREDITS() { return ORE_HARVEST_CREDITS; }
}
