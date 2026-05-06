import Phaser from 'phaser';
import { SCREEN, DEPTH, COLORS } from '../config/constants.js';
import EventBus from '../managers/EventBus.js';

// 화면 오버레이 HUD — HP, 경험치바, 타이머, 킬, 골드, 레벨
export default class HUD {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;

    // 경험치바 (상단)
    const barH = 6;
    this.expBarBg = scene.add.rectangle(0, 0, SCREEN.WIDTH, barH, 0x222222).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD);
    this.expBar = scene.add.rectangle(0, 0, 0, barH, COLORS.EXP_BAR).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD + 1);

    // 레벨
    this.levelText = scene.add
      .text(8, 12, 'Lv.1', { fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 })
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD);

    // HP 바 (좌상단)
    this.hpBarBg = scene.add.rectangle(8, 32, 130, 12, 0x222222).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD);
    this.hpBar = scene.add.rectangle(8, 32, 130, 12, COLORS.HP_BAR).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.HUD + 1);
    this.hpText = scene.add
      .text(73, 38, '100/100', { fontFamily: 'sans-serif', fontSize: '10px', color: '#ffffff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD + 2);

    // 타이머 (상단 중앙)
    this.timeText = scene.add
      .text(SCREEN.WIDTH / 2, 16, '00:00', { fontFamily: 'sans-serif', fontSize: '20px', color: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD);

    // 킬 카운트 (우상단)
    this.killText = scene.add
      .text(SCREEN.WIDTH - 8, 16, 'Kills 0', { fontFamily: 'sans-serif', fontSize: '12px', color: '#ffffff', stroke: '#000', strokeThickness: 3 })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD);
    this.goldText = scene.add
      .text(SCREEN.WIDTH - 8, 36, 'G 0', { fontFamily: 'sans-serif', fontSize: '12px', color: '#ffe14d', stroke: '#000', strokeThickness: 3 })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD);

    // 보스 알림 라인
    this.bossText = scene.add
      .text(SCREEN.WIDTH / 2, 100, '', { fontFamily: 'sans-serif', fontSize: '22px', color: '#ff6666', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD)
      .setAlpha(0);

    // 보스 HP 바
    this.bossBarBg = scene.add.rectangle(SCREEN.WIDTH / 2, 70, SCREEN.WIDTH - 32, 10, 0x222222)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD)
      .setVisible(false);
    this.bossBar = scene.add.rectangle(16, 65, SCREEN.WIDTH - 32, 10, 0xff4d4d)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD + 1)
      .setVisible(false);
    this.bossNameText = scene.add
      .text(SCREEN.WIDTH / 2, 70, '', {
        fontFamily: 'sans-serif',
        fontSize: '11px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD + 2)
      .setVisible(false);
    this.activeBoss = null;

    // 도전과제 알림
    this.achievementText = scene.add
      .text(SCREEN.WIDTH / 2, 200, '', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#ffe14d',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 3,
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD + 5)
      .setAlpha(0);

    // 슬롯/시너지 패널 (좌측 하단 — 조이스틱 위)
    this.slotPanel = scene.add
      .text(8, SCREEN.HEIGHT - 230, '', {
        fontFamily: 'sans-serif',
        fontSize: '11px',
        color: '#ffffff',
        stroke: '#000',
        strokeThickness: 2,
        lineSpacing: 2,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.HUD);

    EventBus.on('player:damaged', this._refreshHp, this);
    EventBus.on('player:healed', this._refreshHp, this);
    EventBus.on('player:exp-changed', this._refreshExp, this);
    EventBus.on('wave:boss-spawn', this._showBoss, this);
    EventBus.on('enemy:killed', this._onEnemyKilled, this);
    EventBus.on('achievement:unlocked', this._onAchievement, this);
    EventBus.on('weapon:evolved', this._onEvolved, this);

    scene.events.on(Phaser.Scenes.Events.UPDATE, this._frame, this);
  }

  // 외부 호출용: 큰 알림 — VICTORY, 루프 등
  showAnnounce(text, colorNum = 0xffffff, durationMs = 3000) {
    const colorStr = `#${colorNum.toString(16).padStart(6, '0')}`;
    this.achievementText.setText(text).setColor(colorStr).setAlpha(1);
    this.scene.tweens.killTweensOf(this.achievementText);
    this.scene.tweens.add({
      targets: this.achievementText,
      alpha: 0,
      duration: 800,
      delay: durationMs,
    });
  }

  _onEnemyKilled() {
    // 보스 처치 시 보스바 숨김
    if (this.activeBoss && !this.activeBoss.active) {
      this.activeBoss = null;
      this.bossBar.setVisible(false);
      this.bossBarBg.setVisible(false);
      this.bossNameText.setVisible(false);
    }
  }

  _onAchievement(payload) {
    this.showAnnounce(`도전과제: ${payload.name || payload.id}\n+${payload.reward?.gold || 0} G`, 0xffe14d, 2200);
  }

  _onEvolved(payload) {
    this.showAnnounce(`★ 진화 ★\n${payload.from} → ${payload.to}`, 0xffaa00, 2400);
  }

  _refreshSlots() {
    const ws = this.scene.weaponSystem;
    const ls = this.scene.levelUpSystem;
    if (!ws || !ls) return;
    const wcount = ws.slots.length;
    const pcount = ls.ownedPassives().length;
    let txt = `무기 ${wcount}/4   패시브 ${pcount}/4`;
    // 활성 시너지
    if (this.scene.synergySystem) {
      const active = this.scene.synergySystem.activeSynergies();
      if (active.length > 0) {
        txt += '\n[시너지]';
        active.slice(0, 4).forEach((s) => {
          txt += `\n  ${s.name}`;
        });
      }
    }
    this.slotPanel.setText(txt);
  }

  _refreshHp() {
    const p = this.player;
    const ratio = Math.max(0, Math.min(1, p.stats.hp / p.stats.maxHp));
    this.hpBar.width = 130 * ratio;
    this.hpText.setText(`${Math.round(p.stats.hp)}/${Math.round(p.stats.maxHp)}`);
  }

  _refreshExp() {
    const p = this.player;
    const ratio = Math.max(0, Math.min(1, p.exp / p.expToNext));
    this.expBar.width = SCREEN.WIDTH * ratio;
    this.levelText.setText(`Lv.${p.level}`);
  }

  _showBoss(payload) {
    const isFinal = !!payload.isFinal;
    this.bossText.setText(isFinal ? '!! 마왕 등장 !!' : '!! 보스 등장 !!');
    this.bossText.setAlpha(1);
    this.scene.tweens.add({
      targets: this.bossText,
      alpha: 0,
      duration: 2000,
      delay: 1500,
    });
    // 활성 보스 추적 — WaveSystem에서 가장 최근 추가된 보스
    const ws = this.scene.waveSystem;
    if (!ws) return;
    let boss = null;
    ws.activeEnemies.forEach((e) => {
      if (e.isBoss) boss = e;
    });
    this.activeBoss = boss;
    if (boss) {
      const data = this.scene.cache.json.get('enemies')[payload.bossType];
      this.bossNameText.setText(data?.name || payload.bossType).setVisible(true);
      this.bossBar.setVisible(true);
      this.bossBarBg.setVisible(true);
    }
  }

  _frame() {
    if (!this.scene || !this.player) return;
    // 타이머
    const elapsed = Math.max(0, Math.floor(this.scene.elapsed || 0));
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    this.timeText.setText(`${m}:${s}`);
    this.killText.setText(`Kills ${this.player.kills}`);
    this.goldText.setText(`G ${this.player.gold}`);
    this._refreshHp();
    this._refreshExp();
    this._refreshSlots();
    // 보스 HP 바 업데이트
    if (this.activeBoss) {
      if (!this.activeBoss.active) {
        this.activeBoss = null;
        this.bossBar.setVisible(false);
        this.bossBarBg.setVisible(false);
        this.bossNameText.setVisible(false);
      } else {
        const ratio = Math.max(0, Math.min(1, this.activeBoss.hp / this.activeBoss.maxHp));
        this.bossBar.width = (SCREEN.WIDTH - 32) * ratio;
      }
    }
  }

  destroy() {
    EventBus.off('player:damaged', this._refreshHp, this);
    EventBus.off('player:healed', this._refreshHp, this);
    EventBus.off('player:exp-changed', this._refreshExp, this);
    EventBus.off('wave:boss-spawn', this._showBoss, this);
    EventBus.off('enemy:killed', this._onEnemyKilled, this);
    EventBus.off('achievement:unlocked', this._onAchievement, this);
    EventBus.off('weapon:evolved', this._onEvolved, this);
    if (this.scene && this.scene.events) {
      this.scene.events.off(Phaser.Scenes.Events.UPDATE, this._frame, this);
    }
    [this.expBar, this.expBarBg, this.hpBar, this.hpBarBg, this.hpText, this.levelText, this.timeText, this.killText, this.goldText, this.bossText, this.bossBar, this.bossBarBg, this.bossNameText, this.achievementText, this.slotPanel]
      .forEach((o) => o && o.destroy && o.destroy());
  }
}
