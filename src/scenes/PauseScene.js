import Phaser from 'phaser';
import { SCREEN, DEPTH } from '../config/constants.js';
import EventBus from '../managers/EventBus.js';
import AudioManager from '../managers/AudioManager.js';

// 일시정지 오버레이 — 무기 슬롯 표시 + 재개/포기 버튼
export default class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  init(data) {
    this.weaponSlots = data?.weaponSlots || [];
    this.player = data?.player || null;
    this.elapsed = data?.elapsed || 0;
  }

  create() {
    const W = SCREEN.WIDTH;
    const H = SCREEN.HEIGHT;

    this.add.rectangle(0, 0, W, H, 0x000000, 0.75).setOrigin(0, 0).setDepth(DEPTH.OVERLAY);

    this.add
      .text(W / 2, 90, '일시정지', {
        fontFamily: 'sans-serif',
        fontSize: '32px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY + 1);

    // 통계
    const m = Math.floor(this.elapsed / 60).toString().padStart(2, '0');
    const s = Math.floor(this.elapsed % 60).toString().padStart(2, '0');
    const stats = [
      `생존 시간   ${m}:${s}`,
      `레벨        Lv.${this.player?.level || 1}`,
      `처치 수     ${this.player?.kills || 0}`,
      `골드        ${this.player?.gold || 0}`,
    ];
    stats.forEach((line, i) => {
      this.add
        .text(W / 2, 150 + i * 22, line, {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: '#aaccdd',
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.OVERLAY + 1);
    });

    // 무기 슬롯 표시
    this.add.text(W / 2, 270, '장비된 무기', { fontFamily: 'sans-serif', fontSize: '14px', color: '#88aacc' })
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY + 1);
    const weaponsData = this.cache.json.get('weapons');
    this.weaponSlots.forEach((slot, i) => {
      const data = weaponsData[slot.id];
      const y = 300 + i * 30;
      this.add
        .text(40, y, data?.name || slot.id, { fontFamily: 'sans-serif', fontSize: '14px', color: '#fff' })
        .setDepth(DEPTH.OVERLAY + 1);
      this.add
        .text(W - 40, y, `Lv.${slot.level}`, { fontFamily: 'sans-serif', fontSize: '14px', color: '#ffe14d' })
        .setOrigin(1, 0)
        .setDepth(DEPTH.OVERLAY + 1);
    });

    // 버튼
    this._button(W / 2, H - 180, '재개', 0x4ec9ff, () => {
      AudioManager.uiClick();
      EventBus.emit('game:resume', {});
      this.scene.resume('GameScene');
      this.scene.stop();
    });
    this._button(W / 2, H - 110, '포기', 0xff5577, () => {
      AudioManager.uiClick();
      // 강제 종료 → ResultScene
      this.scene.stop('GameScene');
      this.scene.start('ResultScene', {
        time: this.elapsed,
        kills: this.player?.kills || 0,
        gold: this.player?.gold || 0,
        level: this.player?.level || 1,
        cleared: false,
        forfeit: true,
      });
      this.scene.stop();
    });

    // ESC 한 번 더로 재개
    this.input.keyboard.once('keydown-ESC', () => {
      AudioManager.uiClick();
      EventBus.emit('game:resume', {});
      this.scene.resume('GameScene');
      this.scene.stop();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.input.keyboard) this.input.keyboard.removeAllListeners();
    });
  }

  _button(x, y, label, color, onClick) {
    const bg = this.add.rectangle(x, y, 220, 52, color).setStrokeStyle(3, 0x111111).setDepth(DEPTH.OVERLAY + 1);
    bg.setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, { fontFamily: 'sans-serif', fontSize: '18px', color: '#000', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY + 2);
    bg.on('pointerdown', onClick);
    return bg;
  }
}
