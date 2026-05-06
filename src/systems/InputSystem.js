import Phaser from 'phaser';
import EventBus from '../managers/EventBus.js';

// 조이스틱 + 키보드 → EventBus로 정규화된 입력 벡터 발행
export default class InputSystem {
  constructor(scene, joystick) {
    this.scene = scene;
    this.joystick = joystick;
    this.keys = scene.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      UP: Phaser.Input.Keyboard.KeyCodes.UP,
      DOWN: Phaser.Input.Keyboard.KeyCodes.DOWN,
      LEFT: Phaser.Input.Keyboard.KeyCodes.LEFT,
      RIGHT: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      ESC: Phaser.Input.Keyboard.KeyCodes.ESC,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    this.keys.SPACE.on('down', () => EventBus.emit('input:dash', {}));

    this._lastPause = 0;
    this.keys.ESC.on('down', () => {
      const now = scene.time.now;
      if (now - this._lastPause < 200) return;
      this._lastPause = now;
      EventBus.emit('game:toggle-pause', {});
    });

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.destroy, this);
  }

  // 매 프레임 호출 — 입력 벡터 반환 (정규화: 길이 ≤ 1)
  poll() {
    let x = 0;
    let y = 0;
    if (this.joystick && this.joystick.isActive()) {
      const v = this.joystick.getVector();
      x = v.x;
      y = v.y;
    }
    if (this.keys.W.isDown || this.keys.UP.isDown) y -= 1;
    if (this.keys.S.isDown || this.keys.DOWN.isDown) y += 1;
    if (this.keys.A.isDown || this.keys.LEFT.isDown) x -= 1;
    if (this.keys.D.isDown || this.keys.RIGHT.isDown) x += 1;

    const len = Math.sqrt(x * x + y * y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  destroy() {
    if (this.keys) {
      Object.values(this.keys).forEach((k) => {
        if (k && typeof k.removeAllListeners === 'function') k.removeAllListeners();
      });
      this.keys = null;
    }
  }
}
