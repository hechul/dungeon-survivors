import Phaser from 'phaser';
import { SCREEN, DEPTH, COLORS } from '../config/constants.js';
import EventBus from '../managers/EventBus.js';
import PoolManager from '../managers/PoolManager.js';
import SaveManager from '../managers/SaveManager.js';
import Player from '../entities/Player.js';
import VirtualJoystick from '../ui/VirtualJoystick.js';
import InputSystem from '../systems/InputSystem.js';
import HUD from '../ui/HUD.js';
import DashButton from '../ui/DashButton.js';
import OffscreenIndicators from '../ui/OffscreenIndicators.js';
import WaveSystem from '../systems/WaveSystem.js';
import WeaponSystem from '../systems/WeaponSystem.js';
import CollisionSystem from '../systems/CollisionSystem.js';
import LevelUpSystem from '../systems/LevelUpSystem.js';
import ComboSystem from '../systems/ComboSystem.js';
import EventSystem from '../systems/EventSystem.js';
import HazardSystem from '../systems/HazardSystem.js';
import SynergySystem from '../systems/SynergySystem.js';
import MetaProgressSystem from '../systems/MetaProgressSystem.js';
import ParticleSystem from '../systems/ParticleSystem.js';
import AudioManager from '../managers/AudioManager.js';
import Enemy from '../entities/Enemy.js';
import ExpGem from '../entities/ExpGem.js';
import DamageNumber from '../entities/DamageNumber.js';
import Projectile from '../entities/Projectile.js';
import Pickup from '../entities/Pickup.js';

