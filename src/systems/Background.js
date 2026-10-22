import { GAME_W, GROUND_Y, THEATERS } from '../config.js';

// 背景：戰區配色的漸層天空、月亮（沙漠是夕陽）、閃爍星星、流星，以及三層不同速度捲動的遠景
export default class Background {
  constructor(scene, theater = THEATERS[0]) {
    this.scene = scene;
    this.theater = theater;
    const fixed = (obj, depth) => obj.setScrollFactor(0).setDepth(depth);
    const [top, bottom] = theater.sky;

    const sky = scene.add.graphics();
    sky.fillGradientStyle(top, top, bottom, bottom, 1);
    sky.fillRect(0, 0, GAME_W, GROUND_Y + 40);
    fixed(sky, -20);

    this.stars = fixed(scene.add.tileSprite(0, 0, GAME_W, GROUND_Y - 60, 'stars').setOrigin(0).setAlpha(theater.stars), -19);
    // 會閃爍的亮星
    const brightStars = Math.round(14 * theater.stars);
    for (let i = 0; i < brightStars; i++) {
      const star = fixed(scene.add.circle(
        Phaser.Math.Between(10, GAME_W - 10), Phaser.Math.Between(10, 190), Phaser.Math.FloatBetween(1.2, 2.2), 0xffffff,
      ), -18);
      scene.tweens.add({
        targets: star, alpha: 0.15, duration: Phaser.Math.Between(600, 1600),
        delay: Phaser.Math.Between(0, 1500), yoyo: true, repeat: -1,
      });
    }

    if (theater.sunset) this.sunset(theater.moon);
    else this.moon(theater.moon);

    // 三層遠景：越近的顏色越深、捲動越快
    const id = theater.id;
    this.layers = [
      { sprite: scene.add.tileSprite(0, GROUND_Y - 200, GAME_W, 220, `far_${id}`), factor: 0.08, depth: -17 },
      { sprite: scene.add.tileSprite(0, GROUND_Y - 130, GAME_W, 160, `mid_${id}`), factor: 0.25, depth: -16 },
      { sprite: scene.add.tileSprite(0, GROUND_Y - 75, GAME_W, 100, `near_${id}`), factor: 0.5, depth: -15 },
    ];
    for (const l of this.layers) fixed(l.sprite.setOrigin(0), l.depth);

    this.nextMeteor = 0;
  }

  // 月亮：光暈加隕石坑
  moon(color) {
    const s = this.scene;
    const fixed = (obj) => obj.setScrollFactor(0).setDepth(-18);
    const mx = 790;
    const my = 78;
    fixed(s.add.circle(mx, my, 64, color, 0.05));
    fixed(s.add.circle(mx, my, 38, color, 0.08));
    fixed(s.add.circle(mx, my, 24, color));
    const crater = Phaser.Display.Color.IntegerToColor(color).darken(12).color;
    fixed(s.add.circle(mx - 8, my - 5, 5, crater));
    fixed(s.add.circle(mx + 7, my + 7, 3.5, crater));
    fixed(s.add.circle(mx + 9, my - 9, 2.5, crater));
  }

  // 沙漠的夕陽：低低掛在地平線上，被遠山擋住下半部
  sunset(color) {
    const s = this.scene;
    const fixed = (obj) => obj.setScrollFactor(0).setDepth(-18);
    const sx = 700;
    const sy = GROUND_Y - 150;
    fixed(s.add.circle(sx, sy, 130, color, 0.06));
    fixed(s.add.circle(sx, sy, 85, color, 0.1));
    fixed(s.add.circle(sx, sy, 52, color, 0.9));
  }

  update(scrollX, time) {
    this.stars.tilePositionX = scrollX * 0.03;
    for (const l of this.layers) l.sprite.tilePositionX = scrollX * l.factor;
    if (this.theater.stars >= 0.5 && time > this.nextMeteor) {
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
