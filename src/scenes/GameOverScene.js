import Phaser from 'phaser';
import { SCREEN, COLORS } from '../config/constants.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.runData = data || {};
  }

  create() {
    this.add.rectangle(0, 0, SCREEN.WIDTH, SCREEN.HEIGHT, 0x000000, 1).setOrigin(0, 0);

    const title = this.add
      .text(SCREEN.WIDTH / 2, SCREEN.HEIGHT / 2, 'GAME OVER', {
        fontFamily: 'sans-serif',
        fontSize: '40px',
        color: '#ff5577',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 1000 });

    this.time.delayedCall(2000, () => {
      this.scene.start('ResultScene', { ...this.runData, cleared: false });
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.removeAllListeners();
    });
  }
}
