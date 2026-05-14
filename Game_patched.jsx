/**
 * Game.jsx — v0.3
 * Wires ALL systems: tile grid, units, structures, combat,
 * build system, enemy AI, particle FX, HUD.
 *
 * v0.3 changes:
 *  - Def maps imported from content/defs.js (single source of truth)
 *  - Spawn logic delegated to SpawnSystem
 *  - Particle rendering delegated to FxRenderer
 *  - Local UnitEntity / StructureEntity imports removed (used via SpawnSystem only)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Simulation
import { generateJungleMap }     from '../simulation/world/MapGenerator.js';
import { EntityRegistry }        from '../simulation/entities/EntityRegistry.js';
import { SpawnSystem }           from '../simulation/entities/SpawnSystem.js';
import { Pathfinder }            from '../simulation/movement/Pathfinder.js';
import { CombatResolver }        from '../simulation/combat/CombatResolver.js';
import { BuildSystem }           from '../simulation/construction/BuildSystem.js';
import { EnemyAIController }     from '../simulation/ai/EnemyAIController.js';
import { GarrisonSystem }        from '../simulation/garrison/GarrisonSystem.js';
import { SubterrainSystem }      from '../simulation/subterrain/SubterrainSystem.js';
import { TrenchSystem }          from '../simulation/trench/TrenchSystem.js';
import { AirCombatSystem }       from '../simulation/combat/AirCombatSystem.js';

// Presentation
import { IsometricCamera }       from '../presentation/IsometricCamera.js';
import { TileRenderer }          from '../presentation/TileRenderer.js';
import { UnitRenderer }          from '../presentation/UnitRenderer.js';
import { StructureRenderer }     from '../presentation/StructureRenderer.js';
import { loadSprites }          from '../presentation/SpriteLoader.js';
import { renderParticles }       from '../presentation/FxRenderer.js';

// Engine
import { SelectionController }   from '../engine/SelectionController.js';
import { EventBus }              from '../engine/EventBus.js';
import { GameLoop }              from '../engine/GameLoop.js';

// Content — single source of truth
import { UNIT_DEFS, WEAPON_DEFS, PROJ_DEFS, STRUCT_DEFS } from '../content/defs.js';
import { UnitEntity } from '../simulation/entities/UnitEntity.js';

// ── Resource income rate ──────────────────────────────────────────────────────
const CREDIT_GAIN_PER_SEC = 8;

export default function Game({ onExit }) {
  const canvasRef  = useRef(null);
  const stateRef   = useRef(null);
  const [hud, setHud] = useState({
    selected: [], credits: 1500, power: 0, powerUsed: 0,
    selectedStructure: null, fps: 0,
    placingDefId: null, placingValid: false,
    notification: null,
  });
  const hudRef = useRef(hud);
  hudRef.current = hud;

  const updateHud = useCallback((patch) => {
    setHud(prev => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');

    let cleanupFn = null;

    (async () => {
      // ── Load sprites ────────────────────────────────────────────────────
      const sprites = await loadSprites();

    // ── Systems ──────────────────────────────────────────────────────────

    const eventBus   = new EventBus();
    const { grid, meta } = generateJungleMap(42);
    const entities   = new EntityRegistry();
    const pathfinder = new Pathfinder(grid);
    const camera     = new IsometricCamera(canvas.width, canvas.height);
    camera.setBounds(grid.cols, grid.rows);

    const tileRenderer      = new TileRenderer(ctx, camera);
    const unitRenderer      = new UnitRenderer(ctx, camera);
    const structureRenderer = new StructureRenderer(ctx, camera, sprites);
    const selection         = new SelectionController(camera, entities, eventBus);
    const combat            = new CombatResolver(entities, WEAPON_DEFS, PROJ_DEFS, eventBus);
    const garrison          = new GarrisonSystem({ entities, grid, eventBus });
    const subterrain        = new SubterrainSystem({ entities, grid, eventBus });
    combat.setGarrisonSystem(garrison);
    const trench            = new TrenchSystem({ entities, grid, eventBus });
    const buildSystem       = new BuildSystem({ entities, grid, eventBus, structDefs: STRUCT_DEFS });
    const airCombat         = new AirCombatSystem(entities, eventBus);
    const spawner           = new SpawnSystem({ entities, grid, unitDefs: UNIT_DEFS, structDefs: STRUCT_DEFS });
    const enemyAI           = new EnemyAIController({
      entities, grid, pathfinder, eventBus,
      structDefs: STRUCT_DEFS, unitDefs: UNIT_DEFS, faction: 'enemy',
    });

    // ── Spawn player assets ───────────────────────────────────────────────

    // Player base
    spawner.spawnStructure('command_hq',  'player', meta.playerStartCol,     meta.playerStartRow);
    spawner.spawnStructure('power_plant', 'player', meta.playerStartCol + 4, meta.playerStartRow);
    spawner.spawnStructure('barracks',    'player', meta.playerStartCol - 4, meta.playerStartRow - 2);

    // Starting squad
    spawner.spawnUnit('infantry_rifleman', 'player', meta.playerStartCol - 2, meta.playerStartRow - 4);
    spawner.spawnUnit('infantry_rifleman', 'player', meta.playerStartCol,     meta.playerStartRow - 4);
    spawner.spawnUnit('infantry_rifleman', 'player', meta.playerStartCol + 2, meta.playerStartRow - 4);
    spawner.spawnUnit('tank_medium',       'player', meta.playerStartCol + 4, meta.playerStartRow - 4);

    // Enemy base
    spawner.spawnStructure('command_hq',  'enemy', meta.enemyStartCol,     meta.enemyStartRow);
    spawner.spawnUnit('infantry_rifleman','enemy', meta.enemyStartCol - 1, meta.enemyStartRow + 2);
    spawner.spawnUnit('infantry_rifleman','enemy', meta.enemyStartCol + 1, meta.enemyStartRow + 2);
    spawner.spawnUnit('infantry_rifleman','enemy', meta.enemyStartCol,     meta.enemyStartRow + 3);
    spawner.spawnUnit('tank_medium',      'enemy', meta.enemyStartCol + 2, meta.enemyStartRow + 3);

    buildSystem.recalcPower();

    for (const pb of meta.pillBoxes ?? []) {
      spawner.spawnStructure('pill_box', 'player', pb.col, pb.row);
    }

    subterrain.registerEntrances(meta.subterrainEntrances ?? []);

    for (const u of entities.getPlayerUnits())      grid.revealFog(Math.round(u.col), Math.round(u.row), u.visionRadius ?? 6);
    for (const s of entities.getPlayerStructures()) grid.revealFog(Math.round(s.col), Math.round(s.row), 6);

    updateHud({ credits: buildSystem.credits, power: buildSystem.power, powerUsed: buildSystem.powerUsed });

    // ── Event reactions ───────────────────────────────────────────────────

    const particles = [];

    eventBus.on('explosion', ({ col, row, projDef }) => {
      const scr    = camera.tileToScreen(col, row);
      const size   = projDef?.explosionSize ?? 'medium';
      const count  = size === 'large' ? 40 : 22;
      const radius = size === 'large' ? 120 : 70;

      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 40 + Math.random() * radius;
        particles.push({ type: 'debris', x: scr.x, y: scr.y,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s - 100,
          life: 0.4 + Math.random() * 0.5, maxLife: 0.9,
          r: 3 + Math.random() * 7,
          colour: Math.random() > 0.4 ? '#ff6600' : '#ffcc00' });
      }
      for (let i = 0; i < 5; i++) {
        particles.push({ type: 'smoke', x: scr.x + (Math.random()-0.5)*20, y: scr.y,
          vx: (Math.random()-0.5)*15, vy: -25 - Math.random()*35,
          life: 1.8 + Math.random()*1.5, maxLife: 3.3,
          r: 10 + Math.random()*16, grow: 12, colour: '#555' });
      }
      particles.push({ type: 'ring', x: scr.x, y: scr.y * 1.05,
        r: 4, maxR: size === 'large' ? 60 : 36,
        life: 0.3, maxLife: 0.3, colour: 'rgba(255,200,100,' });

      grid.addOverlay(col, row, 'crater');
    });

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
        const mountIdx = attacker?.garrisonMountIndex ?? 0;
        structureRenderer.triggerMountFlash(mountStructureId, mountIdx);
      }
    });

    eventBus.on('flare_deployed', ({ unitId, col, row }) => {
      const scr = camera.tileToScreen(col, row);
      // Bright white-gold flare burst
      for (let i = 0; i < 18; i++) {
        const a = Math.random() * Math.PI * 2;
        const s2 = 60 + Math.random() * 120;
        particles.push({ type: 'debris', x: scr.x, y: scr.y,
          vx: Math.cos(a) * s2, vy: Math.sin(a) * s2 - 60,
          life: 0.8 + Math.random() * 1.2, maxLife: 2.0,
          r: 2 + Math.random() * 4,
          colour: Math.random() > 0.4 ? '#fff8a0' : '#ffcc44' });
      }
      // Sustained glow smoke trail
      for (let i = 0; i < 3; i++) {
        particles.push({ type: 'smoke', x: scr.x + (Math.random()-0.5)*10, y: scr.y,
          vx: (Math.random()-0.5)*8, vy: -18 - Math.random()*20,
          life: 2.5 + Math.random(), maxLife: 3.5,
          r: 6 + Math.random()*8, grow: 6, colour: '#ffffaa' });
      }
    });

    eventBus.on('entity_killed', ({ col, row, gore, category }) => {
      const scr = camera.tileToScreen(col, row);
      if (gore) {
        for (let i = 0; i < 10; i++) {
          const a = Math.random() * Math.PI * 2;
          particles.push({ type: 'debris', x: scr.x, y: scr.y,
            vx: Math.cos(a)*(20+Math.random()*60), vy: Math.sin(a)*(20+Math.random()*60)-50,
            life: 0.4+Math.random()*0.3, maxLife: 0.7,
            r: 1.5+Math.random()*3, colour: '#8B0000' });
        }
      }
      particles.push({ type: 'flash', x: scr.x, y: scr.y,
        r: category === 'vehicle' ? 30 : 14,
        life: 0.1, maxLife: 0.1, colour: '#fff' });
    });

    eventBus.on('selection_changed', ({ selected }) => {
      const selEntities = selected.map(id => entities.get(id)).filter(Boolean);
      const selStruct   = selEntities.find(e => e.entityType === 'STRUCTURE') ?? null;
      updateHud({ selected: selEntities, selectedStructure: selStruct });
    });

    eventBus.on('credits_changed', ({ credits }) => updateHud({ credits }));
    eventBus.on('power_changed',   ({ power, powerUsed }) => updateHud({ power, powerUsed }));
    eventBus.on('unit_production_complete', ({ defId }) => showNotification(`✅ ${UNIT_DEFS[defId]?.displayName ?? defId} ready`));
    eventBus.on('ai_attack_wave', ({ unitCount }) => showNotification(`⚠️ Enemy attack! ${unitCount} units inbound`));

    function showNotification(msg) {
      updateHud({ notification: msg });
      setTimeout(() => updateHud({ notification: null }), 3500);
    }

    // ── Win/loss ──────────────────────────────────────────────────────────

    let gameOver = false;
    function checkWinLoss() {
      if (gameOver) return;
      const playerHQs = entities.getPlayerStructures().filter(s => s.defId === 'command_hq' && s.alive);
      const enemyHQs  = entities.getEnemyStructures().filter(s => s.defId === 'command_hq' && s.alive);
      if (playerHQs.length === 0) { gameOver = true; showNotification('💀 DEFEAT — HQ destroyed'); }
      if (enemyHQs.length === 0)  { gameOver = true; showNotification('🏆 VICTORY — Enemy HQ destroyed'); }
    }

    // ── State ref ─────────────────────────────────────────────────────────

    stateRef.current = {
      ctx, canvas, eventBus, grid, meta, entities,
      pathfinder, camera, tileRenderer, unitRenderer, structureRenderer,
      selection, combat, buildSystem, enemyAI, spawner,
      garrison, subterrain, trench, airCombat,
      particles, pendingMoves: [],
      pendingGarrison: [],
      pendingExits:    [],
    };

    // ── Game Loop ─────────────────────────────────────────────────────────

    let creditAccum = 0;

    const loop = new GameLoop({
      onSimTick: (dt) => {
        const s = stateRef.current;
        if (!s || gameOver) return;

        s.grid.resetFogVisible();
        for (const u  of s.entities.getPlayerUnits())      s.grid.revealFog(Math.round(u.col),  Math.round(u.row),  u.visionRadius ?? 6);
        for (const st of s.entities.getPlayerStructures()) s.grid.revealFog(Math.round(st.col), Math.round(st.row), 5);

        creditAccum += dt;
        if (creditAccum >= 1) { s.buildSystem.addCredits(CREDIT_GAIN_PER_SEC); creditAccum -= 1; }

        for (const { unitId, col, row } of s.pendingMoves) {
          const unit = s.entities.get(unitId);
          if (!unit?.alive) continue;
          const path = s.pathfinder.findPath(Math.round(unit.col), Math.round(unit.row), col, row);
          if (path.length > 0) unit.setPath(path);
        }
        s.pendingMoves = [];

        for (const unit of s.entities.getUnits()) {
          if (!unit.alive) continue;
          unit.tickMovement(dt, s.grid);
          unit.tickWeaponCooldowns(dt);
          if (unit.state !== 'moving' && !unit.attackTarget && unit.weapons?.length > 0) {
            const weapDef = WEAPON_DEFS[unit.weapons[0]];
            if (weapDef) {
              // Air units prefer air targets (dogfighting); ground units target ground
              let nearest;
              if (unit.isAir) {
                nearest = s.entities.getNearestEnemyAir(unit.col, unit.row, unit.faction)
                       ?? s.entities.getNearestEnemy(unit.col, unit.row, unit.faction);
                if (nearest?.isAir && nearest !== unit) {
                  s.airCombat.engageDogfight(unit, nearest);
                }
              } else {
                nearest = s.entities.getNearestEnemy(unit.col, unit.row, unit.faction);
              }
              if (nearest && unit.distanceTo(nearest) <= weapDef.range) unit.setAttackTarget(nearest.id);
            }
          }
          if (unit.attackTarget) {
            const tgt = s.entities.get(unit.attackTarget);
            if (!tgt?.alive) unit.clearAttackTarget();
          }
        }

        s.combat.tick(dt);
        s.airCombat.tick(dt);

        for (const { unitId, structureId } of s.pendingGarrison) {
          const unit   = s.entities.get(unitId);
          const struct = s.entities.get(structureId);
          if (unit && struct) s.garrison.enter(unit, struct);
        }
        s.pendingGarrison = [];

        for (const unitId of s.pendingExits) {
          const unit = s.entities.get(unitId);
          if (unit?.layer === 'garrisoned') s.garrison.exit(unit);
        }
        s.pendingExits = [];

        s.subterrain.tick(dt);
        s.trench.tick(dt);

        const ready = s.buildSystem.tick(dt);
        for (const { structureId, defId } of ready) {
          const st  = s.entities.get(structureId);
          const def = UNIT_DEFS[defId];
          if (!st || !def) continue;
          const pos = findWalkableNear(st.col, st.row, 4);
          if (pos) {
            const unit = new UnitEntity(def, 'player');
            unit.col = pos.col; unit.row = pos.row;
            s.grid.addOccupant(pos.col, pos.row, unit.id);
            s.entities.add(unit);
          }
        }

        s.enemyAI.tick(dt);
        s.entities.purgeDeadEntities();
        checkWinLoss();
        s.camera.update(dt);
      },

      onRender: () => {
        const s = stateRef.current;
        if (!s) return;
        const { ctx, canvas, camera, grid, entities,
                tileRenderer, unitRenderer, structureRenderer, particles } = s;

        ctx.fillStyle = '#060e06';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        tileRenderer.tick(1/60);
        tileRenderer.render(grid, s.subterrain.getAllEntrances());
        if (window.__rts_debug) tileRenderer.renderDebugGrid(grid);

        const preview = s.buildSystem.getPlacementPreview();
        structureRenderer.tick(1/60);
        structureRenderer.render(entities.getAll(), preview);

        unitRenderer.tick(1/60);
        unitRenderer.render(entities.getAll(), s.subterrain);

        renderParticles(ctx, particles, 1/60);

        const dragRect = s.selection.getDragRect();
        if (dragRect) {
          ctx.save();
          ctx.strokeStyle = '#00ff88';
          ctx.lineWidth   = 1;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(dragRect.x1, dragRect.y1, dragRect.x2 - dragRect.x1, dragRect.y2 - dragRect.y1);
          ctx.fillStyle = 'rgba(0,255,136,0.05)';
          ctx.fillRect(dragRect.x1, dragRect.y1, dragRect.x2 - dragRect.x1, dragRect.y2 - dragRect.y1);
          ctx.restore();
        }
      },
    });

    loop.start();

    // ── Input ─────────────────────────────────────────────────────────────

    const onMouseDown = (e) => {
      const s = stateRef.current;
      if (!s) return;
      if (e.button === 0) {
        if (s.buildSystem.placingDefId) {
          s.buildSystem.confirmPlacement('player');
          s.buildSystem.recalcPower();
          updateHud({ placingDefId: null });
          return;
        }
        s.selection.onMouseDown(e.clientX, e.clientY, 0, { shift: e.shiftKey, ctrl: e.ctrlKey });
      }
    };

    const onMouseMove = (e) => {
      const s = stateRef.current;
      if (!s) return;
      s.selection.onMouseMove(e.clientX, e.clientY);
      s.camera.setMousePosition(e.clientX, e.clientY);
      if (e.buttons === 4) s.camera.pan(-e.movementX, -e.movementY);
      if (s.buildSystem.placingDefId) {
        const tile = s.camera.screenToTile(e.clientX, e.clientY);
        s.buildSystem.updatePreview(tile.col, tile.row);
        updateHud({ placingValid: s.buildSystem.previewValid });
      }
    };

    const onMouseUp = (e) => {
      const s = stateRef.current;
      if (!s) return;
      if (e.button === 0 && !s.buildSystem.placingDefId) {
        s.selection.onMouseUp(e.clientX, e.clientY, 0, { shift: e.shiftKey, ctrl: e.ctrlKey });
      }
      if (e.button === 2) {
        if (s.buildSystem.placingDefId) { s.buildSystem.cancelPlacement(); updateHud({ placingDefId: null }); return; }
        const tile        = s.camera.screenToTile(e.clientX, e.clientY);
        const selectedIds = s.selection.getSelectedIds();
        for (const id of selectedIds) s.pendingMoves.push({ unitId: id, col: tile.col, row: tile.row });
      }
    };

    const onWheel   = (e) => stateRef.current?.camera.zoomAt(e.clientX, e.clientY, e.deltaY);
    const onCtxMenu = (e) => e.preventDefault();

    const onKeyDown = (e) => {
      const s = stateRef.current;
      if (!s) return;
      switch (e.key) {
        case 'w': case 'ArrowUp':    s.camera.setPanKey('up',    true); break;
        case 's': case 'ArrowDown':  s.camera.setPanKey('down',  true); break;
        case 'a': case 'ArrowLeft':  s.camera.setPanKey('left',  true); break;
        case 'd': case 'ArrowRight': s.camera.setPanKey('right', true); break;
        case 'S': s.selection.issueStopOrder(); break;
        case 'h': s.selection.issueHoldOrder(); break;
        case 'g': case 'G': {
          const selectedIds = s.selection.getSelectedIds();
          for (const id of selectedIds) {
            const unit = s.entities.get(id);
            if (!unit || unit.category !== 'infantry') continue;
            if (unit.layer === 'garrisoned') { s.pendingExits.push(id); continue; }
            let nearestStruct = null, nearestDist = Infinity;
            for (const st of s.entities.getPlayerStructures()) {
              if (!st.garrisonable || st.garrisonOccupants.length >= st.garrisonSlots) continue;
              const dc = st.col - unit.col, dr = st.row - unit.row;
              const d  = Math.sqrt(dc*dc + dr*dr);
              if (d < nearestDist && d <= 5) { nearestDist = d; nearestStruct = st; }
            }
            if (nearestStruct) s.pendingGarrison.push({ unitId: id, structureId: nearestStruct.id });
          }
          break;
        }
        case 'u': case 'U': {
          const selectedIds = s.selection.getSelectedIds();
          for (const id of selectedIds) {
            const unit = s.entities.get(id);
            if (unit?.layer === 'garrisoned') s.pendingExits.push(id);
          }
          break;
        }
        case 'f': case 'F': {
          // Deploy flares on selected air units
          const s2 = stateRef.current;
          if (s2) {
            const selectedIds = s2.selection.getSelectedIds();
            for (const id of selectedIds) {
              const unit = s2.entities.get(id);
              if (unit?.isAir) s2.airCombat.tryDeployFlares(unit);
            }
          }
          break;
        }
        case 'Escape':
          if (s.buildSystem.placingDefId) { s.buildSystem.cancelPlacement(); updateHud({ placingDefId: null }); }
          else onExit?.();
          break;
        case '`': window.__rts_debug = !window.__rts_debug; break;
        default:
          if (e.key >= '1' && e.key <= '9') {
            if (e.ctrlKey) s.selection.assignGroup(parseInt(e.key));
            else s.selection.recallGroup(parseInt(e.key));
          }
      }
    };

    const onKeyUp = (e) => {
      const s = stateRef.current;
      if (!s) return;
      const keyMap = { w:'up', ArrowUp:'up', s:'down', ArrowDown:'down', a:'left', ArrowLeft:'left', d:'right', ArrowRight:'right' };
      if (keyMap[e.key]) s.camera.setPanKey(keyMap[e.key], false);
    };

    const onResize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      stateRef.current?.camera.resize(canvas.width, canvas.height);
    };

    canvas.addEventListener('mousedown',   onMouseDown);
    canvas.addEventListener('mousemove',   onMouseMove);
    canvas.addEventListener('mouseup',     onMouseUp);
    canvas.addEventListener('contextmenu', onCtxMenu);
    canvas.addEventListener('wheel',       onWheel, { passive: true });
    window.addEventListener('keydown',     onKeyDown);
    window.addEventListener('keyup',       onKeyUp);
    window.addEventListener('resize',      onResize);

      cleanupFn = () => {
        loop.stop();
        canvas.removeEventListener('mousedown',   onMouseDown);
        canvas.removeEventListener('mousemove',   onMouseMove);
        canvas.removeEventListener('mouseup',     onMouseUp);
        canvas.removeEventListener('contextmenu', onCtxMenu);
        canvas.removeEventListener('wheel',       onWheel);
        window.removeEventListener('keydown',     onKeyDown);
        window.removeEventListener('keyup',       onKeyUp);
        window.removeEventListener('resize',      onResize);
        stateRef.current = null;
      };
    })(); // end async IIFE

    return () => cleanupFn?.();
  }, []);

  // ── HUD interactions ──────────────────────────────────────────────────────

  const handleBuild = (defId) => {
    const s = stateRef.current;
    if (!s) return;
    s.buildSystem.startPlacement(defId);
    updateHud({ placingDefId: defId });
  };

  const handleQueueUnit = (unitDefId) => {
    const s    = stateRef.current;
    const def  = UNIT_DEFS[unitDefId];
    const struct = hud.selectedStructure;
    if (!s || !def || !struct) return;
    s.buildSystem.queueUnit(struct.id, def);
  };

  return (
    <div style={{ position: 'relative', width:'100vw', height:'100vh', background:'#000', overflow:'hidden' }}>
      <canvas ref={canvasRef} style={{ display:'block', position:'absolute', inset:0 }} />
      <GameHUD
        hud={hud}
        onExit={onExit}
        onBuild={handleBuild}
        onQueueUnit={handleQueueUnit}
        structDefs={STRUCT_DEFS}
        unitDefs={UNIT_DEFS}
      />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function findWalkableNear(col, row, radius) {
  for (let r = 1; r <= radius + 2; r++) {
    for (let dc = -r; dc <= r; dc++) {
      for (let dr = -r; dr <= r; dr++) {
        if (Math.abs(dc) !== r && Math.abs(dr) !== r) continue;
        return { col: col + dc, row: row + dr };
      }
    }
  }
  return { col, row };
}

// ── HUD ───────────────────────────────────────────────────────────────────────

const HUD_STYLE = {
  bar: {
    position: 'absolute', left: 0, right: 0,
    background: 'rgba(5,12,5,0.88)',
    borderColor: 'rgba(74,122,63,0.35)',
    color: '#bbb', fontFamily: 'monospace', fontSize: 12,
    backdropFilter: 'blur(4px)',
    pointerEvents: 'none',
  },
};

function GameHUD({ hud, onExit, onBuild, onQueueUnit, structDefs, unitDefs }) {
  const { selected, credits, power, powerUsed, selectedStructure, notification, placingDefId } = hud;
  const primary     = selected[0];
  const isPowerLow  = powerUsed > power;
  const buildableStructures = Object.values(structDefs).filter(d => d.id !== 'command_hq');

  return (
    <>
      {/* ── Top bar ── */}
      <div style={{ ...HUD_STYLE.bar, top: 0, borderBottom: '1px solid', display: 'flex', alignItems: 'center', padding: '6px 16px', gap: 24, pointerEvents: 'all' }}>
        <span style={{ color: '#4caf50', fontWeight: 700 }}>💰 {Math.floor(credits)}</span>
        <span style={{ color: isPowerLow ? '#ff4444' : '#aacc88' }}>
          ⚡ {power} / {powerUsed}{isPowerLow ? ' ⚠ LOW POWER' : ''}
        </span>
        <span style={{ flex: 1, textAlign: 'center', color: '#4a7c3f', letterSpacing: 3, fontSize: 11 }}>
          IRON FRONT · JUNGLE SKIRMISH
        </span>
        {placingDefId && (
          <span style={{ color: '#ffcc00', fontSize: 11 }}>
            📐 Placing {structDefs[placingDefId]?.displayName} — RMB to cancel
          </span>
        )}
        <button onClick={onExit} style={{ background:'rgba(180,30,30,0.7)', border:'1px solid #f44', color:'#fff', padding:'2px 10px', borderRadius:3, cursor:'pointer', fontSize:11, pointerEvents:'all' }}>
          EXIT
        </button>
      </div>

      {/* ── Notification toast ── */}
      {notification && (
        <div style={{
          position: 'absolute', top: 52, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.85)', border: '1px solid #4a7c3f',
          color: '#fff', padding: '8px 20px', borderRadius: 4,
          fontSize: 13, fontFamily: 'monospace', letterSpacing: 1,
          pointerEvents: 'none', zIndex: 100,
        }}>
          {notification}
        </div>
      )}

      {/* ── Bottom panel ── */}
      <div style={{ ...HUD_STYLE.bar, bottom: 0, borderTop: '1px solid', minHeight: 110, display: 'flex', alignItems: 'stretch', pointerEvents: 'all' }}>

        {/* Portrait */}
        <div style={{ width: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(74,122,63,0.25)', padding: 8 }}>
          {primary ? (
            <>
              <div style={{ fontSize: 28, marginBottom: 4 }}>
                {primary.entityType === 'STRUCTURE' ? '🏗' : primary.category === 'infantry' ? '🪖' : primary.category === 'vehicle' ? '🚘' : '🚁'}
              </div>
              <div style={{ fontSize: 10, color: '#4caf50', textAlign: 'center' }}>{primary.displayName}</div>
              {primary.entityType === 'UNIT' && (
                <>
                  <div style={{ width: 70, height: 4, background: '#333', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(primary.hpFraction ?? 1)*100}%`, background: (primary.hpFraction ?? 1) > 0.6 ? '#4caf50' : (primary.hpFraction ?? 1) > 0.3 ? '#ff9800' : '#f44' }} />
                  </div>
                  <div style={{ fontSize: 9, color: '#666', marginTop: 2 }}>{Math.round(primary.hp ?? 0)} HP</div>
                  {primary.entrenched  && <div style={{ fontSize: 9, color: '#8B6914', marginTop: 2 }}>⛺ ENTRENCHED</div>}
                  {primary.veterancy > 0 && <div style={{ fontSize: 9, color: '#ffd700' }}>⭐×{primary.veterancy}</div>}
                </>
              )}
            </>
          ) : (
            <div style={{ fontSize: 10, color: '#333', textAlign: 'center' }}>NO<br/>SELECTION</div>
          )}
        </div>

        {/* Actions */}
        <div style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
          {selectedStructure?.produces?.length > 0 ? (
            <div>
              <div style={{ fontSize: 10, color: '#4a7c3f', marginBottom: 4, letterSpacing: 2 }}>PRODUCE</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {selectedStructure.produces.map(defId => {
                  const def = unitDefs[defId];
                  if (!def) return null;
                  return (
                    <button key={defId} onClick={() => onQueueUnit(defId)}
                      style={{ background: 'rgba(40,70,40,0.8)', border: '1px solid #4a7c3f', color: '#ccc', padding: '4px 10px', borderRadius: 3, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace' }}>
                      {def.displayName} <span style={{ color: '#4caf50' }}>{def.cost}cr</span>
                    </button>
                  );
                })}
              </div>
              {selectedStructure.productionQueue?.length > 0 && (
                <div style={{ marginTop: 4, fontSize: 10, color: '#666' }}>
                  Queue: {selectedStructure.productionQueue.map((q,i) => (
                    <span key={i} style={{ marginRight: 8 }}>
                      {unitDefs[q.defId]?.displayName ?? q.defId} {Math.round(q.progress * 100)}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 10, color: '#4a7c3f', marginBottom: 4, letterSpacing: 2 }}>BUILD</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {buildableStructures.map(def => (
                  <button key={def.id} onClick={() => onBuild(def.id)}
                    style={{ background: 'rgba(40,70,40,0.7)', border: '1px solid #4a7c3f', color: '#ccc', padding: '4px 10px', borderRadius: 3, cursor: 'pointer', fontSize: 11, fontFamily: 'monospace', opacity: credits < def.cost ? 0.4 : 1 }}>
                    {def.displayName} <span style={{ color: '#4caf50' }}>{def.cost}cr</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Controls reminder */}
        <div style={{ width: 150, fontSize: 9, color: '#333', padding: '8px 10px', borderLeft: '1px solid rgba(74,122,63,0.2)', lineHeight: 1.8, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div>WASD / Edge — Pan</div>
          <div>Scroll — Zoom</div>
          <div>LMB — Select</div>
          <div>Drag — Box select</div>
          <div>RMB — Move/Attack</div>
          <div>S — Stop · H — Hold</div>
          <div>G — Garrison · U — Exit</div>
          <div>Ctrl+1–9 — Groups</div>
          <div>` — Debug grid</div>
        </div>
      </div>
    </>
  );
}
