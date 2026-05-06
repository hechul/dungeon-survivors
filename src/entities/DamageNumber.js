import Phaser from 'phaser';
import { DEPTH } from '../config/constants.js';

// 풀링되는 데미지 숫자 — 위로 떠오르며 페이드아웃
export default class DamageNumber extends Phaser.GameObjects.Text {
  constructor(scene, x, y) {
    super(scene, x, y, '', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    });
    scene.add.existing(this);
    this.setOrigin(0.5);
    this.setDepth(DEPTH.DAMAGE_NUMBER);
    this.setActive(false);
    this.setVisible(false);
  }

  spawn(x, y, amount, isCrit = false) {
    this.setActive(true);
    this.setVisible(true);
    this.setPosition(x, y);
    this.setText(`${Math.round(amount)}`);
    this.setAlpha(1);
    this.setScale(isCrit ? 1.4 : 1.0);
    this.setColor(isCrit ? '#ffe14d' : '#ffffff');

    this.scene.tweens.add({
      targets: this,
      y: y - 28,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.setActive(false);
        this.setVisible(false);
      },
    });
  }
}
