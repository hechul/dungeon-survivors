import EventBus from '../managers/EventBus.js';

const MAX_PASSIVES = 4;

// 레벨업 발생 시 선택지 3개 생성 → LevelUpScene으로 띄움 → 선택 처리
export default class LevelUpSystem {
  constructor(scene, player, weaponSystem) {
    this.scene = scene;
    this.player = player;
    this.weaponSystem = weaponSystem;
    this.pool = scene.cache.json.get('levelUpPool');
    this.weaponsData = scene.cache.json.get('weapons');
    this.passiveLevels = {};
    this.queuedLevels = 0;
    this.modalOpen = false;
    this.MAX_PASSIVES = MAX_PASSIVES;
  }

  ownedPassives() {
    return Object.keys(this.passiveLevels).filter((k) => this.passiveLevels[k] > 0);
  }

  hasPassive(id) {
    return (this.passiveLevels[id] || 0) > 0;
  }

  isPassivesFull() {
    return this.ownedPassives().length >= MAX_PASSIVES;
  }

  passiveAtMax(id) {
    const def = this.pool.passives.find((p) => p.id === id);
    if (!def) return true;
    return (this.passiveLevels[id] || 0) >= (def.maxLevel || 5);

    this._onLevelUp = this._onLevelUp.bind(this);
    this._onSelect = this._onSelect.bind(this);
    EventBus.on('player:levelup', this._onLevelUp);
    EventBus.on('player:select-upgrade', this._onSelect);
  }

  _onLevelUp() {
    this.queuedLevels += 1;
    this._maybeOpen();
  }

  _maybeOpen() {
    if (this.modalOpen || this.queuedLevels <= 0) return;
    if (!this.player.alive) return;
    const choices = this._generateChoices();
    if (choices.length === 0) {
      // 더 이상 줄 게 없으면 그냥 소비
      this.queuedLevels = 0;
      return;
    }
    this.modalOpen = true;
    this.scene.scene.launch('LevelUpScene', { choices });
    this.scene.scene.pause();
  }

  _generateChoices() {
    const candidates = [];
    const weaponPool = this.pool.weapons || [];
    const passivePool = this.pool.passives || [];

    // 0. 진화 가능한 무기 (있으면 우선 노출)
    const evolvable = this.weaponSystem.evolvableWeapons(this.passiveLevels);
    evolvable.forEach((id) => {
      const data = this.weaponsData[id];
      const evoData = this.weaponsData[data.evolvesTo];
      if (!evoData) return;
      candidates.push({
        kind: 'weapon-evolve',
        id,
        evolvesTo: data.evolvesTo,
        name: `[진화] ${evoData.name}`,
        description: evoData.description,
        level: 'EVO',
      });
    });

    // 1. 미보유 무기 (슬롯 여유 있을 때만)
    if (!this.weaponSystem.isFull()) {
      weaponPool.forEach((id) => {
        if (!this.weaponSystem.hasWeapon(id)) {
          const data = this.weaponsData[id];
          if (data) {
            candidates.push({
              kind: 'weapon-new',
              id,
              name: data.name,
              description: data.description,
              level: 1,
            });
          }
        }
      });
    }

    // 2. 보유 무기 레벨업
    weaponPool.forEach((id) => {
      if (this.weaponSystem.hasWeapon(id) && !this.weaponSystem.weaponAtMax(id)) {
        const slot = this.weaponSystem.slots.find((s) => s.id === id);
        const data = this.weaponsData[id];
        candidates.push({
          kind: 'weapon-up',
          id,
          name: data.name,
          description: `Lv.${slot.level + 1} 강화`,
          level: slot.level + 1,
        });
      }
    });

    // 3. 패시브 — 슬롯 제한 적용
    const passivesFull = this.isPassivesFull();
    passivePool.forEach((p) => {
      const cur = this.passiveLevels[p.id] || 0;
      if (cur >= (p.maxLevel || 5)) return;
      // 슬롯 가득 차면 보유 중인 것만 강화 가능
      if (passivesFull && cur === 0) return;
      candidates.push({
        kind: 'passive',
        id: p.id,
        name: p.name,
        description: p.description,
        level: cur + 1,
      });
    });

    // 진화 항목은 항상 첫 카드, 나머지 셔플
    const evolveCards = candidates.filter((c) => c.kind === 'weapon-evolve');
    const others = candidates.filter((c) => c.kind !== 'weapon-evolve');
    for (let i = others.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    const cardCount = 3 + (this.player.stats.luckBonusCards || 0);
    return [...evolveCards.slice(0, 1), ...others].slice(0, cardCount);
  }

  _onSelect(payload) {
    const { kind, id } = payload;
    if (kind === 'weapon-new') {
      this.weaponSystem.addWeapon(id);
    } else if (kind === 'weapon-up') {
      this.weaponSystem.levelUp(id);
    } else if (kind === 'weapon-evolve') {
      this.weaponSystem.evolveWeapon(id);
    } else if (kind === 'passive') {
      const passive = this.pool.passives.find((p) => p.id === id);
      if (passive) {
        this.player.applyPassive(passive);
        this.passiveLevels[id] = (this.passiveLevels[id] || 0) + 1;
      }
    }
    this.queuedLevels = Math.max(0, this.queuedLevels - 1);
    this.modalOpen = false;
    this.scene.scene.resume();
    this.scene.scene.stop('LevelUpScene');
    this.scene.time.delayedCall(50, () => this._maybeOpen());
  }

  // 외부 트리거 — 보물상자 (강제 한 번 모달)
  triggerChest() {
    this.queuedLevels += 1;
    this._maybeOpen();
  }

  destroy() {
    EventBus.off('player:levelup', this._onLevelUp);
    EventBus.off('player:select-upgrade', this._onSelect);
  }
}
