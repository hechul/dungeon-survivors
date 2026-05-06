import Phaser from 'phaser';
import { SCREEN, COLORS } from '../config/constants.js';
import charactersData from '../../data/characters.json';
import enemiesData from '../../data/enemies.json';
import weaponsData from '../../data/weapons.json';
import wavesData from '../../data/waves.json';
import levelUpPoolData from '../../data/level-up-pool.json';
import metaUpgradesData from '../../data/meta-upgrades.json';
import achievementsData from '../../data/achievements.json';
import synergiesData from '../../data/synergies.json';

// 데이터 로딩 + 텍스처 로딩 + 애니메이션 등록 + 다음 씬 전이
export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // 진행 표시
    const W = SCREEN.WIDTH;
    const H = SCREEN.HEIGHT;
    this.add.rectangle(0, 0, W, H, COLORS.BG).setOrigin(0, 0);
    const titleText = this.add
      .text(W / 2, H / 2 - 24, '던전 서바이버즈', {
        fontFamily: 'sans-serif', fontSize: '24px', color: '#ffffff', fontStyle: 'bold',
      })
      .setOrigin(0.5);
    const subText = this.add
      .text(W / 2, H / 2 + 14, 'Loading 0%', {
        fontFamily: 'sans-serif', fontSize: '14px', color: '#88aacc',
      })
      .setOrigin(0.5);
    this.load.on('progress', (v) => subText.setText(`Loading ${Math.round(v * 100)}%`));

    // 배경
    this.load.image('bg_tile', 'assets/bg/tile_dungeon_floor.png');
    this.load.image('tile_swamp', 'assets/bg/tile_swamp.png');

    // 캐릭터
    this.load.spritesheet('char_warrior', 'assets/sprites/player/char_warrior.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('char_mage', 'assets/sprites/player/char_mage.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('char_ranger', 'assets/sprites/player/char_ranger.png', { frameWidth: 32, frameHeight: 32 });

    // 적
    this.load.spritesheet('enemy_slime', 'assets/sprites/enemy/enemy_slime.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('enemy_bat', 'assets/sprites/enemy/enemy_bat.png', { frameWidth: 14, frameHeight: 14 });
    this.load.spritesheet('enemy_skeleton', 'assets/sprites/enemy/enemy_skeleton.png', { frameWidth: 18, frameHeight: 18 });
    this.load.spritesheet('enemy_ghost', 'assets/sprites/enemy/enemy_ghost.png', { frameWidth: 18, frameHeight: 18 });
    this.load.spritesheet('enemy_orc', 'assets/sprites/enemy/enemy_orc.png', { frameWidth: 22, frameHeight: 22 });
    this.load.spritesheet('enemy_swarmer', 'assets/sprites/enemy/enemy_swarmer.png', { frameWidth: 12, frameHeight: 12 });
    this.load.spritesheet('enemy_caster', 'assets/sprites/enemy/enemy_caster.png', { frameWidth: 18, frameHeight: 18 });
    this.load.spritesheet('enemy_bomber', 'assets/sprites/enemy/enemy_bomber.png', { frameWidth: 18, frameHeight: 18 });
    this.load.spritesheet('enemy_giant', 'assets/sprites/enemy/enemy_giant.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('enemy_sniper', 'assets/sprites/enemy/enemy_sniper.png', { frameWidth: 18, frameHeight: 18 });

    // 보스
    this.load.spritesheet('boss_skeleton_king', 'assets/sprites/boss/boss_skeleton_king.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('boss_dark_mage', 'assets/sprites/boss/boss_dark_mage.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('boss_dragon', 'assets/sprites/boss/boss_dragon.png', { frameWidth: 80, frameHeight: 80 });
    this.load.spritesheet('boss_demon_king', 'assets/sprites/boss/boss_demon_king.png', { frameWidth: 96, frameHeight: 96 });

    // 무기 (시트)
    this.load.spritesheet('weapon_sword', 'assets/sprites/weapon/weapon_sword.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('weapon_orb', 'assets/sprites/weapon/weapon_orb.png', { frameWidth: 12, frameHeight: 12 });
    this.load.spritesheet('weapon_aura', 'assets/fx/weapon_aura.png', { frameWidth: 96, frameHeight: 96 });
    this.load.image('weapon_blade', 'assets/sprites/weapon/weapon_blade.png');
    this.load.spritesheet('weapon_whip', 'assets/sprites/weapon/weapon_whip.png', { frameWidth: 96, frameHeight: 48 });
    this.load.spritesheet('weapon_lightning', 'assets/fx/weapon_storm.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('weapon_poison', 'assets/fx/weapon_poison.png', { frameWidth: 100, frameHeight: 100 });
    this.load.image('weapon_boomerang', 'assets/sprites/weapon/weapon_boomerang.png');
    this.load.spritesheet('weapon_frost', 'assets/fx/weapon_frost.png', { frameWidth: 100, frameHeight: 100 });
    // 진화
    this.load.spritesheet('weapon_holy_sword', 'assets/sprites/weapon/weapon_holy_sword.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('weapon_starfall', 'assets/sprites/weapon/weapon_starfall.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('weapon_inferno', 'assets/fx/weapon_inferno.png', { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('weapon_thunder_whip', 'assets/sprites/weapon/weapon_thunder_whip.png', { frameWidth: 96, frameHeight: 48 });
    this.load.spritesheet('weapon_storm', 'assets/fx/weapon_storm.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('weapon_plague', 'assets/fx/weapon_plague.png', { frameWidth: 140, frameHeight: 140 });
    this.load.spritesheet('weapon_tempest', 'assets/sprites/weapon/weapon_tempest.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('weapon_blizzard', 'assets/fx/weapon_blizzard.png', { frameWidth: 160, frameHeight: 160 });
    this.load.image('weapon_death_orbit', 'assets/sprites/weapon/weapon_death_orbit.png');

    // 아이템
    this.load.spritesheet('exp_gem_small', 'assets/sprites/item/exp_gem_small.png', { frameWidth: 8, frameHeight: 8 });
    this.load.spritesheet('exp_gem_med', 'assets/sprites/item/exp_gem_med.png', { frameWidth: 10, frameHeight: 10 });
    this.load.spritesheet('exp_gem_big', 'assets/sprites/item/exp_gem_big.png', { frameWidth: 14, frameHeight: 14 });
    this.load.image('pickup_magnet', 'assets/sprites/item/pickup_magnet.png');
    this.load.image('pickup_bomb', 'assets/sprites/item/pickup_bomb.png');
    this.load.image('pickup_boost', 'assets/sprites/item/pickup_boost.png');
    this.load.image('pickup_heal', 'assets/sprites/item/pickup_heal.png');

    // 로드 실패시 무시
    this.load.on('loaderror', (file) => {
      console.warn('[BootScene] load error:', file.key, file.src);
    });

    this._titleText = titleText;
    this._subText = subText;
  }

  create() {
    // JSON 데이터를 Phaser 캐시에 등록
    this.cache.json.add('characters', charactersData);
    this.cache.json.add('enemies', enemiesData);
    this.cache.json.add('weapons', weaponsData);
    this.cache.json.add('waves', wavesData);
    this.cache.json.add('levelUpPool', levelUpPoolData);
    this.cache.json.add('metaUpgrades', metaUpgradesData);
    this.cache.json.add('achievements', achievementsData);
    this.cache.json.add('synergies', synergiesData);

    // 누락된 텍스처 fallback 생성 (아직 에셋이 없는 키용)
    this._createPlaceholderTextures();

    // 애니메이션 등록
    this._registerAnimations();

    // 전이
    this.time.delayedCall(300, () => {
      if (this._titleText) this._titleText.destroy();
      if (this._subText) this._subText.destroy();
      this.scene.start('TitleScene');
    });
  }

  _createPlaceholderTextures() {
    const make = (key, w, h, color) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillRect(0, 0, w, h);
      g.generateTexture(key, w, h);
      g.destroy();
    };

    make('white1x1', 1, 1, 0xffffff);
    // 에셋 없는 placeholder들 (혹시라도 빠진 무기/UI에 fallback)
    if (!this.textures.exists('placeholder_player')) make('placeholder_player', 24, 24, 0x4ec9ff);
    if (!this.textures.exists('placeholder_enemy')) make('placeholder_enemy', 16, 16, 0xff4d4d);
    if (!this.textures.exists('placeholder_boss')) make('placeholder_boss', 64, 64, 0xb066ff);
    if (!this.textures.exists('placeholder_gem')) make('placeholder_gem', 8, 8, 0x4dffa0);
    if (!this.textures.exists('placeholder_blade')) make('placeholder_blade', 12, 12, 0xffffff);
  }

  _registerAnimations() {
    const aa = this.anims;

    // 캐릭터 워크 (4프레임 ping-pong)
    ['char_warrior', 'char_mage', 'char_ranger'].forEach((key) => {
      if (!aa.exists(`${key}_walk`) && this.textures.exists(key)) {
        aa.create({
          key: `${key}_walk`,
          frames: aa.generateFrameNumbers(key, { start: 0, end: 3 }),
          frameRate: 8,
          repeat: -1,
        });
      }
    });

    // 적 2프레임 idle/walk
    [
      'enemy_slime', 'enemy_bat', 'enemy_skeleton', 'enemy_ghost', 'enemy_orc',
      'enemy_swarmer', 'enemy_caster', 'enemy_bomber', 'enemy_giant', 'enemy_sniper',
    ].forEach((key) => {
      if (!aa.exists(`${key}_walk`) && this.textures.exists(key)) {
        aa.create({
          key: `${key}_walk`,
          frames: aa.generateFrameNumbers(key, { start: 0, end: 1 }),
          frameRate: 4,
          repeat: -1,
        });
      }
    });

    // 보스 4프레임 idle (호흡)
    ['boss_skeleton_king', 'boss_dark_mage', 'boss_dragon', 'boss_demon_king'].forEach((key) => {
      if (!aa.exists(`${key}_idle`) && this.textures.exists(key)) {
        aa.create({
          key: `${key}_idle`,
          frames: aa.generateFrameNumbers(key, { start: 0, end: 3 }),
          frameRate: 6,
          repeat: -1,
        });
      }
    });

    // 무기 시트 애니메이션 (1회 재생용)
    const weaponAnims = [
      ['weapon_sword', 6, 18],
      ['weapon_orb', 4, 10],
      ['weapon_aura', 6, 12],
      ['weapon_whip', 6, 18],
      ['weapon_lightning', 4, 18],
      ['weapon_poison', 6, 8],
      ['weapon_frost', 6, 14],
      ['weapon_holy_sword', 8, 20],
      ['weapon_starfall', 4, 12],
      ['weapon_inferno', 6, 14],
      ['weapon_thunder_whip', 6, 18],
      ['weapon_storm', 6, 18],
      ['weapon_plague', 6, 8],
      ['weapon_tempest', 4, 14],
      ['weapon_blizzard', 8, 16],
    ];
    weaponAnims.forEach(([key, frames, fps]) => {
      if (!aa.exists(`${key}_play`) && this.textures.exists(key)) {
        const tex = this.textures.get(key);
        const realFrames = Math.min(frames, tex.frameTotal);
        aa.create({
          key: `${key}_play`,
          frames: aa.generateFrameNumbers(key, { start: 0, end: realFrames - 1 }),
          frameRate: fps,
          repeat: 0, // 1회 재생 (FX는 spawn당 1회, aura는 매번 재생됨)
        });
      }
    });

    // 경험치 젬 반짝임
    ['exp_gem_small', 'exp_gem_med', 'exp_gem_big'].forEach((key) => {
      if (!aa.exists(`${key}_pulse`) && this.textures.exists(key)) {
        aa.create({
          key: `${key}_pulse`,
          frames: aa.generateFrameNumbers(key, { start: 0, end: 3 }),
          frameRate: 6,
          repeat: -1,
        });
      }
    });
  }
}
