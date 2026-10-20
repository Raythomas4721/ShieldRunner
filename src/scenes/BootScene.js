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

    // 補血包：白底紅十字
    g.fillStyle(0xf1faee).fillRoundedRect(0, 0, 26, 22, 4);
    g.fillStyle(0xe63946).fillRect(10, 3, 6, 16).fillRect(5, 8, 16, 6);
    make('medkit', 26, 22);

    // 撤離點旗子
    g.fillStyle(0xadb5bd).fillRect(4, 0, 4, 120);
    g.fillStyle(0x2dc653).fillTriangle(8, 4, 40, 16, 8, 28);
    make('evac', 40, 120);

    // 夜空星星
    for (let i = 0; i < 40; i++) {
      g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.2, 0.8));
      g.fillRect(Phaser.Math.Between(0, 254), Phaser.Math.Between(0, 198), 2, 2);
    }
    make('stars', 256, 200);

    // 遠景山丘（可左右無縫重複）
    g.fillStyle(COLORS.hills);
    g.fillTriangle(0, 140, 70, 40, 150, 140);
    g.fillTriangle(110, 140, 200, 70, 256, 140);
    make('hills', 256, 140);

    // 地面
    g.fillStyle(COLORS.ground).fillRect(0, 0, 64, 200);
    g.fillStyle(COLORS.groundTop).fillRect(0, 0, 64, 6);
    g.fillStyle(COLORS.groundSpot).fillRect(10, 30, 8, 6).fillRect(40, 70, 10, 6).fillRect(20, 130, 8, 6).fillRect(48, 170, 8, 6);
    make('ground', 64, 200);

    g.destroy();
    this.scene.start('Menu');
  }
}
