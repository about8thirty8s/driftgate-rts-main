/**
 * StructureRenderer.js
 * Draws all structures. Placeholder geometry until sprites arrive.
 * Depth-sorted by (col + row) same as units.
 *
 * Garrison cutaway:
 *   When a structure has occupants, the roof is drawn at reduced opacity
 *   so you can see inside. Small infantry silhouettes appear at each
 *   occupied mount point, coloured by their faction.
 *
 * Mount point indicators:
 *   Shown when structure is selected — dashed firing arc lines.
 *
 * Muzzle flash:
 *   Driven by external _mountFlashTimers Map (set by Game.jsx on weapon_fired events).
 */

import { TILE_HW, TILE_HH } from './IsometricCamera.js';

const FACTION_COLOURS = {
  player:  '#3a9a4a',
  enemy:   '#cc3333',
  ally:    '#3366cc',
  neutral: '#aaaaaa',
};

const STRUCT_CONFIG = {
  hq:         { label: 'HQ',      emoji: '🏛', w: 3, h: 3, colour: '#5a8a5a', heightPx: 44 },
  production: { label: 'PROD',    emoji: '🏭', w: 3, h: 2, colour: '#5a7a6a', heightPx: 34 },
  power:      { label: 'PWR',     emoji: '⚡', w: 2, h: 2, colour: '#8a8a3a', heightPx: 28 },
  defense:    { label: 'DEF',     emoji: '🗼', w: 2, h: 2, colour: '#7a4a4a', heightPx: 36 },
  resource:   { label: 'RES',     emoji: '⛏', w: 2, h: 2, colour: '#6a6a3a', heightPx: 24 },
  pill_box:   { label: 'PILLBOX', emoji: '🔫', w: 2, h: 2, colour: '#6a5a4a', heightPx: 22 },
  farmhouse:  { label: 'FARM',    emoji: '🏚', w: 3, h: 3, colour: '#8a7a5a', heightPx: 40 },
  refinery:   { label: 'RFNRY',  emoji: '🏗', w: 2, h: 2, colour: '#b08040', heightPx: 38 },
  oil_derrick:{ label: 'OIL',    emoji: '🛢', w: 1, h: 1, colour: '#3a3a3a', heightPx: 42 },
};

export class StructureRenderer {
  constructor(ctx, camera) {
    this.ctx    = ctx;
    this.camera = camera;
    this._tick  = 0;

    // mountId → seconds remaining for muzzle flash
    // Key format: `${structureId}_${mountIndex}`
    // Populated externally by Game.jsx listening to weapon_fired events
    this.mountFlashTimers = new Map();
  }

  tick(dt) {
    this._tick += dt;

    // Drain flash timers
    for (const [key, t] of this.mountFlashTimers) {
      const next = t - dt;
      if (next <= 0) this.mountFlashTimers.delete(key);
      else this.mountFlashTimers.set(key, next);
    }
  }

  /** Called by Game.jsx when weapon_fired fires from a garrison mount */
  triggerMountFlash(structureId, mountIndex) {
    this.mountFlashTimers.set(`${structureId}_${mountIndex}`, 0.12);
  }

  render(entities, placementPreview = null) {
    const structures = entities
      .filter(e => e.alive && e.entityType === 'STRUCTURE')
      .sort((a, b) => (a.col + a.row) - (b.col + b.row));

    for (const s of structures) {
      this._drawStructure(s);
    }

    if (placementPreview) {
      this._drawPlacementPreview(placementPreview);
    }
  }

