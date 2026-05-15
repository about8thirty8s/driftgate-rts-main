/**
 * OilDerrickSystem.js
 *
 * Capturable oil derrick structures that generate slow passive income.
 *
 * Each derrick:
 *   - Belongs to a faction (default: neutral)
 *   - Generates INCOME_PER_SECOND credits when owned by player or enemy
 *   - Can be captured by an engineer unit (via existing captureProgress on StructureEntity)
 *   - Emits 'oil_income' event on each payout so Mission.jsx can update credits
 *
 * The OilDerrickSystem is purely a tick layer on top of the existing StructureEntity.
 * Derrick structures are registered here; the system ticks income accumulation.
 */

const INCOME_PER_SECOND  = 4;   // credits/sec per derrick when owned
const INCOME_INTERVAL    = 5;   // emit income every N seconds (smoother than every tick)
const PUMP_ANIM_INTERVAL = 2;   // pump animation cycle in seconds

export class OilDerrickSystem {
  /**
   * @param {object} opts
   * @param {EventBus}        opts.eventBus
   * @param {EntityRegistry}  opts.entities
   */
  constructor({ eventBus, entities }) {
    this.events   = eventBus;
    this.entities = entities;

    // Map of structureId → { accum, animPhase }
    this._state = new Map();
  }

  /** Register a derrick StructureEntity with this system. */
  register(structureEntity) {
    this._state.set(structureEntity.id, {
      accum:     0,
      animPhase: Math.random() * PUMP_ANIM_INTERVAL, // stagger animations
    });
    structureEntity.isDerrick = true;
    structureEntity.derrickIncome = INCOME_PER_SECOND;
  }

  tick(dt) {
    for (const [id, state] of this._state) {
      const struct = this.entities.get(id);
      if (!struct || !struct.alive) { this._state.delete(id); continue; }
      if (struct.structureState !== 'operational') continue;

      // Pump animation phase
      state.animPhase = (state.animPhase + dt) % PUMP_ANIM_INTERVAL;
      struct._pumpPhase = state.animPhase / PUMP_ANIM_INTERVAL; // 0–1 for renderer

      // Income accumulation
      if (struct.faction === 'neutral') continue; // neutral = no income
      state.accum += INCOME_PER_SECOND * dt;

      if (state.accum >= INCOME_INTERVAL * INCOME_PER_SECOND) {
        const payout = Math.floor(state.accum);
        state.accum -= payout;
        this.events.emit('oil_income', { faction: struct.faction, amount: payout, structureId: id });
      }
    }
  }

  /** Returns all registered derrick structure entities. */
  getDerricks() {
    return [...this._state.keys()]
      .map(id => this.entities.get(id))
      .filter(Boolean);
  }

  static get INCOME_PER_SECOND() { return INCOME_PER_SECOND; }
}
