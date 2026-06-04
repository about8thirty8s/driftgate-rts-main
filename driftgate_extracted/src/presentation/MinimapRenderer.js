/**
 * MinimapRenderer.js
 * Draws a minimap in the bottom-right corner of the canvas.
 * Ported from iron-curtain-rts MinimapRenderer.js, adapted for
 * Driftgate's TileGrid + EntityRegistry + IsometricCamera APIs.
 *
 * Shows:
 *  - Terrain tiles with fog state (unseen/explored/visible)
 *  - Player units (green dots), enemy units (red dots, visible only)
 *  - Structures (colored squares)
 *  - Camera viewport rectangle
 *  - Click-to-pan: returns tile coords if clicked inside minimap
 */

const TILE_COLOURS = {
  GRASS:         '#3a6030',
  JUNGLE:        '#1e3e0e',
  JUNGLE_THICK:  '#122808',
  MUD:           '#5a3c22',
  DIRT:          '#7a5c3a',
  SAND:          '#a8904a',
  CLIFF:         '#444',
  WATER_SHALLOW: '#3a6a8c',
  WATER_DEEP:    '#1a3a6c',
  FORD:          '#3a5a8c',
  TRENCH:        '#2a1a0a',
  ROAD:          '#6a5a4a',
  CRATER:        '#2a2010',
  RUBBLE:        '#4a3a2a',
};

const EXPLORED_COLOURS = {
  GRASS:         '#1e3018',
  JUNGLE:        '#0e1e08',
  JUNGLE_THICK:  '#091404',
  MUD:           '#2a1c10',
  DIRT:          '#3a2c1a',
  SAND:          '#544820',
  CLIFF:         '#222',
  WATER_SHALLOW: '#1a3040',
  WATER_DEEP:    '#0a1830',
  FORD:          '#1a2840',
  TRENCH:        '#150d05',
  ROAD:          '#342c22',
  CRATER:        '#151008',
  RUBBLE:        '#251d15',
};

const MAP_W = 160; // minimap render width in px
const MAP_H = 100; // minimap render height in px
const PAD   = 12;  // padding from canvas edge

export class MinimapRenderer {
  constructor(ctx, camera) {
    this.ctx    = ctx;
    this.camera = camera;

    // Offscreen canvas for terrain layer (only redraw when fog changes)
    this._terrainCanvas = document.createElement('canvas');
    this._terrainCanvas.width  = MAP_W;
    this._terrainCanvas.height = MAP_H;
    this._terrainDirty = true;
  }

  // Call when fog changes (each tick is fine — it's an offscreen canvas)
  markDirty() { this._terrainDirty = true; }

  /**
   * Main render call. Pass canvas width/height for positioning.
   */
  render(grid, entities, canvasW, canvasH) {
    const ctx = this.ctx;
    const x = canvasW - MAP_W - PAD;
    const y = canvasH - MAP_H - PAD;

    const scaleX = MAP_W / grid.cols;
    const scaleY = MAP_H / grid.rows;

    // ── Border + background ──────────────────────────────────────────────
    ctx.save();
    ctx.fillStyle = '#050805';
    ctx.fillRect(x - 2, y - 2, MAP_W + 4, MAP_H + 4);
    ctx.strokeStyle = 'rgba(180,150,60,0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 2, y - 2, MAP_W + 4, MAP_H + 4);

    // Clip to minimap bounds
    ctx.beginPath();
    ctx.rect(x, y, MAP_W, MAP_H);
    ctx.clip();

    // ── Terrain layer ────────────────────────────────────────────────────
    if (this._terrainDirty) {
      this._renderTerrain(grid, scaleX, scaleY);
      this._terrainDirty = false;
    }
    ctx.drawImage(this._terrainCanvas, x, y);

    // ── Scanline overlay ─────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let sy = y; sy < y + MAP_H; sy += 3) {
      ctx.fillRect(x, sy, MAP_W, 1);
    }

