/**
 * EnemyAIController.js
 * Enemy AI: expand → build → attack.
 * Supports three personalities: aggressive, defensive, balanced.
 * Ported personality system from vietnam-the-war-rts.
 *
 * Runs on the simulation tick. Reads EntityRegistry and TileGrid.
 * Issues orders by directly mutating entities (same as player commands).
 */

import { UnitEntity }      from '../entities/UnitEntity.js';
import { StructureEntity } from '../entities/StructureEntity.js';

const Phase = { EXPAND: 'expand', PRODUCE: 'produce', ATTACK: 'attack' };

// ── Personality definitions ────────────────────────────────────────────────
const PERSONALITIES = {
  aggressive: {
    buildDelay:       15,
    attackDelay:       5,
    trainDelay:        8,
    economyPriority:  0.3,
    militaryPriority: 0.7,
    attackThreshold:   3,   // units needed before attacking
    waveSize:          6,
    waveEscalation:    2,   // extra units added per subsequent wave
    attackIntervalSec: 30,
    creditGainRate:   14,
  },
  defensive: {
    buildDelay:       10,
    attackDelay:      20,
    trainDelay:        6,
    economyPriority:  0.6,
    militaryPriority: 0.4,
    attackThreshold:   8,
    waveSize:          4,
    waveEscalation:    1,
    attackIntervalSec: 60,
    creditGainRate:   16,   // defensive AI prioritises economy
  },
  balanced: {
    buildDelay:       12,
    attackDelay:      12,
    trainDelay:        7,
    economyPriority:  0.5,
    militaryPriority: 0.5,
    attackThreshold:   5,
    waveSize:          5,
    waveEscalation:    1,
    attackIntervalSec: 45,
    creditGainRate:   12,
  },
};

export class EnemyAIController {
  constructor({
    entities,
    grid,
    pathfinder,
    eventBus,
    structDefs,
    unitDefs,
    faction      = 'enemy',
    personality  = 'balanced',
    startCredits = 2000,
  }) {
    this.entities   = entities;
    this.grid       = grid;
    this.pathfinder = pathfinder;
    this.events     = eventBus;
    this.structDefs = structDefs;
    this.unitDefs   = unitDefs;
    this.faction    = faction;

    // Apply personality
    this.personality = PERSONALITIES[personality] ?? PERSONALITIES.balanced;
    this.personalityName = personality;

    this.phase        = Phase.EXPAND;
    this.credits      = startCredits;
    this.creditGain   = this.personality.creditGainRate;

    this._timer         = 0;
    this._buildTimer    = 0;
    this._trainTimer    = 0;
    this._attackTimer   = 0;
    this._attackInterval = this.personality.attackIntervalSec;
    this._waveSize      = this.personality.waveSize;
    this._unitBuffer    = [];

    this._buildQueue = [];
    this._initBuildOrder();
  }

  _initBuildOrder() {
    // Strict build order: power → barracks → power → war_factory
    // Aggressive skips second power plant to rush military faster
    if (this.personalityName === 'aggressive') {
      this._buildQueue = [
        { defId: 'power_plant', placed: false },
        { defId: 'barracks',    placed: false },
        { defId: 'war_factory', placed: false },
      ];
    } else if (this.personalityName === 'defensive') {
      this._buildQueue = [
        { defId: 'power_plant', placed: false },
        { defId: 'refinery',    placed: false },
        { defId: 'power_plant', placed: false },
        { defId: 'barracks',    placed: false },
        { defId: 'refinery',    placed: false },
        { defId: 'war_factory', placed: false },
      ];
    } else {
      this._buildQueue = [
        { defId: 'power_plant', placed: false },
        { defId: 'barracks',    placed: false },
        { defId: 'power_plant', placed: false },
        { defId: 'war_factory', placed: false },
      ];
    }
  }

  // ── Main tick ─────────────────────────────────────────────────────────────

  tick(dt) {
    this._timer       += dt;
    this._buildTimer  += dt;
    this._trainTimer  += dt;
    this._attackTimer += dt;

    // Passive income
    this.credits += this.creditGain * dt;

    // Run AI logic every 1s to avoid per-frame overhead
    if (this._timer < 1.0) return;
    this._timer = 0;

    // Expand / produce
    if (this._buildTimer >= this.personality.buildDelay) {
      this._tickExpand();
      this._buildTimer = 0;
    }

    if (this._trainTimer >= this.personality.trainDelay) {
      this._tickProduce();
      this._trainTimer = 0;
    }

    // Attack runs on its own interval
    if (this._attackTimer >= this._attackInterval) {
      this._tickAttack();
      this._attackTimer = 0;
      // Escalate over time
      this._attackInterval = Math.max(15, this._attackInterval - 4);
      this._waveSize = Math.min(12, this._waveSize + this.personality.waveEscalation);
    }

    // Production tick for all enemy structures
    this._tickProduction(1.0);
  }

  // ── Expand phase: place buildings ─────────────────────────────────────────

