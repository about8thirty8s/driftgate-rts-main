/**
 * GameLoop.js
 * Fixed-timestep simulation + variable-rate rendering.
 *
 * Simulation ticks at exactly SIM_HZ (50hz = 20ms steps).
 * Rendering interpolates between last and current sim state.
 * This means sim is deterministic regardless of framerate.
 */

const SIM_HZ    = 50;               // simulation ticks per second
const SIM_STEP  = 1000 / SIM_HZ;   // ms per sim tick (20ms)
const MAX_FRAME_TIME = 250;         // clamp to avoid spiral of death

export class GameLoop {
  constructor({ onSimTick, onRender }) {
    this.onSimTick  = onSimTick;  // (dt: seconds) => void
    this.onRender   = onRender;   // (alpha: 0-1 interpolation) => void

    this._running    = false;
    this._rafId      = null;
    this._lastTime   = 0;
    this._accumulator = 0;

    this.stats = {
      fps: 0,
      simTps: 0,
      frameTime: 0,
      _fpsCount: 0,
      _fpsTimer: 0,
      _tpsCount: 0,
    };
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._lastTime = performance.now();
    this._accumulator = 0;
    this._rafId = requestAnimationFrame(this._frame.bind(this));
  }

  stop() {
    this._running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  pause() { this._running = false; }
  resume() {
    if (!this._running) {
      this._running = true;
      this._lastTime = performance.now();
      this._rafId = requestAnimationFrame(this._frame.bind(this));
    }
  }

  _frame(now) {
    if (!this._running) return;

    let frameTime = now - this._lastTime;
    this._lastTime = now;

    // Clamp to prevent death spiral
    if (frameTime > MAX_FRAME_TIME) frameTime = MAX_FRAME_TIME;

    this.stats.frameTime = frameTime;
    this._accumulator += frameTime;

    // Fixed sim ticks
    while (this._accumulator >= SIM_STEP) {
      this.onSimTick(SIM_STEP / 1000); // pass seconds
      this._accumulator -= SIM_STEP;
      this.stats._tpsCount++;
    }

    // Interpolation alpha (how far between last and next sim tick)
    const alpha = this._accumulator / SIM_STEP;

    // Render
    this.onRender(alpha);

    // FPS tracking
    this.stats._fpsCount++;
    this.stats._fpsTimer += frameTime;
    if (this.stats._fpsTimer >= 1000) {
      this.stats.fps    = this.stats._fpsCount;
      this.stats.simTps = this.stats._tpsCount;
      this.stats._fpsCount = 0;
      this.stats._tpsCount = 0;
      this.stats._fpsTimer -= 1000;
    }

    this._rafId = requestAnimationFrame(this._frame.bind(this));
  }
}
