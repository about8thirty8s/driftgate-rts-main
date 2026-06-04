/**
 * CommandFeedback.js
 * Renders move, attack, and attack-move order markers on the canvas.
 * Ported from iron-curtain-rts CommandFeedbackRenderer.js and adapted
 * to Driftgate's IsometricCamera API.
 *
 * Usage:
 *   const feedback = new CommandFeedback(ctx, camera);
 *   // On order issued:
 *   feedback.trigger(col, row, 'move');    // or 'attack' / 'attackMove'
 *   // Each frame:
 *   feedback.tick(dt);
 *   feedback.render();
 */

export class CommandFeedback {
  constructor(ctx, camera) {
    this.ctx    = ctx;
    this.camera = camera;
    this._markers = []; // { col, row, type, life, maxLife }
  }

  trigger(col, row, type = 'move') {
    // Remove any existing marker at the same tile
    this._markers = this._markers.filter(m => !(m.col === col && m.row === row));
    this._markers.push({ col, row, type, life: 0.7, maxLife: 0.7 });
  }

  tick(dt) {
    for (const m of this._markers) m.life -= dt;
    this._markers = this._markers.filter(m => m.life > 0);
  }

  render() {
    for (const m of this._markers) this._drawMarker(m);
  }

  _drawMarker(m) {
    const ctx = this.ctx;
    const screen = this.camera.tileToScreen(m.col, m.row);
    const x = screen.x;
    const y = screen.y;
    const alpha = Math.min(1, m.life / m.maxLife);
    const pulse = Math.sin(Date.now() / 120) * 3;
    const z = this.camera.zoom;

    ctx.save();
    ctx.globalAlpha = alpha * 0.85;

    if (m.type === 'attack') {
      // Red pulsing crosshair
      const r = (18 + pulse) * z;
      ctx.strokeStyle = '#dd3333';
      ctx.lineWidth = 2 * z;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - r * 0.7, y); ctx.lineTo(x + r * 0.7, y);
      ctx.moveTo(x, y - r * 0.7); ctx.lineTo(x, y + r * 0.7);
      ctx.stroke();

    } else if (m.type === 'attackMove') {
      // Orange upward arrow
      const s = (16 + pulse * 0.5) * z;
      ctx.strokeStyle = '#ffaa44';
      ctx.fillStyle  = 'rgba(255,170,68,0.25)';
      ctx.lineWidth  = 2 * z;
      ctx.beginPath();
      ctx.moveTo(x,       y - s);
      ctx.lineTo(x - s*0.5, y + s*0.4);
      ctx.lineTo(x - s*0.2, y + s*0.1);
      ctx.lineTo(x - s*0.2, y + s*0.7);
      ctx.lineTo(x + s*0.2, y + s*0.7);
      ctx.lineTo(x + s*0.2, y + s*0.1);
      ctx.lineTo(x + s*0.5, y + s*0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

    } else {
      // Standard move — green isometric chevron
      const hw = 48 * z;
      const hh = 24 * z;
      const shrink = (1 - alpha) * 12 * z;

      ctx.strokeStyle = '#44cc66';
      ctx.lineWidth = 1.5 * z;

      // Outer diamond
      ctx.beginPath();
      ctx.moveTo(x,       y - hh + shrink);
      ctx.lineTo(x + hw - shrink, y       );
      ctx.lineTo(x,       y + hh - shrink);
      ctx.lineTo(x - hw + shrink, y       );
      ctx.closePath();
      ctx.stroke();

      // Inner diamond (smaller)
      const iw = hw * 0.5;
      const ih = hh * 0.5;
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = '#44cc66';
      ctx.beginPath();
      ctx.moveTo(x,     y - ih);
      ctx.lineTo(x + iw, y    );
      ctx.lineTo(x,     y + ih);
      ctx.lineTo(x - iw, y    );
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}
