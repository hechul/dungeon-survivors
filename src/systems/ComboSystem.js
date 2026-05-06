import Phaser from 'phaser';
import { SCREEN, DEPTH } from '../config/constants.js';
import EventBus from '../managers/EventBus.js';

const RESET_AFTER = 3000; // 3초 무처치 시 콤보 리셋

// 처치 콤보 — 일정 시간 안에 적을 계속 처치하면 카운트 누적
// 콤보 단계별로 플레이어 공격력 보너스
export default class ComboSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.combo = 0;
    this.lastKill = 0;
    this.bestRunCombo = 0;

    // HUD 텍스트
    this.label = scene.add
      .text(SCREEN.WIDTH - 8, 60, '', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#ffe14d',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 4,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD)
      .setAlpha(0);

    this._onKill = this._onKill.bind(this);
    EventBus.on('enemy:killed', this._onKill);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this._frame, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  _onKill() {
    const now = this.scene.time.now;
    this.combo += 1;
    this.lastKill = now;
    if (this.combo > this.bestRunCombo) this.bestRunCombo = this.combo;
    EventBus.emit('combo:changed', { combo: this.combo, multiplier: this.atkMultiplier() });
    // 콤보 단계 도달 시 알림
    if (this.combo === 25 || this.combo === 50 || this.combo === 100 || this.combo === 200) {
      if (this.scene.hud && this.scene.hud.showAnnounce) {
        this.scene.hud.showAnnounce(`COMBO x${this.combo}!`, 0xffe14d, 1400);
      }
    }
  }

  _frame() {
    const now = this.scene.time.now;
    if (this.combo > 0 && now - this.lastKill > RESET_AFTER) {
      this.combo = 0;
      EventBus.emit('combo:changed', { combo: 0, multiplier: 1 });
    }
    if (this.combo >= 5) {
      const mul = this.atkMultiplier();
      this.label.setText(`x${this.combo}\n+${Math.round((mul - 1) * 100)}%`);
      this.label.setAlpha(Math.min(1, 0.4 + this.combo / 50));
    } else {
      this.label.setAlpha(0);
    }
  }

  atkMultiplier() {
    // 5 콤보부터 보너스 시작, 200 콤보 = +50%
    if (this.combo < 5) return 1;
    return 1 + Math.min(0.5, (this.combo - 5) * 0.0025);
  }

  destroy() {
    EventBus.off('enemy:killed', this._onKill);
    if (this.scene && this.scene.events) {
      this.scene.events.off(Phaser.Scenes.Events.UPDATE, this._frame, this);
    }
    if (this.label) this.label.destroy();
  }
}