  _tickExpand() {
    const hq = this._getHQ();
    if (!hq) return;

    const next = this._buildQueue.find(b => !b.placed);
    if (!next) {
      this.phase = Phase.PRODUCE;
      return;
    }

    const def = this.structDefs[next.defId];
    if (!def) { next.placed = true; return; }
    if (this.credits < def.cost) return;

    const spot = this._findBuildSpot(hq.col, hq.row, def.footprint.w, def.footprint.h);
    if (!spot) return;

    const structure = new StructureEntity(def, this.faction);
    structure.col = spot.col;
    structure.row = spot.row;
    structure.hp  = structure.maxHp;
    structure.constructionProgress = 1;
    structure.structureState = 'operational';

    this.grid.placeStructure(spot.col, spot.row, def.footprint.w, def.footprint.h, structure.id);
    this.entities.add(structure);

    this.credits -= def.cost;
    next.placed = true;

    this.events.emit('ai_structure_placed', {
      faction: this.faction,
      defId:   def.id,
      col:     spot.col,
      row:     spot.row,
    });

    if (this._buildQueue.every(b => b.placed)) {
      this.phase = Phase.PRODUCE;
    }
  }

  // ── Produce phase: queue units ─────────────────────────────────────────────

  _tickProduce() {
    const barracks   = this._getStructureByType('barracks');
    const warFactory = this._getStructureByType('war_factory');

    // Aggressive: prioritise military units
    if (this.personalityName === 'aggressive') {
      if (barracks) this._tryQueue(barracks, 'infantry_vietcong');
      if (warFactory) this._tryQueue(warFactory, 'vehicle_m48_tank');
      return;
    }

    // Defensive: mix of units
    if (this.personalityName === 'defensive') {
      if (barracks) {
        Math.random() < 0.6
          ? this._tryQueue(barracks, 'infantry_vietcong')
          : this._tryQueue(barracks, 'infantry_grenadier');
      }
      if (warFactory) {
        Math.random() < 0.5
          ? this._tryQueue(warFactory, 'tank_medium')
          : this._tryQueue(warFactory, 'vehicle_m113');
      }
      return;
    }

    // Balanced (default)
    if (barracks)   this._tryQueue(barracks,   'infantry_vietcong');
    if (warFactory) this._tryQueue(warFactory, 'tank_medium');
  }

  _tryQueue(structure, unitId) {
    const def = this.unitDefs[unitId];
    if (!def) return;
    if (this.credits < def.cost) return;
    if (!structure.canQueueUnit?.(def.id)) return;
    structure.queueUnit(def);
    this.credits -= def.cost;
  }

  // ── Production output: spawn units from completed queues ──────────────────

  _tickProduction(dt) {
    for (const structure of this.entities.getEnemyStructures()) {
      const completedDefId = structure.tickProduction(dt);
      if (!completedDefId) continue;

      const def = this.unitDefs[completedDefId];
      if (!def) continue;

      const spawnPos = this._findWalkableNear(structure.col, structure.row, 3);
      if (!spawnPos) continue;

      const unit = new UnitEntity(def, this.faction);
      unit.col  = spawnPos.col;
      unit.row  = spawnPos.row;
      unit.kills = 0; // veterancy tracking
      this.grid.addOccupant(spawnPos.col, spawnPos.row, unit.id);
      this.entities.add(unit);

      this._unitBuffer.push(unit.id);

      this.events.emit('unit_spawned', {
        faction:  this.faction,
        defId:    completedDefId,
        col:      spawnPos.col,
        row:      spawnPos.row,
        entityId: unit.id,
      });
    }
  }

  // ── Attack wave ───────────────────────────────────────────────────────────

  _tickAttack() {
    const available = this.entities.getEnemyUnits()
      .filter(u => u.alive && u.path.length === 0 && u.state !== 'attacking');

    if (available.length < this.personality.attackThreshold) return;

    const wave = available.slice(0, this._waveSize);
    const target = this._getPlayerTarget();
    if (!target) return;

    for (const unit of wave) {
      const path = this.pathfinder.findPath(
        Math.round(unit.col), Math.round(unit.row),
        Math.round(target.col), Math.round(target.row)
      );
      if (path.length > 0) unit.setPath(path);
    }

    this.events.emit('ai_attack_wave', {
      faction:      this.faction,
      personality:  this.personalityName,
      unitCount:    wave.length,
      targetCol:    target.col,
      targetRow:    target.row,
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _getHQ() {
    return this.entities.getEnemyStructures()
      .find(s => s.defId === 'command_hq') ?? null;
  }

  _getStructureByType(defId) {
    return this.entities.getEnemyStructures()
      .find(s => s.defId === defId && s.structureState === 'operational') ?? null;
  }

  _getPlayerTarget() {
    const structs = this.entities.getPlayerStructures();
    const hq = structs.find(s => s.defId === 'command_hq');
    if (hq) return hq;
    return structs[0] ?? this.entities.getPlayerUnits()[0] ?? null;
  }

  _findBuildSpot(nearCol, nearRow, w, h) {
    for (let r = 3; r <= 12; r++) {
      for (let dc = -r; dc <= r; dc++) {
        for (let dr = -r; dr <= r; dr++) {
          if (Math.abs(dc) !== r && Math.abs(dr) !== r) continue;
          const col = nearCol + dc;
          const row = nearRow + dr;
          if (this.grid.canPlaceFootprint(col, row, w, h)) {
            return { col, row };
          }
        }
      }
    }
    return null;
  }

  _findWalkableNear(col, row, radius) {
    for (let r = 1; r <= radius + 2; r++) {
      for (let dc = -r; dc <= r; dc++) {
        for (let dr = -r; dr <= r; dr++) {
          if (Math.abs(dc) !== r && Math.abs(dr) !== r) continue;
          const c = col + dc, ro = row + dr;
          if (this.grid.isWalkable(c, ro)) return { col: c, row: ro };
        }
      }
    }
    return null;
  }
}
