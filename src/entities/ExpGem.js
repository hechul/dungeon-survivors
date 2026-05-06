import Phaser from 'phaser';
import { DEPTH, COLORS, PHYSICS } from '../config/constants.js';

// 풀링되는 경험치 젬 — 자석처럼 끌려옴
export default class ExpGem extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'placeholder_gem');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.GEM);
    this.setActive(false);
    this.setVisible(false);
    this.body.enable = false;
    this.setTint(COLORS.GEM);
    this.setDisplaySize(8, 8);
    this.body.setSize(10, 10, true);
    this.value = 1;
  }

  spawn(x, y, value = 1) {
    this.setPosition(x, y);
    this.value = value;
    this.setActive(true);
    this.setVisible(true);
    this.body.enable = true;
    this.body.setVelocity(0, 0);
    // 가치별 시트 키 매핑
    const tier = value >= 100 ? 'big' : value >= 10 ? 'med' : 'small';
    const sheetKey = `exp_gem_${tier}`;
    if (this.scene.textures.exists(sheetKey)) {
      this.setTexture(sheetKey, 0);
      this.clearTint();
      const anim = `${sheetKey}_pulse`;
      if (this.scene.anims.exists(anim)) this.play(anim);
    } else {
      this.setTexture('placeholder_gem');
      if (value >= 100) this.setTint(0xffaa33);
      else if (value >= 10) this.setTint(0x66aaff);
      else this.setTint(COLORS.GEM);
    }
    const size = value >= 100 ? 14 : value >= 10 ? 10 : 8;
    this.setDisplaySize(size, size);
  }

  update(player) {
    if (!this.active) return;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = player.stats.pickupRadius || PHYSICS.PICKUP_RADIUS;
    if (dist < radius) {
      const len = dist || 1;
      const speed = PHYSICS.MAGNET_SPEED * (1 - Math.min(0.6, dist / radius));
      this.body.setVelocity((dx / len) * (PHYSICS.MAGNET_SPEED + speed), (dy / len) * (PHYSICS.MAGNET_SPEED + speed));
    }
  }
}
