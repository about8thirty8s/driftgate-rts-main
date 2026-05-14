/**
 * SpriteLoader.js
 * Centralised async sprite loader for all game assets.
 * Returns a Map of spriteId → HTMLImageElement (already loaded).
 *
 * Usage in Game.jsx:
 *   import { loadSprites, SPRITE_MAP } from '../presentation/SpriteLoader.js';
 *   const sprites = await loadSprites();
 *   // pass sprites into StructureRenderer and UnitRenderer constructors
 *
 * NEW FILE: src/presentation/SpriteLoader.js
 */

// ── Sprite manifest ───────────────────────────────────────────────────────
// Maps spriteId → public path (relative to /public)
// spriteId matches the "sprite" field in structure/unit JSON defs

export const SPRITE_MAP = {

  // ── General / Allied buildings ──────────────────────────────────────────
  structure_hq:             '/sprites/buildings/general/building_01_command_center.png',
  structure_power_plant:    '/sprites/buildings/general/building_02_power_plant.png',
  structure_barracks:       '/sprites/buildings/general/building_03_barracks.png',
  structure_pillbox:        '/sprites/buildings/general/building_04_pillbox.png',
  structure_sandbags:       '/sprites/buildings/general/building_05_sandbags.png',
  structure_war_factory:    '/sprites/buildings/general/building_06_vehicle_factory.png',
  structure_tech_center:    '/sprites/buildings/general/building_07_tech_center.png',
  structure_comms:          '/sprites/buildings/general/building_08_comms_facility.png',
  structure_airfield:       '/sprites/buildings/general/building_09_airfield.png',
  structure_naval_yard:     '/sprites/buildings/general/building_10_naval_yard.png',
  structure_at_bunker:      '/sprites/buildings/general/building_11_antitank_bunker.png',

  // ── Soviet buildings ────────────────────────────────────────────────────
  structure_soviet_hq:            '/sprites/buildings/soviet/soviet_01_command_center_alpha.png',
  structure_soviet_power_plant:   '/sprites/buildings/soviet/soviet_02_power_plant_alpha.png',
  structure_soviet_barracks:      '/sprites/buildings/soviet/soviet_03_barracks_alpha.png',
  structure_soviet_war_factory:   '/sprites/buildings/soviet/soviet_04_vehicle_factory_alpha.png',
  structure_soviet_tech_center:   '/sprites/buildings/soviet/soviet_05_tech_center_alpha.png',
  structure_soviet_comms:         '/sprites/buildings/soviet/soviet_06_comms_facility_alpha.png',
  structure_soviet_airfield:      '/sprites/buildings/soviet/soviet_07_airfield_alpha.png',
  structure_soviet_naval_yard:    '/sprites/buildings/soviet/soviet_08_naval_yard_alpha.png',
  structure_soviet_at_casemate:   '/sprites/buildings/soviet/soviet_09_at_bunker_casemate_alpha.png',
  structure_soviet_at_turret:     '/sprites/buildings/soviet/soviet_10_at_bunker_turret_alpha.png',
  structure_soviet_at_hulkdown:   '/sprites/buildings/soviet/soviet_11_at_bunker_hulkdown_alpha.png',
};

// ── Loader ────────────────────────────────────────────────────────────────

/**
 * Loads all sprites in SPRITE_MAP in parallel.
 * Returns Map<spriteId, HTMLImageElement>.
 * Failed loads are skipped silently (fallback to placeholder renderer).
 */
export async function loadSprites(extraMap = {}) {
  const combined = { ...SPRITE_MAP, ...extraMap };
  const entries  = Object.entries(combined);

  const results = await Promise.allSettled(
    entries.map(([id, path]) => loadImage(id, path))
  );

  const map = new Map();
  let loaded = 0;
  let failed = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      map.set(result.value.id, result.value.img);
      loaded++;
    } else {
      failed++;
    }
  }

  console.log(`[SpriteLoader] ${loaded} loaded, ${failed} failed`);
  return map;
}

function loadImage(id, path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve({ id, img });
    img.onerror = () => {
      console.warn(`[SpriteLoader] Failed to load: ${path}`);
      reject(new Error(`Failed: ${path}`));
    };
    img.src = path;
  });
}
