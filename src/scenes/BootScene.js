import { COLORS } from '../config.js';

// 用 Graphics 產生色塊貼圖，之後換成正式美術時只要改成載入圖片
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const g = this.add.graphics();
    const make = (key, w, h) => {
      g.generateTexture(key, w, h);
      g.clear();
    };

    // 玩家：藍色身體、膚色頭、槍口朝右
    g.fillStyle(COLORS.player).fillRect(8, 18, 24, 40);
    g.fillStyle(COLORS.skin).fillCircle(20, 10, 9);
    g.fillStyle(COLORS.gun).fillRect(28, 30, 16, 6);
    make('player', 44, 58);

    // 步兵：紫色身體、槍口朝左
    g.fillStyle(COLORS.enemy).fillRect(12, 18, 24, 40);
    g.fillStyle(COLORS.skin).fillCircle(24, 10, 9);
    g.fillStyle(COLORS.gun).fillRect(0, 30, 16, 6);
    make('enemy', 44, 58);

    // 機槍兵：深紫、粗壯，大槍加黃色彈鏈
    g.fillStyle(0x7209b7).fillRect(14, 16, 28, 42);
    g.fillStyle(COLORS.skin).fillCircle(28, 9, 9);
    g.fillStyle(COLORS.gun).fillRect(0, 28, 22, 9);
    g.fillStyle(0xffd60a).fillRect(18, 37, 4, 12);
    make('gunner', 50, 58);

    // 衝鋒兵：淺紫、紅頭巾、短刀
    g.fillStyle(0xc77dff).fillRect(12, 18, 22, 40);
    g.fillStyle(COLORS.skin).fillCircle(23, 10, 9);
    g.fillStyle(0xe63946).fillRect(14, 3, 18, 4);
    g.fillStyle(0xdee2e6).fillRect(0, 32, 14, 3);
    make('charger', 44, 58);

    // 盾兵：紫色加灰色頭盔，盾牌另外一張貼圖
    g.fillStyle(0x5a189a).fillRect(12, 18, 24, 40);
    g.fillStyle(COLORS.skin).fillCircle(24, 11, 9);
    g.fillStyle(0x6c757d).fillRect(14, 0, 20, 7);
    g.fillStyle(COLORS.gun).fillRect(0, 30, 16, 6);
    make('shielder', 44, 58);
    g.fillStyle(0x8d99ae).fillRoundedRect(0, 0, 12, 56, 3);
    g.lineStyle(2, 0xdee2e6).strokeRoundedRect(1, 1, 10, 54, 3);
    make('eshield', 12, 56);

    // 擲彈兵：暗紫色、綠色頭盔，舉著手榴彈
    g.fillStyle(0x6a4c93).fillRect(12, 18, 24, 40);
    g.fillStyle(COLORS.skin).fillCircle(24, 11, 9);
    g.fillStyle(0x52b788).fillRect(14, 0, 20, 7);
    g.fillStyle(0x6a4c93).fillRect(4, 16, 8, 6);
    g.fillStyle(0x2d6a4f).fillCircle(5, 13, 5);
    g.fillStyle(0x2d6a4f).fillRect(14, 40, 20, 5);
    make('grenadier', 44, 58);
    g.fillStyle(0x2d6a4f).fillCircle(6, 6, 6);
    g.fillStyle(0x95d5b2).fillCircle(4, 4, 2);
    g.fillStyle(0xadb5bd).fillRect(5, 0, 3, 2);
    make('grenade', 12, 12);

    // Boss：裝甲指揮官，體型較大、紅色護目鏡
    g.fillStyle(0x3c096c).fillRect(14, 26, 44, 60);
    g.fillStyle(0x6c757d).fillRect(10, 30, 8, 24).fillRect(54, 30, 8, 24);
    g.fillStyle(0x6c757d).fillCircle(36, 14, 14);
    g.fillStyle(0xff006e).fillRect(24, 10, 18, 5);
    g.fillStyle(0x495057).fillRect(0, 44, 28, 11);
    make('boss', 72, 86);

    // 狙擊手：深紫色、長槍加瞄準鏡
    g.fillStyle(COLORS.sniper).fillRect(24, 18, 24, 40);
    g.fillStyle(COLORS.skin).fillCircle(36, 10, 9);
    g.fillStyle(COLORS.gun).fillRect(0, 26, 34, 5).fillRect(12, 21, 8, 5);
    make('sniper', 60, 58);

    // 狙擊塔：鷹架加平台
    g.lineStyle(4, 0x3d405b);
    g.lineBetween(8, 130, 16, 8).lineBetween(52, 130, 44, 8);
    g.lineStyle(2, 0x3d405b);
    g.lineBetween(12, 110, 48, 70).lineBetween(48, 110, 12, 70).lineBetween(14, 60, 46, 20).lineBetween(46, 60, 14, 20);
    g.fillStyle(0x4a4e69).fillRect(0, 0, 60, 8);
    make('tower', 60, 130);

    // 直升機：機頭朝左
    g.fillStyle(COLORS.heli).fillEllipse(50, 28, 72, 30);
    g.fillRect(78, 23, 40, 7).fillRect(112, 12, 5, 22);
    g.fillStyle(0x5a9bd5, 0.8).fillEllipse(32, 25, 22, 14);
    g.fillStyle(0x9d4edd).fillRect(4, 6, 96, 4).fillRect(48, 8, 5, 8);
    g.lineStyle(3, 0x5a189a).lineBetween(28, 46, 72, 46);
    make('heli', 120, 48);

    // 盾牌：正面（直立）與對空（水平）
    g.fillStyle(0x4cc9f0).fillRoundedRect(0, 0, 12, 64, 4);
    g.lineStyle(2, 0xffffff).strokeRoundedRect(1, 1, 10, 62, 4);
    make('shield', 12, 64);
    g.fillStyle(0x4cc9f0).fillRoundedRect(0, 0, 64, 12, 4);
    g.lineStyle(2, 0xffffff).strokeRoundedRect(1, 1, 62, 10, 4);
    make('shieldAir', 64, 12);

    // 子彈
    g.fillStyle(0xffd60a).fillRect(0, 0, 12, 4);
    make('pbullet', 12, 4);
    g.fillStyle(0xffd60a).fillCircle(3, 3, 3);
    make('pellet', 6, 6);
    g.fillStyle(0xf1faee).fillRect(0, 0, 22, 3);
    make('sbullet', 22, 3);
    g.fillStyle(0xff7b00).fillTriangle(0, 1, 6, 4, 0, 7);
    g.fillStyle(0x6b705c).fillRect(5, 1, 11, 6);
    g.fillStyle(0xe63946).fillTriangle(16, 1, 20, 4, 16, 7);
    make('rocket', 20, 8);
    g.fillStyle(0xff7b00).fillCircle(5, 5, 5);
    make('ebullet', 10, 10);
    g.fillStyle(0xff4d6d).fillRect(0, 0, 4, 14);
    make('abullet', 4, 14);
    g.fillStyle(0xff006e, 0.4).fillCircle(9, 9, 9);
    g.fillStyle(0xff006e).fillCircle(9, 9, 6);
    make('heavy', 18, 18);

    // 沙包掩體：下排三包、上排兩包
    g.fillStyle(0x8d7a5a).lineStyle(2, 0x5c4d36);
    for (const [x, y] of [[1, 19], [18, 19], [35, 19], [9, 3], [27, 3]]) {
      g.fillRoundedRect(x, y, 16, 16, 5).strokeRoundedRect(x, y, 16, 16, 5);
    }
    make('sandbag', 52, 36);

    // 木箱掩體
    g.fillStyle(0x6b3e26).fillRect(0, 0, 40, 40);
    g.lineStyle(3, 0x3b2314).strokeRect(1.5, 1.5, 37, 37);
    g.lineBetween(3, 3, 37, 37).lineBetween(37, 3, 3, 37);
    make('crate', 40, 40);

    // 補給箱：軍綠色木箱加白色綁帶
    g.fillStyle(0x52796f).fillRoundedRect(0, 0, 38, 30, 3);
    g.fillStyle(0xcad2c5).fillRect(16, 0, 6, 30).fillRect(0, 12, 38, 6);
    g.lineStyle(2, 0x2f3e46).strokeRoundedRect(1, 1, 36, 28, 3);
    make('supply', 38, 30);

    // 降落傘：半圓傘面加傘繩
    g.fillStyle(0xe9edc9).slice(40, 26, 38, Math.PI, 0, false).fillPath();
    g.fillStyle(0xe76f51).slice(40, 26, 38, Math.PI * 1.33, Math.PI * 1.66, false).fillPath();
    g.lineStyle(1, 0xadb5bd).lineBetween(3, 26, 40, 60).lineBetween(77, 26, 40, 60).lineBetween(40, 26, 40, 60);
    make('parachute', 80, 60);

    // 金幣
    g.fillStyle(0xffd60a).fillCircle(8, 8, 8);
    g.fillStyle(0xe9c46a).fillCircle(8, 8, 5);
    g.fillStyle(0xfff3b0).fillRect(6, 4, 2, 7);
    make('coin', 16, 16);

    // 補血包：白底紅十字
    g.fillStyle(0xf1faee).fillRoundedRect(0, 0, 26, 22, 4);
    g.fillStyle(0xe63946).fillRect(10, 3, 6, 16).fillRect(5, 8, 16, 6);
    make('medkit', 26, 22);

    // 撤離點旗子
    g.fillStyle(0xadb5bd).fillRect(4, 0, 4, 120);
    g.fillStyle(0x2dc653).fillTriangle(8, 4, 40, 16, 8, 28);
    make('evac', 40, 120);

    // 夜空星星：大小、亮度不一
    for (let i = 0; i < 70; i++) {
      g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.15, 0.7));
      const size = Math.random() < 0.8 ? 1 : 2;
      g.fillRect(Phaser.Math.Between(0, 254), Phaser.Math.Between(0, 198), size, size);
    }
    make('stars', 256, 200);

    this.makeMountains(g, make);
    g.destroy();
    this.scene.start('Menu');
  }

  // 背景山：用整數倍頻率的正弦波疊加，左右邊緣高度一致，可以無縫重複
  makeMountains(g, make) {
    const W = 512;
    const ridge = (base, waves) => (x) =>
      base - waves.reduce((sum, [amp, freq, phase]) => sum + amp * Math.sin((2 * Math.PI * freq * x) / W + phase), 0);
    const outline = (fn, step = 4) => {
      const pts = [];
      for (let x = 0; x <= W; x += step) pts.push({ x, y: fn(x) });
      return pts;
    };

    // 遠山：高聳尖峰，山頂積雪
    const H1 = 220;
    const far = ridge(120, [[45, 1, 0.3], [25, 3, 1.1], [14, 7, 2.0], [6, 13, 0.5]]);
    const farTop = outline(far);
    g.fillStyle(0x1b2a4a).fillPoints([...farTop, { x: W, y: H1 }, { x: 0, y: H1 }], true);
    const snowLine = 78;
    const snow = farTop.map((p) => ({ x: p.x, y: Math.min(p.y, snowLine) }));
    g.fillStyle(0x52688f).fillPoints([...snow, ...snow.map((p) => ({ x: p.x, y: snowLine })).reverse()], true);
    make('mountainsFar', W, H1);

    // 中景丘陵：圓緩起伏
    const H2 = 160;
    const mid = ridge(78, [[24, 2, 0.7], [12, 5, 2.3], [6, 9, 1.0]]);
    g.fillStyle(0x14213d).fillPoints([...outline(mid), { x: W, y: H2 }, { x: 0, y: H2 }], true);
    make('hills', W, H2);

    // 近景樹林：松樹剪影，超出邊緣的樹在另一側補畫，接縫不會斷掉
    const H3 = 100;
    g.fillStyle(0x0b1120).fillRect(0, 72, W, H3 - 72);
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(0, W);
      const h = Phaser.Math.Between(26, 48);
      const w = Phaser.Math.Between(14, 22);
      for (const ox of [x - W, x, x + W]) {
        g.fillTriangle(ox - w / 2, 76, ox, 76 - h, ox + w / 2, 76);
        g.fillTriangle(ox - w / 2.6, 76 - h * 0.35, ox, 76 - h * 1.05, ox + w / 2.6, 76 - h * 0.35);
      }
    }
    make('treeline', W, H3);
  }
}
