/**
 * Mission.jsx — v0.3
 * Scripted mission entry point. Wraps all simulation systems + MissionDirector.
 *
 * Flow:
 *   1. CinematicBriefing (fullscreen, blocks canvas)
 *   2. Game canvas mounts, systems initialise
 *   3. MissionDirector runs phase logic on sim tick
 *   4. MissionHUD shows current objective + phase label
 *   5. On mission_complete → victory/defeat overlay
 *   6. Victory: 4-second camera pan beat → results screen
 *
 * v0.3 changes:
 *  - Def maps imported from content/defs.js (single source of truth)
 *  - Spawn logic delegated to SpawnSystem
 *  - Particle + victory overlay rendering delegated to presentation/FxRenderer
 *  - Local inline spawnStructure / spawnUnit / missionSpawnFn removed
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Simulation
import { buildBrokenCrossingMap }  from '../simulation/world/BrokenCrossingMap.js';
import { EntityRegistry }          from '../simulation/entities/EntityRegistry.js';
import { SpawnSystem }             from '../simulation/entities/SpawnSystem.js';
import { Pathfinder }              from '../simulation/movement/Pathfinder.js';
import { CombatResolver }          from '../simulation/combat/CombatResolver.js';
import { GarrisonSystem }          from '../simulation/garrison/GarrisonSystem.js';
import { SubterrainSystem }        from '../simulation/subterrain/SubterrainSystem.js';
import { TrenchSystem }            from '../simulation/trench/TrenchSystem.js';
import { MissionDirector }         from '../simulation/mission/MissionDirector.js';
import { EnemyAIController }       from '../simulation/ai/EnemyAIController.js';
import { BuildSystem }             from '../simulation/construction/BuildSystem.js';
import { ResourceFieldSystem }     from '../simulation/world/ResourceFieldSystem.js';
import { OilDerrickSystem }        from '../simulation/world/OilDerrickSystem.js';
import { HarvesterSystem }         from '../simulation/world/HarvesterSystem.js';

// Presentation
import { IsometricCamera }         from '../presentation/IsometricCamera.js';
import { TileRenderer }            from '../presentation/TileRenderer.js';
import { UnitRenderer }            from '../presentation/UnitRenderer.js';
import { StructureRenderer }       from '../presentation/StructureRenderer.js';
import CinematicBriefing           from '../presentation/CinematicBriefing.jsx';
import { renderParticles, renderVictoryPanOverlay } from '../presentation/FxRenderer.js';

// Engine
import { SelectionController }     from '../engine/SelectionController.js';
import { EventBus }                from '../engine/EventBus.js';
import { GameLoop }                from '../engine/GameLoop.js';

// Content — single source of truth
import { UNIT_DEFS, WEAPON_DEFS, PROJ_DEFS, STRUCT_DEFS } from '../content/defs.js';

// Mission data
import brokenCrossingDef from '../content/missions/broken_crossing.json';

// ── Constants ────────────────────────────────────────────────────────────────
const VICTORY_PAN_DURATION = 4.0; // seconds

export default function Mission({ onExit }) {
  const canvasRef = useRef(null);
  const stateRef  = useRef(null);

  const [phase,      setPhase]      = useState('briefing'); // 'briefing' | 'playing' | 'complete'
  const [result,     setResult]     = useState(null);       // 'victory' | 'defeat'
  const [objective,  setObjective]  = useState('');
  const [phaseLabel, setPhaseLabel] = useState('');
  const [stats,      setStats]      = useState(null);       // { unitsLost, timeSeconds }
  const [credits,    setCredits]    = useState(1000);
  const [buildMode,  setBuildMode]  = useState(null);        // null | defId string
  const [unitStatus, setUnitStatus] = useState({ selected: 0, total: 0 });

  const handleBriefingComplete = useCallback(() => setPhase('playing'), []);

  useEffect(() => {
    if (phase !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');

    // ── Core systems ──────────────────────────────────────────────────────
    const eventBus  = new EventBus();
    const { grid, meta } = buildBrokenCrossingMap();
    const entities  = new EntityRegistry();
    const pathfinder = new Pathfinder(grid);
    const camera    = new IsometricCamera(canvas.width, canvas.height);
    camera.setBounds(grid.cols, grid.rows);
    camera.centerOn(meta.playerStartCol, meta.playerStartRow, grid.cols, grid.rows);

    const tileRenderer      = new TileRenderer(ctx, camera);
    const unitRenderer      = new UnitRenderer(ctx, camera);
    const structureRenderer = new StructureRenderer(ctx, camera);
    const selection         = new SelectionController(camera, entities, eventBus);
    const combat            = new CombatResolver(entities, WEAPON_DEFS, PROJ_DEFS, eventBus);
    const garrison          = new GarrisonSystem({ entities, grid, eventBus });
    const subterrain        = new SubterrainSystem({ entities, grid, eventBus });
    const trench            = new TrenchSystem({ entities, grid, eventBus });
    combat.setGarrisonSystem(garrison);

    const enemyAI = new EnemyAIController({
      entities, grid, pathfinder, eventBus,
      structDefs: STRUCT_DEFS, unitDefs: UNIT_DEFS, weaponDefs: WEAPON_DEFS,
      faction: 'enemy', garrisonSystem: garrison,
    });

    const buildSys = new BuildSystem({ entities, grid, eventBus, structDefs: STRUCT_DEFS });
    buildSys.credits = 1500;

    const spawner = new SpawnSystem({ entities, grid, unitDefs: UNIT_DEFS, structDefs: STRUCT_DEFS });

    // ── Economy systems ───────────────────────────────────────────────────
    const resourceFields = new ResourceFieldSystem({ eventBus, oreSources: meta.oreSources ?? [] });
    const oilDerrickSys  = new OilDerrickSystem({ eventBus, entities });
    const harvesterSys   = new HarvesterSystem({ eventBus, entities, resourceFields, pathfinder });

    eventBus.on('harvester_payout', ({ amount }) => {
      buildSys.credits = (buildSys.credits ?? 0) + amount;
      eventBus.emit('credits_changed', { credits: buildSys.credits });
    });
    eventBus.on('oil_income', ({ faction, amount }) => {
      if (faction === 'player') {
        buildSys.credits = (buildSys.credits ?? 0) + amount;
        eventBus.emit('credits_changed', { credits: buildSys.credits });
      }
    });

    // ── Spawn world ───────────────────────────────────────────────────────

    // Scripted structures (farmhouses, pill boxes, etc.)
    for (const ss of meta.scriptedStructures ?? []) {
      const s = spawner.spawnStructure(ss.defId, ss.faction, ss.col, ss.row, { scriptId: ss.scriptId });
      if (s && ss.garrisonCount > 0) {
        const garrisonSlots = STRUCT_DEFS[ss.defId]?.garrisonSlots ?? 4;
        for (let i = 0; i < ss.garrisonCount && i < garrisonSlots; i++) {
          const guard = spawner.spawnUnit('infantry_rifleman', ss.faction, ss.col + 1, ss.row + 1);
          if (guard) garrison.enter(guard, s);
        }
      }
    }

    // Player HQ + starting squad
    spawner.spawnStructure('command_hq', 'player', meta.playerStartCol, meta.playerStartRow);
    for (const u of meta.playerStartUnits ?? []) spawner.spawnUnit(u.defId, 'player', u.col, u.row);

    // Player economy buildings
    const playerRefinery = spawner.spawnStructure(
      'refinery', 'player',
      meta.playerRefineryCol ?? meta.playerStartCol - 3,
      meta.playerRefineryRow ?? meta.playerStartRow + 1,
    );
    const harvesterUnit = spawner.spawnUnit(
      'harvester_vehicle', 'player',
      meta.playerRefineryCol ?? meta.playerStartCol - 3,
      (meta.playerRefineryRow ?? meta.playerStartRow + 1) + 2,
    );
    if (harvesterUnit && playerRefinery) harvesterSys.register(harvesterUnit, playerRefinery);

    // Oil derricks
    for (const d of meta.oilDerricks ?? []) {
      const derrick = spawner.spawnStructure('oil_derrick', 'neutral', d.col, d.row);
      if (derrick) oilDerrickSys.register(derrick);
    }

    subterrain.registerEntrances(meta.subterrainEntrances ?? []);

    // ── MissionDirector ───────────────────────────────────────────────────
    const director = new MissionDirector({
      missionDef: brokenCrossingDef,
      entities, grid, eventBus,
      spawnFn: (order) => spawner.missionSpawnFn(order),
    });
    director.load();

    // ── Initial fog ───────────────────────────────────────────────────────
    for (const u  of entities.getPlayerUnits())      grid.revealFog(Math.round(u.col),  Math.round(u.row),  u.visionRadius ?? 6);
    for (const st of entities.getPlayerStructures()) grid.revealFog(Math.round(st.col), Math.round(st.row), 6);

    // ── Mission events → React state ──────────────────────────────────────
    let missionStartTime = Date.now();
    let playerUnitsLost  = 0;

    eventBus.on('mission_phase_advanced',   ({ label, objective: obj }) => { setPhaseLabel(label); setObjective(obj); });
    eventBus.on('mission_objective_updated', ({ text }) => setObjective(text));

    eventBus.on('entity_killed', ({ entityId }) => {
      const e = entities.get(entityId);
      if (e?.faction === 'player' && e?.entityType === 'UNIT') playerUnitsLost++;
    });

    eventBus.on('mission_complete', ({ result: r }) => {
      const elapsed = Math.round((Date.now() - missionStartTime) / 1000);
      setStats({ unitsLost: playerUnitsLost, timeSeconds: elapsed });
      setResult(r);
      if (r === 'victory') {
        stateRef.current && (stateRef.current.panActive = true);
        setTimeout(() => setPhase('complete'), VICTORY_PAN_DURATION * 1000);
      } else {
        setPhase('complete');
      }
    });

    // ── Visual FX events ──────────────────────────────────────────────────
    const particles = [];

    eventBus.on('weapon_fired', ({ weaponId, fromCol, fromRow, toCol, toRow, fromMount, mountStructureId, attackerId }) => {
      const from  = camera.tileToScreen(fromCol, fromRow);
      const to    = camera.tileToScreen(toCol,   toRow);
      const heavy = weaponId?.includes('cannon') || weaponId?.includes('rocket');
      particles.push({ type: 'tracer',
        x1: from.x, y1: from.y, x2: to.x, y2: to.y,
        life: heavy ? 0.22 : 0.10, maxLife: heavy ? 0.22 : 0.10,
        colour: heavy ? '#ffaa44' : 'rgba(255,255,220,0.9)',
        width: heavy ? 3 : 1.2 });
      if (fromMount && mountStructureId) {
        const attacker = entities.get(attackerId);
        structureRenderer.triggerMountFlash(mountStructureId, attacker?.garrisonMountIndex ?? 0);
      }
    });

    eventBus.on('explosion', ({ col, row }) => {
      const scr = camera.tileToScreen(col, row);
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 30 + Math.random() * 80;
        particles.push({ type: 'debris', x: scr.x, y: scr.y,
          vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 60,
          life: 0.5 + Math.random() * 0.4, maxLife: 0.9,
          colour: Math.random() > 0.5 ? '#ff8800' : '#aaaaaa',
          size: 2 + Math.random() * 4 });
      }
    });

    eventBus.on('entity_killed', ({ col, row, category }) => {
      const scr = camera.tileToScreen(col, row);
      if (category === 'infantry') {
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * Math.PI * 2;
          particles.push({ type: 'debris', x: scr.x, y: scr.y,
            vx: Math.cos(a) * (20 + Math.random() * 40),
            vy: Math.sin(a) * (20 + Math.random() * 40) - 30,
            life: 0.4, maxLife: 0.4, colour: '#993333', size: 2 });
        }
      }
    });

    // ── Victory pan state ─────────────────────────────────────────────────
    let panTimer = 0;
    const panFrom = { col: meta.playerStartCol, row: meta.playerStartRow };
    const panTo   = { col: 12, row: 8 }; // farmhouse area

    // ── Camera keyboard state ─────────────────────────────────────────────
    const keys = {};
    const onKeyDown = (e) => { keys[e.code] = true; if (e.code === 'Escape') onExit?.(); };
    const onKeyUp   = (e) => { keys[e.code] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);

    // ── Mouse interaction ─────────────────────────────────────────────────
    const onMouseDown = (e) => {
      const s = stateRef.current;
      if (!s) return;
      const tile = s.camera.screenToTile(e.clientX, e.clientY);
      if (!tile) return;

      if (e.button === 0) {
        s.selection.startBoxSelect(e.clientX, e.clientY);
        const clicked = s.entities.getAll().find(en => {
          if (!en.alive || en.entityType !== 'UNIT') return false;
          if (en.layer === 'garrisoned' || en.layer === 'subterrain') return false;
          const sc = s.camera.tileToScreen(en.col, en.row);
          return Math.hypot(sc.x - e.clientX, (sc.y + 14) - e.clientY) < 16;
        });
        clicked ? s.selection.selectSingle(clicked.id) : s.selection.clearSelection();
      }

      if (e.button === 2) {
        const selected = s.entities.getAll().filter(en => en.selected && en.faction === 'player');
        for (const unit of selected) {
          if (unit.layer === 'garrisoned') { garrison.exit(unit); continue; }
          const path = pathfinder.findPath(
            Math.round(unit.col), Math.round(unit.row), tile.col, tile.row,
          );
          if (path.length > 0) {
            if (unit.entrenched) trench._exitTrench(unit, true);
            unit.setPath(path);
          }
        }
      }
    };

    const onMouseMove   = (e) => { if (stateRef.current?.selection?.isDragging) stateRef.current.selection.updateBoxSelect(e.clientX, e.clientY); };
    const onMouseUp     = (e) => { if (e.button === 0) stateRef.current?.selection?.endBoxSelect(); };
    const onContextMenu = (e) => e.preventDefault();
    const onWheel       = (e) => {
      const s = stateRef.current;
      if (!s) return;
      s.camera.zoom = Math.max(0.5, Math.min(3, s.camera.zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
    };

    canvas.addEventListener('mousedown',   onMouseDown);
    canvas.addEventListener('mousemove',   onMouseMove);
    canvas.addEventListener('mouseup',     onMouseUp);
    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('wheel',       onWheel, { passive: true });

    // ── State ref ─────────────────────────────────────────────────────────
    stateRef.current = {
      ctx, canvas, eventBus, grid, meta, entities, pathfinder,
      camera, tileRenderer, unitRenderer, structureRenderer,
      selection, combat, garrison, subterrain, trench,
      director, enemyAI, buildSys, spawner,
      resourceFields, oilDerrickSys, harvesterSys,
      particles, panActive: false, panTimer: 0,
      pendingMoves: [], pendingGarrison: [], pendingExits: [],
    };

    // ── Game loop ─────────────────────────────────────────────────────────
    const loop = new GameLoop((dt) => {
      const s = stateRef.current;
      if (!s) return;
      const { ctx: c, camera: cam, grid: g, entities: ents } = s;

      // ── Camera ────────────────────────────────────────────────────────
      if (s.panActive) {
        s.panTimer = Math.min(VICTORY_PAN_DURATION, s.panTimer + dt);
        const t     = s.panTimer / VICTORY_PAN_DURATION;
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        cam.centerOn(
          panFrom.col + (panTo.col - panFrom.col) * eased,
          panFrom.row + (panTo.row - panFrom.row) * eased,
          g.cols, g.rows,
        );
      } else {
        const PAN = 6 * cam.zoom;
        if (keys['ArrowLeft']  || keys['KeyA']) cam.offsetX += PAN;
        if (keys['ArrowRight'] || keys['KeyD']) cam.offsetX -= PAN;
        if (keys['ArrowUp']    || keys['KeyW']) cam.offsetY += PAN;
        if (keys['ArrowDown']  || keys['KeyS']) cam.offsetY -= PAN;
      }

      // ── Sim tick ──────────────────────────────────────────────────────
      if (!s.director.isComplete() || s.panActive) {
        for (const unit of ents.getUnits()) {
          if (!unit.alive || unit.layer === 'garrisoned' || unit.layer === 'subterrain') continue;
          unit.tickMovement(dt, g);
          unit.tickWeaponCooldowns(dt);
        }

        g.resetFogVisible();
        for (const u  of ents.getPlayerUnits())      { if (u.layer !== 'garrisoned') g.revealFog(Math.round(u.col),  Math.round(u.row),  u.visionRadius ?? 6); }
        for (const st of ents.getPlayerStructures()) g.revealFog(Math.round(st.col), Math.round(st.row), 6);

        s.combat.tick(dt);
        s.subterrain.tick(dt);
        s.trench.tick(dt);

        // Simple enemy AI — fallback patrol + attack
        for (const enemy of ents.getEnemyUnits()) {
          if (!enemy.alive || enemy.layer === 'garrisoned') continue;
          if (!enemy.attackTarget) {
            const nearest = ents.getPlayerUnits()
              .filter(u => u.alive && u.layer !== 'garrisoned')
              .sort((a, b) => (
                ((a.col - enemy.col)**2 + (a.row - enemy.row)**2) -
                ((b.col - enemy.col)**2 + (b.row - enemy.row)**2)
              ))[0];
            if (nearest) {
              const dist = Math.hypot(nearest.col - enemy.col, nearest.row - enemy.row);
              if (dist < 8) enemy.setAttackTarget(nearest.id);
              else if (Math.random() < 0.02) {
                const path = pathfinder.findPath(
                  Math.round(enemy.col), Math.round(enemy.row),
                  Math.round(nearest.col), Math.round(nearest.row),
                );
                if (path.length > 0) enemy.setPath(path);
              }
            }
          }
        }

        s.director.tick(dt);
        s.resourceFields.tick(dt);
        s.oilDerrickSys.tick(dt);
        s.harvesterSys.tick(dt);
      }

      // ── Particle tick ─────────────────────────────────────────────────
      for (const p of s.particles) p.life -= dt;
      s.particles.splice(0, s.particles.length, ...s.particles.filter(p => p.life > 0));

      // ── Render ────────────────────────────────────────────────────────
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.fillStyle = '#060a06';
      c.fillRect(0, 0, canvas.width, canvas.height);

      const visibleEntrances = s.subterrain.getAllEntrances().filter(e =>
        !meta.hiddenEntrances?.includes(e.id) || s.director.isEntranceRevealed(e.id),
      );

      tileRenderer.tick(dt);
      tileRenderer.render(g, visibleEntrances, s.resourceFields?.getFields());

      structureRenderer.tick(dt);
      structureRenderer.render(ents.getAll());

      unitRenderer.tick(dt);
      unitRenderer.render(ents.getAll(), s.subterrain);

      renderParticles(c, s.particles);

      if (s.panActive) {
        renderVictoryPanOverlay(c, canvas, s.panTimer, {
          headline: 'CROSSING SECURED',
          subline:  'IRON FRONT — OPERATION VERDANT',
          duration: VICTORY_PAN_DURATION,
        });
      }
    });

    loop.start();

    return () => {
      loop.stop();
      window.removeEventListener('keydown',     onKeyDown);
      window.removeEventListener('keyup',       onKeyUp);
      canvas.removeEventListener('mousedown',   onMouseDown);
      canvas.removeEventListener('mousemove',   onMouseMove);
      canvas.removeEventListener('mouseup',     onMouseUp);
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('wheel',       onWheel);
      stateRef.current = null;
    };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}>

      {phase === 'briefing' && (
        <CinematicBriefing
          slides={brokenCrossingDef.briefing.slides}
          onComplete={handleBriefingComplete}
        />
      )}

      {phase !== 'briefing' && (
        <canvas ref={canvasRef} style={{ display: 'block', width: '100vw', height: '100vh' }} />
      )}

      {phase === 'playing' && (
        <>
          <MissionHUD
            objective={objective}
            phaseLabel={phaseLabel}
            onExit={onExit}
            unitStatus={unitStatus}
          />
          <BuildPanel
            credits={credits}
            buildMode={buildMode}
            onSelect={(defId) => setBuildMode(prev => prev === defId ? null : defId)}
          />
        </>
      )}

      {phase === 'complete' && result && (
        <MissionCompleteOverlay
          result={result}
          stats={stats}
          onRetry={() => window.location.reload()}
          onExit={onExit}
        />
      )}
    </div>
  );
}

// ── MissionHUD ────────────────────────────────────────────────────────────────

function MissionHUD({ objective, phaseLabel, onExit, unitStatus = { selected: 0, total: 0 } }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      pointerEvents: 'none', zIndex: 100, fontFamily: 'monospace',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 20px' }}>
        <div style={{ background: 'rgba(0,0,0,0.72)', border: '1px solid rgba(180,150,60,0.3)', padding: '10px 16px', maxWidth: 460 }}>
          {phaseLabel && (
            <div style={{ fontSize: 8, letterSpacing: 4, color: '#c9a84c', marginBottom: 4 }}>◆ {phaseLabel.toUpperCase()}</div>
          )}
          {objective && (
            <div style={{ fontSize: 12, color: '#d4c9a0', lineHeight: 1.5 }}>{objective}</div>
          )}
          {!objective && !phaseLabel && (
            <div style={{ fontSize: 10, color: '#444' }}>Awaiting orders...</div>
          )}
        </div>

        <div style={{
          pointerEvents: 'all', background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '6px 12px', fontSize: 9, letterSpacing: 2, color: '#444', cursor: 'pointer',
        }} onClick={onExit}>
          ESC — ABORT
        </div>
      </div>

      <div style={{
        position: 'fixed', bottom: 14, left: '50%', transform: 'translateX(-50%)',
        fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.12)',
        background: 'rgba(0,0,0,0.4)', padding: '5px 14px', pointerEvents: 'none',
      }}>
        WASD — PAN &nbsp;|&nbsp; SCROLL — ZOOM &nbsp;|&nbsp; LEFT CLICK — SELECT &nbsp;|&nbsp; RIGHT CLICK — MOVE/ATTACK
      </div>
    </div>
  );
}


// ── BuildPanel ────────────────────────────────────────────────────────────────
// Bottom-right build palette — shows available structures and current credits.

const BUILD_ITEMS = [
  { defId: 'barracks',    label: 'BARRACKS',    cost: 300, key: 'B' },
  { defId: 'power_plant', label: 'POWER',       cost: 200, key: 'P' },
  { defId: 'war_factory', label: 'FACTORY',     cost: 500, key: 'F' },
  { defId: 'refinery',    label: 'REFINERY',    cost: 400, key: 'R' },
];

function BuildPanel({ credits, buildMode, onSelect }) {
  return (
    <div style={{
      position: 'fixed', bottom: 12, right: 12,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
      fontFamily: 'monospace', zIndex: 100,
      pointerEvents: 'auto',
    }}>
      {/* Credits counter */}
      <div style={{
        fontSize: 11, letterSpacing: 3, color: '#c9a84c',
        background: 'rgba(0,0,0,0.75)',
        border: '1px solid rgba(201,168,76,0.3)',
        padding: '4px 10px', borderRadius: 2,
      }}>
        ₢ {credits.toLocaleString()}
      </div>

      {/* Build buttons */}
      <div style={{ display: 'flex', gap: 4 }}>
        {BUILD_ITEMS.map(({ defId, label, cost, key }) => {
          const active    = buildMode === defId;
          const canAfford = credits >= cost;
          return (
            <button
              key={defId}
              onClick={() => canAfford && onSelect(defId)}
              title={`${label} — ₢${cost} [${key}]`}
              style={{
                padding: '6px 10px',
                background:   active ? 'rgba(74,124,63,0.6)' : 'rgba(0,0,0,0.75)',
                border:       `1px solid ${active ? '#4a7c3f' : canAfford ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
                color:        canAfford ? (active ? '#fff' : '#ccc') : '#444',
                fontSize: 9, letterSpacing: 2,
                cursor:       canAfford ? 'pointer' : 'not-allowed',
                fontFamily:   'monospace',
                borderRadius: 2,
                transition:   'all 0.15s',
              }}
            >
              <div>{label}</div>
              <div style={{ fontSize: 8, color: active ? '#aaa' : '#555', marginTop: 2 }}>₢{cost}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── MissionCompleteOverlay ────────────────────────────────────────────────────

function MissionCompleteOverlay({ result, stats, onRetry, onExit }) {
  const isVictory = result === 'victory';
  const mins      = Math.floor((stats?.timeSeconds ?? 0) / 60);
  const secs      = (stats?.timeSeconds ?? 0) % 60;
  const timeStr   = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: isVictory
        ? 'radial-gradient(ellipse at center, #0a1f0a 0%, #030703 100%)'
        : 'radial-gradient(ellipse at center, #1a0505 0%, #030303 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'monospace', animation: 'fadeIn 0.6s ease', zIndex: 200,
    }}>
      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>

      <div style={{
        textAlign: 'center', padding: '56px 72px',
        background: 'rgba(0,0,0,0.6)',
        border: `1px solid ${isVictory ? 'rgba(180,150,60,0.4)' : 'rgba(180,50,50,0.4)'}`,
        borderRadius: 4,
        boxShadow: `0 0 80px ${isVictory ? 'rgba(180,150,60,0.1)' : 'rgba(180,50,50,0.1)'}`,
      }}>
        <div style={{ fontSize: 11, letterSpacing: 8, color: isVictory ? '#c9a84c' : '#cc4444', marginBottom: 16 }}>
          {isVictory ? '— MISSION COMPLETE —' : '— MISSION FAILED —'}
        </div>
        <div style={{
          fontSize: 52, fontWeight: 900, letterSpacing: 6, color: '#fff',
          textShadow: `0 0 40px ${isVictory ? '#c9a84c' : '#cc4444'}66`, marginBottom: 8,
        }}>
          {isVictory ? 'CROSSING SECURED' : 'SQUAD ELIMINATED'}
        </div>
        <div style={{ fontSize: 13, letterSpacing: 4, color: '#555', marginBottom: 40 }}>
          {isVictory ? 'BROKEN CROSSING — IRON FRONT OPERATION VERDANT' : 'BROKEN CROSSING — OBJECTIVES NOT MET'}
        </div>

        {stats && (
          <div style={{ display: 'flex', gap: 48, justifyContent: 'center', marginBottom: 48, paddingBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {[{ label: 'TIME', value: timeStr }, { label: 'UNITS LOST', value: stats.unitsLost }].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, letterSpacing: 4, color: '#555', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: isVictory ? '#c9a84c' : '#cc4444' }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button onClick={onRetry} style={btnStyle(isVictory ? '#4a7c3f' : '#7c3f3f')}
            onMouseEnter={e => e.target.style.opacity = '0.8'}
            onMouseLeave={e => e.target.style.opacity = '1'}>
            {isVictory ? 'PLAY AGAIN' : 'RETRY MISSION'}
          </button>
          <button onClick={onExit} style={btnStyle('#333')}
            onMouseEnter={e => e.target.style.opacity = '0.8'}
            onMouseLeave={e => e.target.style.opacity = '1'}>
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
}

function btnStyle(bg) {
  return {
    padding: '12px 36px', background: bg,
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#ccc', fontSize: 12, letterSpacing: 4,
    cursor: 'pointer', fontFamily: 'monospace', transition: 'opacity 0.15s',
  };
}
