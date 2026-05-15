/**
 * UnitEntity.js
 * Mobile unit — infantry, tank, helicopter, engineer.
 * Reads from UnitDefinition + WeaponDefinition (content/units/).
 */

import { Entity, EntityType, EntityState } from './Entity.js';

export class UnitEntity extends Entity {
  constructor(def, faction) {
    super(def.id, EntityType.UNIT, faction);

    // From definition
    this.displayName    = def.displayName;
    this.category       = def.category;     // 'infantry' | 'vehicle' | 'air' | 'naval'
    this.speed          = def.speed ?? 2.0;
    this.weapons        = def.weapons ?? [];
    this.visionRadius   = def.visionRadius ?? 6;
    this.canEnterTrench = def.canEnterTrench ?? false;
    this.canGarrison    = def.canGarrison ?? false;
    this.canCapture     = def.tags?.includes('can_capture') ?? false;
    this.isAir          = def.category === 'air';
    this.isHelicopter   = def.isHelicopter  ?? false;
    this.isJet          = def.isJet         ?? false;
    this.isNaval        = def.isNaval       ?? false;
    this.hoverHeight    = def.hoverHeight   ?? 4;
    this.cruiseHeight   = def.cruiseHeight  ?? 10;
    this.flareCount     = def.flareCount    ?? (def.isJet ? 6 : def.isHelicopter ? 3 : 0);
    this.maxAmmo        = def.maxAmmo       ?? null;
    this.rearmTime      = def.rearmTime     ?? 15;
    this._altitude      = undefined; // initialised by AirCombatSystem on first tick
    this.selectionRadius= def.selectionRadius ?? 0.5;
    this.crushable      = def.crushable ?? (def.category === 'infantry');

    this.maxHp = def.hp ?? 100;
    this.hp    = this.maxHp;
    this.armour = def.armour ?? 'light';

    // Movement state
    this.path         = [];    // [{col, row}, ...]
    this.moveTarget   = null;  // {col, row} | null
    this._moveProgress = 0;    // 0–1 progress between current tile and next
    this._fromCol     = this.col;
    this._fromRow     = this.row;

    // Combat state
    this.attackTarget  = null;  // entity id
    this.weaponCooldowns = {};  // weaponId → remaining cooldown seconds

    // Trench / garrison state
    this.entrenched    = false;
    this.garrisonedIn  = null;  // structure entity id


    // Subterrain layer
    this.layer          = 'surface';      // 'surface' | 'subterrain' | 'garrisoned'
    this.allowedLayers  = def.allowedLayers ?? ['surface'];

    // Garrison mount binding (set by GarrisonSystem)
    this.garrisonMountPoint = null;  // {x, y, facing} or null
    this.garrisonMountIndex = null;  // index into structure.mountPoints

    // Orders queue
    this.orders        = [];    // [{type, ...params}]

    // Veterancy
    this.kills         = 0;
    this.veterancy     = 0;     // 0 | 1 | 2 | 3
  }

  // ── Movement ──────────────────────────────────────────────────────────────

  setPath(path) {
    this.path = [...path];
    this._fromCol = this.col;
    this._fromRow = this.row;
    this._moveProgress = 0;
    if (path.length > 0) {
      this.state = EntityState.MOVING;
      this.moveTarget = path[path.length - 1];
    }
  }

  stopMoving() {
    this.path = [];
    this.moveTarget = null;
    this._moveProgress = 0;
    if (this.state === EntityState.MOVING) this.state = EntityState.IDLE;
  }

  // Called by simulation tick — advances unit along its path
  tickMovement(dt, grid) {
    if (this.path.length === 0) return;

    const next = this.path[0];
    const speedMult = grid.getSpeedMult(next.col, next.row);
    const effectiveSpeed = this.speed * speedMult;

    // Distance in tile-space per second
    const dc = next.col - this._fromCol;
    const dr = next.row - this._fromRow;
    const tileDist = Math.sqrt(dc * dc + dr * dr); // 1 or √2

    this._moveProgress += (effectiveSpeed * dt) / tileDist;

    if (this._moveProgress >= 1) {
      // Arrived at next tile
      grid.removeOccupant(Math.round(this.col), Math.round(this.row), this.id);
      this.col = next.col;
      this.row = next.row;
      grid.addOccupant(next.col, next.row, this.id);

      // Update trench state
      this.entrenched = grid.isTrench(next.col, next.row) && this.canEnterTrench;

      this._fromCol = next.col;
      this._fromRow = next.row;
      this._moveProgress = 0;
      this.path.shift();

      // Update facing
      if (dc !== 0 || dr !== 0) this.facing = this._dirToFacing(dc, dr);

      if (this.path.length === 0) {
        this.moveTarget = null;
        this.state = this.entrenched ? EntityState.ENTRENCHED : EntityState.IDLE;
      }
    } else {
      // Interpolate position
      this.col = this._fromCol + dc * this._moveProgress;
      this.row = this._fromRow + dr * this._moveProgress;

      // Update facing toward movement direction
      if (dc !== 0 || dr !== 0) this.facing = this._dirToFacing(dc, dr);
    }
  }

  _dirToFacing(dc, dr) {
    // 8-way facing: 0=N, 1=NE, 2=E, 3=SE, 4=S, 5=SW, 6=W, 7=NW
    const angle = Math.atan2(dr, dc); // atan2(row, col)
    const deg = ((angle * 180 / Math.PI) + 360) % 360;
    return Math.round(deg / 45) % 8;
  }

  // ── Combat ────────────────────────────────────────────────────────────────

  setAttackTarget(entityId) {
    this.attackTarget = entityId;
    this.state = EntityState.ATTACKING;
  }

  clearAttackTarget() {
    this.attackTarget = null;
    if (this.state === EntityState.ATTACKING) this.state = EntityState.IDLE;
  }

  tickWeaponCooldowns(dt) {
    for (const weapId of this.weapons) {
      if (this.weaponCooldowns[weapId] > 0) {
        this.weaponCooldowns[weapId] = Math.max(0, this.weaponCooldowns[weapId] - dt);
      }
    }
  }

  canFireWeapon(weaponId) {
    return (this.weaponCooldowns[weaponId] ?? 0) === 0;
  }

  triggerWeaponCooldown(weaponId, rateOfFire) {
    this.weaponCooldowns[weaponId] = rateOfFire;
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  issueOrder(order) {
    this.orders = [order]; // for now: replace all orders
    this._executeOrder(order);
  }

  _executeOrder(order) {
    switch (order.type) {
      case 'move':
        this.stopMoving();
        this.clearAttackTarget();
        // Pathfinding is done by the simulation controller, not here
        break;
      case 'attack':
        this.setAttackTarget(order.targetId);
        break;
      case 'stop':
        this.stopMoving();
        this.clearAttackTarget();
        this.state = EntityState.IDLE;
        break;
      case 'hold':
        this.stopMoving();
        this.clearAttackTarget();
        this._data.holdPosition = true;
        this.state = EntityState.IDLE;
        break;
    }
  }

  // ── Serialise ─────────────────────────────────────────────────────────────

  serialize() {
    return {
      ...super.serialize(),
      category: this.category,
      path: this.path,
      attackTarget: this.attackTarget,
      entrenched: this.entrenched,
      veterancy: this.veterancy,
      kills: this.kills,
    };
  }
}
