import { GAME_W, FONT, RANKS, rankIndexOf } from '../config.js';
import { makeButton } from '../ui.js';
import { sfx } from '../systems/Sound.js';

const BAR_W = 420;

// 結算畫面：本場成績、軍階與晉升進度
export default class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  init(data) {
    this.result = data;
  }

  create() {
    const { victory, retreat, mission, meters, kills, totalBefore, totalAfter, reward, coins } = this.result;
    const cx = GAME_W / 2;
    this.cameras.main.setBackgroundColor('#05070d');

    this.add.text(cx, 50, victory ? '任務完成！' : retreat ? '撤退' : '任務失敗', {
      fontFamily: FONT, fontSize: '50px', color: victory ? '#2dc653' : '#e63946', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(cx, 105, `任務 ${mission}　前進 ${meters} 公尺　擊殺 ${kills} 名敵人`, {
      fontFamily: FONT, fontSize: '22px', color: '#f1faee',
    }).setOrigin(0.5);

    // 金幣明細
    const parts = [`距離 ${reward.distance}`, `擊殺 ${reward.kills}`];
    if (reward.bonus) parts.push(`任務獎勵 ${reward.bonus}`);
    const notes = [];
    if (reward.mul !== 1) notes.push(`倍率 ×${+reward.mul.toFixed(2)}`); // 升級加成 × 難度
    if (reward.halved) notes.push(retreat ? '撤退減半' : '陣亡減半');
    this.add.text(cx, 145, `金幣 +${reward.total}（${parts.join(' + ')}${notes.length ? `，${notes.join('，')}` : ''}）　持有 ${coins}`, {
      fontFamily: FONT, fontSize: '19px', color: '#ffd60a',
    }).setOrigin(0.5);

    // 軍階
    const before = rankIndexOf(totalBefore);
    const after = rankIndexOf(totalAfter);
    this.add.text(cx, 200, `軍階：${RANKS[after].name}`, {
      fontFamily: FONT, fontSize: '32px', color: '#ffd60a', fontStyle: 'bold',
    }).setOrigin(0.5);
    if (after > before) {
      const promo = this.add.text(cx, 245, `晉升！ ${RANKS[before].name} → ${RANKS[after].name}`, {
        fontFamily: FONT, fontSize: '26px', color: '#ffffff', fontStyle: 'bold', stroke: '#e85d04', strokeThickness: 4,
      }).setOrigin(0.5);
      this.tweens.add({ targets: promo, scale: 1.12, duration: 450, yoyo: true, repeat: -1 });
      this.time.delayedCall(500, () => sfx('promote'));
    }
    this.drawRankProgress(cx, 295, totalBefore, totalAfter, before, after);

    // 按鈕：稍等一下才啟用，避免還在連按時誤觸
    const next = victory ? mission + 1 : mission;
    const primaryLabel = victory ? `前往任務 ${next}` : `重新挑戰任務 ${mission}`;
    const goGame = () => this.scene.start('Game', { mission: next });
    const goMenu = () => this.scene.start('Menu');
    this.time.delayedCall(600, () => {
      makeButton(this, cx - 230, 440, 250, 60, primaryLabel, 0x2a9d8f, goGame);
      makeButton(this, cx + 30, 440, 190, 60, '軍火庫', 0xe85d04, () => this.scene.start('Shop'));
      makeButton(this, cx + 230, 440, 170, 60, '主選單', 0x415a77, goMenu);
      this.input.keyboard.once('keydown-SPACE', goGame);
      this.input.keyboard.once('keydown-ESC', goMenu);
    });
  }

  // 晉升進度條：從本場之前的擊殺數動畫增加到之後
  drawRankProgress(cx, y, totalBefore, totalAfter, before, after) {
    const nextRank = RANKS[after + 1];
    const style = { fontFamily: FONT, fontSize: '20px', color: '#a8dadc' };
    if (!nextRank) {
      this.add.text(cx, y, `累計擊殺 ${totalAfter}　已達最高軍階`, style).setOrigin(0.5);
      return;
    }
    const floor = RANKS[after].kills;
    const ratio = (n) => Phaser.Math.Clamp((n - floor) / (nextRank.kills - floor), 0, 1);
    this.add.text(cx, y, `累計擊殺 ${totalAfter}　距離「${nextRank.name}」還差 ${nextRank.kills - totalAfter} 名`, style).setOrigin(0.5);

    const g = this.add.graphics();
    const x = cx - BAR_W / 2;
    const draw = (r) => {
      g.clear();
      g.fillStyle(0x1c2541).fillRect(x, y + 24, BAR_W, 14);
      g.fillStyle(0xffd60a).fillRect(x, y + 24, BAR_W * r, 14);
    };
    const anim = { r: after > before ? 0 : ratio(totalBefore) };
    draw(anim.r);
    this.tweens.add({ targets: anim, r: ratio(totalAfter), duration: 900, delay: 300, ease: 'Cubic.easeOut', onUpdate: () => draw(anim.r) });
  }
}
