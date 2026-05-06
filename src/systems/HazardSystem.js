import Phaser from 'phaser';
import { SCREEN, DEPTH } from '../config/constants.js';
import EventBus from '../managers/EventBus.js';

// 환경 위험: 게임 시작 후 5분마다 60초 페이즈로 화면 가장자리 안개
// 안개 안에 있으면 초당 데미지
const TRIGGER_AT = 300;     // 5분 후 시작
const PHASE_INTERVAL = 240; // 4분마다 재발동
const PHASE_DURATION = 50;  // 50초 지속
const FOG_DPS = 6;          // 초당 데미지

export default class HazardSystem {
  constructor(scene) {
    this.scene = scene;
    this.gfx = scene.add.graphics();
    this.gfx.setScrollFactor(0).setDepth(DEPTH.HUD - 1);
    this.active = false;
    this.lastTrigger = -PHASE_INTERVAL; // 첫 트리거를 TRIGGER_AT 시점에
    this.phaseEnd = 0;
    this.fogRadius = 0;
    this.targetRadius = 0;
    this._dpsAcc = 0;

    scene.events.on(Phaser.Scenes.Events.UPDATE, this._frame, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  _frame(time, delta) {
    const elapsed = this.scene.elapsed || 0;
    const dt = (typeof delta === 'number' && delta > 0) ? delta : (this.scene.game?.loop?.delta || 16);
    if (elapsed < TRIGGER_AT) {
      this.gfx.clear();
      return;
    }
    if (!this.active && elapsed - this.lastTrigger >= PHASE_INTERVAL) {
      this.lastTrigger = elapsed;
      this.active = true;
      this.phaseEnd = elapsed + PHASE_DURATION;
      this.targetRadius = 130;
      if (this.scene.hud && this.scene.hud.showAnnounce) {
        this.scene.hud.showAnnounce('어둠이 다가옵니다!\n중심을 사수하세요', 0xaa66ff, 3000);
      }
    }
    if (this.active && elapsed >= this.phaseEnd) {
      this.active = false;
      this.targetRadius = Math.max(SCREEN.WIDTH, SCREEN.HEIGHT);
      if (this.scene.hud && this.scene.hud.showAnnounce) {
        this.scene.hud.showAnnounce('안전!', 0x4dffa0, 1800);
      }
    }
    // 부드럽게 보간
    this.fogRadius += (this.targetRadius - this.fogRadius) * 0.05;

    // 그리기 — 화면 중앙 기준 반지름 밖은 어둠
    this.gfx.clear();
    if (this.active || this.fogRadius < SCREEN.WIDTH) {
      const cx = SCREEN.WIDTH / 2;
      const cy = SCREEN.HEIGHT / 2;
      // 어둠 — 반지름 밖
      this.gfx.fillStyle(0x110018, 0.7);
      this.gfx.fillRect(0, 0, SCREEN.WIDTH, SCREEN.HEIGHT);
      // 안전 구역 — destination-out blend (대신 투명한 원으로 컷아웃 효과 흉내)
      this.gfx.setBlendMode(Phaser.BlendModes.ERASE);
      this.gfx.fillStyle(0xffffff, 1);
      this.gfx.fillCircle(cx, cy, this.fogRadius);
      this.gfx.setBlendMode(Phaser.BlendModes.NORMAL);
      // 가장자리 링
      if (this.active) {
        this.gfx.lineStyle(3, 0xaa66ff, 0.7);
        this.gfx.strokeCircle(cx, cy, this.fogRadius);
      }
    }

    // 데미지 — 플레이어가 안전 구역 밖
    if (this.active && this.scene.player && this.scene.player.alive) {
      const cam = this.scene.cameras.main;
      const px = this.scene.player.x - cam.scrollX;
      const py = this.scene.player.y - cam.scrollY;
      const dx = px - SCREEN.WIDTH / 2;
      const dy = py - SCREEN.HEIGHT / 2;
      if (dx * dx + dy * dy > this.fogRadius * this.fogRadius) {
        this._dpsAcc += (FOG_DPS * dt) / 1000;
        while (this._dpsAcc >= 1) {
          this._dpsAcc -= 1;
          this.scene.player.takeDamage(1);
        }
      }
    }
  }

  destroy() {
    if (this.scene && this.scene.events) {
      this.scene.events.off(Phaser.Scenes.Events.UPDATE, this._frame, this);
    }
    if (this.gfx) this.gfx.destroy();
  }
}
