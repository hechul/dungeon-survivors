import Phaser from 'phaser';
import { SCREEN, COLORS } from '../config/constants.js';
import SaveManager from '../managers/SaveManager.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create() {
    // SaveManager 등록 (전역 접근용)
    this.game.registry.set('SaveManager', SaveManager);

    this.add.rectangle(0, 0, SCREEN.WIDTH, SCREEN.HEIGHT, COLORS.BG).setOrigin(0, 0);

    // 별빛 입자
    for (let i = 0; i < 60; i += 1) {
      const x = Math.random() * SCREEN.WIDTH;
      const y = Math.random() * SCREEN.HEIGHT;
      const size = Math.random() * 2 + 0.5;
      const star = this.add.rectangle(x, y, size, size, 0xffffff, Math.random() * 0.6 + 0.3);
      this.tweens.add({ targets: star, alpha: 0.05, duration: 1500 + Math.random() * 1500, yoyo: true, repeat: -1 });
    }

    this.add
      .text(SCREEN.WIDTH / 2, 220, '던전 서바이버즈', {
        fontFamily: 'sans-serif',
        fontSize: '38px',
        fontStyle: 'bold',
        color: '#ffe14d',
        stroke: '#000',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.add
      .text(SCREEN.WIDTH / 2, 268, 'DUNGEON SURVIVORS', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#88aacc',
      })
      .setOrigin(0.5);

    const tap = this.add
      .text(SCREEN.WIDTH / 2, SCREEN.HEIGHT - 200, '터치하여 시작', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: tap, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    // 최고 기록 표시
    const save = SaveManager.load();
    const best = save.highScore || {};
    this.add
      .text(
        SCREEN.WIDTH / 2,
        SCREEN.HEIGHT - 100,
        `최고 생존: ${formatTime(best.survivedTime || 0)}\n최고 레벨: Lv.${best.level || 1}    Gold: ${save.gold || 0}`,
        {
          fontFamily: 'sans-serif',
          fontSize: '12px',
          color: '#cccccc',
          align: 'center',
        }
      )
      .setOrigin(0.5);

    this.input.once('pointerdown', () => this.scene.start('LobbyScene'));
    this.input.keyboard.once('keydown', () => this.scene.start('LobbyScene'));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
      if (this.input.keyboard) this.input.keyboard.removeAllListeners();
    });
  }
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
