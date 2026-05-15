/**
 * defs.js — Single source of truth for all content definition maps.
 *
 * Import from here in Game.jsx, Mission.jsx, and any future page.
 * Never duplicate these maps in page files.
 */

// ── Units ────────────────────────────────────────────────────────────────────
import riflemanDef      from './units/infantry_rifleman.json';
import engineerDef      from './units/infantry_engineer.json';
import grenadierDef     from './units/infantry_grenadier.json';
import vietcongDef      from './units/infantry_vietcong.json';
import tankDef          from './units/tank_medium.json';
import m48Def           from './units/vehicle_m48_tank.json';
import m113Def          from './units/vehicle_m113.json';
import jeepDef          from './units/vehicle_jeep.json';
import heliDef          from './units/helicopter_attack.json';
import hueyDef          from './units/air_huey.json';
import phantomDef       from './units/air_f4_phantom.json';
import b52Def           from './units/air_b52.json';
import patrolBoatDef    from './units/naval_patrol_boat.json';
import harvesterDef     from './units/harvester_vehicle.json';

// ── Weapons ──────────────────────────────────────────────────────────────────
import rifleWeap        from './weapons/rifle_m16.json';
import ak47Weap         from './weapons/rifle_ak47.json';
import cannonWeap       from './weapons/cannon_90mm.json';
import grenadeLauncher  from './weapons/grenade_launcher_m79.json';
import m60mg            from './weapons/m60_machinegun.json';
import m60DoorGun       from './weapons/m60_door_gun.json';
import m2Browning       from './weapons/m2_browning.json';
import rocketPod        from './weapons/rocket_pod_2_75.json';
import napalmBomb       from './weapons/napalm_bomb.json';
import aim7Sparrow      from './weapons/aim7_sparrow.json';
import mk82Carpet       from './weapons/mk82_bomb_carpet.json';

// ── Projectiles ──────────────────────────────────────────────────────────────
import proj90mm         from './projectiles/proj_90mm_shell.json';
import proj556mm        from './projectiles/proj_556mm.json';

// ── Structures ───────────────────────────────────────────────────────────────
import hqDef            from './structures/command_hq.json';
import barracksDef      from './structures/barracks.json';
import powerDef         from './structures/power_plant.json';
import factoryDef       from './structures/war_factory.json';
import pillBoxDef       from './structures/pill_box.json';
import farmhouseDef     from './structures/farmhouse.json';
import refineryDef      from './structures/refinery.json';
import oilDerrickDef    from './structures/oil_derrick.json';
import helipadDef       from './structures/helipad.json';
import airfieldDef      from './structures/airfield.json';
import navalYardDef     from './structures/naval_yard.json';
import radarDef         from './structures/radar.json';

// ── Maps ─────────────────────────────────────────────────────────────────────

export const UNIT_DEFS = {
  infantry_rifleman:  riflemanDef,
  infantry_engineer:  engineerDef,
  infantry_grenadier: grenadierDef,
  infantry_vietcong:  vietcongDef,
  tank_medium:        tankDef,
  vehicle_m48_tank:   m48Def,
  vehicle_m113:       m113Def,
  vehicle_jeep:       jeepDef,
  helicopter_attack:  heliDef,
  air_huey:           hueyDef,
  air_f4_phantom:     phantomDef,
  air_b52:            b52Def,
  naval_patrol_boat:  patrolBoatDef,
  harvester_vehicle:  harvesterDef,
};

export const WEAPON_DEFS = {
  rifle_m16:            rifleWeap,
  rifle_ak47:           ak47Weap,
  cannon_90mm:          cannonWeap,
  grenade_launcher_m79: grenadeLauncher,
  m60_machinegun:       m60mg,
  m60_door_gun:         m60DoorGun,
  m2_browning:          m2Browning,
  rocket_pod_2_75:      rocketPod,
  napalm_bomb:          napalmBomb,
  aim7_sparrow:         aim7Sparrow,
  mk82_bomb_carpet:     mk82Carpet,
};

export const PROJ_DEFS = {
  proj_90mm_shell: proj90mm,
  proj_556mm:      proj556mm,
};

export const STRUCT_DEFS = {
  command_hq:  hqDef,
  barracks:    barracksDef,
  power_plant: powerDef,
  war_factory: factoryDef,
  pill_box:    pillBoxDef,
  farmhouse:   farmhouseDef,
  refinery:    refineryDef,
  oil_derrick: oilDerrickDef,
  helipad:     helipadDef,
  airfield:    airfieldDef,
  naval_yard:  navalYardDef,
  radar:       radarDef,
};
