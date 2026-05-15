/**
 * IsometricCamera.js
 * Handles all world↔screen coordinate transforms, pan, zoom.
 *
 * Isometric projection:
 *   screenX = (col - row) * TILE_HW + originX
 *   screenY = (col + row) * TILE_HH + originY
 *
 * TILE_HW = half tile width  = 64px  (tile is 128px wide)
 * TILE_HH = half tile height = 32px  (tile is 64px tall)
 *
 * The camera stores a worldOrigin (wx, wy) — the world-space point
 * at the centre of the screen — and a zoom level.
 */

export const TILE_HW = 64;  // half-width of one tile in pixels at zoom 1
export const TILE_HH = 32;  // half-height of one tile in pixels at zoom 1
export const TILE_W  = TILE_HW * 2;
export const TILE_H  = TILE_HH * 2;

export const ZOOM_MIN = 0.4;
export const ZOOM_MAX = 2.0;
export const ZOOM_DEFAULT = 1.0;

export class IsometricCamera {
  constructor(viewportW, viewportH) {
    this.viewportW = viewportW;
    this.viewportH = viewportH;

    // World origin — centre of viewport in world space (pixel units before iso)
    this.wx = 0;
    this.wy = 0;
    this.zoom = ZOOM_DEFAULT;

    // Pan input state
    this._panKeys = { up: false, down: false, left: false, right: false };
    this.PAN_SPEED = 400; // world pixels per second at zoom 1

    // Edge scroll zone in pixels
    this.EDGE_SCROLL_MARGIN = 40;
    this.EDGE_SCROLL_SPEED = 350;
    this._mouseX = -1;
    this._mouseY = -1;

    // Clamp bounds (set after grid size known)
    this.boundMinX = -Infinity;
    this.boundMaxX = Infinity;
    this.boundMinY = -Infinity;
    this.boundMaxY = Infinity;
  }

  // Call after TileGrid is created to set scroll bounds
  setBounds(gridCols, gridRows, padding = 200) {
    // World pixel extent of the full grid in iso space
    const maxX = (gridCols + gridRows) * TILE_HW;
    const maxY = (gridCols + gridRows) * TILE_HH;
    this.boundMinX = -padding;
    this.boundMaxX = maxX + padding;
    this.boundMinY = -padding;
    this.boundMaxY = maxY + padding;

    // Start camera centred on the map
    this.wx = maxX / 2;
    this.wy = maxY / 2;
  }

  resize(w, h) {
    this.viewportW = w;
    this.viewportH = h;
  }

  // ─── Coordinate Transforms ──────────────────────────────────────────────

  // Tile grid (col, row) → screen pixel (x, y)
  tileToScreen(col, row) {
    const wx = (col - row) * TILE_HW;
    const wy = (col + row) * TILE_HH;
    return this.worldToScreen(wx, wy);
  }

  // World pixel → screen pixel
  worldToScreen(wx, wy) {
    const sx = (wx - this.wx) * this.zoom + this.viewportW / 2;
    const sy = (wy - this.wy) * this.zoom + this.viewportH / 2;
    return { x: sx, y: sy };
  }

  // Screen pixel → world pixel
  screenToWorld(sx, sy) {
    const wx = (sx - this.viewportW / 2) / this.zoom + this.wx;
    const wy = (sy - this.viewportH / 2) / this.zoom + this.wy;
    return { wx, wy };
  }

  // Screen pixel → tile grid (col, row) — nearest tile
  screenToTile(sx, sy) {
    const { wx, wy } = this.screenToWorld(sx, sy);
    // Inverse isometric:
    //   col = (wx/TILE_HW + wy/TILE_HH) / 2
    //   row = (wy/TILE_HH - wx/TILE_HW) / 2
    const col = Math.floor((wx / TILE_HW + wy / TILE_HH) / 2);
    const row = Math.floor((wy / TILE_HH - wx / TILE_HW) / 2);
    return { col, row };
  }

  // Get the pixel position of the top-centre of a tile (for unit positioning)
  tileCentre(col, row) {
    const { x, y } = this.tileToScreen(col, row);
    return { x, y: y + TILE_HH * this.zoom };
  }

  // ─── Zoom ────────────────────────────────────────────────────────────────

  zoomAt(screenX, screenY, delta) {
    // Zoom toward the screen point
    const worldBefore = this.screenToWorld(screenX, screenY);
    this.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this.zoom * (1 - delta * 0.001)));
    const worldAfter = this.screenToWorld(screenX, screenY);
    this.wx += worldBefore.wx - worldAfter.wx;
    this.wy += worldBefore.wy - worldAfter.wy;
    this._clamp();
  }

  // ─── Pan ─────────────────────────────────────────────────────────────────

  setPanKey(dir, down) {
    this._panKeys[dir] = down;
  }

  setMousePosition(x, y) {
    this._mouseX = x;
    this._mouseY = y;
  }

  // Call every frame with dt in seconds
  update(dt) {
    const speed = this.PAN_SPEED / this.zoom;
    let dx = 0, dy = 0;

    // WASD / arrow keys
    if (this._panKeys.up)    dy -= speed * dt;
    if (this._panKeys.down)  dy += speed * dt;
    if (this._panKeys.left)  dx -= speed * dt;
    if (this._panKeys.right) dx += speed * dt;

    // Edge scrolling
    const m = this.EDGE_SCROLL_MARGIN;
    const es = this.EDGE_SCROLL_SPEED / this.zoom;
    if (this._mouseX >= 0) {
      if (this._mouseX < m)                      dx -= es * dt;
      if (this._mouseX > this.viewportW - m)     dx += es * dt;
      if (this._mouseY < m)                      dy -= es * dt;
      if (this._mouseY > this.viewportH - m)     dy += es * dt;
    }

    if (dx !== 0 || dy !== 0) {
      this.wx += dx;
      this.wy += dy;
      this._clamp();
    }
  }

  pan(dx, dy) {
    this.wx += dx / this.zoom;
    this.wy += dy / this.zoom;
    this._clamp();
  }

  _clamp() {
    this.wx = Math.max(this.boundMinX, Math.min(this.boundMaxX, this.wx));
    this.wy = Math.max(this.boundMinY, Math.min(this.boundMaxY, this.wy));
  }

  // ─── Culling ─────────────────────────────────────────────────────────────

  // Returns true if a tile is potentially visible (loose check for culling)
  isTileVisible(col, row) {
    const { x, y } = this.tileToScreen(col, row);
    const margin = TILE_W * this.zoom * 2;
    return x > -margin && x < this.viewportW + margin &&
           y > -margin && y < this.viewportH + margin;
  }

  // Centre the camera on a given tile (fractional col/row supported for panning)
  centerOn(col, row) {
    this.wx = (col - row) * TILE_HW;
    this.wy = (col + row) * TILE_HH;
    this._clamp();
  }

}