    // ── Structures ───────────────────────────────────────────────────────
    for (const e of entities.getAll()) {
      if (e.entityType !== 'STRUCTURE' || !e.alive) continue;
      const fogState = grid.getFogState?.(Math.round(e.col), Math.round(e.row)) ?? 2;
      if (e.faction === 'enemy' && fogState < 2) continue;

      const bx = x + e.col * scaleX;
      const by = y + e.row * scaleY;
      const bw = Math.max(3, (e.footprint?.w ?? 1) * scaleX);
      const bh = Math.max(3, (e.footprint?.h ?? 1) * scaleY);

      ctx.fillStyle = e.faction === 'player' ? '#2a6aaa'
        : e.faction === 'enemy'  ? '#aa1a1a'
        : '#666';
      ctx.fillRect(bx, by, bw, bh);

      // Highlight edge
      ctx.fillStyle = e.faction === 'player' ? 'rgba(100,160,255,0.4)'
        : e.faction === 'enemy'  ? 'rgba(255,80,80,0.4)'
        : 'rgba(200,200,200,0.2)';
      ctx.fillRect(bx, by, bw, 1);
    }

    // ── Units ────────────────────────────────────────────────────────────
    for (const e of entities.getAll()) {
      if (e.entityType !== 'UNIT' || !e.alive || e.layer === 'garrisoned') continue;
      const fogState = grid.getFogState?.(Math.round(e.col), Math.round(e.row)) ?? 2;
      if (e.faction === 'enemy' && fogState < 2) continue;

      const ux = x + e.col * scaleX;
      const uy = y + e.row * scaleY;

      const isHarvester = e.category === 'harvester';
      ctx.fillStyle = e.faction === 'player'
        ? (isHarvester ? '#c9a84c' : '#44dd66')
        : e.faction === 'enemy' ? '#ff4444'
        : '#aaa';

      ctx.fillRect(ux - 1.5, uy - 1.5, 3, 3);
    }

    // ── Camera viewport ──────────────────────────────────────────────────
    const cam = this.camera;
    // Convert world wx/wy to grid tile space
    // Camera.tileToScreen(col,row) → wx/wy are in world pixel space
    // We need to reverse: which tiles are at the viewport corners?
    // Top-left of viewport in screen coords is (0,0), bottom-right is (canvasW, canvasH)
    const topLeft     = cam.screenToTile(0,       0);
    const bottomRight = cam.screenToTile(canvasW, canvasH);

    if (topLeft && bottomRight) {
      const vx = x + topLeft.col * scaleX;
      const vy = y + topLeft.row * scaleY;
      const vw = (bottomRight.col - topLeft.col) * scaleX;
      const vh = (bottomRight.row - topLeft.row) * scaleY;

      ctx.strokeStyle = 'rgba(200,180,80,0.7)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(vx, vy, vw, vh);
      ctx.setLineDash([]);
    }

    // ── Label ────────────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(180,150,60,0.6)';
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('MAP', x + 3, y + 9);

    ctx.restore();
  }

  /**
   * Returns tile {col, row} if (sx, sy) is inside the minimap, else null.
   * Use for click-to-pan behaviour.
   */
  getTileFromClick(sx, sy, canvasW, canvasH, grid) {
    const x = canvasW - MAP_W - PAD;
    const y = canvasH - MAP_H - PAD;
    if (sx < x || sx > x + MAP_W || sy < y || sy > y + MAP_H) return null;
    const col = Math.round(((sx - x) / MAP_W) * grid.cols);
    const row = Math.round(((sy - y) / MAP_H) * grid.rows);
    return { col: Math.max(0, Math.min(grid.cols - 1, col)), row: Math.max(0, Math.min(grid.rows - 1, row)) };
  }

  _renderTerrain(grid, scaleX, scaleY) {
    const tctx = this._terrainCanvas.getContext('2d');
    tctx.clearRect(0, 0, MAP_W, MAP_H);
    tctx.fillStyle = '#050805';
    tctx.fillRect(0, 0, MAP_W, MAP_H);

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const tile = grid.getTile(col, row);
        if (!tile) continue;

        const fogState = grid.getFogState?.(col, row) ?? 2; // 0=unseen, 1=explored, 2=visible
        if (fogState === 0) continue;

        const type = tile.type ?? 'GRASS';
        const colour = fogState === 2
          ? (TILE_COLOURS[type] ?? '#333')
          : (EXPLORED_COLOURS[type] ?? '#1a1a1a');

        tctx.fillStyle = colour;
        tctx.fillRect(
          Math.floor(col * scaleX),
          Math.floor(row * scaleY),
          Math.ceil(scaleX) + 1,
          Math.ceil(scaleY) + 1,
        );
      }
    }
  }
}
