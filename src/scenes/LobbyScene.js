import Phaser from 'phaser';
import { SCREEN, DEPTH, COLORS } from '../config/constants.js';
import SaveManager from '../managers/SaveManager.js';
import EventBus from '../managers/EventBus.js';

// 캐릭터 선택 + 메타 강화 + 던전 입장
export default class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LobbyScene' });
  }

  create() {
    this.charactersData = this.cache.json.get('characters');
    this.metaData = this.cache.json.get('metaUpgrades');
    this.save = SaveManager.load();
    this.selectedId = (this.save.unlockedCharacters || ['warrior'])[0] || 'warrior';

    this.add.rectangle(0, 0, SCREEN.WIDTH, SCREEN.HEIGHT, 0x0e1320).setOrigin(0, 0);

    // 헤더
    this.add
      .text(SCREEN.WIDTH / 2, 30, '마을', { fontFamily: 'sans-serif', fontSize: '20px', color: '#ffe14d', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.goldText = this.add
      .text(SCREEN.WIDTH - 12, 22, `G ${this.save.gold || 0}`, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#ffe14d',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0);

    // 탭: 캐릭터 / 강화 / 시너지
    this.tab = 'character';
    this.tabBtns = {};
    this._buildTabs();
    this._buildPanel();

    this.synergiesData = this.cache.json.get('synergies')?.synergies || [];

    // 던전 입장 버튼
    const enterBtn = this.add.rectangle(SCREEN.WIDTH / 2, SCREEN.HEIGHT - 60, 220, 56, 0x4ec9ff, 1)
      .setStrokeStyle(3, 0x111111);
    enterBtn.setInteractive({ useHandCursor: true });
    this.add
      .text(SCREEN.WIDTH / 2, SCREEN.HEIGHT - 60, '던전 입장', { fontFamily: 'sans-serif', fontSize: '20px', color: '#000', fontStyle: 'bold' })
      .setOrigin(0.5);
    enterBtn.on('pointerdown', () => this._enter());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
    });
  }

  _buildTabs() {
    const cy = 70;
    const tabs = [
      { id: 'character', label: '캐릭터' },
      { id: 'meta', label: '강화' },
      { id: 'synergy', label: '시너지' },
    ];
    tabs.forEach((t, i) => {
      const x = 60 + i * 95;
      const bg = this.add.rectangle(x, cy, 90, 28, 0x1a2030).setStrokeStyle(2, 0x4ec9ff);
      bg.setInteractive({ useHandCursor: true });
      const label = this.add.text(x, cy, t.label, { fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
      bg.on('pointerdown', () => {
        this.tab = t.id;
        this._buildPanel();
        this._refreshTabs();
      });
      this.tabBtns[t.id] = { bg, label };
    });
    this._refreshTabs();
  }

  _refreshTabs() {
    Object.entries(this.tabBtns).forEach(([id, { bg }]) => {
      bg.setFillStyle(this.tab === id ? 0x4ec9ff : 0x1a2030);
    });
    Object.entries(this.tabBtns).forEach(([id, { label }]) => {
      label.setColor(this.tab === id ? '#000' : '#ffffff');
    });
  }

  _buildPanel() {
    if (this.panelObjs) this.panelObjs.forEach((o) => o.destroy && o.destroy());
    this.panelObjs = [];
    if (this.tab === 'character') this._buildCharacterPanel();
    else if (this.tab === 'meta') this._buildMetaPanel();
    else if (this.tab === 'synergy') this._buildSynergyPanel();
  }

  _buildSynergyPanel() {
    const startY = 130;
    const cardH = 64;
    const cardW = SCREEN.WIDTH - 32;
    const list = this.synergiesData || [];
    // 스크롤은 생략 — 화면에 들어가는 만큼만
    const maxItems = Math.floor((SCREEN.HEIGHT - startY - 130) / (cardH + 6));

    const head = this.add
      .text(SCREEN.WIDTH / 2, startY - 12, '도감 — 무기/패시브 조합으로 발동', {
        fontFamily: 'sans-serif',
        fontSize: '11px',
        color: '#88aacc',
      })
      .setOrigin(0.5);
    this.panelObjs.push(head);

    list.slice(0, maxItems).forEach((syn, i) => {
      const y = startY + (cardH + 6) * i;
      const tier = syn.tier || 2;
      const tierColor = tier >= 4 ? 0xff66cc : tier === 3 ? 0xffaa33 : 0x88ccff;
      const bg = this.add
        .rectangle(SCREEN.WIDTH / 2, y, cardW, cardH, 0x162236)
        .setStrokeStyle(2, tierColor);
      const name = this.add.text(SCREEN.WIDTH / 2 - cardW / 2 + 12, y - 22, `${syn.name}  [T${tier}]`, {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#ffffff',
        fontStyle: 'bold',
      });
      const req = this._formatReq(syn.require);
      const reqText = this.add.text(SCREEN.WIDTH / 2 - cardW / 2 + 12, y - 4, req, {
        fontFamily: 'sans-serif',
        fontSize: '10px',
        color: '#88aacc',
        wordWrap: { width: cardW - 20 },
      });
      const desc = this.add.text(SCREEN.WIDTH / 2 - cardW / 2 + 12, y + 12, syn.description, {
        fontFamily: 'sans-serif',
        fontSize: '10px',
        color: '#aaccdd',
        wordWrap: { width: cardW - 20 },
      });
      this.panelObjs.push(bg, name, reqText, desc);
    });
  }

  _formatReq(req) {
    const parts = [];
    if (req?.weapons?.length) parts.push(`무기: ${req.weapons.map((w) => this._weaponName(w)).join(' + ')}`);
    if (req?.passives?.length) parts.push(`패시브: ${req.passives.map((p) => this._passiveName(p)).join(' + ')}`);
    return parts.join('  ');
  }

  _weaponName(id) {
    const wd = this.cache.json.get('weapons');
    return wd?.[id]?.name || id;
  }

  _passiveName(id) {
    const pd = this.cache.json.get('levelUpPool')?.passives || [];
    return pd.find((p) => p.id === id)?.name || id;
  }

  _buildCharacterPanel() {
    const ids = Object.keys(this.charactersData);
    const startY = 130;
    const cardH = 110;
    const cardW = SCREEN.WIDTH - 32;
    ids.forEach((id, i) => {
      const c = this.charactersData[id];
      const y = startY + (cardH + 12) * i;
      const isUnlocked = (this.save.unlockedCharacters || []).includes(id);
      const isSelected = this.selectedId === id;
      const bg = this.add
        .rectangle(SCREEN.WIDTH / 2, y, cardW, cardH, isUnlocked ? 0x162236 : 0x1a1a1a)
        .setStrokeStyle(2, isSelected ? 0xffe14d : isUnlocked ? 0x4ec9ff : 0x444444);
      const portrait = this.add
        .rectangle(SCREEN.WIDTH / 2 - cardW / 2 + 50, y, 56, 56, isUnlocked ? c.color : 0x333333)
        .setStrokeStyle(2, 0x111111);
      const name = this.add.text(SCREEN.WIDTH / 2 - cardW / 2 + 92, y - 30, c.name, {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: isUnlocked ? '#ffffff' : '#666',
        fontStyle: 'bold',
      });
      const desc = this.add.text(SCREEN.WIDTH / 2 - cardW / 2 + 92, y - 8, c.description, {
        fontFamily: 'sans-serif',
        fontSize: '11px',
        color: '#aaccdd',
        wordWrap: { width: cardW - 110 },
      });
      const cond = isUnlocked
        ? `HP ${c.baseStats.hp}  Spd ${c.baseStats.speed}`
        : `잠금: ${this._unlockText(c.unlockCondition)}`;
      const condText = this.add.text(SCREEN.WIDTH / 2 - cardW / 2 + 92, y + 18, cond, {
        fontFamily: 'sans-serif',
        fontSize: '11px',
        color: isUnlocked ? '#88aacc' : '#bb6666',
      });
      // 친화 시너지
      const affinityNames = (c.affinitySynergies || [])
        .map((sid) => (this.synergiesData || []).find((s) => s.id === sid)?.name)
        .filter(Boolean)
        .slice(0, 2)
        .join(', ');
      const affinityText = isUnlocked && affinityNames
        ? this.add.text(SCREEN.WIDTH / 2 - cardW / 2 + 92, y + 36, `친화: ${affinityNames}`, {
            fontFamily: 'sans-serif',
            fontSize: '10px',
            color: '#ffe14d',
          })
        : null;
      this.panelObjs.push(bg, portrait, name, desc, condText);
      if (affinityText) this.panelObjs.push(affinityText);

      if (isUnlocked) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => {
          this.selectedId = id;
          this._buildPanel();
        });
      }
    });
  }

  _unlockText(cond) {
    if (!cond) return '?';
    if (cond === 'default') return '기본';
    const [type, val] = cond.split(':');
    if (type === 'kills') return `누적 처치 ${val}`;
    if (type === 'survive') return `${val}초 생존`;
    return cond;
  }

  _buildMetaPanel() {
    const meta = this.save.metaUpgrades || {};
    const ids = Object.keys(this.metaData);
    const startY = 130;
    const cardH = 70;
    const cardW = SCREEN.WIDTH - 32;
    ids.forEach((id, i) => {
      const def = this.metaData[id];
      const lv = meta[id] || 0;
      const max = def.maxLevel || 5;
      const cost = Math.floor(def.baseCost * Math.pow(def.costMul || 1.5, lv));
      const y = startY + (cardH + 8) * i;
      const canBuy = lv < max && (this.save.gold || 0) >= cost;

      const bg = this.add
        .rectangle(SCREEN.WIDTH / 2, y, cardW, cardH, 0x162236)
        .setStrokeStyle(2, canBuy ? 0xffe14d : 0x4ec9ff);
      const name = this.add.text(SCREEN.WIDTH / 2 - cardW / 2 + 12, y - 22, def.name, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
      });
      const desc = this.add.text(SCREEN.WIDTH / 2 - cardW / 2 + 12, y - 4, def.description, {
        fontFamily: 'sans-serif',
        fontSize: '11px',
        color: '#aaccdd',
        wordWrap: { width: cardW - 100 },
      });
      const lvText = this.add.text(SCREEN.WIDTH / 2 + cardW / 2 - 12, y - 22, `Lv.${lv}/${max}`, {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: '#88aacc',
      }).setOrigin(1, 0);
      const costText = this.add.text(SCREEN.WIDTH / 2 + cardW / 2 - 12, y + 8, lv >= max ? 'MAX' : `${cost} G`, {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: lv >= max ? '#888' : canBuy ? '#ffe14d' : '#ff7777',
        fontStyle: 'bold',
      }).setOrigin(1, 0);
      this.panelObjs.push(bg, name, desc, lvText, costText);

      if (lv < max) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => this._buyMeta(id, cost));
      }
    });
  }

  _buyMeta(id, cost) {
    if ((this.save.gold || 0) < cost) return;
    const meta = { ...(this.save.metaUpgrades || {}) };
    meta[id] = (meta[id] || 0) + 1;
    SaveManager.save({ gold: (this.save.gold || 0) - cost, metaUpgrades: meta });
    this.save = SaveManager.load();
    this.goldText.setText(`G ${this.save.gold || 0}`);
    this._buildPanel();
  }

  _enter() {
    this.scene.start('GameScene', { characterId: this.selectedId });
  }
}
