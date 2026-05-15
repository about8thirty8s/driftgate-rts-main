/**
 * TileRenderer.js
 * Draws the isometric tile grid onto a Canvas 2D context.
 * Reads TileGrid state. Knows nothing about entities.
 *
 * Rendering order: back-to-front (row 0 col 0 → row N col N)
 * This achieves correct isometric depth sorting automatically.
 */

import { TILE_HW, TILE_HH } from './IsometricCamera.js';

// Placeholder colours per tile type — will be replaced with sprite sheets
const TILE_COLOURS = {
  GRASS:         { base: '#4a7c3f', shadow: '#3d6835', top: '#5a9c4f' },
  JUNGLE:        { base: '#2d5a1b', shadow: '#244a15', top: '#3d7a2b' },
  JUNGLE_THICK:  { base: '#1a3d0d', shadow: '#152f0a', top: '#254d12' },
  MUD:           { base: '#7a5c3a', shadow: '#5c4428', top: '#8a6c4a' },
  DIRT:          { base: '#9a7a5a', shadow: '#7a5c3a', top: '#b08060' },
  SAND:          { base: '#c8b06a', shadow: '#a8904a', top: '#d8c07a' },
  CLIFF:         { base: '#5a5a5a', shadow: '#404040', top: '#7a7a7a' },
  WATER_SHALLOW: { base: '#4a8acc', shadow: '#3a6a9c', top: '#5aaacc', animated: true },
  WATER_DEEP:    { base: '#2a5a9c', shadow: '#1a3a6c', top: '#3a6acc', animated: true },
  FORD:          { base: '#4a7aac', shadow: '#3a5a8c', top: '#5a8abc', animated: true },
  TRENCH:        { base: '#3a2a1a', shadow: '#2a1a0a', top: '#4a3828' },
  ROAD:          { base: '#8a7a6a', shadow: '#6a5a4a', top: '#9a8a7a' },
  CRATER:        { base: '#3a3020', shadow: '#2a2010', top: '#4a3828' },
  RUBBLE:        { base: '#6a5a4a', shadow: '#4a3a2a', top: '#7a6a5a' },
};

const OVERLAY_COLOURS = {
  crater:  'rgba(30,20,10,0.5)',
  scorch:  'rgba(10,10,10,0.4)',
  blood:   'rgba(120,20,20,0.3)',
};

const TILE_DEPTH = 8; // px — the visible side/depth of the tile

export class TileRenderer {
  constructor(ctx, camera) {
    this.ctx    = ctx;
    this.camera = camera;
    this._tick  = 0; // for animated tiles
  }

  tick(dt) {
    this._tick += dt;
  }

  render(grid, subterrainEntrances = null, oreFields = null) {
    const ctx = this.ctx;
    const cam = this.camera;

    // Render back-to-front: iterate in isometric draw order
    for (let sum = 0; sum < grid.cols + grid.rows - 1; sum++) {
      for (let col = 0; col <= sum; col++) {
        const row = sum - col;
        if (col >= grid.cols || row >= grid.rows || row < 0) continue;
        if (!cam.isTileVisible(col, row)) continue;

        const tile = grid.getTile(col, row);
        if (!tile) continue;

        this._drawTile(ctx, cam, col, row, tile);
      }
    }

    // Draw subterrain entrance markers on top
    if (subterrainEntrances) {
      for (const entrance of subterrainEntrances) {
        this._drawSubterrainEntrance(ctx, cam, entrance);
      }
    }

    // Draw ore field overlays (on top of tiles, below units)
    if (oreFields) {
      this._drawOreFields(ctx, cam, oreFields);
    }
  }

