/**
 * MissionDirector.js
 * Evaluates scripted mission phases, spawns units, tracks objectives.
 *
 * Usage:
 *   const director = new MissionDirector({ missionDef, entities, grid,
 *                                          pathfinder, eventBus, spawnFn });
 *   director.load();
 *   // each sim tick:
 *   director.tick(dt);
 *
 * spawnFn(spawnOrder, faction) → UnitEntity  — provided by Mission.jsx
 *
 * Events emitted:
 *   mission_phase_advanced  { phaseId, label, objective }
 *   mission_objective_updated { text }
 *   mission_complete        { result: 'victory' | 'defeat' }
 */

export class MissionDirector {
  constructor({ missionDef, entities, grid, eventBus, spawnFn }) {
    this._def       = missionDef;
    this._entities  = entities;
    this._grid      = grid;
    this._events    = eventBus;
    this._spawnFn   = spawnFn;

    this._phaseIndex     = -1;   // -1 = not started
    this._complete       = false;
    this._result         = null; // 'victory' | 'defeat'
    this._elapsed        = 0;    // total seconds since mission start
    this._phaseElapsed   = 0;    // seconds since current phase started

    // Track which hold-zone timers are active: zoneKey → seconds held
    this._holdTimers = new Map();

    // Phases array (resolved at load)
    this._phases    = [];

    // Resolved victory / defeat conditions
    this._victoryConditions = [];
    this._defeatConditions  = [];

    // Revealed subterrain entrances (starts hidden)
    this._revealedEntrances = new Set();

    this._currentObjective = '';
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  load() {
    this._phases             = this._def.phases ?? [];
    this._victoryConditions  = this._def.victoryConditions ?? [];
    this._defeatConditions   = this._def.defeatConditions  ?? [];

    // Auto-advance to first phase (mission_start trigger)
    this._tryAdvancePhase();
  }

  // ── Tick ──────────────────────────────────────────────────────────────────

  tick(dt) {
    if (this._complete) return;

    this._elapsed      += dt;
    this._phaseElapsed += dt;

    // Check defeat first, then victory (defeat takes precedence mid-check
    // but victory wins if both somehow hit same tick — handled below)
    const defeated = this._checkConditions(this._defeatConditions, dt);
    const victored = this._checkConditions(this._victoryConditions, dt);

    if (victored) {
      this._resolve('victory');
      return;
    }
    if (defeated) {
      this._resolve('defeat');
      return;
    }

    // Try to advance to the next phase
    this._tryAdvancePhase();
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  getCurrentObjective() { return this._currentObjective; }
  getCurrentPhase()     { return this._phases[this._phaseIndex] ?? null; }
  isComplete()          { return this._complete; }
  getResult()           { return this._result; }
  isEntranceRevealed(id){ return this._revealedEntrances.has(id); }

  // ── Internal: phase advancement ───────────────────────────────────────────

  _tryAdvancePhase() {
    const nextIndex = this._phaseIndex + 1;
    if (nextIndex >= this._phases.length) return;

    const next = this._phases[nextIndex];
    if (!next) return;

    if (this._evaluateTrigger(next.trigger)) {
      this._phaseIndex   = nextIndex;
      this._phaseElapsed = 0;
      this._runOnEnter(next.onEnter ?? {});

      this._events.emit('mission_phase_advanced', {
        phaseId:   next.id,
        label:     next.label ?? '',
        objective: next.onEnter?.showObjective ?? '',
      });
    }
  }

  // ── Internal: trigger evaluation ──────────────────────────────────────────

  _evaluateTrigger(trigger) {
    if (!trigger) return false;

    switch (trigger.type) {
      case 'mission_start':
        return true; // always fires immediately on load

      case 'unit_reaches_tile': {
        const { col, row } = trigger;
        for (const unit of this._entities.getPlayerUnits()) {
          if (Math.round(unit.col) === col && Math.round(unit.row) === row) return true;
        }
        return false;
      }

      case 'structure_captured': {
        const s = this._findStructureById(trigger.structureId);
        return s ? s.faction === 'player' : false;
      }

      case 'elapsed_time':
        // Relative to phase start
        return this._phaseElapsed >= (trigger.seconds ?? 0);

      case 'all_units_dead': {
        const faction = trigger.faction ?? 'enemy';
        return this._entities.getByFaction(faction)
          .filter(e => e.entityType === 'UNIT').length === 0;
      }

      case 'player_holds_zone': {
        const key = `${trigger.zone.col}_${trigger.zone.row}`;
        const held = this._isPlayerHoldingZone(trigger.zone);
        if (!held) {
          this._holdTimers.delete(key);
          return false;
        }
        // Already tracked by _checkConditions for victory/defeat
        return false;
      }

      default:
        return false;
    }
  }

  // ── Internal: condition checking (victory/defeat) ─────────────────────────

  _checkConditions(conditions, dt) {
    // ALL conditions must be met simultaneously
    if (conditions.length === 0) return false;

    for (const cond of conditions) {
      if (!this._evalCondition(cond, dt)) return false;
    }
    return true;
  }

  _evalCondition(cond, dt) {
    switch (cond.type) {
      case 'structure_captured': {
        const s = this._findStructureById(cond.structureId);
        return s ? s.faction === 'player' : false;
      }

      case 'player_holds_zone': {
        const { zone, duration } = cond;
        const key = `${zone.col}_${zone.row}`;
        const holding = this._isPlayerHoldingZone(zone);

        if (!holding) {
          this._holdTimers.delete(key);
          return false;
        }

        const current = (this._holdTimers.get(key) ?? 0) + dt;
        this._holdTimers.set(key, current);
        return current >= (duration ?? 30);
      }

      case 'all_units_dead': {
        const faction = cond.faction ?? 'enemy';
        const alive = this._entities.getByFaction(faction)
          .filter(e => e.entityType === 'UNIT').length;
        return alive === 0;
      }

      case 'elapsed_time':
        return this._elapsed >= (cond.seconds ?? 0);

      default:
        return false;
    }
  }

  _isPlayerHoldingZone(zone) {
    const { col, row, radius = 3 } = zone;
    const playerUnits = this._entities.getPlayerUnits();
    for (const u of playerUnits) {
      const dc = Math.round(u.col) - col;
      const dr = Math.round(u.row) - row;
      if (dc * dc + dr * dr <= radius * radius) return true;
    }
    return false;
  }

  // ── Internal: onEnter actions ─────────────────────────────────────────────

  _runOnEnter(onEnter) {
    if (onEnter.showObjective) {
      this._currentObjective = onEnter.showObjective;
      this._events.emit('mission_objective_updated', { text: onEnter.showObjective });
    }

    if (onEnter.spawnUnits) {
      for (const order of onEnter.spawnUnits) {
        for (let i = 0; i < (order.count ?? 1); i++) {
          try {
            this._spawnFn(order);
          } catch (e) {
            console.warn('[MissionDirector] spawnFn failed:', e);
          }
        }
      }
    }

    if (onEnter.revealSubterrainEntrance) {
      this._revealedEntrances.add(onEnter.revealSubterrainEntrance);
      this._events.emit('subterrain_entrance_revealed', {
        id: onEnter.revealSubterrainEntrance,
      });
    }
  }

  // ── Internal: resolution ──────────────────────────────────────────────────

  _resolve(result) {
    if (this._complete) return;
    this._complete = true;
    this._result   = result;
    this._events.emit('mission_complete', { result });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _findStructureById(scriptId) {
    // Mission JSON uses script IDs like "farmhouse_A".
    // StructureEntity.id is auto-generated (uuid-style).
    // We match on scriptId stored as structure.scriptId (set at spawn).
    return this._entities.getStructures().find(s => s.scriptId === scriptId) ?? null;
  }
}
