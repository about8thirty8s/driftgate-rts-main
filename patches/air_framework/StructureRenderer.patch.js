/**
 * StructureRenderer.js — SPRITE WIRING PATCH
 *
 * LOCATION: src/presentation/StructureRenderer.js
 *
 * Adds sprite rendering on top of the existing placeholder geometry.
 * Sprites are drawn INSTEAD of the placeholder when available.
 * If a sprite isn't loaded (null), falls back to existing placeholder — zero breakage.
 *
 * CHANGES:
 * 1. Constructor accepts optional `sprites` Map (from SpriteLoader)
 * 2. _drawStructure() checks for sprite and uses _drawSpriteStructure() if found
 * 3. _drawSpriteStructure() — new method — handles sprite rendering with
 *    damage states, construction opacity, garrison cutaway, HP bar, selection
 *
 * ALSO REQUIRED in Game.jsx:
 *   - import { loadSprites } from '../presentation/SpriteLoader.js';
 *   - Load sprites async before game loop starts
 *   - Pass sprites map to StructureRenderer constructor
 */

// ── CHANGE 1: Constructor update ─────────────────────────────────────────
// FIND:
//   constructor(ctx, camera) {
//     this.ctx    = ctx;
//     this.camera = camera;
//     this._tick  = 0;
//
// REPLACE WITH:
constructor(ctx, camera, sprites = new Map()) {
  this.ctx     = ctx;
  this.camera  = camera;
  this._tick   = 0;
  this.sprites = sprites;   // Map<spriteId, HTMLImageElement>
}

// ── CHANGE 2: Top of _drawStructure() ────────────────────────────────────
// At the very start of _drawStructure(structure), BEFORE any existing code, ADD:
//
//   const spriteId = structure.sprite;
//   const spriteImg = spriteId ? this.sprites.get(spriteId) : null;
//   if (spriteImg) {
//     this._drawSpriteStructure(structure, spriteImg);
//     return;  // sprite handled — skip placeholder
//   }
//   // ... existing placeholder code follows unchanged ...

// ── CHANGE 3: New method — add to StructureRenderer class ────────────────

_drawSpriteStructure(structure, img) {
  const ctx = this.ctx;
  const cam = this.camera;

  const { x: sx, y: sy } = cam.tileToScreen(structure.col, structure.row);
  const fw = structure.footprint?.w ?? 2;
  const fh = structure.footprint?.h ?? 2;

  // Anchor point: bottom-center of the footprint diamond
  const anchorX = sx + (fw - fh) * (cam.TILE_HW ?? 32) * cam.zoom * 0.5;
  const anchorY = sy + (fw + fh) * (cam.TILE_HH ?? 16) * cam.zoom * 0.5;

  // Scale sprite to footprint width
  const targetW = fw * (cam.TILE_HW ?? 32) * cam.zoom * 2.8;  // tune this multiplier
  const scale   = targetW / img.width;
  const drawW   = img.width  * scale;
  const drawH   = img.height * scale;

  // Bottom-anchor the sprite
  const drawX = anchorX - drawW / 2;
  const drawY = anchorY - drawH;

  const structState = structure.getStructureState?.() ?? structure.structureState;
  const hpFrac      = structure.hpFraction ?? (structure.hp / structure.maxHp) ?? 1;

  ctx.save();

  // Construction: fade in
  if (structState === 'constructing') {
    ctx.globalAlpha = 0.25 + (structure.constructionProgress ?? 0) * 0.75;
  }

  // Damage tint: overlay red-orange when damaged/critical
  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  if (structState === 'damaged' || structState === 'critical') {
    const flicker = Math.sin(this._tick * 8) > 0.3;
    if (flicker) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = structState === 'critical' ? 0.5 : 0.3;
      ctx.fillStyle   = structState === 'critical' ? '#ff3300' : '#ff8800';
      ctx.fillRect(drawX, drawY, drawW, drawH);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
    }
  }

  // Power deficit indicator
  if (!structure.powered && structState !== 'constructing') {
    ctx.globalAlpha = 0.85 + Math.sin(this._tick * 4) * 0.15;
    ctx.font        = `${Math.max(11, 14 * cam.zoom)}px monospace`;
    ctx.textAlign   = 'center';
    ctx.fillStyle   = '#ffcc00';
    ctx.fillText('⚡', anchorX, drawY - 4 * cam.zoom);
    ctx.globalAlpha = 1.0;
  }

  // HP bar
  if (hpFrac < 1.0) {
    const bw = drawW * 0.7;
    const bh = Math.max(3, 4 * cam.zoom);
    const bx = anchorX - bw / 2;
    const by = drawY - 10 * cam.zoom;
    ctx.fillStyle = '#222';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = hpFrac > 0.6 ? '#4caf50' : hpFrac > 0.3 ? '#ff9800' : '#f44336';
    ctx.fillRect(bx, by, bw * hpFrac, bh);
  }

  // Construction progress bar
  if (structState === 'constructing') {
    const prog = structure.constructionProgress ?? 0;
    const bw   = drawW * 0.7;
    const bx   = anchorX - bw / 2;
    const by   = drawY - 14 * cam.zoom;
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, by, bw, 5 * cam.zoom);
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(bx, by, bw * prog, 5 * cam.zoom);
  }

  // Selection ring (screen-space ellipse under building)
  if (structure.selected) {
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.ellipse(anchorX, anchorY - 2, drawW * 0.48, drawW * 0.22, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Garrison mount flash indicators (reuse existing logic)
  if (structure.mountPoints?.length > 0) {
    this._drawMountPoints(ctx, cam, anchorX, anchorY - drawH * 0.4, drawH * 0.5, structure);
  }

  ctx.restore();
}

// ── Game.jsx INTEGRATION — sprite loading ────────────────────────────────
//
// In Game.jsx, convert useEffect to async and load sprites before loop:
//
//   useEffect(() => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;
//
//     let cleanup = null;
//
//     (async () => {
//       canvas.width  = window.innerWidth;
//       canvas.height = window.innerHeight;
//       const ctx = canvas.getContext('2d');
//
//       // Load sprites — non-blocking, falls back to placeholders if slow
//       import { loadSprites } from '../presentation/SpriteLoader.js';
//       const sprites = await loadSprites();
//
//       // ... all existing system setup ...
//
//       // Pass sprites to StructureRenderer:
//       const structureRenderer = new StructureRenderer(ctx, camera, sprites);
//
//       // ... rest unchanged ...
//     })();
//
//     return () => cleanup?.();
//   }, []);
//
// NOTE: The async wrapper doesn't affect React — the cleanup fn is returned
// synchronously and called on unmount. All existing code inside works identically.
