import { GAME_W, FONT, DIFFICULTY, CONTROL_LAYOUTS } from '../config.js';
import { loadSave, writeSave } from '../save.js';
import { makeButton, toast } from '../ui.js';
import { setSoundEnabled, setVibrateEnabled } from '../systems/Sound.js';

// 設定：每一列點右邊的按鈕就切換到下一個選項，立即存檔
export default class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create() {
    const save = loadSave();
    this.cameras.main.setBackgroundColor('#05070d');
    this.add.text(GAME_W / 2, 40, '設定', { fontFamily: FONT, fontSize: '36px', color: '#ffd60a', fontStyle: 'bold' }).setOrigin(0.5);

    const onOff = (v) => (v ? '開' : '關');
    const rows = [
      {
        label: '音效', value: () => onOff(save.sound),
        next: () => { save.sound = !save.sound; setSoundEnabled(save.sound); },
      },
      {
        label: '震動（Android）', value: () => onOff(save.vibrate),
        next: () => { save.vibrate = !save.vibrate; setVibrateEnabled(save.vibrate); },
      },
      {
        label: '難度', value: () => DIFFICULTY[save.difficulty].name,
        hint: () => ({ easy: '敵人傷害較低、開火較慢，金幣 ×0.8', normal: '標準難度', hard: '敵人傷害較高、開火較快，金幣 ×1.3' })[save.difficulty],
        next: () => { save.difficulty = cycle(Object.keys(DIFFICULTY), save.difficulty); },
      },
      {
        label: '按鈕大小', value: () => CONTROL_LAYOUTS[save.buttonSize].name,
        next: () => { save.buttonSize = cycle(Object.keys(CONTROL_LAYOUTS), save.buttonSize); },
      },
      {
        label: '慣用手', value: () => (save.leftHanded ? '左手（開火在左）' : '右手（開火在右）'),
        next: () => { save.leftHanded = !save.leftHanded; },
      },
    ];

    rows.forEach((row, i) => {
      const y = 108 + i * 64;
      this.add.text(200, y, row.label, { fontFamily: FONT, fontSize: '22px', color: '#f1faee' }).setOrigin(0, 0.5);
      const hint = this.add.text(200, y + 22, row.hint ? row.hint() : '', { fontFamily: FONT, fontSize: '14px', color: '#8d99ae' }).setOrigin(0, 0.5);
      const btn = makeButton(this, 640, y, 260, 46, row.value(), 0x415a77, () => {
        row.next();
        writeSave(save);
        btn.text.setText(row.value());
        if (row.hint) hint.setText(row.hint());
      }, { fontSize: 20 });
    });

    makeButton(this, 300, 460, 240, 54, '重看新手教學', 0x7b2cbf, () => {
      save.tutorialDone = false;
      writeSave(save);
      toast(this, GAME_W / 2, 410, '下次玩任務 1 會再顯示教學', '#8ecae6');
    }, { fontSize: 20 });
    makeButton(this, 660, 460, 240, 54, '返回主選單', 0x2a9d8f, () => this.scene.start('Menu'), { fontSize: 20 });
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('Menu'));
  }
}

function cycle(list, current) {
  return list[(list.indexOf(current) + 1) % list.length];
}
