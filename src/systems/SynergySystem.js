import EventBus from '../managers/EventBus.js';

// 시너지 — 보유 무기/패시브 조합으로 활성, 효과 자동 적용
// 효과 타입:
//   playerStat: { key, add | mul }  → 플레이어 스탯
//   weaponMul:  { weapons[], key, mul } → WeaponSystem._weaponMods에서 적용
export default class SynergySystem {
  constructor(scene, player, weaponSystem, levelUpSystem) {
    this.scene = scene;
    this.player = player;
    this.weaponSystem = weaponSystem;
    this.levelUpSystem = levelUpSystem;
    this.allSynergies = scene.cache.json.get('synergies').synergies || [];
    this.appliedPlayerEffects = []; // 되돌리기용
    this.weaponMods = {}; // { weaponId: { key: mul } }
    this.lastActiveIds = new Set();

    this._refresh = this._refresh.bind(this);
    EventBus.on('weapon:added', this._refresh);
    EventBus.on('weapon:levelup', this._refresh);
    EventBus.on('weapon:evolved', this._refresh);
    EventBus.on('player:select-upgrade', this._refresh);
    // 초기화
    this.scene.time.delayedCall(50, this._refresh);
  }

  activeSynergies() {
    return this.allSynergies.filter((s) => this._matches(s));
  }

  _matches(synergy) {
    const req = synergy.require || {};
    if (req.weapons) {
      const owned = new Set(this.weaponSystem.slots.map((s) => s.id));
      const ok = req.weapons.every((w) => owned.has(w) || this._isEvolvedOf(owned, w));
      if (!ok) return false;
    }
    if (req.passives) {
      const ok = req.passives.every((p) => this.levelUpSystem.hasPassive(p));
      if (!ok) return false;
    }
    if (req.weaponCount && this.weaponSystem.slots.length < req.weaponCount) return false;
    if (req.passiveCount && this.levelUpSystem.ownedPassives().length < req.passiveCount) return false;
    return true;
  }

  _isEvolvedOf(owned, baseId) {
    // 진화 무기 데이터에서 베이스 찾기
    const wd = this.scene.cache.json.get('weapons');
    return Array.from(owned).some((id) => {
      const d = wd[id];
      // d.evolved 인 경우 → base id를 직접 비교 못 함. 별도 evolvesFrom 필드는 없으므로,
      // 베이스 무기의 evolvesTo가 owned에 있으면 매칭 인정
      if (!d || !d.evolved) return false;
      const baseDef = wd[baseId];
      return baseDef && baseDef.evolvesTo === id;
    });
  }

  _refresh() {
    // 모든 효과 되돌림
    this._revertAll();
    const active = this.activeSynergies();
    active.forEach((syn) => this._applySynergy(syn));

    // 변경된 ID 알림
    const ids = new Set(active.map((s) => s.id));
    const newOnes = active.filter((s) => !this.lastActiveIds.has(s.id));
    newOnes.forEach((s) => {
      EventBus.emit('synergy:activated', { id: s.id, name: s.name });
      if (this.scene.hud && this.scene.hud.showAnnounce) {
        this.scene.hud.showAnnounce(`시너지: ${s.name}`, 0x88ffaa, 2200);
      }
    });
    this.lastActiveIds = ids;
  }

  _applySynergy(synergy) {
    const effects = synergy.effects || [];
    // 캐릭터 친화도 — 추가 강화
    const charData = this.player.characterData || {};
    const isAffinity = (charData.affinitySynergies || []).includes(synergy.id);
    const affinityBonus = isAffinity ? (charData.affinityBonus || 0) : 0;
    effects.forEach((eff) => {
      if (eff.type === 'playerStat') {
        const k = eff.key;
        const before = this.player.stats[k] ?? 0;
        if (eff.add !== undefined) {
          const adj = eff.add * (1 + affinityBonus);
          this.player.stats[k] = before + adj;
        }
        if (eff.mul !== undefined) {
          const adj = 1 + (eff.mul - 1) * (1 + affinityBonus);
          this.player.stats[k] = (before || 1) * adj;
        }
        this.appliedPlayerEffects.push({ key: k, before });
      } else if (eff.type === 'weaponMul') {
        const adj = 1 + (eff.mul - 1) * (1 + affinityBonus);
        eff.weapons.forEach((wId) => {
          if (!this.weaponMods[wId]) this.weaponMods[wId] = {};
          this.weaponMods[wId][eff.key] = (this.weaponMods[wId][eff.key] || 1) * adj;
        });
      }
    });
  }

  _revertAll() {
    // 플레이어 스탯 되돌림 (역순)
    while (this.appliedPlayerEffects.length > 0) {
      const { key, before } = this.appliedPlayerEffects.pop();
      this.player.stats[key] = before;
    }
    this.weaponMods = {};
  }

  // WeaponSystem이 호출 — 무기별 스탯 보정 배율
  weaponMod(weaponId, key) {
    return this.weaponMods[weaponId]?.[key] ?? 1;
  }

  destroy() {
    this._revertAll();
    EventBus.off('weapon:added', this._refresh);
    EventBus.off('weapon:levelup', this._refresh);
    EventBus.off('weapon:evolved', this._refresh);
    EventBus.off('player:select-upgrade', this._refresh);
  }
}
