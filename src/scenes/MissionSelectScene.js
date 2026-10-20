import { GAME_W, FONT, missionConfig } from '../config.js';
import { loadSave } from '../save.js';
import { makeButton } from '../ui.js';
import { sfx } from '../systems/Sound.js';

const COLS = 5;
const MAX_SHOWN = 15;
const CELL_W = 160;
const CELL_H = 86;

// 選擇任務：已解鎖的任務都能重打，用來補星星或賺金幣；最多列出最近 15 關
export default class MissionSelectScene extends Phaser.Scene {
  constructor() {
    super('Missions');
  }

  create() {
    const save = loadSave();
    const unlocked = save.mission;
    this.cameras.main.setBackgroundColor('#05070d');

    const totalStars = Object.values(save.stars).reduce((sum, n) => sum + n, 0);
    this.add.text(30, 22, '選擇任務', { fontFamily: FONT, fontSize: '32px', color: '#ffd60a', fontStyle: 'bold' });
    this.add.text(GAME_W - 30, 30, `★ ${totalStars} / ${(unlocked - 1) * 3}`, {
      fontFamily: FONT, fontSize: '24px', color: '#ffd60a', fontStyle: 'bold',
    }).setOrigin(1, 0);

    const first = Math.max(1, unlocked - MAX_SHOWN + 1);
    const left = (GAME_W - COLS * CELL_W) / 2 + CELL_W / 2;
    for (let n = first; n <= unlocked; n++) {
      const i = n - first;
      const x = left + (i % COLS) * CELL_W;
      const y = 120 + Math.floor(i / COLS) * (CELL_H + 12);
      this.missionCell(n, x, y, save.stars[n] || 0, n === unlocked);
    }

    makeButton(this, GAME_W / 2, 490, 220, 52, '返回主選單', 0x415a77, () => this.scene.start('Menu'), { fontSize: 20 });
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('Menu'));
  }

  missionCell(n, x, y, stars, isNew) {
    const m = missionConfig(n);
    const bg = this.add.rectangle(x, y, CELL_W - 14, CELL_H, isNew ? 0x16324f : 0x111827)
      .setStrokeStyle(2, isNew ? 0x3a86ff : 0x2b2d42)
      .setInteractive({ useHandCursor: true });
    this.add.text(x, y - 24, `任務 ${n}`, { fontFamily: FONT, fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.add.text(x, y + 2, `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, {
      fontFamily: FONT, fontSize: '20px', color: stars ? '#ffd60a' : '#495057',
    }).setOrigin(0.5);
    const tags = [`${m.length}m`];
    if (m.boss) tags.push('Boss');
    if (isNew) tags.push('最新');
    this.add.text(x, y + 28, tags.join('・'), {
      fontFamily: FONT, fontSize: '13px', color: m.boss ? '#ff006e' : '#8d99ae',
    }).setOrigin(0.5);
    bg.on('pointerdown', () => {
      sfx('click');
      this.scene.start('Game', { mission: n });
    });
  }
}
