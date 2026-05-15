/**
 * FxRenderer.js
 * Stateless canvas rendering helpers for visual effects.
 *
 * All functions are pure — they take a canvas context and data,
 * they draw, they return nothing. No state held here.
 *
 * Used by: Mission.jsx, Game.jsx, any future page with a canvas.
 */

// ── Particles ────────────────────────────────────────────────────────────────

/**
 * Render and update a particle array in-place.
 * Mutates particle positions for physics-simulated types (debris).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object[]} particles
 */
export function renderParticles(ctx, particles) {
  for (const p of particles) {
    if (p.life <= 0) continue;
    const alpha = Math.max(0, p.life / p.maxLife);

    ctx.save();
    ctx.globalAlpha = alpha;

    if (p.type === 'tracer') {
      ctx.strokeStyle = p.colour;
      ctx.lineWidth   = p.width ?? 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x1, p.y1);
      ctx.lineTo(p.x2, p.y2);
      ctx.stroke();

    } else if (p.type === 'debris') {
      p.x  += p.vx * (1 / 60);
      p.y  += p.vy * (1 / 60);
      p.vy += 80  * (1 / 60); // gravity
      ctx.fillStyle = p.colour;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (p.size ?? 2) * alpha, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// ── Victory pan overlay ───────────────────────────────────────────────────────

const VICTORY_PAN_DURATION = 4.0; // seconds — mirrors Mission constant

/**
 * Render the cinematic victory text overlay during a camera pan beat.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement}        canvas
 * @param {number}                   timer     — elapsed seconds since pan started
 * @param {object}                   [opts]
 * @param {string}                   [opts.headline]   — e.g. 'CROSSING SECURED'
 * @param {string}                   [opts.subline]    — e.g. 'IRON FRONT — OPERATION VERDANT'
 * @param {number}                   [opts.duration]   — override pan duration
 */
export function renderVictoryPanOverlay(ctx, canvas, timer, opts = {}) {
  const duration  = opts.duration ?? VICTORY_PAN_DURATION;
  const t         = Math.min(1, timer / duration);
  const textAlpha = Math.max(0, (t - 0.5) * 2);
  if (textAlpha <= 0) return;

  const scale    = canvas.width / 1280;
  const headline = opts.headline ?? 'OBJECTIVE COMPLETE';
  const subline  = opts.subline  ?? '';

  ctx.save();
  ctx.globalAlpha = textAlpha;

  ctx.font        = `bold ${Math.max(24, 36 * scale)}px monospace`;
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#c9a84c';
  ctx.shadowColor = '#c9a84c';
  ctx.shadowBlur  = 30;
  ctx.fillText(headline, canvas.width / 2, canvas.height / 2 - 20);

  if (subline) {
    ctx.font        = `${Math.max(10, 13 * scale)}px monospace`;
    ctx.fillStyle   = 'rgba(255,255,255,0.5)';
    ctx.shadowBlur  = 0;
    ctx.letterSpacing = '0.3em';
    ctx.fillText(subline, canvas.width / 2, canvas.height / 2 + 20);
  }

  ctx.restore();
}
