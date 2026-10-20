import { SPAWN, HEALTH_PACK, enemyPool } from '../config.js';

// 依玩家前進的位置，在前方畫面外預先生成敵人、掩體、狙擊塔與補血包
export default class Spawner {
  constructor(scene, startX, evacX, mission) {
    this.scene = scene;
    this.mission = mission;
    this.evacX = evacX;
    this.pool = enemyPool(mission.number);
    this.nextX = startX + SPAWN.firstAt;
    this.count = 0;
    this.sniperForcedX = startX + (evacX - startX) * SPAWN.sniperForcedAt;
    this.sniperForcedDone = false;
    this.lastSniperX = -Infinity;
    this.bossX = mission.boss ? evacX - 200 : null; // Boss 守在撤離點前
  }

  // difficulty 越小越難：敵人間距跟著縮短
  update(playerX, difficulty) {
    while (this.nextX < playerX + SPAWN.ahead && this.nextX < this.evacX - SPAWN.evacClear) {
      const x = this.nextX;
      const type = this.pickType();
      // 站著開槍的敵人前方可能有沙包；第一個敵人不放，讓玩家先熟悉操作
      const canCover = type === 'infantry' || type === 'gunner' || type === 'grenadier';
      if (this.count > 0 && canCover && Math.random() < SPAWN.enemyCoverChance) {
        this.scene.spawnCover(x - 55, 'sandbag');
      }
      this.scene.spawnEnemy(x, type);
      this.count++;

      const gap = Phaser.Math.Between(SPAWN.gap[0], SPAWN.gap[1]) * (0.5 + 0.5 * difficulty);
      const mid = x + gap / 2;
      if (this.shouldSpawnSniper(mid)) {
        this.scene.spawnSniper(mid);
        this.lastSniperX = mid;
      } else if (Math.random() < SPAWN.freeCoverChance) {
        // 兩個敵人中間放一個掩體給玩家躲
        this.scene.spawnCover(mid, Math.random() < 0.5 ? 'crate' : 'sandbag');
      }
      if (Math.random() < HEALTH_PACK.chance) this.scene.spawnHealthPack(x + gap * 0.3);
      this.nextX += gap;
    }
    if (this.bossX !== null && this.bossX < playerX + SPAWN.ahead) {
      this.scene.spawnEnemy(this.bossX, 'boss');
      this.bossX = null;
    }
  }

  // 這關新登場的敵人固定當第 2 個出場，之後依權重隨機
  pickType() {
    if (this.count === 1 && this.mission.newEnemy) return this.mission.newEnemy;
    if (this.count === 0) return 'infantry';
    const total = this.pool.reduce((sum, [, w]) => sum + w, 0);
    let r = Math.random() * total;
    for (const [type, w] of this.pool) {
      r -= w;
      if (r < 0) return type;
    }
    return 'infantry';
  }

  shouldSpawnSniper(x) {
    if (x - this.lastSniperX < SPAWN.sniperMinGap) return false;
    if (!this.sniperForcedDone && x >= this.sniperForcedX) {
      this.sniperForcedDone = true;
      return true;
    }
    return this.count > 1 && Math.random() < this.mission.sniperChance;
  }
}
