/**
 * BuildSystem.js
 * Manages player base construction:
 *   - placement preview validation
 *   - structure spawning
 *   - power grid tracking
 *   - production queue management
 *
 * Called by Game.jsx — bridges player input to simulation state.
 */

import { StructureEntity } from '../entities/StructureEntity.js';

export class BuildSystem {
  constructor({ entities, grid, eventBus, structDefs }) {
    this.entities   = entities;
    this.grid       = grid;
    this.events     = eventBus;
    this.structDefs = structDefs;

    // Player economy
    this.credits    = 1500;
    this.power      = 0;
    this.powerUsed  = 0;

    // Active placement mode
    this.placingDefId = null;   // defId being placed, or null
    this.previewValid = false;
    this.previewCol   = 0;
    this.previewRow   = 0;
  }

  // ── Economy ───────────────────────────────────────────────────────────────

  canAfford(amount) { return this.credits >= amount; }

  addCredits(amount) {
    this.credits += amount;
    this.events.emit('credits_changed', { credits: this.credits });
  }

  spendCredits(amount) {
    if (this.credits < amount) return false;
    this.credits -= amount;
    this.events.emit('credits_changed', { credits: this.credits });
    return true;
  }

  // Recalculate power from all player structures
  recalcPower() {
    let gen = 0, used = 0;
    for (const s of this.entities.getPlayerStructures()) {
      if (!s.alive) continue;
      const def = this.structDefs[s.defId];
      if (!def) continue;
      if (s.structureState === 'operational' || s.structureState === 'damaged') {
        gen  += def.powerGen  ?? 0;
        used += def.powerDraw ?? 0;
      }
    }
    this.power     = gen;
    this.powerUsed = used;

    // Update powered state on all structures
    const surplus = gen - used;
    // Simple model: if deficit, disable highest-draw structures first
    for (const s of this.entities.getPlayerStructures()) {
      s.powered = (gen >= used); // simplified — all on or all off
    }

    this.events.emit('power_changed', { power: gen, powerUsed: used });
  }

  // ── Placement ─────────────────────────────────────────────────────────────

  startPlacement(defId) {
    this.placingDefId = defId;
    this.events.emit('placement_started', { defId });
  }

  cancelPlacement() {
    this.placingDefId = null;
    this.events.emit('placement_cancelled', {});
  }

  // Call on mouse move — updates preview validity
  updatePreview(col, row) {
    if (!this.placingDefId) return;
    const def = this.structDefs[this.placingDefId];
    if (!def) return;

    this.previewCol = col;
    this.previewRow = row;
    this.previewValid = this._canPlace(def, col, row);
  }

  // Convenience: place directly at col/row (bypasses preview state)
  placeAt(col, row, defId, faction = 'player') {
    this.startPlacement(defId);
    this.updatePreview(col, row);
    return this.confirmPlacement(faction);
  }

  // Attempt to place structure at current preview position
  confirmPlacement(faction = 'player') {
    if (!this.placingDefId) return false;
    const def = this.structDefs[this.placingDefId];
    if (!def) return false;

    if (!this._canPlace(def, this.previewCol, this.previewRow)) return false;
    if (!this.spendCredits(def.cost)) return false;

    const structure = new StructureEntity(def, faction);
    structure.col = this.previewCol;
    structure.row = this.previewRow;

    // Start construction (hp = 0, needs engineer or instant for now)
    // For M0: instant construction — remove when engineer units exist
    structure.hp = structure.maxHp;
    structure.constructionProgress = 1;
    structure.structureState = 'operational';

    this.grid.placeStructure(
      this.previewCol, this.previewRow,
      def.footprint.w, def.footprint.h,
      structure.id
    );
    this.entities.add(structure);
    this.recalcPower();

    this.events.emit('structure_placed', {
      defId:    def.id,
      entityId: structure.id,
      col:      this.previewCol,
      row:      this.previewRow,
      faction,
    });

    this.placingDefId = null;
    return true;
  }

  _canPlace(def, col, row) {
    // Credit check
    if (this.credits < def.cost) return false;
    // Footprint check
    if (!this.grid.canPlaceFootprint(col, row, def.footprint.w, def.footprint.h)) return false;
    // Power check (can always place power plants)
    if (def.powerDraw > 0 && def.id !== 'power_plant') {
      // Allow placement even if underpowered — structure just won't work
    }
    return true;
  }

  // ── Production ────────────────────────────────────────────────────────────

  queueUnit(structureId, unitDef) {
    const structure = this.entities.get(structureId);
    if (!structure) return false;
    if (!this.spendCredits(unitDef.cost)) return false;
    return structure.queueUnit(unitDef);
  }

  cancelUnit(structureId, queueIndex) {
    const structure = this.entities.get(structureId);
    if (!structure) return;
    // Refund half cost
    const item = structure.productionQueue[queueIndex];
    if (item) {
      const def = { cost: 0 }; // would normally lookup def
      this.addCredits(Math.floor((def.cost ?? 0) / 2));
    }
    structure.cancelQueue(queueIndex);
  }

  // Called each tick — returns array of {structureId, defId} for spawning
  tick(dt) {
    const ready = [];
    for (const structure of this.entities.getPlayerStructures()) {
      if (!structure.alive) continue;
      const completedDefId = structure.tickProduction(dt);
      if (completedDefId) {
        ready.push({ structureId: structure.id, defId: completedDefId });
        this.events.emit('unit_production_complete', {
          structureId: structure.id,
          defId: completedDefId,
        });
      }
    }
    return ready;
  }

  // ── Accessors ─────────────────────────────────────────────────────────────

  get powerSurplus() { return this.power - this.powerUsed; }
  get isPowerDeficit() { return this.powerUsed > this.power; }

  getPlacementPreview() {
    if (!this.placingDefId) return null;
    return {
      defId: this.placingDefId,
      col: this.previewCol,
      row: this.previewRow,
      valid: this.previewValid,
      def: this.structDefs[this.placingDefId],
    };
  }
}
