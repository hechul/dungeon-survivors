import Phaser from 'phaser';
import { SCREEN, DEPTH } from '../config/constants.js';
import EventBus from '../managers/EventBus.js';

// 반투명 오버레이 — 3개 카드 선택
export default class LevelUpScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelUpScene' });
  }

  init(data) {
    this.choices = data?.choices || [];
  }

  create() {
    // 어두운 오버레이
    this.add.rectangle(0, 0, SCREEN.WIDTH, SCREEN.HEIGHT, 0x000000, 0.7).setOrigin(0, 0).setDepth(DEPTH.OVERLAY);

    // 타이틀
    this.add
      .text(SCREEN.WIDTH / 2, 90, 'LEVEL UP!', {
        fontFamily: 'sans-serif',
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#ffe14d',
        stroke: '#000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY + 1);
    this.add
      .text(SCREEN.WIDTH / 2, 130, '하나를 선택하세요', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#cccccc',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY + 1);

    // 카드 3개
    const cardW = SCREEN.WIDTH - 60;
    const cardH = 120;
    const startY = 200;
    const gap = 16;
    this.choices.forEach((c, i) => {
      const y = startY + (cardH + gap) * i;
      this._buildCard(SCREEN.WIDTH / 2, y, cardW, cardH, c);
    });

    // 카드가 0개일 때 — 빈 상태 (LevelUpSystem이 미리 막아줌)
    if (this.choices.length === 0) {
      this._select(null);
    }
  }

  _buildCard(cx, cy, w, h, choice) {
    const isEvo = choice.kind === 'weapon-evolve';
    const cardBg = isEvo ? 0x3a2e0d : 0x1a2030;
    const stroke = isEvo ? 0xffaa00 : 0x4ec9ff;
    const bg = this.add.rectangle(cx, cy, w, h, cardBg, 1).setStrokeStyle(isEvo ? 3 : 2, stroke).setDepth(DEPTH.OVERLAY + 2);
    bg.setInteractive({ useHandCursor: true });

    if (isEvo) {
      // 진화 카드 깜빡임
      this.tweens.add({ targets: bg, alpha: 0.7, yoyo: true, repeat: -1, duration: 600 });
    }

    const accentColor =
      isEvo ? '#ffaa00' :
      choice.kind === 'weapon-new' ? '#4dffa0' :
      choice.kind === 'weapon-up' ? '#4ec9ff' :
      '#ffe14d';

    const tag =
      isEvo ? '★ 진화 ★' :
      choice.kind === 'weapon-new' ? '신규' :
      `Lv.${choice.level}`;

    this.add
      .text(cx - w / 2 + 16, cy - h / 2 + 14, tag, {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        color: accentColor,
        fontStyle: 'bold',
      })
      .setDepth(DEPTH.OVERLAY + 3);

    this.add
      .text(cx, cy - 20, choice.name, {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY + 3);

    this.add
      .text(cx, cy + 18, choice.description, {
        fontFamily: 'sans-serif',
        fontSize: '13px',
        color: '#aaccdd',
        wordWrap: { width: w - 32 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY + 3);

    bg.on('pointerover', () => bg.setStrokeStyle(3, 0xffe14d));
    bg.on('pointerout', () => bg.setStrokeStyle(2, 0x4ec9ff));
    bg.on('pointerdown', () => this._select(choice));
  }

  _select(choice) {
    if (!choice) {
      // 안전장치
      this.scene.resume('GameScene');
      this.scene.stop();
      return;
    }
    EventBus.emit('player:select-upgrade', choice);
  }
}