  _drawStructure(structure) {
    const ctx = this.ctx;
    const cam = this.camera;
    const cfg = STRUCT_CONFIG[structure.category] ?? STRUCT_CONFIG.production;
    const factionColour = FACTION_COLOURS[structure.faction] ?? '#888';

    const { x: sx, y: sy } = cam.tileToScreen(structure.col, structure.row);
    const fw = structure.footprint?.w ?? 2;
    const fh = structure.footprint?.h ?? 2;

    const cx    = sx + (fw - fh) * TILE_HW * cam.zoom * 0.5;
    const cy    = sy + (fw + fh) * TILE_HH * cam.zoom * 0.5;
    const baseW = fw * TILE_HW * cam.zoom;
    const baseH = cfg.heightPx * cam.zoom;
    const baseD = 10 * cam.zoom;

    const structState = structure.getStructureState?.() ?? structure.structureState;
    const hpFrac      = structure.hpFraction ?? 1;
    const isGarrisoned = (structure.garrisonOccupants?.length ?? 0) > 0;

    // ── Special renders: oil derrick, refinery ─────────────────────────────
    if (structure.defId === 'oil_derrick') {
      this._drawOilDerrick(ctx, cam, cx, cy, structure);
      return;
    }

    ctx.save();

    const alpha = structState === 'constructing'
      ? 0.3 + structure.constructionProgress * 0.7
      : 1.0;
    ctx.globalAlpha = alpha;

    // ── Left face ─────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(cx - baseW * 0.5, cy);
    ctx.lineTo(cx,               cy + baseH * 0.3);
    ctx.lineTo(cx,               cy + baseH * 0.3 + baseD);
    ctx.lineTo(cx - baseW * 0.5, cy + baseD);
    ctx.closePath();
    ctx.fillStyle = this._darken(cfg.colour, 0.25);
    ctx.fill();

    // ── Right face ────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(cx,               cy + baseH * 0.3);
    ctx.lineTo(cx + baseW * 0.5, cy);
    ctx.lineTo(cx + baseW * 0.5, cy + baseD);
    ctx.lineTo(cx,               cy + baseH * 0.3 + baseD);
    ctx.closePath();
    ctx.fillStyle = this._darken(cfg.colour, 0.15);
    ctx.fill();

    // ── Top face (roof) ───────────────────────────────────────────────────
    // When garrisoned: draw roof at reduced opacity (cutaway effect)
    const roofAlpha = isGarrisoned ? 0.28 : 1.0;
    ctx.globalAlpha = alpha * roofAlpha;

    ctx.beginPath();
    ctx.moveTo(cx,               cy - baseH + baseH * 0.3);
    ctx.lineTo(cx + baseW * 0.5, cy - baseH);
    ctx.lineTo(cx,               cy - baseH - baseH * 0.3);
    ctx.lineTo(cx - baseW * 0.5, cy - baseH);
    ctx.closePath();
    ctx.fillStyle = cfg.colour;
    ctx.fill();

    // Faction stripe on roof
    ctx.beginPath();
    ctx.moveTo(cx - baseW * 0.3, cy - baseH + 2);
    ctx.lineTo(cx + baseW * 0.3, cy - baseH - 2);
    ctx.strokeStyle = factionColour;
    ctx.lineWidth = 3 * cam.zoom;
    ctx.stroke();

    ctx.globalAlpha = alpha;

    // ── Garrison interior ─────────────────────────────────────────────────
    if (isGarrisoned) {
      this._drawGarrisonInterior(ctx, cam, cx, cy, baseW, baseH, structure);
    }

    // ── Refinery: dump indicator when a harvester is docked ───────────────
    if (structure.defId === 'refinery' && structure.structureState === 'operational') {
      this._drawRefineryDumpIndicator(ctx, cam, cx, cy);
    }

    // ── Damage state ──────────────────────────────────────────────────────
    if (structState === 'damaged' || structState === 'critical') {
      const flicker = Math.sin(this._tick * 8) > 0.3;
      if (flicker) {
        ctx.globalAlpha = alpha * 0.4;
        ctx.fillStyle = structState === 'critical' ? '#ff4400' : '#ff8800';
        ctx.beginPath();
        ctx.moveTo(cx,               cy - baseH + baseH * 0.3);
        ctx.lineTo(cx + baseW * 0.5, cy - baseH);
        ctx.lineTo(cx,               cy - baseH - baseH * 0.3);
        ctx.lineTo(cx - baseW * 0.5, cy - baseH);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = alpha;
      }
    }

    // ── Health bar ────────────────────────────────────────────────────────
    if (hpFrac < 1.0) {
      const bw = baseW;
      const bh = 4 * cam.zoom;
      const bx = cx - bw / 2;
      const by = cy - baseH - 16 * cam.zoom;
      ctx.fillStyle = '#333';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = hpFrac > 0.6 ? '#4caf50' : hpFrac > 0.3 ? '#ff9800' : '#f44336';
      ctx.fillRect(bx, by, bw * hpFrac, bh);
    }

    // ── Emoji label ───────────────────────────────────────────────────────
    ctx.globalAlpha = alpha;
    ctx.font = `${Math.max(10, 11 * cam.zoom)}px monospace`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(cfg.emoji, cx, cy - baseH - 4 * cam.zoom);

    // ── Construction progress bar ─────────────────────────────────────────
    if (structState === 'constructing') {
      const prog = structure.constructionProgress ?? 0;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(cx - 30 * cam.zoom, cy - baseH - 10 * cam.zoom, 60 * cam.zoom, 6 * cam.zoom);
      ctx.fillStyle = '#4caf50';
      ctx.fillRect(cx - 30 * cam.zoom, cy - baseH - 10 * cam.zoom, 60 * cam.zoom * prog, 6 * cam.zoom);
    }

    // ── Power deficit indicator ───────────────────────────────────────────
    if (!structure.powered && structState !== 'constructing') {
      ctx.globalAlpha = 0.8 + Math.sin(this._tick * 4) * 0.2;
      ctx.font = `${14 * cam.zoom}px monospace`;
      ctx.fillStyle = '#ffcc00';
      ctx.fillText('⚡', cx, cy - baseH - 18 * cam.zoom);
    }

    // ── Mount point arcs (when selected) ─────────────────────────────────
    if (structure.selected && structure.mountPoints?.length > 0) {
      this._drawMountPoints(ctx, cam, cx, cy, baseH, structure);
    }

    ctx.restore();
  }

