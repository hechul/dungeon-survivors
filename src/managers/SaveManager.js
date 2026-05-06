import { STORAGE_KEY } from '../config/constants.js';

// LocalStorage 기반 영구 저장 (안전 가드 포함)
const DEFAULT_SAVE = {
  version: 1,
  gold: 0,
  unlockedCharacters: ['warrior'],
  highScore: {
    survivedTime: 0,
    kills: 0,
    level: 1,
  },
  metaUpgrades: {},
};

class SaveManagerSingleton {
  constructor() {
    this.cache = null;
  }

  load() {
    if (this.cache) return this.cache;
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (!raw) {
        this.cache = { ...DEFAULT_SAVE };
        return this.cache;
      }
      const parsed = JSON.parse(raw);
      this.cache = { ...DEFAULT_SAVE, ...parsed };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[SaveManager] load 실패, 기본값 사용', e);
      this.cache = { ...DEFAULT_SAVE };
    }
    return this.cache;
  }

  save(patch = {}) {
    const data = { ...this.load(), ...patch };
    this.cache = data;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[SaveManager] save 실패', e);
    }
    return data;
  }

  addGold(amount) {
    const data = this.load();
    return this.save({ gold: (data.gold ?? 0) + amount });
  }

  unlockCharacter(id) {
    const data = this.load();
    const set = new Set(data.unlockedCharacters || []);
    set.add(id);
    return this.save({ unlockedCharacters: [...set] });
  }

  setHighScore({ survivedTime, kills, level }) {
    const data = this.load();
    const cur = data.highScore || {};
    return this.save({
      highScore: {
        survivedTime: Math.max(cur.survivedTime ?? 0, survivedTime ?? 0),
        kills: Math.max(cur.kills ?? 0, kills ?? 0),
        level: Math.max(cur.level ?? 1, level ?? 1),
      },
    });
  }

  reset() {
    this.cache = { ...DEFAULT_SAVE };
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
    return this.cache;
  }
}

const SaveManager = new SaveManagerSingleton();
export default SaveManager;
