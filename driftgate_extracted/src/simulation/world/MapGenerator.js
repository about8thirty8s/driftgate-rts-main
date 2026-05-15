/**
 * MapGenerator.js
 * Procedurally generates the first jungle map: 32x32 with river, ford, treeline.
 * Deterministic given the same seed.
 */

import { TileGrid, TILE_TYPES } from './TileGrid.js';

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateJungleMap(seed = 42) {
  const COLS = 32, ROWS = 32;
  const grid = new TileGrid(COLS, ROWS);
  const rand = seededRandom(seed);

  // ── Base terrain: mostly grass with mud patches ──
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const r = rand();
      if (r < 0.05) grid.setTileType(col, row, 'MUD');
      else if (r < 0.08) grid.setTileType(col, row, 'DIRT');
      else grid.setTileType(col, row, 'GRASS');
    }
  }

  // ── River: runs east-west across the middle (rows 13-16) ──
  // Slight meander using sine wave
  for (let col = 0; col < COLS; col++) {
    const midRow = 14 + Math.round(Math.sin(col * 0.4) * 1.5);
    for (let dr = 0; dr < 3; dr++) {
      const r = midRow + dr;
      if (r >= 0 && r < ROWS) {
        // Edge rows are shallow, centre is deep
        grid.setTileType(col, r, dr === 1 ? 'WATER_DEEP' : 'WATER_SHALLOW');
      }
    }
    // Muddy bank
    if (midRow - 1 >= 0) grid.setTileType(col, midRow - 1, 'MUD');
    if (midRow + 3 < ROWS) grid.setTileType(col, midRow + 3, 'MUD');
  }

  // ── Ford crossing point: col 14-16 ──
  for (let col = 14; col <= 16; col++) {
    for (let row = 13; row <= 17; row++) {
      const t = grid.getTile(col, row);
      if (t && (t.type === 'WATER_DEEP' || t.type === 'WATER_SHALLOW')) {
        grid.setTileType(col, row, 'FORD');
      }
    }
  }

  // ── Dense jungle: north band (rows 0-5) and south band (rows 27-31) ──
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row <= 5; row++) {
      grid.setTileType(col, row, rand() < 0.6 ? 'JUNGLE_THICK' : 'JUNGLE');
    }
    for (let row = 27; row < ROWS; row++) {
      grid.setTileType(col, row, rand() < 0.6 ? 'JUNGLE_THICK' : 'JUNGLE');
    }
  }

  // ── Scattered jungle patches in playable area ──
  for (let col = 0; col < COLS; col++) {
    for (let row = 6; row < 27; row++) {
      const t = grid.getTile(col, row);
      if (!t || t.type === 'WATER_DEEP' || t.type === 'WATER_SHALLOW' || t.type === 'FORD' || t.type === 'MUD') continue;
      if (rand() < 0.12) grid.setTileType(col, row, 'JUNGLE');
      else if (rand() < 0.03) grid.setTileType(col, row, 'JUNGLE_THICK');
    }
  }

  // ── Dirt road: runs north-south through centre (col 15), connecting player to ford ──
  for (let row = 6; row <= 13; row++) {
    grid.setTileType(15, row, 'ROAD');
  }
  for (let row = 17; row <= 26; row++) {
    grid.setTileType(15, row, 'ROAD');
  }

  // ── Resource nodes: 4 nodes on map (ore/crystal stand-ins) ──
  // Player side (south)
  grid.setTileType(8, 24, 'DIRT');
  grid.setTileType(22, 24, 'DIRT');
  // Enemy side (north)
  grid.setTileType(8, 8, 'DIRT');
  grid.setTileType(22, 8, 'DIRT');

  return { grid, meta: {
    cols: COLS,
    rows: ROWS,
    fordCol: 15,
    fordRow: 15,
    playerStartCol: 15,
    playerStartRow: 26,
    enemyStartCol: 15,
    enemyStartRow: 5,
    resourceNodes: [
      { col: 8, row: 24 }, { col: 22, row: 24 },
      { col: 8, row: 8  }, { col: 22, row: 8  },
    ],
    // Subterrain entrances — paired by linkedId
    subterrainEntrances: [
      { id: 'tunnel_south_A', col: 13, row: 24, linkedId: 'tunnel_north_A' },
      { id: 'tunnel_north_A', col: 13, row:  8, linkedId: 'tunnel_south_A' },
      { id: 'tunnel_south_B', col: 18, row: 24, linkedId: 'tunnel_north_B' },
      { id: 'tunnel_north_B', col: 18, row:  8, linkedId: 'tunnel_south_B' },
    ],
    // Garrisonable structures (pill boxes) — placed on map for pickup by Game.jsx
    pillBoxes: [
      { col: 11, row: 19 },
      { col: 19, row: 12 },
    ],
  }};
}
