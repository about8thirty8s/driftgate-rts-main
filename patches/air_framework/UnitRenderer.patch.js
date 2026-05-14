/**
 * UnitRenderer.js — AIR FRAMEWORK PATCH
 *
 * LOCATION: src/presentation/UnitRenderer.js
 *
 * Adds an air unit render path to the existing render() loop.
 * Air units:
 *   - Draw at an altitude-based Y offset (higher altitude = drawn higher on screen)
 *   - Draw a small shadow below them at ground level
 *   - Show altitude band as a small indicator (debug / can be removed)
 *   - Use turretAngle for turret rotation (when sprites exist)
 *   - Show flare visual state
 *
 * For MVP: draws a coloured placeholder shape while sprites are being made.
 * When sprites are ready: replace the placeholder block with drawImage calls.
 */

// ── ADD to UnitRenderer class ─────────────────────────────────────────────

// ALTITUDE → screen Y offset (pixels per altitude unit)
// At altitude 10, jet appears ~80px higher on screen than ground level.
const ALT_Y_SCALE = 8; // px per altitude unit

/**
 * Render a single air unit.
 * Call this from render() when unit.isAir === true, INSTEAD of the ground unit path.
 */
_renderAirUnit(ctx, unit, camera) {
  const base = camera.tileToScreen(unit.col, unit.row);
  const alt  = unit._altitude ?? 0;

  // Air units float upward on screen relative to their ground tile
  const screenX = base.x;
  const screenY = base.y - (alt * ALT_Y_SCALE);

  // ── Shadow at ground level ────────────────────────────────────────────
  // Soft circle shadow drawn at base tile position (not elevated)
  const shadowAlpha = Math.max(0.05, 0.4 - alt * 0.025); // fades with altitude
  ctx.save();
  ctx.globalAlpha = shadowAlpha;
  ctx.fillStyle   = '#000';
  ctx.beginPath();
  ctx.ellipse(base.x, base.y + 4, 20, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ── Sprite render (REPLACE THIS BLOCK WHEN SPRITES ARE READY) ────────
  // TODO: replace placeholder with actual sprite drawImage
  // Sprite render order: shadow (ground) → hull → turret+barrel (rotated)
  //
  // ctx.drawImage(sprites.hull, screenX - hw, screenY - hh);
  // ctx.save();
  // ctx.translate(screenX + TURRET_PIVOT_X, screenY + TURRET_PIVOT_Y);
  // ctx.rotate(unit.turretAngle);
  // ctx.drawImage(sprites.turretWithBarrel, -tw/2, -th/2);
  // ctx.restore();

  // MVP PLACEHOLDER — coloured shape so unit is visible in-engine
  const isPlayer   = unit.faction === 'player';
  const isJet      = unit.isJet;
  const isHeli     = unit.isHelicopter;
  const bodyColour = isPlayer
    ? (isJet ? '#44aaff' : '#22cc88')
    : (isJet ? '#ff4444' : '#ff8844');

  ctx.save();
  ctx.translate(screenX, screenY);

  // Draw aircraft body
  if (isJet) {
    // Jet: delta-wing silhouette
    ctx.fillStyle = bodyColour;
    ctx.beginPath();
    ctx.moveTo(0, -14);     // nose (forward-right in iso)
    ctx.lineTo(-16, 8);     // left wing tip
    ctx.lineTo(-6, 4);      // left wing root
    ctx.lineTo(-8, 14);     // left tail
    ctx.lineTo(0, 10);      // tail centre
    ctx.lineTo(8, 14);      // right tail
    ctx.lineTo(6, 4);       // right wing root
    ctx.lineTo(16, 8);      // right wing tip
    ctx.closePath();
    ctx.fill();

    // Canopy glint
    ctx.fillStyle = 'rgba(200,240,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(0, -6, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (isHeli) {
    // Helicopter: fuselage + rotor disc
    ctx.fillStyle = bodyColour;
    ctx.beginPath();
    ctx.ellipse(0, 2, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail boom
    ctx.strokeStyle = bodyColour;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, 2);
    ctx.lineTo(-20, 0);
    ctx.stroke();

    // Rotor disc (semi-transparent)
    ctx.strokeStyle = 'rgba(200,200,200,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Faction marker dot
  ctx.fillStyle = isPlayer ? '#00ff88' : '#ff2222';
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();

  // Flare glow when active
  if (unit._flareActive) {
    ctx.globalAlpha = 0.7;
    ctx.fillStyle   = '#ffee44';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  ctx.restore();

  // ── Selection ring ────────────────────────────────────────────────────
  if (unit._selected) {
    ctx.save();
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.ellipse(screenX, screenY + 2, 22, 11, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ── Altitude band indicator (debug — remove in polish pass) ──────────
  if (window.__rts_debug) {
    const bandLabel = unit._altitudeBand?.toUpperCase() ?? '?';
    ctx.fillStyle = 'rgba(255,255,100,0.85)';
    ctx.font      = '9px monospace';
    ctx.fillText(`${bandLabel} ${Math.round(alt)}`, screenX - 14, screenY - 20);
  }

  // ── HP bar ────────────────────────────────────────────────────────────
  if (unit.hp < unit.maxHp) {
    const barW = 30;
    const pct  = unit.hp / unit.maxHp;
    ctx.fillStyle = '#333';
    ctx.fillRect(screenX - barW/2, screenY - 22, barW, 4);
    ctx.fillStyle = pct > 0.5 ? '#44ff44' : pct > 0.25 ? '#ffaa00' : '#ff2222';
    ctx.fillRect(screenX - barW/2, screenY - 22, barW * pct, 4);
  }
}

// ── HOW TO INTEGRATE into the existing render() loop ─────────────────────
//
// In UnitRenderer.render(), inside the unit loop, REPLACE:
//
//   this._renderUnit(ctx, unit);
//
// WITH:
//
//   if (unit.isAir) {
//     this._renderAirUnit(ctx, unit, this.camera);
//   } else {
//     this._renderUnit(ctx, unit);
//   }
