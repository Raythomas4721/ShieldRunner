import { GAME_W, GROUND_Y, COLORS } from '../config.js';

// 背景：漸層夜空、月亮、閃爍星星、流星，以及三層不同速度捲動的山
export default class Background {
  constructor(scene) {
    this.scene = scene;
    const fixed = (obj, depth) => obj.setScrollFactor(0).setDepth(depth);

    const sky = scene.add.graphics();
    sky.fillGradientStyle(COLORS.skyTop, COLORS.skyTop, COLORS.skyBottom, COLORS.skyBottom, 1);
    sky.fillRect(0, 0, GAME_W, GROUND_Y + 40);
    fixed(sky, -20);

    this.stars = fixed(scene.add.tileSprite(0, 0, GAME_W, GROUND_Y - 60, 'stars').setOrigin(0), -19);
    // 會閃爍的亮星
    for (let i = 0; i < 14; i++) {
      const star = fixed(scene.add.circle(
        Phaser.Math.Between(10, GAME_W - 10), Phaser.Math.Between(10, 190), Phaser.Math.FloatBetween(1.2, 2.2), 0xffffff,
      ), -18);
      scene.tweens.add({
        targets: star, alpha: 0.15, duration: Phaser.Math.Between(600, 1600),
        delay: Phaser.Math.Between(0, 1500), yoyo: true, repeat: -1,
      });
    }

    // 月亮：光暈加隕石坑
    const mx = 790;
    const my = 78;
    fixed(scene.add.circle(mx, my, 64, 0xf1faee, 0.05), -18);
    fixed(scene.add.circle(mx, my, 38, 0xf1faee, 0.08), -18);
    fixed(scene.add.circle(mx, my, 24, 0xe9eef2), -18);
    fixed(scene.add.circle(mx - 8, my - 5, 5, 0xcdd5db), -18);
    fixed(scene.add.circle(mx + 7, my + 7, 3.5, 0xcdd5db), -18);
    fixed(scene.add.circle(mx + 9, my - 9, 2.5, 0xcdd5db), -18);

    // 三層山：越近的顏色越深、捲動越快
    this.layers = [
      { sprite: scene.add.tileSprite(0, GROUND_Y - 200, GAME_W, 220, 'mountainsFar'), factor: 0.08, depth: -17 },
      { sprite: scene.add.tileSprite(0, GROUND_Y - 130, GAME_W, 160, 'hills'), factor: 0.25, depth: -16 },
      { sprite: scene.add.tileSprite(0, GROUND_Y - 75, GAME_W, 100, 'treeline'), factor: 0.5, depth: -15 },
    ];
    for (const l of this.layers) fixed(l.sprite.setOrigin(0), l.depth);

    this.nextMeteor = 0;
  }

  update(scrollX, time) {
    this.stars.tilePositionX = scrollX * 0.03;
    for (const l of this.layers) l.sprite.tilePositionX = scrollX * l.factor;
    if (time > this.nextMeteor) {
      if (this.nextMeteor) this.meteor();
      this.nextMeteor = time + Phaser.Math.Between(5000, 11000);
    }
  }

  // 流星：從右上往左下劃過
  meteor() {
    const x = Phaser.Math.Between(300, GAME_W);
    const y = Phaser.Math.Between(20, 110);
    const dx = -220;
    const dy = 110;
    const streak = this.scene.add.rectangle(x, y, 70, 2, 0xffffff)
      .setRotation(Math.atan2(dy, dx))
      .setScrollFactor(0)
      .setDepth(-18);
    this.scene.tweens.add({
      targets: streak, x: x + dx, y: y + dy, alpha: 0, duration: 700, ease: 'Quad.easeIn',
      onComplete: () => streak.destroy(),
    });
  }
}
