import Phaser from 'phaser';
import { SCREEN, COLORS } from './constants.js';

// Phaser.Game 인스턴스 생성에 사용되는 설정 객체
export function createGameConfig(scenes) {
  return {
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: COLORS.BG,
    width: SCREEN.WIDTH,
    height: SCREEN.HEIGHT,
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: SCREEN.WIDTH,
      height: SCREEN.HEIGHT,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false,
      },
    },
    input: {
      activePointers: 2,
      touch: {
        capture: true,
      },
    },
    scene: scenes,
    fps: {
      target: 60,
      forceSetTimeOut: false,
    },
    render: {
      antialias: false,
    },
  };
}
