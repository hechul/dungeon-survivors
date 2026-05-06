import Phaser from 'phaser';
import { DEPTH } from '../config/constants.js';

// 마법구/투사체 — 풀링됨
export default class Projectile extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'white1x1');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.WEAPON);
    this.setActive(false);
    this.setVisible(false);
    this.body.enable = false;
    this.setDisplaySize(10, 10);
    this.setTint(0x66ccff);
    this.body.setSize(10, 10, true);

    this.damage = 0;
    this.pierce = 1;
    this.lifeUntil = 0;
    this.hits = new Set();
  }

  spawn(x, y, vx, vy, damage, pierce = 1, lifeMs = 1500, color = 0x66ccff) {
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.body.enable = true;
    this.setTint(color);
    this.body.setVelocity(vx, vy);
    this.damage = damage;
    this.pierce = pierce;
    this.lifeUntil = this.scene.time.now + lifeMs;
    this.hits.clear();
    this.isEnemyProjectile = false;
  }

  update(time) {
    if (!this.active) return;
    if (time > this.lifeUntil) {
      this._pool();
    }
    this.angle += 6;
  }

  hit(enemy, pool) {
    if (this.hits.has(enemy)) return false;
    this.hits.add(enemy);
    this.pierce -= 1;
    if (this.pierce <= 0) this._pool(pool);
    return true;
  }

  _pool(pool) {
    if (pool && this.__poolType) {
      pool.release(this);
    } else {
      this.setActive(false);
      this.setVisible(false);
      if (this.body) this.body.enable = false;
    }
  }
}
