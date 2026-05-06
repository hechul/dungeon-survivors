// 모바일 진동 — 안전 가드
const Haptics = {
  vibrate(ms) {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms);
    } catch (_) {}
  },
  light() { this.vibrate(15); },
  med() { this.vibrate(40); },
  heavy() { this.vibrate([60, 30, 80]); },
};

export default Haptics;
