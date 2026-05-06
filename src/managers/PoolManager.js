// 오브젝트 풀링 매니저
// Enemy/Projectile/ExpGem/DamageNumber 등 update() 안에서 자주 생성되는 객체는
// new 대신 PoolManager.get()으로만 가져온다.
export default class PoolManager {
  constructor(scene) {
    this.scene = scene;
    this.pools = new Map();
    this.factories = new Map();
  }

  // 풀 등록: type 이름과 (scene)=>인스턴스 팩토리
  register(type, factory) {
    this.factories.set(type, factory);
    if (!this.pools.has(type)) this.pools.set(type, []);
  }

  get(type) {
    const pool = this.pools.get(type);
    if (!pool) {
      throw new Error(`PoolManager: '${type}' 미등록`);
    }

    let inst = null;
    while (pool.length > 0) {
      const candidate = pool.pop();
      if (candidate && !candidate.active) {
        inst = candidate;
        break;
      }
    }

    if (!inst) {
      const factory = this.factories.get(type);
      inst = factory(this.scene);
      inst.__poolType = type;
    }

    inst.setActive(true);
    if (typeof inst.setVisible === 'function') inst.setVisible(true);
    if (inst.body && typeof inst.body.enable !== 'undefined') inst.body.enable = true;
    return inst;
  }

  release(obj) {
    if (!obj) return;
    obj.setActive(false);
    if (typeof obj.setVisible === 'function') obj.setVisible(false);
    if (obj.body && typeof obj.body.enable !== 'undefined') obj.body.enable = false;
    if (typeof obj.setVelocity === 'function') obj.setVelocity(0, 0);
    // 풀 객체에 걸린 tween 누적 차단
    if (this.scene && this.scene.tweens) this.scene.tweens.killTweensOf(obj);
    const type = obj.__poolType;
    if (!type) return;
    const pool = this.pools.get(type);
    if (pool) pool.push(obj);
  }

  releaseAll(type) {
    const pool = this.pools.get(type);
    if (!pool) return;
    // 활성 객체도 모두 끄기 — 씬 전환 시 사용
    pool.forEach((o) => {
      if (o.active) this.release(o);
    });
  }

  count(type) {
    return this.pools.get(type)?.length ?? 0;
  }
}
