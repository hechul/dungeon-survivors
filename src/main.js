import Phaser from 'phaser';
import { createGameConfig } from './config/game-config.js';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import LobbyScene from './scenes/LobbyScene.js';
import GameScene from './scenes/GameScene.js';
import LevelUpScene from './scenes/LevelUpScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import ResultScene from './scenes/ResultScene.js';
import PauseScene from './scenes/PauseScene.js';

// 게임 인스턴스 부팅
const config = createGameConfig([
  BootScene,
  TitleScene,
  LobbyScene,
  GameScene,
  LevelUpScene,
  GameOverScene,
  ResultScene,
  PauseScene,
]);

// eslint-disable-next-line no-new
new Phaser.Game(config);
