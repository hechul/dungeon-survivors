import Phaser from 'phaser';

// 모든 시스템 간 통신은 이 싱글톤 EventEmitter를 통해서만 발생
class EventBusSingleton extends Phaser.Events.EventEmitter {
  constructor() {
    super();
  }

  // 디버그: 발행 이벤트 추적용
  emitVerbose(name, payload) {
    if (typeof window !== 'undefined' && window.__DS_DEBUG__) {
      // eslint-disable-next-line no-console
      console.log('[EventBus]', name, payload);
    }
    return super.emit(name, payload);
  }
}

const EventBus = new EventBusSingleton();
export default EventBus;
