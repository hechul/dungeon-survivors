import Phaser from 'phaser';
import { SCREEN } from '../config/constants.js';
import EventBus from '../managers/EventBus.js';
import AudioManager from '../managers/AudioManager.js';
import Haptics from '../managers/Haptics.js';

// data/waves.json timeline 기반 적 스폰 관리
export default class WaveSystem {
  constructor(scene, pools) {
    this.scene = scene;
    this.pools = pools;
    this.timeline = scene.cache.json.get('waves').timeline;
    this.enemiesData = scene.cache.json.get('enemies');
    this.activeEnemies = new Set();
    this.spawnTimer = 0;
    this.currentStageIdx = 0;
    this.spawnedBosses = new Set();
    this.gameClear = false;
    this.lastEliteSpawn = 0;
    this.endlessMode = false;
    this.endlessLoop = 0;
    this.endlessNextBossAt = 0;
    this.bossRotation = ['skeleton_king', 'dark_mage', 'dragon', 'demon_king'];
    this.bossRotationIdx = 0;
    // 미니 보스 트리거 시간 (초) — 메인 보스 시간과 겹치지 않게
    this.miniBossTimes = [120, 480, 720, 1080, 1440];
    this.miniBossSpawned = new Set();
    this.miniBossPool = ['giant', 'sniper', 'caster'];

    EventBus.on('enemy:released', this._onEnemyReleased, this);
  }

  _onEnemyReleased(enemy) {
    this.activeEnemies.delete(enemy);
  }

  // 현재 시간(초)에 해당하는 stage 찾기
  _currentStage(elapsed) {
    let stage = this.timeline[0];
    for (let i = 0; i < this.timeline.length; i += 1) {
      if (this.timeline[i].time <= elapsed) {
        stage = this.timeline[i];
        this.currentStageIdx = i;
      } else break;
    }
    return stage;
  }

  update(time, delta, elapsed) {
    const stage = this._currentStage(elapsed);

    // 일반 모드 — 보스 스폰 (한 번만)
    if (!this.endlessMode && stage.boss && !this.spawnedBosses.has(stage.time)) {
      this.spawnedBosses.add(stage.time);
      this._spawnBoss(stage);
    }

    // 미니 보스 스폰 (한 번만, 일반 모드에서만)
    if (!this.endlessMode) {
      this.miniBossTimes.forEach((mbTime) => {
        if (this.miniBossSpawned.has(mbTime)) return;
        if (elapsed >= mbTime) {
          this.miniBossSpawned.add(mbTime);
          this._spawnMiniBoss(stage, mbTime);
        }
      });
    }

    // 무한 모드 — 30초마다 보스 재스폰 (시간이 갈수록 짧아짐)
    if (this.endlessMode) {
      if (this.endlessNextBossAt === 0) this.endlessNextBossAt = time + 15000;
      if (time >= this.endlessNextBossAt) {
        const bossId = this.bossRotation[this.bossRotationIdx % this.bossRotation.length];
        this.bossRotationIdx += 1;
        this._spawnBossById(bossId, stage);
        const interval = Math.max(15000, 35000 - this.endlessLoop * 3000);
        this.endlessNextBossAt = time + interval;
      }
    }

    // 엘리트 스폰
    if (stage.elite && stage.eliteInterval) {
      const intervalMs = stage.eliteInterval * 1000;
      if (elapsed * 1000 - this.lastEliteSpawn >= intervalMs) {
        this.lastEliteSpawn = elapsed * 1000;
        this._spawnElite(stage);
      }
    }

    // 일반 적 스폰
    this.spawnTimer -= delta;
    const spawnInterval = 1000 / Math.max(0.1, stage.spawnRate || 1);
    const endlessBoost = this.endlessMode ? 1 + this.endlessLoop * 0.5 : 1;
    const rushMul = (this._rushUntil && time < this._rushUntil) ? (this._rushMul || 1) : 1;
    while (this.spawnTimer <= 0) {
      this.spawnTimer += spawnInterval / endlessBoost / rushMul;
      if (this.activeEnemies.size < (stage.maxOnScreen || 30) * endlessBoost * rushMul) {
        this._spawnEnemy(stage);
      }
    }
  }

  _spawnElite(stage) {
    const data = this.enemiesData[stage.elite];
    if (!data) return;
    const player = this.scene.player;
    const pos = this._randomSpawnPosAround(player);
    const e = this.pools.get('enemy');
    e.spawn(data, stage.elite, pos.x, pos.y, stage.hpMul || 1, stage.dmgMul || 1, true);
    this.scene.enemyGroup.add(e);
    this.activeEnemies.add(e);
    EventBus.emit('wave:elite-spawn', { type: stage.elite });
    if (this.scene.cameras && this.scene.cameras.main) this.scene.cameras.main.flash(120, 255, 200, 100);
  }