  // ── Garrison interior ─────────────────────────────────────────────────────
  //
  // Draws:
  //   1. Dark "floor" diamond inside the cutaway roof
  //   2. One silhouette per occupied mount point, faction-coloured
  //   3. Garrison count badge top-right
  //   4. Muzzle flash at active mount points

  _drawGarrisonInterior(ctx, cam, cx, cy, baseW, baseH, structure) {
    const occupants = structure.garrisonOccupants ?? [];
    const slots     = structure.garrisonSlots ?? 2;
    const mps       = structure.mountPoints ?? [];

    // ── Interior floor (dark diamond) ──
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.beginPath();
    ctx.moveTo(cx,               cy - baseH + baseH * 0.3);
    ctx.lineTo(cx + baseW * 0.5, cy - baseH);
    ctx.lineTo(cx,               cy - baseH - baseH * 0.3);
    ctx.lineTo(cx - baseW * 0.5, cy - baseH);
    ctx.closePath();
    ctx.fillStyle = '#0e1810'; // very dark green-black
    ctx.fill();
    ctx.restore();

    // ── Occupant silhouettes at mount points ──
    const figW = Math.max(4, 5 * cam.zoom);
    const figH = Math.max(7, 9 * cam.zoom);

    for (let i = 0; i < occupants.length; i++) {
      const mp = mps[i % Math.max(1, mps.length)];

      // Map mount point (tile-offsets from structure origin) → screen position
      // Mount x/y are fractional tile offsets, same coord system as structure.col/row
      const mpScreenBase = this._mountToScreen(cam, cx, cy, baseW, baseH, structure, mp, i);
      const fx = mpScreenBase.x;
      const fy = mpScreenBase.y;

      // Faction colour — we don't have faction on the occupant id alone,
      // so use structure.faction as a proxy (garrison = same faction as building)
      const silColour = FACTION_COLOURS[structure.faction] ?? '#aaaaaa';

      ctx.save();
      ctx.globalAlpha = 0.88;

      // Body
      ctx.fillStyle = silColour;
      ctx.fillRect(fx - figW * 0.35, fy - figH * 0.5, figW * 0.7, figH * 0.6);

      // Head
      ctx.beginPath();
      ctx.arc(fx, fy - figH * 0.6, figW * 0.38, 0, Math.PI * 2);
      ctx.fill();

      // Helmet highlight
      ctx.fillStyle = this._lighten(silColour, 0.2);
      ctx.beginPath();
      ctx.arc(fx, fy - figH * 0.64, figW * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Muzzle flash at this mount point
      const flashKey = `${structure.id}_${i}`;
      if (this.mountFlashTimers.has(flashKey)) {
        const flashT   = this.mountFlashTimers.get(flashKey);
        const flashAmt = flashT / 0.12; // 1 → 0 over 120ms

        // Direction from facing
        const facingAngle = (mp?.facing ?? 0) * (Math.PI / 4) - Math.PI / 2;
        const flashDist   = 8 * cam.zoom;
        const flashX      = fx + Math.cos(facingAngle) * flashDist;
        const flashY      = fy + Math.sin(facingAngle) * flashDist * 0.5;

        ctx.globalAlpha = flashAmt * 0.9;

        // Glow bloom
        const grad = ctx.createRadialGradient(flashX, flashY, 0, flashX, flashY, 7 * cam.zoom);
        grad.addColorStop(0, 'rgba(255,230,100,0.95)');
        grad.addColorStop(0.4, 'rgba(255,140,20,0.6)');
        grad.addColorStop(1, 'rgba(255,80,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(flashX, flashY, 7 * cam.zoom, 0, Math.PI * 2);
        ctx.fill();

        // Core bright dot
        ctx.globalAlpha = flashAmt;
        ctx.fillStyle = '#ffffc0';
        ctx.beginPath();
        ctx.arc(flashX, flashY, 2.5 * cam.zoom, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // ── Garrison count badge ──
    const badgeX = cx + baseW * 0.4;
    const badgeY = cy - baseH - baseH * 0.42;
    const badgeR = Math.max(6, 7 * cam.zoom);

    ctx.save();
    ctx.fillStyle = occupants.length >= slots ? '#cc3333' : '#1a4a1a';
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = occupants.length >= slots ? '#ff6666' : '#44cc44';
    ctx.lineWidth = 1 * cam.zoom;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(7, 8 * cam.zoom)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${occupants.length}/${slots}`, badgeX, badgeY);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  // ── Mount point screen position ───────────────────────────────────────────
  //
  // Converts a mount point's tile-offset (mp.x, mp.y relative to structure origin)
  // into a screen position inside the building's isometric silhouette.

  _mountToScreen(cam, cx, cy, baseW, baseH, structure, mp, fallbackIndex) {
    if (!mp) {
      // Distribute evenly across the top face if no mount point
      const total = structure.garrisonSlots ?? 2;
      const t = fallbackIndex / Math.max(1, total - 1);
      return {
        x: cx - baseW * 0.3 + t * baseW * 0.6,
        y: cy - baseH,
      };
    }

    // mp.x and mp.y are fractional tile offsets from structure.col/row.
    // We project via isometric: screen_x += dc * TILE_HW, screen_y += (dc + dr) * TILE_HH
    const fw = structure.footprint?.w ?? 2;
    const fh = structure.footprint?.h ?? 2;

    // Normalise to 0..1 within footprint
    const normX = mp.x / fw;
    const normY = mp.y / fh;

    // Isometric offset from building centre
    const isoX = (normX - normY) * baseW * 0.5;
    const isoY = (normX + normY - 1) * (baseH * 0.3) * 0.5;

    return {
      x: cx + isoX,
      y: cy - baseH * 0.5 + isoY,
    };
  }

  // ── Mount point firing arcs (selected) ────────────────────────────────────

  _drawMountPoints(ctx, cam, cx, cy, baseH, structure) {
    if (!structure.mountPoints) return;

    for (let i = 0; i < structure.mountPoints.length; i++) {
      const mp  = structure.mountPoints[i];
      const pos = this._mountToScreen(cam, cx, cy, 0, baseH, structure, mp, i);
      const sx  = pos.x;
      const sy  = pos.y;

      const facingAngle = (mp.facing ?? 0) * (Math.PI / 4) - Math.PI / 2;
      const arcSpread   = 2 * (Math.PI / 4);
      const arcLen      = 36 * cam.zoom;

      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth   = 1;
      ctx.setLineDash([4 * cam.zoom, 3 * cam.zoom]);

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(
        sx + Math.cos(facingAngle - arcSpread) * arcLen,
        sy + Math.sin(facingAngle - arcSpread) * arcLen * 0.55,
      );
      ctx.moveTo(sx, sy);
      ctx.lineTo(
        sx + Math.cos(facingAngle + arcSpread) * arcLen,
        sy + Math.sin(facingAngle + arcSpread) * arcLen * 0.55,
      );
      ctx.stroke();
      ctx.setLineDash([]);

      // Centre line
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(
        sx + Math.cos(facingAngle) * arcLen * 0.7,
        sy + Math.sin(facingAngle) * arcLen * 0.4,
      );
      ctx.stroke();

      // Mount dot
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(sx, sy, 3 * cam.zoom, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // ── Placement preview ghost ────────────────────────────────────────────────

  _drawPlacementPreview({ def, col, row, valid }) {
    const ctx = this.ctx;
    const cam = this.camera;
    if (!def) return;

    const fw = def.footprint?.w ?? 2;
    const fh = def.footprint?.h ?? 2;

    for (let dc = 0; dc < fw; dc++) {
      for (let dr = 0; dr < fh; dr++) {
        const { x: sx, y: sy } = cam.tileToScreen(col + dc, row + dr);
        const hw = TILE_HW * cam.zoom;
        const hh = TILE_HH * cam.zoom;

        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.moveTo(sx,      sy       );
        ctx.lineTo(sx + hw, sy + hh  );
        ctx.lineTo(sx,      sy + hh*2);
        ctx.lineTo(sx - hw, sy + hh  );
        ctx.closePath();
        ctx.fillStyle = valid ? 'rgba(80,255,80,0.4)' : 'rgba(255,60,60,0.4)';
        ctx.fill();
        ctx.strokeStyle = valid ? '#80ff80' : '#ff4444';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  _drawRefineryDumpIndicator(ctx, cam, cx, cy) {
    const pulse = 0.6 + 0.4 * Math.sin(this._tick * 5);
    ctx.save();
    ctx.globalAlpha = pulse * 0.8;
    ctx.fillStyle = '#ffd040';
    ctx.beginPath();
    ctx.arc(cx + TILE_HW * cam.zoom * 0.3, cy - 10 * cam.zoom, 4 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _darken(hex, amt) {
    try {
      const n = parseInt(hex.replace('#',''), 16);
      const r = Math.max(0, ((n>>16)&0xff) - Math.round(amt*255));
      const g = Math.max(0, ((n>>8) &0xff) - Math.round(amt*255));
      const b = Math.max(0,  (n     &0xff) - Math.round(amt*255));
      return `rgb(${r},${g},${b})`;
    } catch { return hex; }
  }

  _lighten(hex, amt) {
    try {
      const n = parseInt(hex.replace('#',''), 16);
      const r = Math.min(255, ((n>>16)&0xff) + Math.round(amt*255));
      const g = Math.min(255, ((n>>8) &0xff) + Math.round(amt*255));
      const b = Math.min(255,  (n     &0xff) + Math.round(amt*255));
      return `rgb(${r},${g},${b})`;
    } catch { return hex; }
  }
}
