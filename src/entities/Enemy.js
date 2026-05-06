import Phaser from 'phaser';
import { DEPTH } from '../config/constants.js';

// 풀링되는 적 — Sprite + ArcadeBody
export default class Enemy extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'placeholder_enemy');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.ENEMY);
    this.setActive(false);
    this.setVisible(false);
    this.body.enable = false;

    this.hp = 1;
    this.maxHp = 1;
    this.damage = 0;
    this.speed = 0;
    this.exp = 0;
    this.goldDrop = 0;
    this.behavior = 'chase';
    this.enemyType = null;
    this.isBoss = false;
    this.isElite = false;
    this.knockbackUntil = 0;
    this.rangedNextFire = 0;
    this.poisonStacks = 0;
    this.poisonExpires = 0;
    this.poisonNextTick = 0;
    this.poisonDps = 0;
    this.patterns = null;
    this.patternTimers = null;
    this.chargeUntil = 0;
    this.chargeDir = { x: 0, y: 0 };
    this.chargeSpeedMul = 1;
  }

  // 풀에서 꺼내 데이터로 초기화
  spawn(data, typeId, x, y, hpMul = 1, dmgMul = 1, isElite = false) {
    const size = data.size || 16;
    this.enemyType = typeId;
    this.behavior = data.behavior || 'chase';
    this.maxHp = (data.hp || 1) * hpMul * (isElite ? 4 : 1);
    this.hp = this.maxHp;
    this.damage = (data.damage || 1) * dmgMul * (isElite ? 1.4 : 1);
    this.speed = (data.speed || 30) * (isElite ? 1.1 : 1);
    this.exp = (data.exp || 1) * (isElite ? 5 : 1);
    this.goldDrop = (data.goldDrop || 0) * (isElite ? 6 : 1);
    this.isBoss = data.isBoss === true;
    this.isElite = !!isElite;
    this.rangedRange = data.rangedRange || 220;
    this.rangedKeepDist = data.rangedKeepDist || 160;
    this.rangedCooldown = data.rangedCooldown || 2000;
    this.rangedProjSpeed = data.rangedProjSpeed || 180;
    this.rangedNextFire = this.scene.time.now + 1000;
    this.explodeRange = data.explodeRange || 50;
    this.explodeRadius = data.explodeRadius || 70;
    this.poisonStacks = 0;
    this.poisonExpires = 0;
    this.poisonNextTick = 0;
    this.poisonDps = 0;
    this.patterns = data.patterns || null;
    this.patternTimers = this.patterns ? this.patterns.map(() => this.scene.time.now + 2500) : null;
    this.chargeUntil = 0;
    this.chargeSpeedMul = 1;
    this.frozenUntil = 0;

    this.setPosition(x, y);
    // 실제 텍스처가 있으면 그것을 사용, 없으면 placeholder + 데이터 색상
    const spriteKey = data.spriteKey || 'placeholder_enemy';
    if (this.scene.textures.exists(spriteKey)) {
      this.setTexture(spriteKey, 0);
      // 시트면 애니메이션 재생
      const animKey = `${spriteKey}_walk`;
      if (this.scene.anims.exists(animKey)) {
        this.play(animKey);
      }
      // 엘리트는 색조만 살짝 노랗게
      if (isElite) this.setTint(0xffcc88);
      else this.clearTint();
    } else {
      this.setTexture('placeholder_enemy');
      this.setTint(isElite ? 0xffaa44 : (data.color ?? 0xff4444));
    }
    this.setDisplaySize(size, size);
    this.setAngle(0);
    this.setAlpha(1);
    this.setActive(true);
    this.setVisible(true);
    this.body.enable = true;
    this.body.setSize(size, size, true);
    this.body.setVelocity(0, 0);
    this.knockbackUntil = 0;
  }

  update(time, delta, player) {
    if (!this.active || !this.body) return;

    // 빙결 — 멈춤
    if (time < this.frozenUntil) {
      this.body.setVelocity(0, 0);
      // 독 DoT는 이어 적용
      if (this.poisonExpires > time && this.poisonDps > 0 && time >= this.poisonNextTick) {
        this.hp -= this.poisonDps;
        this.poisonNextTick = time + 250;
        if (this.hp <= 0 && this.scene.collisionSystem) {
          this.scene.collisionSystem._killEnemy(this);
          return;
        }
      }
      return;
    }

    // 독 DoT
    if (this.poisonExpires > time && this.poisonDps > 0) {
      if (time >= this.poisonNextTick) {
        this.hp -= this.poisonDps;
        this.poisonNextTick = time + 250;
        if (this.hp <= 0 && this.scene.collisionSystem) {
          this.scene.collisionSystem._killEnemy(this);
          return;
        }
      }
    }

    if (time < this.knockbackUntil) return;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    switch (this.behavior) {
      case 'ranged': {
        // 적정 거리 유지 — 너무 가까우면 후퇴, 너무 멀면 접근
        let dir = 0;
        if (dist < this.rangedKeepDist - 10) dir = -1;
        else if (dist > this.rangedKeepDist + 20) dir = 1;
        this.body.setVelocity((dx / dist) * this.speed * dir, (dy / dist) * this.speed * dir);

        // 사거리 안이면 발사
        if (dist <= this.rangedRange && time >= this.rangedNextFire) {
          this.rangedNextFire = time + this.rangedCooldown;
          this._fireProjectile(player);
        }
        break;
      }
      case 'bomber': {
        this.body.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed);
        if (dist < this.explodeRange) this._explode(player);
        break;
      }
      case 'boss': {
        // 패턴 시퀀스 + 기본 chase
        let speed = this.speed;
        if (time < this.chargeUntil) speed *= this.chargeSpeedMul;
        this.body.setVelocity((dx / dist) * speed, (dy / dist) * speed);
        if (this.patterns && this.patternTimers) this._runBossPatterns(time, player);
        break;
      }
      case 'chase':
      default: {
        this.body.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed);
      }
    }
  }

  _runBossPatterns(time, player) {
    this.patterns.forEach((pat, i) => {
      if (time < this.patternTimers[i]) return;
      this.patternTimers[i] = time + (pat.cooldown || 5000);
      switch (pat.type) {
        case 'charge': {
          // 텔레그래프 라인 — 700ms 지연 후 돌진
          const tx = player.x;
          const ty = player.y;
          const line = this.scene.add.graphics();
          line.lineStyle(3, 0xff5577, 0.8);
          line.beginPath();
          line.moveTo(this.x, this.y);
          line.lineTo(tx, ty);
          line.strokePath();
          line.setDepth(1);
          this.scene.tweens.add({ targets: line, alpha: 0.3, yoyo: true, duration: 200, repeat: 2 });
          // 돌진 시작 — 약간 지연
          this.scene.time.delayedCall(700, () => {
            line.destroy();
            if (!this.active) return;
            this.chargeUntil = this.scene.time.now + (pat.duration || 800);
            this.chargeSpeedMul = pat.speedMul || 3;
            if (this.scene.particles) {
              this.scene.particles.burst(this.x, this.y, 6, 0xffaa33, { life: 300, speed: 80 });
            }
          });
          break;
        }
        case 'summon': {
          if (!this.scene.waveSystem) break;
          const data = this.scene.cache.json.get('enemies')[pat.summonType];
          if (!data) break;
          for (let k = 0; k < (pat.count || 3); k += 1) {
            const angle = Math.random() * Math.PI * 2;
            const r = 50 + Math.random() * 30;
            const ex = this.x + Math.cos(angle) * r;
            const ey = this.y + Math.sin(angle) * r;
            const e = this.scene.pools.get('enemy');
            e.spawn(data, pat.summonType, ex, ey, 1.5, 1.0);
            this.scene.enemyGroup.add(e);
            this.scene.waveSystem.activeEnemies.add(e);
          }
          break;
        }
        case 'barrage': {
          const n = pat.projectiles || 8;
          const sp = pat.projSpeed || 200;
          for (let k = 0; k < n; k += 1) {
            const a = (k / n) * Math.PI * 2;
            const proj = this.scene.pools.get('projectile');
            proj.spawn(this.x, this.y, Math.cos(a) * sp, Math.sin(a) * sp, this.damage * 0.6, 1, 4500, 0xff6633);
            proj.isEnemyProjectile = true;
            this.scene.enemyProjectileGroup.add(proj);
          }
          break;
        }
        default:
      }
    });
  }

  _fireProjectile(player) {
    if (!this.scene.pools) return;
    const proj = this.scene.pools.get('projectile');
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    const sp = this.rangedProjSpeed;
    proj.spawn(this.x, this.y, Math.cos(angle) * sp, Math.sin(angle) * sp, this.damage, 1, 4000, 0xb066ff);
    proj.isEnemyProjectile = true;
    if (this.scene.enemyProjectileGroup) this.scene.enemyProjectileGroup.add(proj);
  }

  _explode(player) {
    if (!this.active) return;
    if (this.scene.particles) {
      this.scene.particles.burst(this.x, this.y, 24, 0xff7733, { life: 500, speed: 240, size: 4 });
    }
    if (this.scene.cameras && this.scene.cameras.main) this.scene.cameras.main.shake(150, 0.008);
    // 광역 데미지
    const cx = this.x;
    const cy = this.y;
    const dx = player.x - cx;
    const dy = player.y - cy;
    if (Math.sqrt(dx * dx + dy * dy) <= this.explodeRadius) {
      player.takeDamage(this.damage);
    }
    if (this.scene.audioManager) this.scene.audioManager.explode();
    if (this.scene.collisionSystem) {
      this.hp = 0;
      this.scene.collisionSystem._killEnemy(this);
    }
  }

  applyFreeze(durationMs) {
    if (this.isBoss) durationMs *= 0.4; // 보스는 빙결 저항
    this.frozenUntil = Math.max(this.frozenUntil, this.scene.time.now + durationMs);
    // 외형 변화 — 푸른 색조
    const orig = this.tintTopLeft;
    this.setTint(0x88ccff);
    this.scene.time.delayedCall(durationMs, () => {
      if (this.active) this.setTint(orig);
    });
  }

  applyPoison(dps, durationMs) {
    const t = this.scene.time.now;
    this.poisonDps = Math.max(this.poisonDps, dps);
    this.poisonExpires = Math.max(this.poisonExpires, t + durationMs);
    this.poisonStacks = Math.min(5, this.poisonStacks + 1);
    if (this.poisonNextTick === 0 || this.poisonNextTick < t) this.poisonNextTick = t + 250;
  }

  takeDamage(amount, fromX, fromY, knockback = 60) {
    if (!this.active) return false;
    this.hp -= amount;
    // 피격 점멸 — 실제 텍스처면 흰색 fill, placeholder면 색상 복원
    this.scene.tweens.killTweensOf(this);
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (!this.active) return;
      const spriteKey = this.texture && this.texture.key;
      if (spriteKey && spriteKey !== 'placeholder_enemy') {
        // 실제 텍스처는 tint 클리어 (엘리트면 노란 tint 다시)
        if (this.isElite) this.setTint(0xffcc88);
        else this.clearTint();
      } else {
        const data = this.scene.cache.json.get('enemies')?.[this.enemyType];
        if (data) this.setTint(data.color ?? 0xff4444);
      }
    });

    // 넉백 (보스/엘리트는 저항)
    if (knockback > 0 && this.body) {
      const player = this.scene.player;
      const mul = (player?.stats?.knockbackMul || 1) * (this.isBoss ? 0.2 : this.isElite ? 0.5 : 1);
      const dx = this.x - fromX;
      const dy = this.y - fromY;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const dur = 100;
      this.body.setVelocity((dx / len) * knockback * 4 * mul, (dy / len) * knockback * 4 * mul);
      this.knockbackUntil = this.scene.time.now + dur;
    }
    return this.hp <= 0;
  }
}
