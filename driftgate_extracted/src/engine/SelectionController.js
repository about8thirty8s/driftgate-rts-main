/**
 * SelectionController.js
 * Handles unit selection — click, box-select, shift-select, group hotkeys.
 * Works in screen space, uses camera to convert to world/tile space.
 */

export class SelectionController {
  constructor(camera, entityRegistry, eventBus) {
    this.camera   = camera;
    this.entities = entityRegistry;
    this.events   = eventBus;

    this.selected = new Set();  // entity ids

    // Box select state
    this._dragStart  = null;    // {x, y} screen
    this._dragging   = false;
    this._dragRect   = null;    // {x1,y1,x2,y2}

    // Control groups (Ctrl+1–9)
    this._groups = {};
    for (let i = 1; i <= 9; i++) this._groups[i] = [];
  }

  // ── Input handlers ────────────────────────────────────────────────────────

  onMouseDown(sx, sy, button, modifiers) {
    if (button !== 0) return; // left button only
    this._dragStart = { x: sx, y: sy };
    this._dragging  = false;
  }

  onMouseMove(sx, sy) {
    if (!this._dragStart) return;
    const dx = Math.abs(sx - this._dragStart.x);
    const dy = Math.abs(sy - this._dragStart.y);
    if (dx > 4 || dy > 4) {
      this._dragging = true;
      this._dragRect = {
        x1: Math.min(sx, this._dragStart.x),
        y1: Math.min(sy, this._dragStart.y),
        x2: Math.max(sx, this._dragStart.x),
        y2: Math.max(sy, this._dragStart.y),
      };
    }
  }

  onMouseUp(sx, sy, button, modifiers) {
    if (button !== 0) return;

    if (this._dragging && this._dragRect) {
      this._boxSelect(this._dragRect, modifiers);
    } else {
      this._clickSelect(sx, sy, modifiers);
    }

    this._dragStart = null;
    this._dragging  = false;
    this._dragRect  = null;
  }

  onRightClick(sx, sy, modifiers) {
    if (this.selected.size === 0) return;

    const tile = this.camera.screenToTile(sx, sy);

    // Check if right-clicking on an enemy entity
    const target = this._pickEntity(sx, sy, { enemiesOnly: true });
    if (target) {
      this._issueAttackOrder(target.id);
      return;
    }

    // Otherwise move order
    this._issueMoveOrder(tile.col, tile.row, modifiers.shift);
  }

  // ── Public API aliases (used by Mission.jsx) ──────────────────────────────

  get isDragging() { return this._dragging; }

  startBoxSelect(sx, sy) {
    this._dragStart = { x: sx, y: sy };
    this._dragging  = false;
    this._dragRect  = null;
  }

  updateBoxSelect(sx, sy) {
    if (!this._dragStart) return;
    const dx = Math.abs(sx - this._dragStart.x);
    const dy = Math.abs(sy - this._dragStart.y);
    if (dx > 4 || dy > 4) {
      this._dragging = true;
      this._dragRect = {
        x1: Math.min(sx, this._dragStart.x),
        y1: Math.min(sy, this._dragStart.y),
        x2: Math.max(sx, this._dragStart.x),
        y2: Math.max(sy, this._dragStart.y),
      };
    }
  }

  endBoxSelect(modifiers = {}) {
    if (this._dragging && this._dragRect) {
      this._boxSelect(this._dragRect, modifiers);
    }
    this._dragStart = null;
    this._dragging  = false;
    this._dragRect  = null;
  }

  selectSingle(entityId) {
    this._clearSelection();
    this._select(entityId);
  }

  clearSelection() {
    this._clearSelection();
  }

  // ── Selection logic ───────────────────────────────────────────────────────

  _clickSelect(sx, sy, modifiers) {
    const picked = this._pickEntity(sx, sy);

    if (!picked) {
      if (!modifiers.shift) this._clearSelection();
      return;
    }

    if (modifiers.shift) {
      // Toggle this unit
      if (this.selected.has(picked.id)) {
        this._deselect(picked.id);
      } else {
        this._select(picked.id);
      }
    } else if (modifiers.ctrl) {
      this._clearSelection();
      this._select(picked.id);
    } else {
      this._clearSelection();
      this._select(picked.id);
    }
  }

