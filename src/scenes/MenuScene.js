import {
  GAME_W, GAME_H, GROUND_Y, FONT, COLORS, RANKS, WEAPONS, DIFFICULTY, rankIndexOf,
} from '../config.js';
import { loadSave } from '../save.js';
import { makeButton } from '../ui.js';
import Background from '../systems/Background.js';

// 主選單上輪流顯示的小技巧
const TIPS = [
  '小技巧：子彈快打到時才舉盾＝完美格擋，不扣盾值還會反彈',
  '小技巧：狙擊手紅線閃爍時移動或停下就能閃開，靠近還能打斷他',
  '小技巧：沙包、木箱後面可以躲，也能越過它開槍',
  '小技巧：擲彈兵的手榴彈要閃開，或舉「對空」盾擋',
  '小技巧：連續擊殺有額外金幣，火箭筒一次炸好幾個最划算',
  '小技巧：打不過可以去軍火庫升級，或在設定把難度調成簡單',
  '電腦操作：→ 前進　J 開火　K 盾牌　L 對空　P 暫停',
];

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    hideLoadingScreen();
    const cx = GAME_W / 2;
    const save = loadSave();

    // 背景：和遊戲裡一樣的夜空與山，緩慢捲動
    this.background = new Background(this);
    this.scrollX = 0;
    const ground = this.add.graphics();
    ground.fillStyle(COLORS.ground).fillRect(0, GROUND_Y, GAME_W, GAME_H - GROUND_Y);
    ground.lineStyle(5, COLORS.groundTop).lineBetween(0, GROUND_Y, GAME_W, GROUND_Y);
    this.createDemo();

    // 標題
    this.add.text(cx, 78, '盾擊前線', {
      fontFamily: FONT, fontSize: '68px', color: '#ffd60a', fontStyle: 'bold', stroke: '#050816', strokeThickness: 8,
    }).setOrigin(0.5);
    this.add.text(cx, 130, 'S H I E L D   R U N N E R', {
      fontFamily: FONT, fontSize: '18px', color: '#a8dadc', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 狀態列
    const weapon = WEAPONS[save.equipped] || WEAPONS.pistol;
    const stars = Object.values(save.stars).reduce((sum, n) => sum + n, 0);
    const info = [
      `軍階 ${RANKS[rankIndexOf(save.totalKills)].name}`,
      `金幣 ${save.coins}`,
      `武器 ${weapon.name}`,
      `★ ${stars}`,
      `難度 ${DIFFICULTY[save.difficulty].name}`,
    ].join('　｜　');
    this.add.text(cx, 176, info, {
      fontFamily: FONT, fontSize: '17px', color: '#f1faee', fontStyle: 'bold',
      backgroundColor: '#050816c0', padding: { x: 16, y: 7 },
    }).setOrigin(0.5);

    // 輪流顯示的小技巧
    this.tipIndex = Phaser.Math.Between(0, TIPS.length - 1);
    this.tip = this.add.text(cx, 222, TIPS[this.tipIndex], {
      fontFamily: FONT, fontSize: '16px', color: '#8ecae6',
      backgroundColor: '#050816a0', padding: { x: 12, y: 5 },
    }).setOrigin(0.5);
    this.time.addEvent({ delay: 4000, loop: true, callback: () => this.nextTip() });

    // 按鈕：開始任務最大、會呼吸；其他排在下面
    const start = () => {
      // 手機上嘗試進入全螢幕（iOS Safari 不支援時直接略過）
      if (!this.sys.game.device.os.desktop && this.scale.fullscreen.available && !this.scale.isFullscreen) {
        try { this.scale.startFullscreen(); } catch (e) { /* 忽略 */ }
      }
      this.scene.start('Game', { mission: save.mission });
    };
    const main = makeButton(this, cx, 412, 320, 66, `▶  開始任務 ${save.mission}`, 0x2a9d8f, start, { fontSize: 28 });
    this.tweens.add({ targets: [main.bg, main.text], scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    makeButton(this, cx - 220, 490, 200, 50, '選擇任務', 0x7b2cbf, () => this.scene.start('Missions'), { fontSize: 20 });
    makeButton(this, cx, 490, 200, 50, '軍火庫', 0xe85d04, () => this.scene.start('Shop'), { fontSize: 20 });
    makeButton(this, cx + 220, 490, 200, 50, '設定', 0x415a77, () => this.scene.start('Settings'), { fontSize: 20 });
    this.input.keyboard.once('keydown-SPACE', start);
    this.input.keyboard.once('keydown-ENTER', start);
  }

  update(time, delta) {
    this.scrollX += delta * 0.04;
    this.background.update(this.scrollX, time);
  }

  nextTip() {
    this.tipIndex = (this.tipIndex + 1) % TIPS.length;
    this.tweens.add({
      targets: this.tip, alpha: 0, duration: 250, yoyo: true,
      onYoyo: () => this.tip.setText(TIPS[this.tipIndex]),
    });
  }

  // 示範動畫：主角舉盾，敵人變黃後開槍，子彈被盾牌擋下，循環播放
  createDemo() {
    const px = 250;
    const ex = 730;
    this.add.image(px, GROUND_Y, 'player').setOrigin(0.5, 1).setScale(1.3).setDepth(5);
    this.add.image(px + 34, GROUND_Y - 2, 'shield').setOrigin(0.5, 1).setScale(1.3).setDepth(6);
    const enemy = this.add.image(ex, GROUND_Y, 'enemy').setOrigin(0.5, 1).setScale(1.3).setDepth(5);
    this.add.image(ex + 90, GROUND_Y + 3, 'sandbag').setOrigin(0.5, 1).setScale(1.3).setDepth(6);
    this.add.image(ex + 150, GROUND_Y, 'gunner').setOrigin(0.5, 1).setScale(1.3).setDepth(5);

    const gunY = GROUND_Y - 33;
    const shoot = () => {
      enemy.setTintFill(COLORS.aim);
      this.time.delayedCall(450, () => {
        enemy.clearTint();
        const b = this.add.image(ex - 34, gunY, 'ebullet').setScale(1.3).setDepth(7);
        this.tweens.add({
          targets: b, x: px + 46, duration: 900, ease: 'Linear',
          onComplete: () => {
            b.destroy();
            const ring = this.add.circle(px + 40, gunY, 10).setStrokeStyle(3, 0x4cc9f0).setDepth(8);
            this.tweens.add({ targets: ring, scale: 2.6, alpha: 0, duration: 260, onComplete: () => ring.destroy() });
          },
        });
      });
    };
    this.time.addEvent({ delay: 1900, loop: true, startAt: 1200, callback: shoot });
  }
}

// 主選單第一次出現時，把網頁上的載入畫面淡出
function hideLoadingScreen() {
  const el = document.getElementById('loading');
  if (!el || el.classList.contains('done')) return;
  el.classList.add('done');
  setTimeout(() => el.remove(), 500);
}
