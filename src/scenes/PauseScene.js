import { GAME_W, GAME_H, FONT } from '../config.js';
import { makeButton } from '../ui.js';

// 暫停選單：疊在 GameScene 上面，遊戲場景暫停時才開
export default class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create() {
    const cx = GAME_W / 2;
    const game = this.scene.get('Game');
    this.add.rectangle(cx, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.7).setInteractive(); // 擋住下層的點擊
    this.add.text(cx, 110, '暫停', { fontFamily: FONT, fontSize: '48px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(cx, 165, `任務 ${game.mission.number}　${game.meters} / ${game.mission.length} m　擊殺 ${game.kills}`, {
      fontFamily: FONT, fontSize: '20px', color: '#a8dadc',
    }).setOrigin(0.5);

    const resume = () => {
      this.scene.resume('Game');
      this.scene.stop();
    };
    makeButton(this, cx, 250, 300, 60, '繼續', 0x2a9d8f, resume, { fontSize: 24 });
    makeButton(this, cx, 330, 300, 60, '撤退（結算，金幣減半）', 0xe85d04, () => {
      this.scene.resume('Game');
      this.scene.stop();
      game.finish(false, true);
    }, { fontSize: 22 });
    makeButton(this, cx, 410, 300, 60, '重新開始本關', 0x415a77, () => {
      this.scene.stop();
      game.scene.restart({ mission: game.missionNo });
    }, { fontSize: 22 });

    this.input.keyboard.once('keydown-ESC', resume);
    this.input.keyboard.once('keydown-P', resume);
  }
}
