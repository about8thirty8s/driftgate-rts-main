/**
 * UnitRenderer.js
 * Draws all live unit entities onto the canvas.
 * Placeholder shapes until sprites are loaded.
 *
 * Draw order: sorted by (col + row) so south units appear above north units.
 * Entrenched units render lower in world space with partial occlusion.
 * Garrisoned units are NOT drawn here — StructureRenderer handles silhouettes.
 * Subterrain-in-transit units get a progress indicator only.
 *
 * v0.4 — Air unit altitude rendering:
 *   Air units are lifted vertically proportional to _altitude (set by AirCombatSystem).
 *   Each air unit casts a ground shadow that fades with height.
 *   A dashed vertical line connects unit to shadow when selected.
 *   Altitude band label + flare count shown on selected air units.
 *   Jets get a swept-wing shape; helicopters keep the existing heli shape.
 */

import { TILE_HW, TILE_HH } from './IsometricCamera.js';

// How many screen pixels of vertical lift per altitude unit (at zoom 1)
const ALT_SCREEN_SCALE = 5.5;

// Band label colours
const ALT_BAND_COLOURS = {
  noe:    '#88ffff',
  low:    '#88ff88',
  medium: '#ffcc44',
  high:   '#ff8844',
};

const FACTION_COLOURS = {
  player:  '#3a9a4a',
  enemy:   '#cc3333',
  ally:    '#3366cc',
  neutral: '#aaaaaa',
};

const CATEGORY_CONFIG = {
  infantry: { w: 10, h: 14, shape: 'person', zOffset: -0.5 },
  vehicle:  { w: 22, h: 16, shape: 'tank',   zOffset: 0    },
  air:      { w: 24, h: 14, shape: 'heli',   zOffset: -1.5 },
  jet:      { w: 28, h: 12, shape: 'jet',    zOffset: -2.0 },
  naval:    { w: 24, h: 14, shape: 'boat',   zOffset: 0    },
};

// How far down entrenched units sink (in tile-height units)
const TRENCH_SINK_FACTOR = 0.55;
// Opacity of entrenched unit body (partially occluded by trench walls)
const TRENCH_BODY_ALPHA  = 0.65;

export class UnitRenderer {
  constructor(ctx, camera) {
    this.ctx    = ctx;
    this.camera = camera;
    this._tick  = 0;
  }

  tick(dt) {
    this._tick += dt;
  }

  render(entities, subterrainSystem = null) {
    const units = entities
      .filter(e => e.alive && e.entityType === 'UNIT' && e.layer !== 'garrisoned')
      .sort((a, b) => (a.col + a.row) - (b.col + b.row));

    for (const unit of units) {
      if (unit.layer === 'subterrain') {
        const progress = subterrainSystem?.getTransitProgress(unit.id) ?? 0;
        this._drawSubterrainIndicator(unit, progress);
      } else {
        this._drawUnit(unit);
      }
    }
  }

