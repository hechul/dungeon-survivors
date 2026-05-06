import Phaser from 'phaser';
import { DEPTH } from '../config/constants.js';

// 가벼운 파티클 풀 — Phaser ParticleEmitter 대신 직접 관리하여 모바일 성능 우선
const POOL_SIZE = 200;

export default class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    for (let i = 0; i < POOL_SIZE; i += 1) {
      const r = scene.add.rectangle(0, 0, 3, 3, 0xffffff, 0);
      r.setDepth(DEPTH.WEAPON + 1);
      this.particles.push({ obj: r, vx: 0, vy: 0, life: 0, maxLife: 0 });
    }
    this.cursor = 0;

    scene.events.on(Phaser.Scenes.Events.UPDATE, this._update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  _next() {
    for (let i = 0; i < POOL_SIZE; i += 1) {
      const idx = (this.cursor + i) % POOL_SIZE;
      const p = this.particles[idx];
      if (p.life <= 0) {
        this.cursor = (idx + 1) % POOL_SIZE;
        return p;
      }
    }
    // 가득 찼으면 가장 오래된 것 재활용
    this.cursor = (this.cursor + 1) % POOL_SIZE;
    return this.particles[this.cursor];
  }

  // 폭발/스파크 — count개 입자를 360도로 분사
  burst(x, y, count, color, options = {}) {
    const speed = options.speed ?? 120;
    const speedJitter = options.speedJitter ?? 60;
    const life = options.life ?? 350;
    const size = options.size ?? 3;
    for (let i = 0; i < count; i += 1) {
      const p = this._next();
      const angle = Math.random() * Math.PI * 2;
      const s = speed + Math.random() * speedJitter;
      p.obj.setPosition(x, y);
      p.obj.setSize(size, size);
      p.obj.fillColor = color;
      p.obj.setAlpha(1);
      p.vx = Math.cos(angle) * s;
      p.vy = Math.sin(angle) * s;
      p.life = life;
      p.maxLife = life;
    }
  }

  // 직선 입자 (피격 방향)
  jet(x, y, dirX, dirY, count, color) {
    const baseAngle = Math.atan2(dirY, dirX);
    for (let i = 0; i < count; i += 1) {
      const p = this._next();
      const a = baseAngle + (Math.random() - 0.5) * 0.6;
      const s = 100 + Math.random() * 80;
      p.obj.setPosition(x, y);
      p.obj.setSize(3, 3);
      p.obj.fillColor = color;
      p.obj.setAlpha(1);
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.life = 280;
      p.maxLife = 280;
    }
  }

  _update(time, delta) {
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      if (p.life <= 0) continue;
      p.life -= delta;
      const t = Math.max(0, p.life / p.maxLife);
      p.obj.x += (p.vx * delta) / 1000;
      p.obj.y += (p.vy * delta) / 1000;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.obj.setAlpha(t);
      if (p.life <= 0) p.obj.setAlpha(0);
    }
  }

  destroy() {
    if (this.scene && this.scene.events) {
      this.scene.events.off(Phaser.Scenes.Events.UPDATE, this._update, this);
    }
    this.particles.forEach((p) => p.obj && p.obj.destroy());
    this.particles = [];
  }
}
