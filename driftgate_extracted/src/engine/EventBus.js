/**
 * EventBus.js
 * Lightweight pub/sub. Simulation emits — presentation listens.
 * The hard wall between sim and rendering.
 */

export class EventBus {
  constructor() {
    this._listeners = new Map();
    this._queue     = [];
    this._dispatching = false;
  }

  on(event, handler) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(handler);
    return () => this.off(event, handler); // returns unsubscribe fn
  }

  off(event, handler) {
    const handlers = this._listeners.get(event);
    if (handlers) {
      const i = handlers.indexOf(handler);
      if (i >= 0) handlers.splice(i, 1);
    }
  }

  emit(event, data = {}) {
    this._queue.push({ event, data });
    if (!this._dispatching) this._flush();
  }

  _flush() {
    this._dispatching = true;
    while (this._queue.length > 0) {
      const { event, data } = this._queue.shift();
      const handlers = this._listeners.get(event);
      if (handlers) {
        for (const h of handlers) {
          try { h(data); } catch (e) { console.error(`[EventBus] Error in handler for "${event}":`, e); }
        }
      }
      // Also dispatch to wildcard listeners
      const wildcard = this._listeners.get('*');
      if (wildcard) {
        for (const h of wildcard) {
          try { h({ event, data }); } catch(e) {}
        }
      }
    }
    this._dispatching = false;
  }

  // Clear all listeners (use on scene change)
  clear() {
    this._listeners.clear();
    this._queue = [];
  }
}

// Singleton for convenience
export const globalBus = new EventBus();
