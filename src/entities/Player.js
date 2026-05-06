import Phaser from 'phaser';
import { COLORS, DEPTH } from '../config/constants.js';
import EventBus from '../managers/EventBus.js';
import AudioManager from '../managers/AudioManager.js';
import Haptics from '../managers/Haptics.js';

// 플레이어 — 32x32 컬러 사각형 + 물리바디
export default class Player extends Phaser.GameObjects.Container {
  constructor(scene, x, y, characterData) {
    super(scene, x, y);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.characterData = characterData;
    const color = characterData.color ?? COLORS.PLAYER;

    // 본체 사각형 + 외곽선
    this.body.setSize(22, 22);
    this.body.setOffset(-11, -11);
    this.body.setDamping(false);

    this.shadow = scene.add.ellipse(0, 12, 24, 8, 0x000000, 0.35);
    this.add(this.shadow);

    // 실제 캐릭터 스프라이트 (없으면 사각형 fallback)
    const spriteKey = characterData.spriteKey || 'placeholder_player';
    if (scene.textures.exists(spriteKey) && scene.textures.get(spriteKey).frameTotal > 1) {
      this.bodySprite = scene.add.sprite(0, -2, spriteKey, 0);
      this.bodySprite.setOrigin(0.5, 0.5);
      const walkKey = `${spriteKey}_walk`;
      if (scene.anims.exists(walkKey)) this.bodySprite.play(walkKey);
      this.eyeL = null;
      this.eyeR = null;
    } else {
      this.bodySprite = scene.add.rectangle(0, 0, 24, 24, color);
      this.bodySprite.setStrokeStyle(2, 0x111111, 0.8);
      this.eyeL = scene.add.rectangle(-5, -3, 3, 4, 0xffffff);
      this.eyeR = scene.add.rectangle(5, -3, 3, 4, 0xffffff);
      this.add([this.eyeL, this.eyeR]);
    }
    this.add(this.bodySprite);

    this.setDepth(DEPTH.PLAYER);

    // 스탯 — 데이터에서 로드
    const base = characterData.baseStats || {};
    this.stats = {
      maxHp: base.hp ?? 100,
      hp: base.hp ?? 100,
      speed: base.speed ?? 100,
      atk: base.atk ?? 1,
      cooldownReduction: base.cooldownReduction ?? 0,
      expBonus: base.expBonus ?? 0,
      pickupRadius: 80,
      critChance: 0.05,
      critDmg: 1.5,
      regenRate: 0,
      armor: 0,
      luckBonusCards: 0,
      lifesteal: 0,
      knockbackMul: 1,
      revives: 1,
      extraRevives: 0,
      critChanceBase: 0,
      pierceBonus: 0,
      thorns: 0,
      berserk: 0,
    };
    this._regenAcc = 0;

    this.invulnUntil = 0;
    this.alive = true;
    this.kills = 0;
    this.gold = 0;
    this.level = 1;
    this.exp = 0;
    this.expToNext = 5;

    // 대시: 0.2초 무적 + 가속, 쿨다운 데이터 기반
    this.stats.dashCooldown = 2500; // ms
    this.stats.dashDuration = 200;  // ms
    this.stats.dashSpeedMul = 3.5;
    this.dashUntil = 0;
    this.dashReadyAt = 0;
    this.lastMoveDir = { x: 1, y: 0 };
    this.facing = 1;

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  // 입력 벡터로 이동
  move(vec, dt) {
    if (!this.alive) return;
    const now = this.scene.time.now;
    const isDashing = now < this.dashUntil;
    const speed = this.stats.speed * (isDashing ? this.stats.dashSpeedMul : 1);
    let vx = vec.x * speed;
    let vy = vec.y * speed;
    if (isDashing) {
      vx = this.lastMoveDir.x * speed;
      vy = this.lastMoveDir.y * speed;
    }
    this.body.setVelocity(vx, vy);

    if (vec.x !== 0 || vec.y !== 0) {
      this.lastMoveDir.x = vec.x;
      this.lastMoveDir.y = vec.y;
      const len = Math.sqrt(vec.x * vec.x + vec.y * vec.y) || 1;
      this.lastMoveDir.x /= len;
      this.lastMoveDir.y /= len;
      if (vec.x !== 0) this.facing = vec.x > 0 ? 1 : -1;
      this.bodySprite.scaleY = 1 + Math.sin(now / 80) * 0.05;
      this.bodySprite.scaleX = (1 - Math.sin(now / 80) * 0.03) * this.facing;
      if (this.eyeL) this.eyeL.x = -5 * this.facing;
      if (this.eyeR) this.eyeR.x = 5 * this.facing;
    } else {
      this.bodySprite.scaleY = 1;
      this.bodySprite.scaleX = 1 * this.facing;
    }

    if (isDashing) {
      // 대시 잔상
      if (this.scene.particles && Math.random() < 0.5) {
        this.scene.particles.burst(this.x, this.y, 2, 0x88ccff, { life: 200, speed: 10, size: 3 });
      }
      this.bodySprite.alpha = 0.55;
    } else {
      this.bodySprite.alpha = 1;
    }
  }

  tryDash() {
    if (!this.alive) return false;
    const now = this.scene.time.now;
    if (now < this.dashReadyAt) return false;
    if (this.lastMoveDir.x === 0 && this.lastMoveDir.y === 0) return false;
    this.dashUntil = now + this.stats.dashDuration;
    this.dashReadyAt = now + this.stats.dashCooldown;
    this.invulnUntil = Math.max(this.invulnUntil, this.dashUntil + 60);
    if (this.scene.particles) {
      this.scene.particles.burst(this.x, this.y, 6, 0x88ccff, { life: 280, speed: 100 });
    }
    Haptics.light();
    // 짧은 시간 슬로우 (시각적 강조)
    if (this.scene && this.scene.time) {
      this.scene.time.timeScale = 0.55;
      this.scene.physics.world.timeScale = 1.6; // 물리는 빠르게 (역수)
      this.scene.time.delayedCall(180, () => {
        this.scene.time.timeScale = 1;
        this.scene.physics.world.timeScale = 1;
      });
    }
    EventBus.emit('player:dashed', { readyAt: this.dashReadyAt });
    return true;
  }

  dashRatio() {
    const now = this.scene.time.now;
    const cd = this.stats.dashCooldown;
    if (now >= this.dashReadyAt) return 1;
    return 1 - (this.dashReadyAt - now) / cd;
  }

  takeDamage(amount, attacker = null) {
    if (!this.alive) return;
    if (this.scene.time.now < this.invulnUntil) return;
    const reduced = Math.max(1, amount - (this.stats.armor || 0));
    this.stats.hp = Math.max(0, this.stats.hp - reduced);

    // 가시(thorns) — 공격자에게 반사
    if (this.stats.thorns > 0 && attacker && this.scene.collisionSystem) {
      const back = Math.max(1, Math.floor(reduced * this.stats.thorns));
      this.scene.collisionSystem.applyDamage(attacker, back, this.x, this.y, 0);
    }
    this.invulnUntil = this.scene.time.now + 600;

    // 피격 점멸
    this.scene.tweens.add({
      targets: this.bodySprite,
      alpha: 0.3,
      duration: 80,
      yoyo: true,
      repeat: 3,
      onComplete: () => this.bodySprite.setAlpha(1),
    });

    Haptics.med();
    EventBus.emit('player:damaged', { amount: reduced, currentHP: this.stats.hp, maxHP: this.stats.maxHp });

    if (this.stats.hp <= 0) this.die();
  }

  // GameScene update에서 호출 — HP 자동 회복
  tick(dt) {
    if (!this.alive) return;
    if (this.stats.regenRate > 0) {
      this._regenAcc += (this.stats.regenRate * dt) / 1000;
      if (this._regenAcc >= 1) {
        const heal = Math.floor(this._regenAcc);
        this._regenAcc -= heal;
        if (this.stats.hp < this.stats.maxHp) {
          this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + heal);
          EventBus.emit('player:healed', { amount: heal, currentHP: this.stats.hp, maxHP: this.stats.maxHp });
        }
      }
    }
  }

