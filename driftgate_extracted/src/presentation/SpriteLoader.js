/**
 * SpriteLoader.js — v2.0
 * Centralised async sprite loader for all game assets.
 * Returns a Map of spriteId → HTMLImageElement (already loaded).
 *
 * CHANGES v2.0:
 *  - Added 19 defensive structure sprites (AT guns, MG posts, towers, walls)
 *  - loadSprites() now accepts cancelToken to support async abort in Game.jsx
 *
 * FILE LOCATION: src/presentation/SpriteLoader.js
 */

// ── Sprite manifest ───────────────────────────────────────────────────────
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
  structure_soviet_hq:              '/sprites/buildings/soviet/soviet_01_command_center_alpha.png',
  structure_soviet_power_plant:     '/sprites/buildings/soviet/soviet_02_power_plant_alpha.png',
  structure_soviet_barracks:        '/sprites/buildings/soviet/soviet_03_barracks_alpha.png',
  structure_soviet_war_factory:     '/sprites/buildings/soviet/soviet_04_vehicle_factory_alpha.png',
  structure_soviet_tech_center:     '/sprites/buildings/soviet/soviet_05_tech_center_alpha.png',
  structure_soviet_comms:           '/sprites/buildings/soviet/soviet_06_comms_facility_alpha.png',
  structure_soviet_airfield:        '/sprites/buildings/soviet/soviet_07_airfield_alpha.png',
  structure_soviet_naval_yard:      '/sprites/buildings/soviet/soviet_08_naval_yard_alpha.png',
  structure_soviet_at_casemate:     '/sprites/buildings/soviet/soviet_09_at_bunker_casemate_alpha.png',
  structure_soviet_at_turret:       '/sprites/buildings/soviet/soviet_10_at_bunker_turret_alpha.png',
  structure_soviet_at_hulkdown:     '/sprites/buildings/soviet/soviet_11_at_bunker_hulkdown_alpha.png',

  // ── Defensive structures ────────────────────────────────────────────────
  // AT Guns
  structure_at_gun_01_wheeled_sandbags:     '/sprites/buildings/defensive/at_gun_01_wheeled_sandbags.png',
  structure_at_gun_02_zis2_concrete_ring:   '/sprites/buildings/defensive/at_gun_02_zis2_concrete_ring.png',
  // MG Posts
  structure_mg_post_01_m2_sandbags:         '/sprites/buildings/defensive/mg_post_01_m2_sandbags.png',
  structure_mg_post_02_pkm_earthwork:       '/sprites/buildings/defensive/mg_post_02_pkm_earthwork.png',
  // Watch Towers
  structure_tower_01_concrete_searchlight:  '/sprites/buildings/defensive/tower_01_concrete_searchlight.png',
  structure_tower_02_scaffold_sandbag:      '/sprites/buildings/defensive/tower_02_scaffold_sandbag.png',
  structure_tower_03_soviet_brutalist:      '/sprites/buildings/defensive/tower_03_soviet_brutalist.png',
  structure_tower_04_steel_lattice:         '/sprites/buildings/defensive/tower_04_steel_lattice.png',
  structure_tower_05_squat_twin_lights:     '/sprites/buildings/defensive/tower_05_squat_twin_lights.png',
  structure_tower_06_sniper_tower:          '/sprites/buildings/defensive/tower_06_sniper_tower.png',
  structure_tower_07_modular_prefab:        '/sprites/buildings/defensive/tower_07_modular_prefab.png',
  structure_tower_08_stone_repurposed:      '/sprites/buildings/defensive/tower_08_stone_repurposed.png',
  structure_tower_09_bunker_platform:       '/sprites/buildings/defensive/tower_09_bunker_platform.png',
  structure_tower_10_nato_sensor:           '/sprites/buildings/defensive/tower_10_nato_sensor.png',
  // Walls
  structure_wall_01_concrete:               '/sprites/buildings/defensive/wall_01_concrete.png',
  structure_wall_02_hesco:                  '/sprites/buildings/defensive/wall_02_hesco.png',
  structure_wall_03_sandbag:                '/sprites/buildings/defensive/wall_03_sandbag.png',
  structure_wall_04_corrugated_steel:       '/sprites/buildings/defensive/wall_04_corrugated_steel.png',
  structure_wall_05_dragon_teeth:           '/sprites/buildings/defensive/wall_05_dragon_teeth.png',
};

// ── Loader ────────────────────────────────────────────────────────────────

/**
 * Loads all sprites in SPRITE_MAP in parallel.
 * Returns Map<spriteId, HTMLImageElement>, or null if cancelToken was triggered.
 * Failed loads are skipped silently (StructureRenderer falls back to placeholder).
 *
 * @param {Object} extraMap     Additional spriteId → path entries to merge
 * @param {Object} cancelToken  { cancelled: false } — set .cancelled=true to abort
 */
export async function loadSprites(extraMap = {}, cancelToken = { cancelled: false }) {
  const combined = { ...SPRITE_MAP, ...extraMap };
  const entries  = Object.entries(combined);

  const results = await Promise.allSettled(
    entries.map(([id, path]) => loadImage(id, path))
  );

  // If React unmounted the component before we finished, bail out entirely.
  if (cancelToken.cancelled) {
    console.log('[SpriteLoader] Cancelled — component unmounted before load completed');
    return null;
  }

  const map = new Map();
  let loaded = 0, failed = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      map.set(result.value.id, result.value.img);
      loaded++;
    } else {
      failed++;
    }
  }

  console.log(`[SpriteLoader] ${loaded} loaded, ${failed} missing (placeholder fallback)`);
  return map;
}

function loadImage(id, path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve({ id, img });
    img.onerror = () => {
      console.warn(`[SpriteLoader] Missing: ${path}`);
      reject(new Error(`Failed: ${path}`));
    };
    img.src = path;
  });
}
