import Phaser from 'phaser';
import EventBus from '../managers/EventBus.js';
import AudioManager from '../managers/AudioManager.js';

// 게임 중 무작위 이벤트 — 90초마다 0.45 확률로 발생
const EVENT_CHECK_INTERVAL = 90000;
const EVENT_CHANCE = 0.45;

const EVENTS = [
  {
    id: 'rush',
    name: '대규모 침공',
    description: '20초간 적 스폰 5배',
    duration: 20000,
    apply: (scene) => {
      const ws = scene.waveSystem;
      ws._origRate = ws.spawnTimer;
      ws._rushUntil = scene.time.now + 20000;
      ws._rushMul = 5;
    },
    revert: (scene) => {
      const ws = scene.waveSystem;
      ws._rushUntil = 0;
      ws._rushMul = 1;
    },
  },
  {
    id: 'gold_burst',
    name: '황금 시간',
    description: '15초간 골드 드롭 3배',
    duration: 15000,
    apply: (scene) => {
      scene.player._goldMul = 3;
    },
    revert: (scene) => {
      scene.player._goldMul = 1;
    },
  },
  {
    id: 'frenzy',
    name: '광폭화',
    description: '12초간 공격력 2배',
    duration: 12000,
    apply: (scene) => {
      scene.player._frenzyMul = 2;
    },
    revert: (scene) => {
      scene.player._frenzyMul = 1;
    },
  },
];

export default class EventSystem {
  constructor(scene) {
    this.scene = scene;
    this.lastCheck = 0;
    this.activeEvent = null;
    this.activeUntil = 0;
    scene.events.on(Phaser.Scenes.Events.UPDATE, this._frame, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  _frame() {
    const now = this.scene.time.now;
    if (this.activeEvent && now >= this.activeUntil) {
      this.activeEvent.revert(this.scene);
      EventBus.emit('event:ended', { id: this.activeEvent.id });
      this.activeEvent = null;
    }
    if (now - this.lastCheck < EVENT_CHECK_INTERVAL) return;
    this.lastCheck = now;
    if (this.activeEvent) return;
    if (Math.random() > EVENT_CHANCE) return;
    const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    this.activeEvent = ev;
    this.activeUntil = now + ev.duration;
    ev.apply(this.scene);
    AudioManager.achievement();
    EventBus.emit('event:started', ev);
    if (this.scene.hud && this.scene.hud.showAnnounce) {
      this.scene.hud.showAnnounce(`${ev.name}\n${ev.description}`, 0xffaa00, 3000);
    }
  }

  destroy() {
    if (this.activeEvent) this.activeEvent.revert(this.scene);
    if (this.scene && this.scene.events) {
      this.scene.events.off(Phaser.Scenes.Events.UPDATE, this._frame, this);
    }
  }
}