  _drawOreFields(ctx, cam, fields) {
    for (const field of fields) {
      // Draw source glow
      const srcScr = cam.tileToScreen(field.sourceCol, field.sourceRow);
      const hw = TILE_HW * cam.zoom;
      const hh = TILE_HH * cam.zoom;
      const glowR = field.radius * hw * 1.4;

      ctx.save();
      const grad = ctx.createRadialGradient(srcScr.x, srcScr.y + hh, 0, srcScr.x, srcScr.y + hh, glowR);
      grad.addColorStop(0,   'rgba(255, 200, 50, 0.18)');
      grad.addColorStop(0.5, 'rgba(200, 140, 20, 0.09)');
      grad.addColorStop(1,   'rgba(180, 100, 0,  0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(srcScr.x, srcScr.y + hh, glowR, glowR * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw per-tile ore speckle
      for (const [key, richness] of field.cells) {
        if (richness < 0.08) continue;
        const [col, row] = key.split(',').map(Number);
        if (!cam.isTileVisible(col, row)) continue;

        const scr = cam.tileToScreen(col, row);
        const cx = scr.x;
        const cy = scr.y + hh;

        ctx.save();
        ctx.globalAlpha = richness * 0.55;

        // Draw ore diamond shimmer on top face of tile
        ctx.beginPath();
        ctx.moveTo(cx,       cy - hh);
        ctx.lineTo(cx + hw,  cy     );
        ctx.lineTo(cx,       cy + hh);
        ctx.lineTo(cx - hw,  cy     );
        ctx.closePath();

        const tileGrad = ctx.createLinearGradient(cx - hw, cy, cx + hw, cy);
        tileGrad.addColorStop(0,   'rgba(255,200,40,0)');
        tileGrad.addColorStop(0.4, 'rgba(255,210,60,' + (richness * 0.45) + ')');
        tileGrad.addColorStop(0.6, 'rgba(255,230,80,' + (richness * 0.45) + ')');
        tileGrad.addColorStop(1,   'rgba(255,200,40,0)');
        ctx.fillStyle = tileGrad;
        ctx.fill();

        // Speckle dots (ore crystals)
        const numDots = Math.floor(richness * 5) + 1;
        const seed = (col * 17 + row * 31) % 100;
        for (let d = 0; d < numDots; d++) {
          const angle  = ((seed + d * 137.5) % 360) * (Math.PI / 180);
          const radius = ((seed * 0.3 + d * 0.7) % 0.7) * hw * 0.8;
          const dx = Math.cos(angle) * radius;
          const dy = Math.sin(angle) * radius * 0.5;
          const dotR = (1.5 + (d % 3) * 0.8) * cam.zoom;
          ctx.beginPath();
          ctx.arc(cx + dx, cy + dy, dotR, 0, Math.PI * 2);
          ctx.fillStyle = d % 2 === 0 ? '#ffd04a' : '#e8a820';
          ctx.globalAlpha = richness * 0.8;
          ctx.fill();
        }

        ctx.restore();
      }

      // Source marker — small glowing ore deposit icon
      ctx.save();
      const pulse = 0.75 + 0.25 * Math.sin(this._tick * 2.5);
      ctx.globalAlpha = pulse * 0.9;
      ctx.font = `\${Math.max(12, 14 * cam.zoom)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⬡', srcScr.x, srcScr.y + hh * 0.6);
      ctx.restore();
    }
  }

  _drawTile(ctx, cam, col, row, tile) {
    const { x: sx, y: sy } = cam.tileToScreen(col, row);
    const hw = TILE_HW * cam.zoom;
    const hh = TILE_HH * cam.zoom;
    const depth = TILE_DEPTH * cam.zoom;

    const colours = TILE_COLOURS[tile.type] ?? TILE_COLOURS.GRASS;
    const isTrench = tile.type === 'TRENCH';

    // Fog of war
    if (tile.fogState === 'hidden') return;
    const fogAlpha = tile.fogState === 'explored' ? 0.45 : 1.0;

    ctx.save();
    ctx.globalAlpha = fogAlpha;

    if (isTrench) {
      this._drawTrenchTile(ctx, cam, sx, sy, hw, hh, depth, colours, tile);
    } else {
      this._drawStandardTile(ctx, cam, sx, sy, hw, hh, depth, colours, tile, col, row);
    }

    // ── Overlays ──
    for (const overlay of tile.overlays) {
      const overlayColor = OVERLAY_COLOURS[overlay];
      if (!overlayColor) continue;
      ctx.beginPath();
      ctx.moveTo(sx,       sy       );
      ctx.lineTo(sx + hw,  sy + hh  );
      ctx.lineTo(sx,       sy + hh*2);
      ctx.lineTo(sx - hw,  sy + hh  );
      ctx.closePath();
      ctx.fillStyle = overlayColor;
      ctx.fill();
    }

    // ── Ford marker ──
    if (tile.type === 'FORD') {
      ctx.globalAlpha = fogAlpha * 0.4;
      ctx.fillStyle = '#ffffaa';
      ctx.beginPath();
      ctx.moveTo(sx, sy + hh);
      ctx.lineTo(sx + hw * 0.3, sy + hh * 1.5);
      ctx.lineTo(sx, sy + hh * 2);
      ctx.lineTo(sx - hw * 0.3, sy + hh * 1.5);
      ctx.closePath();
      ctx.fill();
    }

    // ── Trench occupant badge ──
    if (isTrench && tile.trenchOccupants?.length > 0) {
      ctx.globalAlpha = fogAlpha;
      this._drawTrenchBadge(ctx, cam, sx, sy, hw, hh, tile.trenchOccupants.length);
    }

    ctx.restore();
  }

  // ── Standard tile (non-trench) ────────────────────────────────────────────

  _drawStandardTile(ctx, cam, sx, sy, hw, hh, depth, colours, tile, col, row) {
    // Top face (diamond)
    ctx.beginPath();
    ctx.moveTo(sx,       sy       );
    ctx.lineTo(sx + hw,  sy + hh  );
    ctx.lineTo(sx,       sy + hh*2);
    ctx.lineTo(sx - hw,  sy + hh  );
    ctx.closePath();

    if (colours.animated) {
      const shimmer = Math.sin(this._tick * 2 + col * 0.5 + row * 0.3) * 0.08;
      ctx.fillStyle = this._lighten(colours.top, shimmer);
    } else {
      ctx.fillStyle = colours.top;
    }
    ctx.fill();

    // Left face (south-west)
    ctx.beginPath();
    ctx.moveTo(sx - hw, sy + hh              );
    ctx.lineTo(sx,      sy + hh*2            );
    ctx.lineTo(sx,      sy + hh*2 + depth    );
    ctx.lineTo(sx - hw, sy + hh   + depth    );
    ctx.closePath();
    ctx.fillStyle = colours.shadow;
    ctx.fill();

    // Right face (south-east)
    ctx.beginPath();
    ctx.moveTo(sx,      sy + hh*2            );
    ctx.lineTo(sx + hw, sy + hh              );
    ctx.lineTo(sx + hw, sy + hh   + depth    );
    ctx.lineTo(sx,      sy + hh*2 + depth    );
    ctx.closePath();
    ctx.fillStyle = colours.base;
    ctx.fill();
  }

  // ── Trench tile — recessed appearance ─────────────────────────────────────

  _drawTrenchTile(ctx, cam, sx, sy, hw, hh, depth, colours, tile) {
    // Outer diamond (rim of the trench — darker dirt colour)
    const rimColour = '#6a5040';
    ctx.beginPath();
    ctx.moveTo(sx,       sy       );
    ctx.lineTo(sx + hw,  sy + hh  );
    ctx.lineTo(sx,       sy + hh*2);
    ctx.lineTo(sx - hw,  sy + hh  );
    ctx.closePath();
    ctx.fillStyle = rimColour;
    ctx.fill();

    // Inner recessed floor (smaller diamond, offset downward)
    const recess = hh * 0.35;
    const innerScale = 0.55;
    const ix = sx;
    const iy = sy + recess;
    const ihw = hw * innerScale;
    const ihh = hh * innerScale;

    ctx.beginPath();
    ctx.moveTo(ix,        iy        );
    ctx.lineTo(ix + ihw,  iy + ihh  );
    ctx.lineTo(ix,        iy + ihh*2);
    ctx.lineTo(ix - ihw,  iy + ihh  );
    ctx.closePath();
    ctx.fillStyle = colours.top; // '#4a3828' — dark muddy floor
    ctx.fill();

    // Depth shadow on the inner walls (north-west wall)
    ctx.beginPath();
    ctx.moveTo(sx - hw,  sy + hh  );  // outer left
    ctx.lineTo(sx,       sy + hh*2);  // outer bottom
    ctx.lineTo(ix,       iy + ihh*2); // inner bottom
    ctx.lineTo(ix - ihw, iy + ihh  ); // inner left
    ctx.closePath();
    ctx.fillStyle = colours.shadow;
    ctx.fill();

    // Depth shadow on north-east wall
    ctx.beginPath();
    ctx.moveTo(sx + hw,  sy + hh  );  // outer right
    ctx.lineTo(sx,       sy + hh*2);  // outer bottom
    ctx.lineTo(ix,       iy + ihh*2); // inner bottom
    ctx.lineTo(ix + ihw, iy + ihh  ); // inner right
    ctx.closePath();
    ctx.fillStyle = colours.base;
    ctx.fill();

    // Rim highlight line (north edge — top of trench opening)
    ctx.beginPath();
    ctx.moveTo(sx - hw, sy + hh);
    ctx.lineTo(sx,      sy     );
    ctx.lineTo(sx + hw, sy + hh);
    ctx.strokeStyle = '#8a6a50';
    ctx.lineWidth = 1 * cam.zoom;
    ctx.stroke();

    // Left tile face
    ctx.beginPath();
    ctx.moveTo(sx - hw, sy + hh              );
    ctx.lineTo(sx,      sy + hh*2            );
    ctx.lineTo(sx,      sy + hh*2 + depth    );
    ctx.lineTo(sx - hw, sy + hh   + depth    );
    ctx.closePath();
    ctx.fillStyle = colours.shadow;
    ctx.fill();

    // Right tile face
    ctx.beginPath();
    ctx.moveTo(sx,      sy + hh*2            );
    ctx.lineTo(sx + hw, sy + hh              );
    ctx.lineTo(sx + hw, sy + hh   + depth    );
    ctx.lineTo(sx,      sy + hh*2 + depth    );
    ctx.closePath();
    ctx.fillStyle = colours.base;
    ctx.fill();
  }

  // ── Trench occupant badge ─────────────────────────────────────────────────

  _drawTrenchBadge(ctx, cam, sx, sy, hw, hh, count) {
    const bx = sx + hw * 0.6;
    const by = sy + hh * 0.7;
    const r  = Math.max(6, 8 * cam.zoom);

    // Green circle background
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fillStyle = '#2d7a2d';
    ctx.fill();
    ctx.strokeStyle = '#88ff88';
    ctx.lineWidth = 1 * cam.zoom;
    ctx.stroke();

    // Count text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(8, 9 * cam.zoom)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(count), bx, by);
    ctx.textBaseline = 'alphabetic';
  }

  // ── Grid lines (debug) ────────────────────────────────────────────────────

  renderDebugGrid(grid) {
    const ctx = this.ctx;
    const cam = this.camera;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;

    for (let col = 0; col < grid.cols; col++) {
      for (let row = 0; row < grid.rows; row++) {
        if (!cam.isTileVisible(col, row)) continue;
        const { x: sx, y: sy } = cam.tileToScreen(col, row);
        const hw = TILE_HW * cam.zoom;
        const hh = TILE_HH * cam.zoom;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + hw, sy + hh);
        ctx.lineTo(sx, sy + hh * 2);
        ctx.lineTo(sx - hw, sy + hh);
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _lighten(hexColor, amount) {
    try {
      const num = parseInt(hexColor.replace('#', ''), 16);
      const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(amount * 255));
      const g = Math.min(255, ((num >> 8)  & 0xff) + Math.round(amount * 255));
      const b = Math.min(255,  (num        & 0xff) + Math.round(amount * 255));
      return `rgb(${r},${g},${b})`;
    } catch { return hexColor; }
  }

  // ── Subterrain entrance marker ────────────────────────────────────────────

  _drawSubterrainEntrance(ctx, cam, entrance) {
    const { x: sx, y: sy } = cam.tileToScreen(entrance.col, entrance.row);
    const hw = TILE_HW * cam.zoom;
    const hh = TILE_HH * cam.zoom;
    const cx = sx;
    const cy = sy + hh;

    const pulse = 0.6 + 0.4 * Math.sin(this._tick * 2.5);

    ctx.save();

    // Pulsing diamond outline
    ctx.globalAlpha = pulse * 0.55;
    ctx.strokeStyle = '#8855cc';
    ctx.lineWidth = 2 * cam.zoom;
    ctx.setLineDash([3 * cam.zoom, 2 * cam.zoom]);
    ctx.beginPath();
    ctx.moveTo(cx,      cy - hh);
    ctx.lineTo(cx + hw, cy     );
    ctx.lineTo(cx,      cy + hh);
    ctx.lineTo(cx - hw, cy     );
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Inner fill
    ctx.globalAlpha = pulse * 0.12;
    ctx.fillStyle = '#aa66ff';
    ctx.beginPath();
    ctx.moveTo(cx,      cy - hh);
    ctx.lineTo(cx + hw, cy     );
    ctx.lineTo(cx,      cy + hh);
    ctx.lineTo(cx - hw, cy     );
    ctx.closePath();
    ctx.fill();

    // Icon glyph
    ctx.globalAlpha = pulse * 0.9;
    ctx.font = `${Math.max(10, 12 * cam.zoom)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#cc99ff';
    ctx.fillText('⬇', cx, cy + 4 * cam.zoom);

    ctx.restore();
  }
}
