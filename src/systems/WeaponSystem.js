import Phaser from 'phaser';
import { DEPTH } from '../config/constants.js';
import EventBus from '../managers/EventBus.js';

// 무기 슬롯 관리 + 자동 공격
const MAX_WEAPONS = 4;

export default class WeaponSystem {
  constructor(scene, pools, player, startWeaponId) {
    this.scene = scene;
    this.pools = pools;
    this.player = player;
    this.weaponsData = scene.cache.json.get('weapons');
    this.slots = []; // [{id, level, lastFire, runtime}]

    // 회전날 그래픽 컨테이너
    this.orbitContainer = scene.add.container(player.x, player.y);
    this.orbitContainer.setDepth(DEPTH.WEAPON);

    // 화염장판 그래픽
    this.auraGfx = scene.add.graphics();
    this.auraGfx.setDepth(DEPTH.WEAPON - 1);

    // 검 휘두름 그래픽
    this.swordGfx = scene.add.graphics();
    this.swordGfx.setDepth(DEPTH.WEAPON);

    if (startWeaponId) this.addWeapon(startWeaponId);
  }

  hasWeapon(id) {
    return this.slots.some((s) => s.id === id);
  }

  ownedWeapons() {
    return this.slots.map((s) => s.id);
  }

  weaponAtMax(id) {
    const slot = this.slots.find((s) => s.id === id);
    if (!slot) return false;
    const data = this.weaponsData[id];
    return slot.level >= (data.maxLevel || 8);
  }

  isFull() {
    return this.slots.length >= MAX_WEAPONS;
  }

  addWeapon(id) {
    if (this.hasWeapon(id)) {
      this.levelUp(id);
      return;
    }
    if (this.isFull()) return;
    const data = this.weaponsData[id];
    if (!data) return;
    this.slots.push({
      id,
      level: 1,
      lastFire: 0,
      runtime: { angle: Math.random() * Math.PI * 2 },
    });
    EventBus.emit('weapon:added', { weaponId: id });
  }

  // 진화 조건: 베이스 무기가 max + 진화 요건 패시브 보유 → 베이스 → 진화형 교체
  evolveWeapon(baseId) {
    const slot = this.slots.find((s) => s.id === baseId);
    if (!slot) return false;
    const data = this.weaponsData[baseId];
    if (!data || !data.evolvesTo) return false;
    const evoData = this.weaponsData[data.evolvesTo];
    if (!evoData) return false;
    slot.id = data.evolvesTo;
    slot.level = 1;
    slot.lastFire = 0;
    slot.runtime = { angle: Math.random() * Math.PI * 2 };
    EventBus.emit('weapon:evolved', { from: baseId, to: data.evolvesTo });
    return true;
  }

  // 진화 가능한 무기 ID 리스트 — 모달이 표시 가능
  evolvableWeapons(passiveLevels) {
    return this.slots
      .filter((slot) => {
        const d = this.weaponsData[slot.id];
        if (!d || !d.evolvesTo || d.evolved) return false;
        if (slot.level < (d.maxLevel || 8)) return false;
        if (!d.evolveRequires) return true;
        return (passiveLevels[d.evolveRequires] || 0) > 0;
      })
      .map((s) => s.id);
  }

  levelUp(id) {
    const slot = this.slots.find((s) => s.id === id);
    if (!slot) return;
    const data = this.weaponsData[id];
    const max = data.maxLevel || 8;
    if (slot.level >= max) return;
    slot.level += 1;
    EventBus.emit('weapon:levelup', { weaponId: id, level: slot.level });
  }

