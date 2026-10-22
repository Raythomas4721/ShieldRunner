import { BUDDY } from '../config.js';

// 支援無人機：跟在玩家左上方浮動，射程內有敵人就自動點射
// Lv3 會定時用雷射攔截一發快打到玩家的子彈
export default class Buddy {
  constructor(scene, player, level) {
    this.scene = scene;
    this.player = player;
    this.stats = BUDDY.levels[level];
    this.weapon = { damage: this.stats.damage, range: BUDDY.range, bulletSpeed: BUDDY.bulletSpeed, texture: 'pbullet' };
    this.sprite = scene.add.image(player.x - 34, player.y - 95, 'buddy').setDepth(7);
    this.nextShot = 0;
    this.nextIntercept = 0;
  }

  update(time) {
    const p = this.player;
    const tx = p.x - 34;
    const ty = p.y - 95 + Math.sin(time / 300) * 4;
    // 平滑跟隨，上下坡時不會瞬間跳動
    this.sprite.x += (tx - this.sprite.x) * 0.25;
    this.sprite.y += (ty - this.sprite.y) * 0.15;
    if (p.dead) return;

    const s = this.scene;
    const gunX = this.sprite.x + 18;
    const gunY = this.sprite.y + 2;
    if (time >= this.nextShot && s.findTarget(gunX, BUDDY.range)) {
      this.nextShot = time + this.stats.fireRate;
      s.spawnPlayerShot(gunX, gunY, this.weapon, 1);
      s.muzzleFlash(gunX, gunY, 0x4cc9f0);
      s.sfx('smg');
    }
    if (this.stats.intercept && time >= this.nextIntercept) this.tryIntercept(time);
  }

  // 找一發離玩家夠近、還在往玩家飛的子彈，用雷射打掉
  tryIntercept(time) {
    const s = this.scene;
    const p = this.player;
    const range = BUDDY.interceptRange;
    const enemyShot = s.enemyBullets.getChildren().find((b) => b.x > p.x && b.x - p.x < range && b.body.velocity.x < 0);
    const airShot = s.airBullets.getChildren().find((b) => Math.abs(b.x - p.x) < range * 0.6 && p.y - b.y < range * 1.5);
    const target = enemyShot || airShot;
    if (!target) return;
    this.nextIntercept = time + BUDDY.interceptEveryMs;
    const beam = s.add.graphics().setDepth(9);
    beam.lineStyle(3, 0x4cc9f0, 1).lineBetween(this.sprite.x, this.sprite.y, target.x, target.y);
    s.tweens.add({ targets: beam, alpha: 0, duration: 200, onComplete: () => beam.destroy() });
    s.spark(target.x, target.y, 0x4cc9f0);
    s.floatText(p.x, p.y - 110, '攔截！', '#4cc9f0');
    s.sfx('parry');
    target.destroy();
  }
}
