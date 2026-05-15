/**
 * BrokenCrossingMap.js
 * Hand-authored 32x32 map for Mission: Broken Crossing.
 *
 * Layout (row 0 = north):
 *   Row  0– 4  : enemy rear jungle
 *   Row  5–10  : enemy territory — farmhouse at (11,8), enemy trench at row 10
 *   Row 11–13  : river + ford at cols 13–16
 *   Row 14–17  : no-man's land, craters, mud
 *   Row 18–22  : player approach — dirt road, mud patches
 *   Row 23–23  : player defensive TRENCH line (cols 9–21)
 *   Row 24–27  : player territory — HQ at (15,26)
 *   Row 28–31  : player rear jungle
 *
 * Tunnels:
 *   tunnel_south_A (13,25) ↔ tunnel_north_A (13,7)
 *   tunnel_south_B (18,25) ↔ tunnel_north_B (18,7)
 *
 * Structures (scriptId tagged):
 *   farmhouse_A at (11,8) — enemy garrisoned
 *
 * Returns same { grid, meta } shape as MapGenerator.
 */

import { TileGrid } from './TileGrid.js';

export function buildBrokenCrossingMap() {
  const COLS = 32, ROWS = 32;
  const grid = new TileGrid(COLS, ROWS);

  // ── Fill base terrain ────────────────────────────────────────────────────

  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      grid.setTileType(col, row, 'GRASS');
    }
  }

  // ── Enemy rear jungle (rows 0–4) ─────────────────────────────────────────
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row <= 4; row++) {
      grid.setTileType(col, row, row <= 2 ? 'JUNGLE_THICK' : 'JUNGLE');
    }
  }

  // ── Player rear jungle (rows 28–31) ──────────────────────────────────────
  for (let col = 0; col < COLS; col++) {
    for (let row = 28; row < ROWS; row++) {
      grid.setTileType(col, row, row >= 30 ? 'JUNGLE_THICK' : 'JUNGLE');
    }
  }

  // ── Jungle patches in enemy territory (rows 5–10) ────────────────────────
  const jPatch = [
    [2,5],[3,5],[4,6],[5,5],[8,6],[9,5],[20,6],[21,5],[24,5],[25,6],[27,5],
    [2,7],[3,8],[6,7],[22,7],[26,7],[28,8],[29,7],
    [3,9],[4,9],[22,9],[27,9],[28,9],
  ];
  for (const [c,r] of jPatch) {
    if (c < COLS && r < ROWS) grid.setTileType(c, r, 'JUNGLE');
  }

  // ── River (rows 11–13) — meanders east-west ───────────────────────────────
  for (let col = 0; col < COLS; col++) {
    const mid = 12 + Math.round(Math.sin(col * 0.35) * 0.8);
    grid.setTileType(col, mid,     'WATER_SHALLOW');
    grid.setTileType(col, mid + 1, 'WATER_DEEP');
    grid.setTileType(col, mid + 2, 'WATER_SHALLOW');
    // Muddy banks
    if (mid - 1 >= 0) grid.setTileType(col, mid - 1, 'MUD');
    if (mid + 3 < ROWS) grid.setTileType(col, mid + 3, 'MUD');
  }

  // ── Ford crossing (cols 13–16, rows 11–14) ────────────────────────────────
  for (let col = 13; col <= 16; col++) {
    for (let row = 11; row <= 14; row++) {
      const t = grid.getTile(col, row);
      if (t && (t.type === 'WATER_DEEP' || t.type === 'WATER_SHALLOW' || t.type === 'MUD')) {
        grid.setTileType(col, row, 'FORD');
      }
    }
  }

  // ── No man's land (rows 14–17): craters and mud ───────────────────────────
  const nml = [
    [10,15,'CRATER'],[11,16,'CRATER'],[16,15,'CRATER'],[18,16,'CRATER'],
    [13,17,'CRATER'],[20,15,'CRATER'],[22,16,'MUD'],
    [9,15,'MUD'],[14,16,'MUD'],[17,15,'MUD'],[21,16,'MUD'],
  ];
  for (const [c,r,type] of nml) {
    grid.setTileType(c, r, type);
  }

  // ── Dirt road: north-south through col 15 ────────────────────────────────
  for (let row = 5; row <= 10; row++) grid.setTileType(15, row, 'ROAD');
  // Road stops at river — picks up south of ford
  for (let row = 15; row <= 22; row++) grid.setTileType(15, row, 'ROAD');

  // ── Enemy trench line (row 10, cols 8–22) ────────────────────────────────
  for (let col = 8; col <= 22; col++) {
    if (col === 15) continue; // gap at road
    grid.setTileType(col, 10, 'TRENCH');
  }

  // ── Player defensive trench (row 23, cols 9–21) ──────────────────────────
  for (let col = 9; col <= 21; col++) {
    if (col === 15) continue; // gap at road
    grid.setTileType(col, 23, 'TRENCH');
  }

  // ── Mud patches in player approach ───────────────────────────────────────
  const mudP = [[11,18],[12,19],[17,18],[18,19],[10,20],[19,20],[9,21],[20,21]];
  for (const [c,r] of mudP) grid.setTileType(c, r, 'MUD');

  // ── Dirt patches (resource nodes area) ───────────────────────────────────
  grid.setTileType(7, 24, 'DIRT');
  grid.setTileType(23, 24, 'DIRT');
  grid.setTileType(7,  7, 'DIRT');
  grid.setTileType(23,  7, 'DIRT');

  return {
    grid,
    meta: {
      cols: COLS,
      rows: ROWS,
      fordCol: 15,
      fordRow: 12,
      playerStartCol: 15,
      playerStartRow: 26,
      enemyStartCol:  15,
      enemyStartRow:   5,

      // Subterrain entrance pairs
      subterrainEntrances: [
        { id: 'tunnel_south_A', col: 13, row: 25, linkedId: 'tunnel_north_A' },
        { id: 'tunnel_north_A', col: 13, row:  7, linkedId: 'tunnel_south_A' },
        { id: 'tunnel_south_B', col: 18, row: 25, linkedId: 'tunnel_north_B' },
        { id: 'tunnel_north_B', col: 18, row:  7, linkedId: 'tunnel_south_B' },
      ],

      // Pre-placed structures (created by Mission.jsx, not BuildSystem)
      scriptedStructures: [
        {
          scriptId:  'farmhouse_A',
          defId:     'farmhouse',
          faction:   'enemy',
          col:       11,
          row:        8,
          // Pre-garrisoned with 3 riflemen
          garrisonCount: 3,
        },
      ],

      // Player starting units
      playerStartUnits: [
        { defId: 'infantry_rifleman', col: 14, row: 26 },
        { defId: 'infantry_rifleman', col: 15, row: 26 },
        { defId: 'infantry_rifleman', col: 16, row: 26 },
        { defId: 'infantry_engineer', col: 15, row: 27 },
      ],

      resourceNodes: [
        { col: 7,  row: 24 },
        { col: 23, row: 24 },
        { col: 7,  row:  7 },
        { col: 23, row:  7 },
      ],

      // Alluvial ore field sources — grow outward slowly from these points
      oreSources: [
        { col: 6,  row: 24, label: 'Southwest Deposits' },
        { col: 24, row: 24, label: 'Southeast Deposits' },
      ],

      // Pre-placed neutral oil derricks — capture for passive income
      oilDerricks: [
        { col: 7,  row: 16, label: 'Central Derrick A' },
        { col: 23, row: 16, label: 'Central Derrick B' },
      ],

      // Player refinery start position (spawned by Mission.jsx on init)
      playerRefineryCol: 12,
      playerRefineryRow: 27,

      // Subterrain entrances that start hidden (revealed by MissionDirector)
      hiddenEntrances: ['tunnel_south_A', 'tunnel_north_A'],
    },
  };
}
