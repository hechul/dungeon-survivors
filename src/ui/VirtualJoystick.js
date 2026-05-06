import Phaser from 'phaser';
import { SCREEN, DEPTH } from '../config/constants.js';

const BASE_RADIUS = 56;
const STICK_RADIUS = 26;
const ACTIVE_RADIUS = 48;

// 화면 좌측 하단 영역의 첫 터치를 받아 조이스틱처럼 동작
export default class VirtualJoystick {
  constructor(scene) {
    this.scene = scene;
    this.pointerId = null;
    this.vector = { x: 0, y: 0 };
    this.magnitude = 0;
    this.active = false;
    this.basePos = { x: 80, y: SCREEN.HEIGHT - 110 };
    this.stickPos = { x: this.basePos.x, y: this.basePos.y };

    // 그래픽 (스크롤 무시)
    this.gfx = scene.add.graphics();
    this.gfx.setDepth(DEPTH.HUD).setScrollFactor(0);

    // 좌측 하단 인터랙션 영역 (전체 좌측 하단 1/3)
    const zoneW = SCREEN.WIDTH * 0.55;
    const zoneH = SCREEN.HEIGHT * 0.45;
    this.zone = scene.add
      .zone(0, SCREEN.HEIGHT - zoneH, zoneW, zoneH)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD - 1)
      .setInteractive();

    this.zone.on('pointerdown', this._onDown, this);
    scene.input.on('pointermove', this._onMove, this);
    scene.input.on('pointerup', this._onUp, this);
    scene.input.on('pointerupoutside', this._onUp, this);

    this._draw();

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.destroy, this);
  }

  _onDown(pointer) {
    if (this.pointerId !== null) return;
    this.pointerId = pointer.id;
    this.basePos.x = pointer.x;
    this.basePos.y = pointer.y;
    this.stickPos.x = pointer.x;
    this.stickPos.y = pointer.y;
    this.active = true;
    this._updateVector(pointer.x, pointer.y);
    this._draw();
  }

  _onMove(pointer) {
    if (!this.active || pointer.id !== this.pointerId) return;
    this._updateVector(pointer.x, pointer.y);
    this._draw();
  }

  _onUp(pointer) {
    if (pointer.id !== this.pointerId) return;
    this.pointerId = null;
    this.active = false;
    this.vector.x = 0;
    this.vector.y = 0;
    this.magnitude = 0;
    this.stickPos.x = this.basePos.x;
    this.stickPos.y = this.basePos.y;
    this._draw();
  }

  _updateVector(px, py) {
    const dx = px - this.basePos.x;
    const dy = py - this.basePos.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) {
      this.vector.x = 0;
      this.vector.y = 0;
      this.magnitude = 0;
      this.stickPos.x = this.basePos.x;
      this.stickPos.y = this.basePos.y;
      return;
    }
    const clamped = Math.min(len, ACTIVE_RADIUS);
    this.magnitude = clamped / ACTIVE_RADIUS;
    this.vector.x = (dx / len) * this.magnitude;
    this.vector.y = (dy / len) * this.magnitude;
    this.stickPos.x = this.basePos.x + (dx / len) * clamped;
    this.stickPos.y = this.basePos.y + (dy / len) * clamped;
  }

  _draw() {
    this.gfx.clear();
    if (!this.active) return;
    this.gfx.fillStyle(0xffffff, 0.12);
    this.gfx.fillCircle(this.basePos.x, this.basePos.y, BASE_RADIUS);
    this.gfx.lineStyle(2, 0xffffff, 0.35);
    this.gfx.strokeCircle(this.basePos.x, this.basePos.y, BASE_RADIUS);
    this.gfx.fillStyle(0xffffff, 0.45);
    this.gfx.fillCircle(this.stickPos.x, this.stickPos.y, STICK_RADIUS);
  }

  getVector() {
    return this.vector;
  }

  isActive() {
    return this.active;
  }

  destroy() {
    if (this.scene && this.scene.input) {
      this.scene.input.off('pointermove', this._onMove, this);
      this.scene.input.off('pointerup', this._onUp, this);
      this.scene.input.off('pointerupoutside', this._onUp, this);
    }
    if (this.zone) {
      this.zone.destroy();
      this.zone = null;
    }
    if (this.gfx) {
      this.gfx.destroy();
      this.gfx = null;
    }
  }
}
