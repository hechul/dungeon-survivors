import Phaser from 'phaser';
import EventBus from '../managers/EventBus.js';
import AudioManager from '../managers/AudioManager.js';

// 충돌/데미지 처리 — 무기↔적 / 적↔플레이어 / 젬↔플레이어
export default class CollisionSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;

    // 적 ↔ 플레이어 (오버랩)
    this.col1 = scene.physics.add.overlap(player, scene.enemyGroup, this._enemyHitsPlayer, null, this);
    // 젬 ↔ 플레이어
    this.col2 = scene.physics.add.overlap(player, scene.gemGroup, this._pickupGem, null, this);
    // 투사체 ↔ 적
    this.col3 = scene.physics.add.overlap(scene.projectileGroup, scene.enemyGroup, this._projectileHits, null, this);
    // 적 투사체 ↔ 플레이어
    if (scene.enemyProjectileGroup) {
      this.col4 = scene.physics.add.overlap(player, scene.enemyProjectileGroup, this._enemyProjHitsPlayer, null, this);
    }
    // 픽업 ↔ 플레이어
    if (scene.pickupGroup) {
      this.col5 = scene.physics.add.overlap(player, scene.pickupGroup, this._pickupItem, null, this);
    }
  }

  _pickupItem(player, item) {
    if (!item.active) return;
    const kind = item.kind;
    item.setActive(false);
    item.setVisible(false);
    if (item.body) item.body.enable = false;
    this.scene.pickupGroup.remove(item, false, false);
    this.scene.pools.release(item);
    AudioManager.pickup();
    if (kind === 'magnet') {
      // 모든 젬 흡수
      this.scene.gemGroup.children.iterate((g) => {
        if (g && g.active) {
          this.scene.tweens.add({
            targets: g,
            x: player.x,
            y: player.y,
            duration: 240,
            onComplete: () => this._pickupGem(player, g),
          });
        }
      });
      if (this.scene.hud && this.scene.hud.showAnnounce) this.scene.hud.showAnnounce('자석!', 0x66ccff, 1200);
    } else if (kind === 'bomb') {
      // 화면 안 모든 적 즉사 (보스 제외)
      const cam = this.scene.cameras.main;
      const left = cam.scrollX, top = cam.scrollY;
      const right = left + cam.width, bottom = top + cam.height;
      const list = [];
      this.scene.waveSystem.activeEnemies.forEach((e) => {
        if (!e.active || e.isBoss) return;
        if (e.x >= left && e.x <= right && e.y >= top && e.y <= bottom) list.push(e);
      });
      list.forEach((e) => {
        e.hp = 0;
        this._killEnemy(e);
      });
      this.scene.cameras.main.shake(300, 0.012);
      this.scene.cameras.main.flash(220, 255, 200, 100);
      AudioManager.explode();
      if (this.scene.hud && this.scene.hud.showAnnounce) this.scene.hud.showAnnounce('폭탄!', 0xff5577, 1200);
    } else if (kind === 'boost') {
      player._frenzyMul = (player._frenzyMul || 1) * 1.5;
      this.scene.time.delayedCall(8000, () => {
        if (player) player._frenzyMul = (player._frenzyMul || 1) / 1.5;
      });
      if (this.scene.hud && this.scene.hud.showAnnounce) this.scene.hud.showAnnounce('공격력 부스트!', 0xffe14d, 1500);
    } else if (kind === 'heal') {
      player.heal(Math.max(20, Math.floor(player.stats.maxHp * 0.3)));
      if (this.scene.hud && this.scene.hud.showAnnounce) this.scene.hud.showAnnounce('회복!', 0x4dffa0, 1200);
    }
  }

  _enemyProjHitsPlayer(player, proj) {
    if (!proj.active || !player.alive) return;
    if (this.scene.time.now < player.invulnUntil) return;
    player.takeDamage(proj.damage);
    proj.setActive(false);
    proj.setVisible(false);
    if (proj.body) proj.body.enable = false;
    this.scene.enemyProjectileGroup.remove(proj, false, false);
    this.scene.pools.release(proj);
    AudioManager.playerHurt();
  }

  _enemyHitsPlayer(player, enemy) {
    if (!enemy.active || !player.alive) return;
    if (this.scene.time.now < player.invulnUntil) return;
    player.takeDamage(enemy.damage, enemy);
    AudioManager.playerHurt();
    if (this.scene.particles) {
      this.scene.particles.burst(player.x, player.y, 8, 0xff5577, { life: 300, speed: 100 });
    }
    this.scene.cameras.main.shake(120, 0.006);
  }

  _pickupGem(player, gem) {
    if (!gem.active) return;
    gem.setActive(false);
    gem.setVisible(false);
    if (gem.body) gem.body.enable = false;
    this.scene.gemGroup.remove(gem, false, false);
    this.scene.pools.release(gem);
    player.gainExp(gem.value);
    AudioManager.pickup();
    EventBus.emit('player:exp-pickup', { value: gem.value });
  }

  _projectileHits(projectile, enemy) {
    if (!projectile.active || !enemy.active) return;
    if (projectile.isEnemyProjectile) return;
    if (!projectile.hits || projectile.hits.has(enemy)) return;
    const dmg = projectile.damage;
    const isCrit = !!projectile.isPlayerCrit;
    projectile.hit(enemy, this.scene.pools);
    this.applyDamage(enemy, dmg, projectile.x, projectile.y, 40, isCrit);
    if (!projectile.active) {
      this.scene.projectileGroup.remove(projectile, false, false);
    }
  }

  // 모든 무기 시스템에서 적에게 데미지 가할 때 호출
  applyDamage(enemy, amount, fromX, fromY, knockback = 50, isCrit = false) {
    if (!enemy.active) return;
    const killed = enemy.takeDamage(amount, fromX, fromY, knockback);
    // 데미지 숫자
    const dn = this.scene.pools.get('damageNumber');
    dn.spawn(enemy.x, enemy.y - 12, amount, isCrit);
    AudioManager.hit();

    if (killed) this._killEnemy(enemy);
  }

  _killEnemy(enemy) {
    const player = this.player;
    const x = enemy.x;
    const y = enemy.y;
    const exp = enemy.exp;
    const gold = enemy.goldDrop;
    const wasBoss = enemy.isBoss;
    const enemyType = enemy.enemyType;
    const enemyColor = enemy.tintTopLeft || 0xff4444;

    // 사망 파티클 + 사운드
    if (this.scene.particles) {
      this.scene.particles.burst(x, y, wasBoss ? 32 : 8, enemyColor, {
        life: wasBoss ? 700 : 380,
        speed: wasBoss ? 220 : 130,
        size: wasBoss ? 5 : 3,
      });
    }
    if (wasBoss) {
      AudioManager.bossKill();
      this.scene.cameras.main.shake(500, 0.015);
    } else {
      AudioManager.enemyKill();
    }

    // 젬 드롭
    const gem = this.scene.pools.get('expGem');
    gem.spawn(x, y, exp);
    this.scene.gemGroup.add(gem);

    // 엘리트는 추가 보물 (골드 젬)
    if (enemy.isElite) {
      for (let i = 0; i < 3; i += 1) {
        const g = this.scene.pools.get('expGem');
        const a = (i / 3) * Math.PI * 2;
        g.spawn(x + Math.cos(a) * 14, y + Math.sin(a) * 14, Math.max(5, Math.floor(exp * 0.6)));
        this.scene.gemGroup.add(g);
      }
    }

    // 낮은 확률 픽업 드롭 (보스/엘리트는 더 높음)
    const dropChance = wasBoss ? 1.0 : enemy.isElite ? 0.4 : 0.012;
    if (Math.random() < dropChance) {
      const kinds = ['magnet', 'bomb', 'boost', 'heal'];
      const kind = wasBoss ? 'boost' : kinds[Math.floor(Math.random() * kinds.length)];
      const p = this.scene.pools.get('pickup');
      p.spawn(x, y, kind);
      this.scene.pickupGroup.add(p);
    }

    // 골드 적립 (이벤트 적용)
    player.gold += gold * (player._goldMul || 1);
    player.kills += 1;
    // 흡혈
    if (player.stats.lifesteal > 0) player.heal(player.stats.lifesteal);

    // 풀로 반환
    this.scene.waveSystem.releaseEnemy(enemy);

    EventBus.emit('enemy:killed', { type: enemyType, x, y, exp, gold, isBoss: wasBoss, isElite: !!enemy.isElite });

    // 엘리트/보스 처치 시 보물상자 트리거 (강제 강화 1회)
    if ((wasBoss || enemy.isElite) && this.scene.levelUpSystem) {
      this.scene.levelUpSystem.triggerChest();
    }

    // 최종 보스 처치 시 — 무한 모드 진입
    if (wasBoss) {
      const finalBoss = this._isFinalBoss(enemyType);
      if (finalBoss && !this.scene.waveSystem.endlessMode) {
        EventBus.emit('game:clear', { time: this.scene.elapsed });
        AudioManager.bossKill();
        this.scene.waveSystem.enableEndless();
        // 알림 텍스트
        if (this.scene.hud && this.scene.hud.showAnnounce) {
          this.scene.hud.showAnnounce('VICTORY! 무한 모드 시작', 0xffaa00, 4000);
        }
        this.scene.cameras.main.flash(800, 255, 200, 100);
      } else if (finalBoss && this.scene.waveSystem.endlessMode) {
        // 무한 모드에서 마왕 재처치 → 루프 +1, 더 강해짐
        this.scene.waveSystem.bumpEndlessLoop();
        if (this.scene.hud && this.scene.hud.showAnnounce) {
          this.scene.hud.showAnnounce(
            `루프 ${this.scene.waveSystem.endlessLoop + 1}!`,
            0xffaa00,
            3000
          );
        }
      }
    }
  }

  _isFinalBoss(typeId) {
    const timeline = this.scene.cache.json.get('waves').timeline;
    const finalEntry = timeline.find((s) => s.final && s.boss === typeId);
    return !!finalEntry;
  }

  update() {
    // 매 프레임 풀 객체 업데이트
    const player = this.player;
    if (this.scene.waveSystem) {
      this.scene.waveSystem.updateEnemies(this.scene.time.now, this.scene.game.loop.delta);
    }
    // 젬 자석
    this.scene.gemGroup.children.iterate((gem) => {
      if (gem && gem.active) gem.update(player);
    });
    // 투사체 수명
    this.scene.projectileGroup.children.iterate((proj) => {
      if (proj && proj.active) proj.update(this.scene.time.now);
    });
    if (this.scene.enemyProjectileGroup) {
      this.scene.enemyProjectileGroup.children.iterate((proj) => {
        if (proj && proj.active) proj.update(this.scene.time.now);
      });
    }
  }

  destroy() {
    if (this.col1) this.col1.destroy();
    if (this.col2) this.col2.destroy();
    if (this.col3) this.col3.destroy();
    if (this.col4) this.col4.destroy();
    if (this.col5) this.col5.destroy();
  }
}
