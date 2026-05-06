import Phaser from 'phaser';
import { DEPTH } from '../config/constants.js';

const COLORS = {
  magnet: 0x66ccff,
  bomb: 0xff5577,
  boost: 0xffe14d,
  heal: 0x4dffa0,
};

// 풀링되는 픽업 아이템 — 적 처치 시 낮은 확률로 드롭
export default class Pickup extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.GEM);
    this.setActive(false);
    this.setVisible(false);
    this.body.enable = false;

    this.bg = scene.add.rectangle(0, 0, 16, 16, 0xffffff);
    this.bg.setStrokeStyle(2, 0x000000, 0.7);
    this.add(this.bg);
    this.label = scene.add.text(0, 0, '', {
      fontFamily: 'sans-serif',
      fontSize: '10px',
      color: '#000',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add(this.label);

    this.kind = 'magnet';
  }

  spawn(x, y, kind) {
    this.kind = kind;
    // 기존 보빙 tween이 누적되지 않도록 정리
    if (this.scene && this.scene.tweens) {
      this.scene.tweens.killTweensOf(this);
    }
    this._baseY = y;
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.body.enable = true;
    this.body.setSize(20, 20);
    // 실제 PNG 픽업이 있으면 사각형 대신 사용
    const realKey = `pickup_${kind}`;
    if (this.scene.textures.exists(realKey)) {
      this.bg.setVisible(false);
      this.label.setVisible(false);
      if (!this._sprite) {
        this._sprite = this.scene.add.image(0, 0, realKey);
        this._sprite.setDisplaySize(18, 18);
        this.add(this._sprite);
      }
      this._sprite.setTexture(realKey).setVisible(true);
    } else {
      if (this._sprite) this._sprite.setVisible(false);
      this.bg.setVisible(true);
      this.label.setVisible(true);
      const c = COLORS[kind] || 0xffffff;
      this.bg.setFillStyle(c);
      this.label.setText(
        kind === 'magnet' ? 'M' :
        kind === 'bomb' ? 'B' :
        kind === 'boost' ? '!' :
        kind === 'heal' ? '+' :
        '?'
      );
    }
    // 떠오름 효과 — 진폭 2px (이전 4px는 너무 컸음)
    this.scene.tweens.add({
      targets: this,
      y: y - 2,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