  // 무기별 현재 스탯 — 레벨 스케일링 적용
  _getWeaponStats(slot) {
    const data = this.weaponsData[slot.id];
    const lv = slot.level;
    const scale = data.levelScaling || {};
    const stats = { ...data };
    Object.keys(scale).forEach((key) => {
      const factor = Math.pow(scale[key], lv - 1);
      stats[key] = (data[key] || 0) * factor;
    });
    // 무기별 시너지 보정 (key별 곱)
    const wId = slot.id;
    const synWeaponDmg = this._weaponMod(wId, 'damage');
    if (stats.cooldown !== undefined) stats.cooldown *= this._weaponMod(wId, 'cooldown');
    if (stats.range !== undefined) stats.range *= this._weaponMod(wId, 'range');
    if (stats.area !== undefined) stats.area *= this._weaponMod(wId, 'area');
    if (stats.rotateSpeed !== undefined) stats.rotateSpeed *= this._weaponMod(wId, 'rotateSpeed');
    if (stats.freezeMs !== undefined) stats.freezeMs *= this._weaponMod(wId, 'freezeMs');

    // 플레이어 atk + 콤보 + 광폭화 + 광전사 보너스 적용
    const comboMul = this.scene.comboSystem ? this.scene.comboSystem.atkMultiplier() : 1;
    const frenzy = this.player._frenzyMul || 1;
    const berserkActive = this.player.stats.berserk && this.player.stats.hp / this.player.stats.maxHp < 0.5;
    const berserk = berserkActive
      ? (1.3 + (this.player.stats.berserkBonusBoost || 0))
      : 1;
    stats.damage = (stats.damage || 0) * synWeaponDmg * (this.player.stats.atk || 1) * comboMul * frenzy * berserk;
    // 관통 보너스
    if (stats.pierce !== undefined) {
      stats.pierce = (stats.pierce || 1) + (this.player.stats.pierceBonus || 0);
    }
    // 쿨다운 감소
    stats.cooldown = (stats.cooldown || 0) * (1 - (this.player.stats.cooldownReduction || 0));
    return stats;
  }

  update(time, delta) {
    // swordGfx/auraGfx는 매 프레임 clear, 단 잔상은 별도 sprite로 표시
    this.swordGfx.clear();
    this.auraGfx.clear();

    // 회전날 컨테이너 위치 추적
    this.orbitContainer.x = this.player.x;
    this.orbitContainer.y = this.player.y;

    this.slots.forEach((slot) => {
      const data = this.weaponsData[slot.id];
      const stats = this._getWeaponStats(slot);
      switch (data.type) {
        case 'melee':
          this._tickMelee(slot, stats, time);
          break;
        case 'projectile':
          this._tickProjectile(slot, stats, time);
          break;
        case 'projectile-multi':
          this._tickProjectileMulti(slot, stats, time);
          break;
        case 'area':
          this._tickArea(slot, stats, time);
          break;
        case 'orbit':
          this._tickOrbit(slot, stats, time, delta);
          break;
        case 'whip':
          this._tickWhip(slot, stats, time);
          break;
        case 'whip-chain':
          this._tickWhipChain(slot, stats, time);
          break;
        case 'chain':
          this._tickChain(slot, stats, time);
          break;
        case 'trail':
          this._tickTrail(slot, stats, time);
          break;
        case 'boomerang':
          this._tickBoomerang(slot, stats, time, delta);
          break;
        case 'frost':
          this._tickFrost(slot, stats, time);
          break;
        default:
          break;
      }
    });
  }

