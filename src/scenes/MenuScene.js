import { GAME_W, FONT, RANKS, WEAPONS, DIFFICULTY, rankIndexOf } from '../config.js';
import { loadSave } from '../save.js';
import { makeButton } from '../ui.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const cx = GAME_W / 2;
    const save = loadSave();
    this.cameras.main.setBackgroundColor('#05070d');

    this.add.text(cx, 70, '盾擊前線', {
      fontFamily: FONT, fontSize: '60px', color: '#ffd60a', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(cx, 124, 'SHIELD RUNNER', {
      fontFamily: FONT, fontSize: '20px', color: '#a8dadc',
    }).setOrigin(0.5);
    const weapon = WEAPONS[save.equipped] || WEAPONS.pistol;
    this.add.text(cx, 168, `軍階 ${RANKS[rankIndexOf(save.totalKills)].name}　擊殺 ${save.totalKills}　金幣 ${save.coins}　武器 ${weapon.name}　難度 ${DIFFICULTY[save.difficulty].name}`, {
      fontFamily: FONT, fontSize: '20px', color: '#3a86ff', fontStyle: 'bold',
    }).setOrigin(0.5);

    const tips = [
      '左下「前進」：按住前進，放開停下',
      '右下「開火」連射、「盾牌」擋正面、「對空」擋頭頂',
      '敵人變黃 = 準備開火，快舉盾！子彈快到時才舉 = 完美格擋，還會反彈',
      '紅線閃爍 = 狙擊手鎖定，馬上移動或停下就能閃開；靠近可以打他',
      '沙包、木箱可以躲；白色補血包走過去就能撿',
      '電腦：→ 前進　J 開火　K 盾牌　L 對空　P 暫停',
    ];
    this.add.text(cx, 295, tips.join('\n'), {
      fontFamily: FONT, fontSize: '18px', color: '#f1faee', align: 'center', lineSpacing: 7,
    }).setOrigin(0.5);

    const start = () => {
      // 手機上嘗試進入全螢幕（iOS Safari 不支援時直接略過）
      if (!this.sys.game.device.os.desktop && this.scale.fullscreen.available && !this.scale.isFullscreen) {
        try { this.scale.startFullscreen(); } catch (e) { /* 忽略 */ }
      }
      this.scene.start('Game', { mission: save.mission });
    };
    makeButton(this, 175, 465, 240, 64, `開始任務 ${save.mission}`, 0x2a9d8f, start, { fontSize: 24 });
    makeButton(this, 410, 465, 200, 64, '選擇任務', 0x7b2cbf, () => this.scene.start('Missions'), { fontSize: 22 });
    makeButton(this, 615, 465, 180, 64, '軍火庫', 0xe85d04, () => this.scene.start('Shop'), { fontSize: 22 });
    makeButton(this, 805, 465, 170, 64, '設定', 0x415a77, () => this.scene.start('Settings'), { fontSize: 22 });
    this.input.keyboard.once('keydown-SPACE', start);
    this.input.keyboard.once('keydown-ENTER', start);
  }
}
