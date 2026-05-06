import EventBus from '../managers/EventBus.js';
import SaveManager from '../managers/SaveManager.js';

// 메타 프로그레션: 영구 통계, 도전과제 진행, 캐릭터 해금
// 게임 씬에서 활성화되며, 런 종료 시 결과를 SaveManager에 영속화
export default class MetaProgressSystem {
  constructor(scene) {
    this.scene = scene;
    this.achievementsData = scene.cache.json.get('achievements') || {};
    this.charactersData = scene.cache.json.get('characters') || {};

    // 런 단위 통계
    this.runStats = {
      kills: 0,
      maxLevel: 1,
      bossesKilled: new Set(),
      damageDealt: 0,
      damageTaken: 0,
      gemsPicked: 0,
    };

    this._onEnemyKilled = this._onEnemyKilled.bind(this);
    this._onLevelUp = this._onLevelUp.bind(this);
    this._onWeaponLevelUp = this._onWeaponLevelUp.bind(this);
    this._onPlayerDamaged = this._onPlayerDamaged.bind(this);
    this._onExpPickup = this._onExpPickup.bind(this);
    this._onGameClear = this._onGameClear.bind(this);

    EventBus.on('enemy:killed', this._onEnemyKilled);
    EventBus.on('player:levelup', this._onLevelUp);
    EventBus.on('weapon:levelup', this._onWeaponLevelUp);
    EventBus.on('player:damaged', this._onPlayerDamaged);
    EventBus.on('player:exp-pickup', this._onExpPickup);
    EventBus.on('game:clear', this._onGameClear);
  }

  _onEnemyKilled({ isBoss, type }) {
    this.runStats.kills += 1;
    if (isBoss) this.runStats.bossesKilled.add(type);
    this._checkAchievements();
  }

  _onLevelUp({ level }) {
    if (level > this.runStats.maxLevel) this.runStats.maxLevel = level;
    this._checkAchievements();
  }

  _onWeaponLevelUp({ weaponId, level }) {
    const weapons = this.scene.cache.json.get('weapons');
    const data = weapons[weaponId];
    if (data && level >= (data.maxLevel || 8)) {
      this._unlockAchievement('weapon_max');
    }
  }

  _onPlayerDamaged({ amount }) {
    this.runStats.damageTaken += amount;
  }

  _onExpPickup({ value }) {
    this.runStats.gemsPicked += 1;
  }

  _onGameClear() {
    this._unlockAchievement('survive_30min');
  }

  _checkAchievements() {
    Object.entries(this.achievementsData).forEach(([id, def]) => {
      const c = def.condition;
      if (c.type === 'kills_run' && this.runStats.kills >= c.value) this._unlockAchievement(id);
      if (c.type === 'level_run' && this.runStats.maxLevel >= c.value) this._unlockAchievement(id);
      if (c.type === 'boss_killed' && this.runStats.bossesKilled.has(c.value)) this._unlockAchievement(id);
    });
  }

  _unlockAchievement(id) {
    const save = SaveManager.load();
    const unlocked = save.achievements || {};
    if (unlocked[id]) return;

    unlocked[id] = { time: Date.now() };
    const def = this.achievementsData[id];
    const reward = def?.reward || {};
    SaveManager.save({
      achievements: unlocked,
      gold: (save.gold || 0) + (reward.gold || 0),
    });

    EventBus.emit('achievement:unlocked', { id, name: def?.name, reward });
  }

  // 런 종료 시 호출 — 누적 통계 + 캐릭터 해금 체크
  finalize(runResult) {
    const save = SaveManager.load();
    const totals = save.totals || {
      runs: 0,
      kills: 0,
      survivedTime: 0,
      bestSurvived: 0,
    };
    totals.runs += 1;
    totals.kills += this.runStats.kills;
    totals.survivedTime += runResult.time || 0;
    totals.bestSurvived = Math.max(totals.bestSurvived, runResult.time || 0);

    // 도전과제 — 시간/처치 누적 기반
    if (totals.kills >= 1) this._unlockAchievement('first_blood');
    Object.entries(this.achievementsData).forEach(([id, def]) => {
      const c = def.condition;
      if (c.type === 'survive' && (runResult.time || 0) >= c.value) this._unlockAchievement(id);
    });

    // 캐릭터 해금 (누적 처치 / 단일 런 생존 기반)
    Object.entries(this.charactersData).forEach(([id, c]) => {
      if (!c.unlockCondition || c.unlockCondition === 'default') return;
      const unlocked = SaveManager.load().unlockedCharacters || [];
      if (unlocked.includes(id)) return;
      const [type, valStr] = c.unlockCondition.split(':');
      const val = Number(valStr);
      if (type === 'kills' && totals.kills >= val) {
        SaveManager.unlockCharacter(id);
        EventBus.emit('meta:unlock', { type: 'character', id });
      }
      if (type === 'survive' && (runResult.time || 0) >= val) {
        SaveManager.unlockCharacter(id);
        EventBus.emit('meta:unlock', { type: 'character', id });
      }
    });

    SaveManager.save({ totals });
  }

  destroy() {
    EventBus.off('enemy:killed', this._onEnemyKilled);
    EventBus.off('player:levelup', this._onLevelUp);
    EventBus.off('weapon:levelup', this._onWeaponLevelUp);
    EventBus.off('player:damaged', this._onPlayerDamaged);
    EventBus.off('player:exp-pickup', this._onExpPickup);
    EventBus.off('game:clear', this._onGameClear);
  }
}