  // 부메랑 — 발사된 상태로 가다가 돌아옴
  _tickBoomerang(slot, stats, time, delta) {
    if (!slot.runtime.active && time - slot.lastFire >= stats.cooldown) {
      slot.lastFire = time;
      const target = this._findNearestEnemy(stats.range || 200);
      const angle = target
        ? Math.atan2(target.y - this.player.y, target.x - this.player.x)
        : (Math.random() * Math.PI * 2);
      const range = stats.range || 200;
      const speed = stats.speed || 280;
      slot.runtime.active = true;
      slot.runtime.phase = 'out';
      slot.runtime.x = this.player.x;
      slot.runtime.y = this.player.y;
      slot.runtime.vx = Math.cos(angle) * speed;
      slot.runtime.vy = Math.sin(angle) * speed;
      slot.runtime.maxRange = range;
      slot.runtime.startX = this.player.x;
      slot.runtime.startY = this.player.y;
      slot.runtime.gfx = this.scene.add.rectangle(slot.runtime.x, slot.runtime.y, 14, 14, 0xffe14d).setStrokeStyle(2, 0x111111);
      slot.runtime.gfx.setDepth(40);
      slot.runtime.hits = new Set();
    }

    if (!slot.runtime.active) return;
    const r = slot.runtime;
    r.gfx.angle += 18;
    r.x += (r.vx * delta) / 1000;
    r.y += (r.vy * delta) / 1000;
    r.gfx.setPosition(r.x, r.y);
    // 충돌
    this.scene.waveSystem.activeEnemies.forEach((enemy) => {
      if (!enemy.active || r.hits.has(enemy)) return;
      const dx = enemy.x - r.x;
      const dy = enemy.y - r.y;
      if (dx * dx + dy * dy < 18 * 18) {
        r.hits.add(enemy);
        const { value, isCrit } = this._rollCrit(stats.damage);
        this.scene.collisionSystem.applyDamage(enemy, value, r.x, r.y, 40, isCrit);
      }
    });
    // 거리 도달 시 회귀
    const dx = r.x - r.startX;
    const dy = r.y - r.startY;
    if (r.phase === 'out' && Math.sqrt(dx * dx + dy * dy) >= r.maxRange) {
      r.phase = 'in';
    }
    if (r.phase === 'in') {
      const tdx = this.player.x - r.x;
      const tdy = this.player.y - r.y;
      const len = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
      const sp = Math.sqrt(r.vx * r.vx + r.vy * r.vy);
      r.vx = (tdx / len) * sp * 1.15;
      r.vy = (tdy / len) * sp * 1.15;
      if (len < 14) {
        r.gfx.destroy();
        r.active = false;
      }
    }
  }

  _tickFrost(slot, stats, time) {
    if (time - slot.lastFire < stats.cooldown) return;
    slot.lastFire = time;
    const radius = stats.area || 100;
    // 이펙트 — PNG 시트 우선, 없으면 ring 그래픽
    const fx = this._spawnFxSprite(slot.id, this.player.x, this.player.y, 0, 1);
    if (fx) {
      fx.setDisplaySize(radius * 2, radius * 2);
    } else {
      const ring = this.scene.add.circle(this.player.x, this.player.y, 10, 0x88ccff, 0.4)
        .setStrokeStyle(3, 0xaaeeff, 0.9)
        .setDepth(40);
      this.scene.tweens.add({
        targets: ring,
        radius,
        scale: radius / 10,
        alpha: 0,
        duration: 350,
        onUpdate: () => ring.setPosition(this.player.x, this.player.y),
        onComplete: () => ring.destroy(),
      });
    }
    // 적 영향
    this.scene.waveSystem.activeEnemies.forEach((enemy) => {
      if (!enemy.active) return;
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      if (dx * dx + dy * dy <= radius * radius) {
        const { value, isCrit } = this._rollCrit(stats.damage);
        this.scene.collisionSystem.applyDamage(enemy, value, this.player.x, this.player.y, 30, isCrit);
        if (typeof enemy.applyFreeze === 'function') enemy.applyFreeze(stats.freezeMs || 1500);
      }
    });
  }

  // 크리티컬 적용 — { value, isCrit }
  _rollCrit(rawDamage) {
    const p = this.player;
    const chance = p.stats.critChance || 0;
    const mul = p.stats.critDmg || 1.5;
    if (Math.random() < chance) return { value: rawDamage * mul, isCrit: true };
    return { value: rawDamage, isCrit: false };
  }

  // 무기별 시너지 보정 — SynergySystem이 보정값 제공
  _weaponMod(weaponId, key) {
    return this.scene.synergySystem ? this.scene.synergySystem.weaponMod(weaponId, key) : 1;
  }