  _drawUnit(unit) {
    const ctx = this.ctx;
    const cam = this.camera;

    const config  = CATEGORY_CONFIG[unit.category] ?? CATEGORY_CONFIG.infantry;
    const colour  = FACTION_COLOURS[unit.faction] ?? '#ffffff';
    const isEntrenched = unit.entrenched && unit.category === 'infantry';

    // Base screen position
    const screen = cam.tileToScreen(unit.col, unit.row);
    const tileHH = TILE_HH * cam.zoom;

    // ── Altitude lift for air units ──────────────────────────────────────
    const altitude    = unit._altitude ?? 0;
    const altLift     = unit.isAir ? altitude * ALT_SCREEN_SCALE * cam.zoom : 0;

    // Entrenched units sink below the tile surface
    const sinkOffset = isEntrenched ? tileHH * TRENCH_SINK_FACTOR : config.zOffset * 8 * cam.zoom;
    const sx = screen.x;
    const sy = (screen.y + tileHH - sinkOffset) - altLift;

    const w = config.w * cam.zoom;
    const h = config.h * cam.zoom;

    ctx.save();

    // Entrenched units are partially occluded — reduce body alpha
    if (isEntrenched) {
      ctx.globalAlpha = TRENCH_BODY_ALPHA;
    }

    // Ground shadow — for air units this sits on the ground tile below
    ctx.save();
    if (unit.isAir && altLift > 0) {
      // Shadow stays at ground level, fades with altitude
      const shadowAlpha = Math.max(0.04, 0.35 - altitude * 0.02);
      const shadowScale = 1.0 + altitude * 0.06;
      const groundSy    = (screen.y + tileHH) - config.zOffset * 8 * cam.zoom;
      ctx.globalAlpha = shadowAlpha;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(sx, groundSy + h * 0.1, w * 0.6 * shadowScale, h * 0.15 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dashed vertical line unit→shadow when selected
      if (unit.selected) {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = ALT_BAND_COLOURS[unit._altitudeBand ?? 'low'];
        ctx.lineWidth = 1 * cam.zoom;
        ctx.setLineDash([4 * cam.zoom, 3 * cam.zoom]);
        ctx.beginPath();
        ctx.moveTo(sx, sy + h * 0.5);
        ctx.lineTo(sx, groundSy);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else {
      ctx.globalAlpha *= 0.25;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(sx, sy + h * 0.1, w * 0.6, h * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Unit body
    const shape = unit.isJet ? 'jet' : config.shape;
    switch (shape) {
      case 'person': this._drawInfantry(ctx, sx, sy, w, h, colour, unit); break;
      case 'tank':   this._drawTank(ctx, cam, sx, sy, w, h, colour, unit); break;
      case 'heli':   this._drawHeli(ctx, sx, sy, w, h, colour, unit, altLift); break;
      case 'jet':    this._drawJet(ctx, sx, sy, w, h, colour, unit); break;
      default:       this._drawGeneric(ctx, sx, sy, w, h, colour); break;
    }

    // Faction colour bar (top of sprite)
    ctx.fillStyle = colour;
    ctx.fillRect(sx - w * 0.3, sy - h * 0.6, w * 0.6, 3 * cam.zoom);

    // Selection ring
    if (unit.selected) {
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5 * cam.zoom;
      ctx.setLineDash([3 * cam.zoom, 2 * cam.zoom]);
      ctx.beginPath();
      ctx.ellipse(sx, sy, w * 0.65, h * 0.2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Health bar
    if (unit.selected || unit.hpFraction < 0.7) {
      ctx.globalAlpha = 1.0;
      this._drawHealthBar(ctx, sx, sy - h * 0.7, w, unit.hpFraction);
    }

    // ── Entrenched indicator ──────────────────────────────────────────────
    if (isEntrenched) {
      ctx.globalAlpha = 1.0;

      // Dirt berm line — shows unit is dug in
      ctx.fillStyle = '#6a4a2a';
      ctx.fillRect(sx - w * 0.7, sy + h * 0.15, w * 1.4, Math.max(2, 3 * cam.zoom));

      // Shield icon
      ctx.font = `${Math.max(7, 8 * cam.zoom)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#88ff88';
      ctx.fillText('🛡', sx, sy - h * 0.8);
    }

    ctx.restore();

    // ── Air unit altitude band + flare indicator ──────────────────────────
    if (unit.isAir && (unit.selected || unit._flareActive || unit._dogfightTarget)) {
      ctx.globalAlpha = 1.0;
      const band     = unit._altitudeBand ?? 'low';
      const bandCol  = ALT_BAND_COLOURS[band] ?? '#ffffff';
      const fontSize = Math.max(7, 7 * cam.zoom);
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      // Altitude label
      ctx.fillStyle = bandCol;
      const altLabel = `${band.toUpperCase()} ${Math.round(altitude)}m`;
      ctx.fillText(altLabel, sx, sy - h * 0.75);

      // Flare indicator
      if ((unit._flareCount ?? 0) > 0 || unit._flareActive) {
        const flareX = sx + w * 0.6;
        const flareY = sy - h * 0.4;
        ctx.font = `${Math.max(6, 6 * cam.zoom)}px monospace`;
        ctx.textAlign = 'left';

        if (unit._flareActive) {
          // Pulsing active glow
          const pulse = 0.6 + 0.4 * Math.sin(this._tick * 10);
          ctx.globalAlpha = pulse;
          ctx.fillStyle = '#fff8a0';
          ctx.fillText('🔥', flareX, flareY);
        } else {
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = '#ffcc44';
          ctx.fillText(`✦${unit._flareCount ?? 0}`, flareX, flareY);
        }
      }

      // Dogfight marker
      if (unit._dogfightTarget) {
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(this._tick * 6);
        ctx.fillStyle = '#ff4444';
        ctx.font = `bold ${Math.max(7, 7 * cam.zoom)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('⚔', sx, sy - h * 1.1);
      }
    }

    // ── Harvester cargo bar ──────────────────────────────────────────────────
    if (unit.defId === 'harvester_vehicle' && unit.cargo !== undefined) {
      this._drawHarvesterOverlay(unit, sx, sy, w, h);
    }
  }

  _drawHarvesterOverlay(unit, sx, sy, w, h) {
    const ctx = this.ctx;
    const cam = this.camera;
    const barW = w * 1.1;
    const barH = Math.max(4, 5 * cam.zoom);
    const bx   = sx - barW / 2;
    const by   = sy - h * 0.85 - barH - 2;

    ctx.save();
    ctx.globalAlpha = 1.0;

    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(bx, by, barW, barH);

    // Fill — gold to orange gradient
    const fillW = barW * unit.cargo;
    if (fillW > 0) {
      const grad = ctx.createLinearGradient(bx, by, bx + barW, by);
      grad.addColorStop(0,   '#ffd040');
      grad.addColorStop(0.6, '#e8a820');
      grad.addColorStop(1,   '#c07010');
      ctx.fillStyle = grad;
      ctx.fillRect(bx, by, fillW, barH);
    }

    // Border
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(bx, by, barW, barH);

    // Label
    ctx.font = `bold ${Math.max(7, 7 * cam.zoom)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#ffeebb';
    ctx.fillText('ORE', sx, by - 1);

    // Dumping animation — pulsing golden shimmer around body
    if (unit.harvesterState === 'dumping' && unit._dumpTimer > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(this._tick * 8);
      ctx.globalAlpha = pulse * 0.6;
      ctx.strokeStyle = '#ffd040';
      ctx.lineWidth = 2 * cam.zoom;
      ctx.beginPath();
      ctx.ellipse(sx, sy, w * 0.8, h * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Floating credit text
      ctx.globalAlpha = pulse;
      ctx.font = `bold ${Math.max(8, 9 * cam.zoom)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffd040';
      ctx.fillText('$', sx, sy - h * 1.2 - pulse * 4);
    }

    ctx.restore();
  }

  // ── Shape drawers ─────────────────────────────────────────────────────────

  _drawInfantry(ctx, sx, sy, w, h, colour, unit) {
    // Body
    ctx.fillStyle = colour;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(sx - w/2, sy - h/2, w, h, 2);
      ctx.fill();
    } else {
      ctx.fillRect(sx - w/2, sy - h/2, w, h);
    }

    // Head
    ctx.fillStyle = this._lighten(colour, 0.15);
    ctx.beginPath();
    ctx.arc(sx, sy - h/2 - w * 0.35, w * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Weapon direction
    const angle = (unit.facing ?? 4) * (Math.PI / 4);
    const wx = sx + Math.cos(angle - Math.PI/2) * w * 0.6;
    const wy = sy + Math.sin(angle - Math.PI/2) * w * 0.4;
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy - h * 0.1);
    ctx.lineTo(wx, wy);
    ctx.stroke();
  }

  _drawTank(ctx, cam, sx, sy, w, h, colour, unit) {
    // Hull
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.ellipse(sx, sy, w * 0.5, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Turret
    ctx.fillStyle = this._darken(colour, 0.2);
    ctx.beginPath();
    ctx.arc(sx, sy - h * 0.05, w * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Barrel
    const angle = (unit.facing ?? 4) * (Math.PI / 4) - Math.PI / 2;
    ctx.strokeStyle = this._darken(colour, 0.3);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy - h * 0.05);
    ctx.lineTo(sx + Math.cos(angle) * w * 0.5, sy + Math.sin(angle) * h * 0.3);
    ctx.stroke();

    // Tracks
    ctx.fillStyle = '#333';
    ctx.fillRect(sx - w * 0.55, sy - h * 0.12, w * 1.1, h * 0.1);
    ctx.fillRect(sx - w * 0.55, sy + h * 0.06,  w * 1.1, h * 0.1);
  }

  _drawHeli(ctx, sx, sy, w, h, colour, unit, altLift = 0) {
    const bob = Math.sin(this._tick * 3 + unit.col) * 2;

    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.ellipse(sx, sy + bob, w * 0.45, h * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Spinning rotor
    const rot = this._tick * 8;
    ctx.strokeStyle = 'rgba(200,200,200,0.6)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 2; i++) {
      const a = rot + i * Math.PI;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * w * 0.6, sy + bob + Math.sin(a) * h * 0.1);
      ctx.lineTo(sx + Math.cos(a + Math.PI) * w * 0.6, sy + bob + Math.sin(a + Math.PI) * h * 0.1);
      ctx.stroke();
    }

  }

  _drawJet(ctx, sx, sy, w, h, colour, unit) {
    // Swept delta-wing top-down silhouette for fast jets
    const zoom = this.camera.zoom;
    const angle = (unit.facing ?? 4) * (Math.PI / 4) - Math.PI / 2;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);

    // Main fuselage
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.6);           // nose
    ctx.lineTo(w * 0.15, h * 0.1);     // right fuselage
    ctx.lineTo(w * 0.08, h * 0.5);     // right tail
    ctx.lineTo(-w * 0.08, h * 0.5);    // left tail
    ctx.lineTo(-w * 0.15, h * 0.1);    // left fuselage
    ctx.closePath();
    ctx.fill();

    // Swept wings
    ctx.fillStyle = this._darken(colour, 0.15);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w * 0.6, h * 0.35);     // right wingtip
    ctx.lineTo(w * 0.18, h * 0.4);
    ctx.lineTo(0, h * 0.1);
    ctx.lineTo(-w * 0.18, h * 0.4);
    ctx.lineTo(-w * 0.6, h * 0.35);    // left wingtip
    ctx.closePath();
    ctx.fill();

    // Canopy glint
    ctx.fillStyle = 'rgba(180,220,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.25, w * 0.08, h * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Engine glow (tail)
    const glow = 0.6 + 0.4 * Math.sin(this._tick * 9);
    ctx.globalAlpha = glow * 0.7;
    ctx.fillStyle = '#ff7722';
    ctx.beginPath();
    ctx.ellipse(0, h * 0.52, w * 0.07, h * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawGeneric(ctx, sx, sy, w, h, colour) {
    ctx.fillStyle = colour;
    ctx.fillRect(sx - w/2, sy - h/2, w, h);
  }

  // ── Health bar ────────────────────────────────────────────────────────────

  _drawHealthBar(ctx, sx, sy, w, fraction) {
    const bw = w * 1.2;
    const bh = 3 * this.camera.zoom;
    const x  = sx - bw / 2;

    ctx.fillStyle = '#333';
    ctx.fillRect(x, sy, bw, bh);

    const colour = fraction > 0.6 ? '#4caf50' : fraction > 0.3 ? '#ff9800' : '#f44336';
    ctx.fillStyle = colour;
    ctx.fillRect(x, sy, bw * Math.max(0, fraction), bh);
  }

  // ── Subterrain indicator ──────────────────────────────────────────────────

  _drawSubterrainIndicator(unit, progress) {
    const ctx = this.ctx;
    const cam = this.camera;

    const screen = cam.tileToScreen(unit.col, unit.row);
    const sx = screen.x;
    const sy = screen.y + TILE_HH * cam.zoom;

    const pulse  = 0.5 + 0.5 * Math.sin(this._tick * 4);
    const colour = unit.faction === 'player' ? '#3a9a4a' : '#cc3333';

    ctx.save();

    // Pulsing ring at entry point
    ctx.globalAlpha = 0.3 + pulse * 0.3;
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2 * cam.zoom;
    ctx.setLineDash([3 * cam.zoom, 3 * cam.zoom]);
    ctx.beginPath();
    ctx.arc(sx, sy, 10 * cam.zoom, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow icon
    ctx.globalAlpha = 0.7 + pulse * 0.3;
    ctx.fillStyle = colour;
    ctx.font = `${Math.max(10, 12 * cam.zoom)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('▼', sx, sy);

    // Transit progress bar
    const bw = 24 * cam.zoom;
    const bh = 3  * cam.zoom;
    const bx = sx - bw / 2;
    const by = sy - 18 * cam.zoom;
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#222';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = colour;
    ctx.fillRect(bx, by, bw * progress, bh);

    // Faction dot
    ctx.globalAlpha = 1;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(sx, sy - 26 * cam.zoom, 4 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  _lighten(hex, amt) {
    try {
      const n = parseInt(hex.replace('#',''), 16);
      const r = Math.min(255, ((n>>16)&0xff) + Math.round(amt*255));
      const g = Math.min(255, ((n>>8) &0xff) + Math.round(amt*255));
      const b = Math.min(255, ( n     &0xff) + Math.round(amt*255));
      return `rgb(${r},${g},${b})`;
    } catch { return hex; }
  }

  _darken(hex, amt) { return this._lighten(hex, -amt); }
}