  _boxSelect(rect, modifiers) {
    if (!modifiers.shift) this._clearSelection();

    for (const entity of this.entities.getPlayerUnits()) {
      if (!entity.alive) continue;
      const screen = this.camera.tileToScreen(entity.col, entity.row);
      if (
        screen.x >= rect.x1 && screen.x <= rect.x2 &&
        screen.y >= rect.y1 && screen.y <= rect.y2
      ) {
        this._select(entity.id);
      }
    }
  }

  _pickEntity(sx, sy, { enemiesOnly = false } = {}) {
    let best = null;
    let bestDist = 20; // pixel threshold

    for (const entity of this.entities.getAll()) {
      if (!entity.alive) continue;
      if (entity.entityType === 'PROJECTILE') continue;
      if (enemiesOnly && entity.faction === 'player') continue;

      const screen = this.camera.tileToScreen(entity.col, entity.row);
      const dist = Math.hypot(screen.x - sx, screen.y - sy);
      const radius = (entity.selectionRadius ?? 0.5) * 32 * this.camera.zoom;

      if (dist < radius && dist < bestDist) {
        best = entity;
        bestDist = dist;
      }
    }

    return best;
  }

  _select(entityId) {
    const e = this.entities.get(entityId);
    if (!e) return;
    e.selected = true;
    this.selected.add(entityId);
    this.events.emit('selection_changed', { selected: [...this.selected] });
  }

  _deselect(entityId) {
    const e = this.entities.get(entityId);
    if (e) e.selected = false;
    this.selected.delete(entityId);
    this.events.emit('selection_changed', { selected: [...this.selected] });
  }

  _clearSelection() {
    for (const id of this.selected) {
      const e = this.entities.get(id);
      if (e) e.selected = false;
    }
    this.selected.clear();
    this.events.emit('selection_changed', { selected: [] });
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  _issueMoveOrder(col, row, queue = false) {
    const ids = [...this.selected];
    const offsets = this._formationOffsets(ids.length);

    ids.forEach((id, i) => {
      const e = this.entities.get(id);
      if (!e || !e.issueOrder) return;
      const off = offsets[i] ?? { dc: 0, dr: 0 };
      e.issueOrder({ type: 'move', col: col + off.dc, row: row + off.dr, queue });
    });

    this.events.emit('move_order_issued', { entityIds: ids, col, row });
  }

  _issueAttackOrder(targetId) {
    for (const id of this.selected) {
      const e = this.entities.get(id);
      if (!e || !e.issueOrder) continue;
      e.issueOrder({ type: 'attack', targetId });
    }
    this.events.emit('attack_order_issued', { entityIds: [...this.selected], targetId });
  }

  issueStopOrder() {
    for (const id of this.selected) {
      const e = this.entities.get(id);
      if (e?.issueOrder) e.issueOrder({ type: 'stop' });
    }
  }

  issueHoldOrder() {
    for (const id of this.selected) {
      const e = this.entities.get(id);
      if (e?.issueOrder) e.issueOrder({ type: 'hold' });
    }
  }

  // ── Control Groups ────────────────────────────────────────────────────────

  assignGroup(n) { this._groups[n] = [...this.selected]; }

  recallGroup(n) {
    if (!this._groups[n]?.length) return;
    this._clearSelection();
    for (const id of this._groups[n]) {
      if (this.entities.get(id)?.alive) this._select(id);
    }
  }

  // ── Formation ────────────────────────────────────────────────────────────

  _formationOffsets(count) {
    if (count <= 1) return [{ dc: 0, dr: 0 }];
    const offsets = [];
    const cols = Math.ceil(Math.sqrt(count));
    for (let i = 0; i < count; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      offsets.push({ dc: c - Math.floor(cols / 2), dr: r });
    }
    return offsets;
  }

  // ── Accessors ─────────────────────────────────────────────────────────────

  getDragRect() { return this._dragging ? this._dragRect : null; }
  getSelected() { return [...this.selected].map(id => this.entities.get(id)).filter(Boolean); }
  getSelectedIds() { return [...this.selected]; }
}
