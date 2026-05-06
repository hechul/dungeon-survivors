import Phaser from 'phaser';
import { SCREEN, DEPTH } from '../config/constants.js';

// 화면 밖 보스/엘리트 방향 화살표 — 화면 안쪽 가장자리에 표시
const MARGIN = 24;

export default class OffscreenIndicators {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.gfx = scene.add.graphics();
    this.gfx.setScrollFactor(0).setDepth(DEPTH.HUD);

    scene.events.on(Phaser.Scenes.Events.UPDATE, this._frame, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  _frame() {
    this.gfx.clear();
    if (!this.scene.waveSystem) return;
    const cam = this.scene.cameras.main;
    const camLeft = cam.scrollX;
    const camTop = cam.scrollY;
    const camRight = camLeft + cam.width;
    const camBottom = camTop + cam.height;

    this.scene.waveSystem.activeEnemies.forEach((e) => {
      if (!e.active) return;
      if (!e.isBoss && !e.isElite) return;
      // 화면 안에 있으면 건너뜀
      if (e.x >= camLeft && e.x <= camRight && e.y >= camTop && e.y <= camBottom) return;
      // 화살표 위치 — 화면 가장자리에 클램프
      const localX = e.x - camLeft;
      const localY = e.y - camTop;
      const cx = SCREEN.WIDTH / 2;
      const cy = SCREEN.HEIGHT / 2;
      const dx = localX - cx;
      const dy = localY - cy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const halfW = SCREEN.WIDTH / 2 - MARGIN;
      const halfH = SCREEN.HEIGHT / 2 - MARGIN;
      // 사각형 가장자리에 닿는 비율
      const tx = halfW / Math.abs(dx || 1);
      const ty = halfH / Math.abs(dy || 1);
      const t = Math.min(tx, ty);
      const ax = cx + dx * t;
      const ay = cy + dy * t;
      const angle = Math.atan2(dy, dx);
      this._drawArrow(ax, ay, angle, e.isBoss ? 0xff5577 : 0xffaa44);
    });
  }

  _drawArrow(x, y, angle, color) {
    const size = 12;
    this.gfx.fillStyle(color, 0.85);
    this.gfx.lineStyle(2, 0x000000, 0.8);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const tip = { x: x + cos * size, y: y + sin * size };
    const left = { x: x + Math.cos(angle + Math.PI * 0.85) * size, y: y + Math.sin(angle + Math.PI * 0.85) * size };
    const right = { x: x + Math.cos(angle - Math.PI * 0.85) * size, y: y + Math.sin(angle - Math.PI * 0.85) * size };
    this.gfx.beginPath();
    this.gfx.moveTo(tip.x, tip.y);
    this.gfx.lineTo(left.x, left.y);
    this.gfx.lineTo(right.x, right.y);
    this.gfx.closePath();
    this.gfx.fillPath();
    this.gfx.strokePath();
  }

  destroy() {
    if (this.scene && this.scene.events) {
      this.scene.events.off(Phaser.Scenes.Events.UPDATE, this._frame, this);
    }
    if (this.gfx) this.gfx.destroy();
  }
}