  _spawnMiniBoss(stage, mbTime) {
    const pool = this.miniBossPool;
    const typeId = pool[Math.floor(Math.random() * pool.length)];
    const data = this.enemiesData[typeId];
    if (!data) return;
    const player = this.scene.player;
    // 한 번에 3마리, 엘리트 강화
    for (let i = 0; i < 3; i += 1) {
      const angle = (i / 3) * Math.PI * 2;
      const r = 220;
      const ex = player.x + Math.cos(angle) * r;
      const ey = player.y + Math.sin(angle) * r;
      const e = this.pools.get('enemy');
      e.spawn(data, typeId, ex, ey, (stage.hpMul || 1) * 2.5, (stage.dmgMul || 1) * 1.2, true);
      this.scene.enemyGroup.add(e);
      this.activeEnemies.add(e);
    }
    if (this.scene.hud && this.scene.hud.showAnnounce) {
      this.scene.hud.showAnnounce(`미니 보스: ${data.name} 무리`, 0xffaa44, 2200);
    }
    if (this.scene.cameras && this.scene.cameras.main) {
      this.scene.cameras.main.flash(150, 200, 100, 60);
    }
    AudioManager.bossSpawn();
    EventBus.emit('wave:miniboss-spawn', { type: typeId });
  }

  enableEndless() {
    this.endlessMode = true;
    this.endlessLoop = 0;
  }

  bumpEndlessLoop() {
    this.endlessLoop += 1;
  }

  _randomSpawnPosAround(player) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.max(SCREEN.WIDTH, SCREEN.HEIGHT) * 0.65;
    return {
      x: player.x + Math.cos(angle) * dist,
      y: player.y + Math.sin(angle) * dist,
    };
  }

  _spawnEnemy(stage) {
    const types = stage.enemies || ['slime'];
    const typeId = types[Math.floor(Math.random() * types.length)];
    const data = this.enemiesData[typeId];
    if (!data) return;
    const player = this.scene.player;
    const pos = this._randomSpawnPosAround(player);
    const swarmCount = data.swarm ? data.swarm : 1;
    const hpMul = (stage.hpMul || 1) * (this.endlessMode ? Math.pow(1.5, this.endlessLoop) : 1);
    const dmgMul = (stage.dmgMul || 1) * (this.endlessMode ? Math.pow(1.2, this.endlessLoop) : 1);
    for (let i = 0; i < swarmCount; i += 1) {
      const enemy = this.pools.get('enemy');
      const ox = (Math.random() - 0.5) * 60;
      const oy = (Math.random() - 0.5) * 60;
      enemy.spawn(data, typeId, pos.x + ox, pos.y + oy, hpMul, dmgMul);
      this.scene.enemyGroup.add(enemy);
      this.activeEnemies.add(enemy);
    }
  }

  _spawnBoss(stage) {
    this._spawnBossById(stage.boss, stage, !!stage.final);
  }

  _spawnBossById(bossId, stage, isFinal = false) {
    const data = this.enemiesData[bossId];
    if (!data) return;
    const player = this.scene.player;
    const pos = this._randomSpawnPosAround(player);
    const boss = this.pools.get('enemy');
    const hpMul = (stage?.hpMul || 1) * (this.endlessMode ? Math.pow(2, this.endlessLoop + 1) : 1);
    const dmgMul = (stage?.dmgMul || 1) * (this.endlessMode ? Math.pow(1.3, this.endlessLoop) : 1);
    boss.spawn(data, bossId, pos.x, pos.y, hpMul, dmgMul);
    this.scene.enemyGroup.add(boss);
    this.activeEnemies.add(boss);
    EventBus.emit('wave:boss-spawn', { bossType: bossId, time: stage?.time || 0, isFinal });

    AudioManager.bossSpawn();
    Haptics.heavy();
    this.scene.cameras.main.shake(500, 0.012);
    this.scene.cameras.main.flash(200, 60, 0, 80);
  }

  updateEnemies(time, delta) {
    const player = this.scene.player;
    this.activeEnemies.forEach((enemy) => {
      if (enemy.active) enemy.update(time, delta, player);
    });
  }

  releaseEnemy(enemy) {
    this.activeEnemies.delete(enemy);
    this.scene.enemyGroup.remove(enemy, false, false);
    this.pools.release(enemy);
  }

  destroy() {
    EventBus.off('enemy:released', this._onEnemyReleased, this);
    this.activeEnemies.clear();
  }
}
