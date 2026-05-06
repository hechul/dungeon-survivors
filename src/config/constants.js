// 화면/타일 등 전역 상수
export const SCREEN = {
  WIDTH: 390,
  HEIGHT: 844,
};

export const TILE_SIZE = 16;

export const COLORS = {
  BG: 0x0b0e14,
  GRID: 0x1a2030,
  PLAYER: 0x4ec9ff,
  ENEMY: 0xff4d4d,
  GEM: 0x4dffa0,
  BOSS: 0xb066ff,
  HP_BAR_BG: 0x222222,
  HP_BAR: 0xff3344,
  EXP_BAR: 0x66ccff,
};

export const DEPTH = {
  BG: 0,
  GROUND: 10,
  ENEMY: 20,
  GEM: 25,
  PLAYER: 30,
  WEAPON: 40,
  DAMAGE_NUMBER: 50,
  HUD: 100,
  OVERLAY: 200,
};

export const PHYSICS = {
  PICKUP_RADIUS: 80,
  MAGNET_SPEED: 280,
};

export const STORAGE_KEY = 'dungeon-survivors-save-v1';