// 메인 게임 씬 — 모든 시스템 조립
export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.runStartTime = 0;
    this.elapsed = 0;
    this.paused = false;
    this.selectedCharacter = data?.characterId || 'warrior';
  }

  create() {
    // 무한 배경 (TileSprite — 카메라 따라가도록 setScrollFactor 0 + 위치 동기화)
    this.bg = this.add.tileSprite(0, 0, SCREEN.WIDTH, SCREEN.HEIGHT, 'bg_tile');
    this.bg.setOrigin(0, 0);
    this.bg.setScrollFactor(0);
    this.bg.setDepth(DEPTH.BG);

    // 큰 월드 (카메라 추적)
    this.physics.world.setBounds(-50000, -50000, 100000, 100000);
    this.cameras.main.setBackgroundColor(COLORS.BG);

    // 풀 매니저
    this.pools = new PoolManager(this);
    this.pools.register('enemy', (s) => new Enemy(s, 0, 0));
    this.pools.register('expGem', (s) => new ExpGem(s, 0, 0));
    this.pools.register('damageNumber', (s) => new DamageNumber(s, 0, 0));
    this.pools.register('projectile', (s) => new Projectile(s, 0, 0));
    this.pools.register('pickup', (s) => new Pickup(s, 0, 0));

    // 그룹 (충돌용)
    this.enemyGroup = this.physics.add.group();
    this.gemGroup = this.physics.add.group({ allowGravity: false });
    this.projectileGroup = this.physics.add.group();
    this.enemyProjectileGroup = this.physics.add.group();
    this.pickupGroup = this.physics.add.group({ allowGravity: false });

    // 캐릭터 데이터 + 플레이어
    const charactersData = this.cache.json.get('characters');
    const charData = charactersData[this.selectedCharacter] || charactersData.warrior;
    this.player = new Player(this, 0, 0, charData);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setLerp(0.12, 0.12);
    this.cameras.main.setFollowOffset(0, 0);

    // 영구 메타 강화 적용
    this._applyMetaUpgrades();

    // UI / 입력
    this.joystick = new VirtualJoystick(this);
    this.input2 = new InputSystem(this, this.joystick);
    this.hud = new HUD(this, this.player);
    this.dashBtn = new DashButton(this, this.player);
    this.offscreenIndicators = new OffscreenIndicators(this, this.player);

    // 대시 입력 → 플레이어
    EventBus.on('input:dash', () => this.player.tryDash(), this);

    // 시스템
    this.particles = new ParticleSystem(this);
    this.waveSystem = new WaveSystem(this, this.pools);
    this.weaponSystem = new WeaponSystem(this, this.pools, this.player, charData.startWeapon);
    this.collisionSystem = new CollisionSystem(this, this.player);
    this.levelUpSystem = new LevelUpSystem(this, this.player, this.weaponSystem);
    this.synergySystem = new SynergySystem(this, this.player, this.weaponSystem, this.levelUpSystem);
    this.comboSystem = new ComboSystem(this, this.player);
    this.eventSystem = new EventSystem(this);
    this.hazardSystem = new HazardSystem(this);
    this.metaSystem = new MetaProgressSystem(this);

    this.runStartTime = this.time.now;

    // 이벤트
    EventBus.on('game:toggle-pause', this._togglePause, this);
    EventBus.on('player:died', this._onPlayerDied, this);
    EventBus.on('game:resume', this._resumeFromPause, this);
    EventBus.on('game:pause', this._pauseGame, this);

    // 정리 핸들러
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this._cleanup, this);
  }

  _applyMetaUpgrades() {
    try {
      const meta = SaveManager?.load()?.metaUpgrades || {};
      const defs = this.cache.json.get('metaUpgrades') || {};
      Object.entries(meta).forEach(([id, level]) => {
        const def = defs[id];
        if (!def || !level) return;
        const e = def.effect;
        for (let i = 0; i < level; i += 1) {
          if (e.add !== undefined) {
            this.player.stats[e.key] = (this.player.stats[e.key] ?? 0) + e.add;
          }
          if (e.mul !== undefined) {
            this.player.stats[e.key] = (this.player.stats[e.key] ?? 1) * e.mul;
          }
        }
      });
      // 합산 보정
      if (this.player.stats.speedMul) {
        this.player.stats.speed *= 1 + this.player.stats.speedMul;
      }
      if (this.player.stats.atkMul) {
        this.player.stats.atk *= 1 + this.player.stats.atkMul;
      }
      if (this.player.stats.expBonusBase) {
        this.player.stats.expBonus += this.player.stats.expBonusBase;
      }
      if (this.player.stats.pickupRadiusMul) {
        this.player.stats.pickupRadius *= 1 + this.player.stats.pickupRadiusMul;
      }
      if (this.player.stats.critChanceBase) {
        this.player.stats.critChance += this.player.stats.critChanceBase;
      }
      this.player.stats.hp = this.player.stats.maxHp;
    } catch (e) {
      // 무시
    }
  }

  update(time, delta) {
    if (this.paused || !this.player.alive) return;
    this.elapsed = (time - this.runStartTime) / 1000;

    // 입력 → 플레이어 이동
    const vec = this.input2.poll();
    this.player.move(vec, delta);
    this.player.tick(delta);

    // 카메라 룩어헤드: 플레이어가 움직이는 방향으로 카메라 약간 앞당김
    if (this.cameras.main && (vec.x !== 0 || vec.y !== 0)) {
      const targetOffsetX = -vec.x * 40;
      const targetOffsetY = -vec.y * 40;
      const cur = this.cameras.main.followOffset;
      cur.x += (targetOffsetX - cur.x) * 0.05;
      cur.y += (targetOffsetY - cur.y) * 0.05;
    } else if (this.cameras.main) {
      const cur = this.cameras.main.followOffset;
      cur.x *= 0.95;
      cur.y *= 0.95;
    }

    // 배경 타일 위치 동기화 (카메라 위치에 따라 모듈로 스크롤)
    this.bg.tilePositionX = this.cameras.main.scrollX;
    this.bg.tilePositionY = this.cameras.main.scrollY;

    // 시스템 업데이트
    this.waveSystem.update(time, delta, this.elapsed);
    this.weaponSystem.update(time, delta);
    this.collisionSystem.update();
  }

  _togglePause() {
    if (this.paused) this._resumeFromPause();
    else this._openPauseScene();
  }

  _openPauseScene() {
    if (this.paused) return;
    this.paused = true;
    this.scene.launch('PauseScene', {
      weaponSlots: this.weaponSystem.slots,
      player: this.player,
      elapsed: this.elapsed,
    });
    this.scene.pause();
  }

  _pauseGame() {
    if (this.paused) return;
    this.paused = true;
    this.physics.world.pause();
  }

  _resumeFromPause() {
    if (!this.paused) return;
    this.paused = false;
    this.physics.world.resume();
  }

  _onPlayerDied(payload) {
    this._pauseGame();
    AudioManager.playerHurt();
    this.cameras.main.shake(400, 0.02);
    this.cameras.main.fade(800, 0, 0, 0);
    if (this.metaSystem) {
      this.metaSystem.finalize({
        time: this.elapsed,
        kills: this.player.kills,
        level: this.player.level,
      });
    }
    this.time.delayedCall(900, () => {
      this.scene.start('GameOverScene', {
        time: this.elapsed,
        kills: this.player.kills,
        gold: this.player.gold,
        level: this.player.level,
      });
    });
  }

  _cleanup() {
    EventBus.off('game:toggle-pause', this._togglePause, this);
    EventBus.off('player:died', this._onPlayerDied, this);
    EventBus.off('game:resume', this._resumeFromPause, this);
    EventBus.off('game:pause', this._pauseGame, this);
    if (this.weaponSystem) this.weaponSystem.destroy();
    if (this.waveSystem) this.waveSystem.destroy();
    if (this.collisionSystem) this.collisionSystem.destroy();
    if (this.levelUpSystem) this.levelUpSystem.destroy();
    if (this.metaSystem) this.metaSystem.destroy();
    if (this.synergySystem) this.synergySystem.destroy();
    if (this.comboSystem) this.comboSystem.destroy();
    if (this.eventSystem) this.eventSystem.destroy();
    if (this.hazardSystem) this.hazardSystem.destroy();
    if (this.particles) this.particles.destroy();
    if (this.dashBtn) this.dashBtn.destroy();
    if (this.offscreenIndicators) this.offscreenIndicators.destroy();
    if (this.hud) this.hud.destroy();
    EventBus.off('input:dash');
  }
}
