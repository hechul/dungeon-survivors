import Phaser from 'phaser';
import { SCREEN } from '../config/constants.js';
import SaveManager from '../managers/SaveManager.js';

export default class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  init(data) {
    this.runData = data || {};
  }

  create() {
    const d = this.runData;
    // 골드 적립 + 최고기록 갱신 + 캐릭터 해금 체크
    SaveManager.addGold(d.gold || 0);
    SaveManager.setHighScore({
      survivedTime: d.time || 0,
      kills: d.kills || 0,
      level: d.level || 1,
    });
    this._checkUnlocks(d);

    this.add.rectangle(0, 0, SCREEN.WIDTH, SCREEN.HEIGHT, 0x0b0e14, 1).setOrigin(0, 0);
    this.add
      .text(SCREEN.WIDTH / 2, 80, d.cleared ? 'VICTORY!' : 'RESULT', {
        fontFamily: 'sans-serif',
        fontSize: '32px',
        fontStyle: 'bold',
        color: d.cleared ? '#ffe14d' : '#ffffff',
        stroke: '#000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const stats = [
      ['생존 시간', formatTime(d.time || 0)],
      ['처치 수', `${d.kills || 0}`],
      ['최고 레벨', `Lv.${d.level || 1}`],
      ['획득 골드', `${d.gold || 0} G`],
    ];
    const startY = 180;
    stats.forEach(([k, v], i) => {
      const y = startY + i * 50;
      this.add.text(40, y, k, { fontFamily: 'sans-serif', fontSize: '14px', color: '#88aacc' });
      this.add.text(SCREEN.WIDTH - 40, y, v, { fontFamily: 'sans-serif', fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(1, 0);
    });

    // 마을로 돌아가기 버튼
    const btn = this.add.rectangle(SCREEN.WIDTH / 2, SCREEN.HEIGHT - 80, 220, 56, 0x4ec9ff).setStrokeStyle(3, 0x111111);
    btn.setInteractive({ useHandCursor: true });
    this.add
      .text(SCREEN.WIDTH / 2, SCREEN.HEIGHT - 80, '마을로 돌아가기', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#000',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    btn.on('pointerdown', () => this.scene.start('LobbyScene'));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
    });
  }

  _checkUnlocks(d) {
    const characters = this.cache.json.get('characters');
    Object.entries(characters).forEach(([id, c]) => {
      if (!c.unlockCondition || c.unlockCondition === 'default') return;
      const save = SaveManager.load();
      if ((save.unlockedCharacters || []).includes(id)) return;
      const [type, valStr] = c.unlockCondition.split(':');
      const val = Number(valStr);
      if (type === 'kills' && (d.kills || 0) >= val) SaveManager.unlockCharacter(id);
      if (type === 'survive' && (d.time || 0) >= val) SaveManager.unlockCharacter(id);
    });
  }
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
