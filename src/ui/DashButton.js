import Phaser from 'phaser';
import { SCREEN, DEPTH } from '../config/constants.js';
import EventBus from '../managers/EventBus.js';
import AudioManager from '../managers/AudioManager.js';

// 화면 우측 하단 대시 버튼 — 쿨다운 표시 포함
const RADIUS = 36;

export default class DashButton {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.cx = SCREEN.WIDTH - 70;
    this.cy = SCREEN.HEIGHT - 110;

    this.gfx = scene.add.graphics();
    this.gfx.setDepth(DEPTH.HUD).setScrollFactor(0);

    this.label = scene.add
      .text(this.cx, this.cy, 'DASH', {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: '#000',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD + 1);

    this.zone = scene.add
      .circle(this.cx, this.cy, RADIUS, 0xffffff, 0.0001)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD)
      .setInteractive();
    this.zone.on('pointerdown', () => this._tryDash());

    scene.events.on(Phaser.Scenes.Events.UPDATE, this._frame, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);

    this._onDash = () => AudioManager.uiClick();
    EventBus.on('input:dash', this._tryDash, this);
  }

  _tryDash() {
    const did = this.player.tryDash();
    if (did) AudioManager.uiClick();
  }

  _frame() {
    const ratio = Math.max(0, Math.min(1, this.player.dashRatio()));
    this.gfx.clear();
    // 배경 원
    this.gfx.fillStyle(0x111122, 0.6);
    this.gfx.fillCircle(this.cx, this.cy, RADIUS);
    // 채우기 (쿨다운)
    const color = ratio >= 1 ? 0x88ccff : 0x4d6680;
    this.gfx.fillStyle(color, 0.8);
    if (ratio >= 1) {
      this.gfx.fillCircle(this.cx, this.cy, RADIUS - 4);
    } else {
      // 부채꼴 채우기
      this.gfx.beginPath();
      this.gfx.moveTo(this.cx, this.cy);
      const start = -Math.PI / 2;
      const end = start + Math.PI * 2 * ratio;
      this.gfx.arc(this.cx, this.cy, RADIUS - 4, start, end);
      this.gfx.closePath();
      this.gfx.fillPath();
    }
    // 외곽선
    this.gfx.lineStyle(2, 0xffffff, 0.7);
    this.gfx.strokeCircle(this.cx, this.cy, RADIUS);
  }

  destroy() {
    if (this.scene && this.scene.events) {
      this.scene.events.off(Phaser.Scenes.Events.UPDATE, this._frame, this);
    }
    EventBus.off('input:dash', this._tryDash, this);
    if (this.gfx) this.gfx.destroy();
    if (this.label) this.label.destroy();
    if (this.zone) this.zone.destroy();
  }
}