  _findNearestEnemy(maxRange = Infinity) {
    let best = null;
    let bestDist = maxRange;
    const sys = this.scene.waveSystem;
    if (!sys) return null;
    sys.activeEnemies.forEach((e) => {
      if (!e.active) return;
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist * bestDist) {
        bestDist = Math.sqrt(d2);
        best = e;
      }
    });
    return best;
  }

  _tickMelee(slot, stats, time) {
    if (time - slot.lastFire < stats.cooldown) return;
    const target = this._findNearestEnemy(stats.range || 80);
    if (!target) return;
    slot.lastFire = time;

    const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    const arc = (stats.area || 90) * (Math.PI / 180);
    const range = stats.range || 70;

    // 부채꼴 피해 즉시 적용
    const sys = this.scene.waveSystem;
    sys.activeEnemies.forEach((enemy) => {
      if (!enemy.active) return;
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > range) return;
      const eAng = Math.atan2(dy, dx);
      let diff = eAng - angle;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      if (Math.abs(diff) <= arc / 2) {
        const { value, isCrit } = this._rollCrit(stats.damage);
        this.scene.collisionSystem.applyDamage(enemy, value, this.player.x, this.player.y, stats.knockback || 60, isCrit);
      }
    });

    // PNG 시트 이펙트 (weapon_sword 또는 holy_sword)
    this._spawnFxSprite(slot.id, this.player.x, this.player.y, angle, range);
  }

  // 무기 시트 텍스처가 있으면 1회 재생되는 임시 Sprite를 띄움
  _spawnFxSprite(weaponId, x, y, angle = 0, scaleHint = 1) {
    if (!this.scene.textures.exists(weaponId)) return null;
    const tex = this.scene.textures.get(weaponId);
    if (!tex || tex.frameTotal <= 1) return null;
    const animKey = `${weaponId}_play`;
    const sprite = this.scene.add.sprite(x, y, weaponId, 0);
    sprite.setDepth(40);
    sprite.setRotation(angle);
    if (this.scene.anims.exists(animKey)) {
      sprite.play(animKey);
    }
    // 1회 재생 후 파괴
    const totalFrames = tex.frameTotal;
    // 애니 frameRate 추정 — anims에 들어 있는 정의 사용
    let dur = 600;
    if (this.scene.anims.exists(animKey)) {
      const animDef = this.scene.anims.get(animKey);
      if (animDef && animDef.frameRate) dur = (totalFrames / animDef.frameRate) * 1000;
    }
    this.scene.time.delayedCall(dur, () => sprite.destroy());
    return sprite;
  }

  _tickProjectile(slot, stats, time) {
    if (time - slot.lastFire < stats.cooldown) return;
    const target = this._findNearestEnemy(stats.range || 260);
    if (!target) return;
    slot.lastFire = time;

    const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    const speed = stats.speed || 320;
    const proj = this.pools.get('projectile');
    const { value, isCrit } = this._rollCrit(stats.damage);
    proj.spawn(
      this.player.x,
      this.player.y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      value,
      Math.max(1, Math.floor(stats.pierce || 1)),
      stats.range ? (stats.range / speed) * 1000 + 200 : 1500,
      isCrit ? 0xffaa33 : 0x66ccff
    );
    proj.isPlayerCrit = isCrit;
    this.scene.projectileGroup.add(proj);
  }

  _tickProjectileMulti(slot, stats, time) {
    if (time - slot.lastFire < stats.cooldown) return;
    const target = this._findNearestEnemy(stats.range || 320);
    if (!target) return;
    slot.lastFire = time;
    const baseAng = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    const speed = stats.speed || 360;
    const shots = Math.max(1, Math.floor(stats.shots || 3));
    const spread = stats.spread || 0.35;
    for (let i = 0; i < shots; i += 1) {
      const off = shots === 1 ? 0 : (i - (shots - 1) / 2) * spread;
      const a = baseAng + off;
      const proj = this.pools.get('projectile');
      const { value, isCrit } = this._rollCrit(stats.damage);
      proj.spawn(
        this.player.x,
        this.player.y,
        Math.cos(a) * speed,
        Math.sin(a) * speed,
        value,
        Math.max(1, Math.floor(stats.pierce || 1)),
        stats.range ? (stats.range / speed) * 1000 + 200 : 1500,
        isCrit ? 0xffaa33 : 0xffffaa
      );
      proj.isPlayerCrit = isCrit;
      this.scene.projectileGroup.add(proj);
    }
  }

  _tickArea(slot, stats, time) {
    if (time - slot.lastFire < stats.cooldown) return;
    slot.lastFire = time;
    const radius = stats.area || 60;
    const sys = this.scene.waveSystem;
    sys.activeEnemies.forEach((enemy) => {
      if (!enemy.active) return;
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        const { value, isCrit } = this._rollCrit(stats.damage);
        this.scene.collisionSystem.applyDamage(enemy, value, this.player.x, this.player.y, 30, isCrit);
      }
    });
    // 시각 이펙트 — Graphics 폴백 + PNG 시트 (있으면)
    this.auraGfx.fillStyle(0xff7733, 0.18);
    this.auraGfx.fillCircle(this.player.x, this.player.y, radius);
    this.auraGfx.lineStyle(2, 0xffaa44, 0.7);
    this.auraGfx.strokeCircle(this.player.x, this.player.y, radius);
    if (!slot.runtime.fxSprite && this.scene.textures.exists(slot.id)
        && this.scene.textures.get(slot.id).frameTotal > 1) {
      const sprite = this.scene.add.sprite(this.player.x, this.player.y, slot.id, 0);
      sprite.setDepth(39);
      sprite.setAlpha(0.85);
      const animKey = `${slot.id}_play`;
      if (this.scene.anims.exists(animKey)) sprite.play(animKey);
      slot.runtime.fxSprite = sprite;
    }
    if (slot.runtime.fxSprite) {
      slot.runtime.fxSprite.setPosition(this.player.x, this.player.y);
      slot.runtime.fxSprite.setDisplaySize(radius * 2.1, radius * 2.1);
    }
  }

  // 채찍 — 좌우 번갈아 휘두름, 다수 타격
  _tickWhip(slot, stats, time) {
    if (time - slot.lastFire < stats.cooldown) return;
    slot.lastFire = time;
    slot.runtime.whipSide = (slot.runtime.whipSide || 0) === 0 ? 1 : 0;
    const dirX = slot.runtime.whipSide === 0 ? -1 : 1;
    const range = stats.range || 110;
    const halfArc = (stats.area || 70) * 0.5 * (Math.PI / 180);
    const sys = this.scene.waveSystem;
    sys.activeEnemies.forEach((enemy) => {
      if (!enemy.active) return;
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > range) return;
      // 좌/우 절반 검사
      if (Math.sign(dx) !== dirX) return;
      // 수직 각도 한정
      const ang = Math.atan2(dy, dx);
      const refAng = dirX > 0 ? 0 : Math.PI;
      let diff = Math.abs(ang - refAng);
      if (diff > Math.PI) diff = Math.abs(2 * Math.PI - diff);
      if (diff > halfArc) return;
      const { value, isCrit } = this._rollCrit(stats.damage);
      this.scene.collisionSystem.applyDamage(enemy, value, this.player.x, this.player.y, stats.knockback || 60, isCrit);
    });
    // 시각 이펙트 — Graphics + PNG 시트
    this.swordGfx.fillStyle(0xffe14d, 0.18);
    this.swordGfx.lineStyle(2, 0xffe14d, 0.7);
    this.swordGfx.beginPath();
    const startA = dirX > 0 ? -halfArc : Math.PI - halfArc;
    const endA = dirX > 0 ? halfArc : Math.PI + halfArc;
    this.swordGfx.moveTo(this.player.x, this.player.y);
    this.swordGfx.arc(this.player.x, this.player.y, range, startA, endA);
    this.swordGfx.closePath();
    this.swordGfx.fillPath();
    this.swordGfx.strokePath();
    const fx = this._spawnFxSprite(slot.id, this.player.x + dirX * range / 2, this.player.y, 0);
    if (fx) {
      fx.setDisplaySize(range * 1.5, range * 0.8);
      if (dirX < 0) fx.setFlipX(true);
    }
  }

  _tickWhipChain(slot, stats, time) {
    this._tickWhip(slot, stats, time);
    // 추가로 가까운 적에 짧은 체인
    if (time - (slot.runtime.lastChain || 0) < 600) return;
    slot.runtime.lastChain = time;
    const target = this._findNearestEnemy(140);
    if (target) this._chainBolt(target, stats.damage * 0.7, stats.chains || 2, 100);
  }

  // 체인 라이트닝
  _tickChain(slot, stats, time) {
    if (time - slot.lastFire < stats.cooldown) return;
    const target = this._findNearestEnemy(stats.range || 240);
    if (!target) return;
    slot.lastFire = time;
    this._chainBolt(target, stats.damage, Math.max(1, Math.floor(stats.chains || 3)), stats.chainRange || 100);
  }

  _chainBolt(initial, dmg, chains, chainRange) {
    const visited = new Set();
    let current = initial;
    let prevX = this.player.x;
    let prevY = this.player.y;
    const points = [{ x: prevX, y: prevY }];
    while (current && chains > 0) {
      visited.add(current);
      const { value, isCrit } = this._rollCrit(dmg);
      this.scene.collisionSystem.applyDamage(current, value, prevX, prevY, 20, isCrit);
      points.push({ x: current.x, y: current.y });
      prevX = current.x;
      prevY = current.y;
      // 다음 타깃 — 가장 가까운 미방문
      let next = null;
      let bestD = chainRange;
      this.scene.waveSystem.activeEnemies.forEach((e) => {
        if (!e.active || visited.has(e)) return;
        const dx = e.x - current.x;
        const dy = e.y - current.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestD) { bestD = d; next = e; }
      });
      current = next;
      chains -= 1;
    }
    // 라인 그리기
    this.swordGfx.lineStyle(2, 0x88ccff, 0.9);
    this.swordGfx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) this.swordGfx.moveTo(p.x, p.y);
      else this.swordGfx.lineTo(p.x, p.y);
    });
    this.swordGfx.strokePath();
  }

  // 독장판 — 발 밑에 깔리고 일정 시간 동안 적에게 DoT
  _tickTrail(slot, stats, time) {
    if (!slot.runtime.fields) slot.runtime.fields = [];
    // 새 장판
    if (time - slot.lastFire >= stats.cooldown) {
      slot.lastFire = time;
      slot.runtime.fields.push({
        x: this.player.x,
        y: this.player.y,
        until: time + (stats.duration || 4000),
        radius: stats.area || 50,
        dps: stats.damage || 3,
        gfx: this.scene.add.circle(this.player.x, this.player.y, stats.area || 50, 0x4dffa0, 0.18)
          .setStrokeStyle(2, 0x4dffa0, 0.6)
          .setDepth(1),
      });
    }
    // 만료 정리 + 적용
    slot.runtime.fields = slot.runtime.fields.filter((f) => {
      if (time > f.until) { f.gfx.destroy(); return false; }
      this.scene.waveSystem.activeEnemies.forEach((enemy) => {
        if (!enemy.active) return;
        const dx = enemy.x - f.x;
        const dy = enemy.y - f.y;
        if (dx * dx + dy * dy <= f.radius * f.radius) {
          enemy.applyPoison(f.dps, 1000);
        }
      });
      return true;
    });
  }

  _tickOrbit(slot, stats, time, delta) {
    const count = Math.max(1, Math.round(stats.count || 2));
    const radius = stats.radius || 56;
    const speed = stats.rotateSpeed || 3.0;
    slot.runtime.angle += (speed * delta) / 1000;

    // 컨테이너 자식 동기화
    while (this.orbitContainer.list.length < count) {
      const blade = this.scene.add.rectangle(0, 0, 12, 12, 0xffffff, 1);
      blade.setStrokeStyle(2, 0x111111);
      this.orbitContainer.add(blade);
    }
    while (this.orbitContainer.list.length > count) {
      const last = this.orbitContainer.list[this.orbitContainer.list.length - 1];
      this.orbitContainer.remove(last, true);
    }

    const blades = this.orbitContainer.list;
    const sys = this.scene.waveSystem;
    blades.forEach((blade, i) => {
      const a = slot.runtime.angle + (Math.PI * 2 * i) / count;
      blade.x = Math.cos(a) * radius;
      blade.y = Math.sin(a) * radius;
      blade.angle += (speed * delta) / 16;

      const wx = this.player.x + blade.x;
      const wy = this.player.y + blade.y;
      // 충돌 검사 (간단 거리)
      sys.activeEnemies.forEach((enemy) => {
        if (!enemy.active) return;
        const dx = enemy.x - wx;
        const dy = enemy.y - wy;
        if (dx * dx + dy * dy < 16 * 16) {
          const dmg = stats.damage * (delta / 1000) * 6;
          this.scene.collisionSystem.applyDamage(enemy, dmg, wx, wy, 15);
        }
      });
    });
  }

  destroy() {
    if (this.orbitContainer) this.orbitContainer.destroy();
    if (this.auraGfx) this.auraGfx.destroy();
    if (this.swordGfx) this.swordGfx.destroy();
  }
}