  heal(amount) {
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount);
    EventBus.emit('player:healed', { amount, currentHP: this.stats.hp, maxHP: this.stats.maxHp });
  }

  gainExp(amount) {
    if (!this.alive) return;
    const total = Math.floor(amount * (1 + this.stats.expBonus));
    this.exp += total;
    while (this.exp >= this.expToNext) {
      this.exp -= this.expToNext;
      this.level += 1;
      this.expToNext = Math.floor(this.level * 5 + 5);
      AudioManager.levelUp();
      Haptics.med();
      if (this.scene && this.scene.particles) {
        this.scene.particles.burst(this.x, this.y, 16, 0xffe14d, { life: 600, speed: 180, size: 4 });
      }
      EventBus.emit('player:levelup', { level: this.level });
    }
    EventBus.emit('player:exp-changed', {
      exp: this.exp,
      expToNext: this.expToNext,
      level: this.level,
    });
  }

  applyPassive(passive) {
    const e = passive.effect;
    if (!e) return;
    const k = e.key;
    // knockbackMul 같이 곱연산이지만 add로 들어오는 경우 처리: 기본값 1 + add
    if (e.add !== undefined) {
      const def = (k === 'knockbackMul' || k === 'critDmg') ? 1 : 0;
      this.stats[k] = (this.stats[k] ?? def) + e.add;
    }
    if (e.mul !== undefined) {
      this.stats[k] = (this.stats[k] ?? 1) * e.mul;
    }
    if (k === 'maxHp' && e.add) {
      this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + e.add);
    }
  }

  die() {
    if (!this.alive) return;
    // 부활 처리
    const revives = (this.stats.revives || 0) + (this.stats.extraRevives || 0);
    if (revives > 0) {
      this.stats.revives = Math.max(0, (this.stats.revives || 0) - 1);
      if (this.stats.revives < 0 || (revives - 1) >= 0) {
        // 한 번 사용
        if (this.stats.revives === 0 && this.stats.extraRevives > 0) {
          this.stats.extraRevives -= 1;
        }
      }
      this.stats.hp = Math.floor(this.stats.maxHp * 0.5);
      this.invulnUntil = this.scene.time.now + 2500;
      // 광역 정리 — 주변 적 즉사
      if (this.scene.waveSystem) {
        const list = [];
        this.scene.waveSystem.activeEnemies.forEach((e) => {
          const dx = e.x - this.x;
          const dy = e.y - this.y;
          if (dx * dx + dy * dy < 200 * 200 && !e.isBoss) list.push(e);
        });
        list.forEach((e) => {
          e.hp = 0;
          if (this.scene.collisionSystem) this.scene.collisionSystem._killEnemy(e);
        });
      }
      if (this.scene.cameras && this.scene.cameras.main) {
        this.scene.cameras.main.flash(500, 255, 220, 100);
        this.scene.cameras.main.shake(300, 0.01);
      }
      AudioManager.achievement();
      if (this.scene.hud && this.scene.hud.showAnnounce) {
        this.scene.hud.showAnnounce('부활!', 0xffe14d, 1800);
      }
      EventBus.emit('player:revived', { remaining: this.stats.revives + this.stats.extraRevives });
      return;
    }

    this.alive = false;
    this.body.setVelocity(0, 0);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      angle: 90,
      duration: 600,
    });
    EventBus.emit('player:died', {
      kills: this.kills,
      gold: this.gold,
      level: this.level,
    });
  }
}
