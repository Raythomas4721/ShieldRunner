import { GAME_W, FONT, WEAPONS, UPGRADES, upgradePrice, upgradeEffect } from '../config.js';
import { loadSave, writeSave } from '../save.js';
import { makeButton, toast } from '../ui.js';

const ROW_H = 72;
const TOP = 78;

// 軍火庫：左邊買／裝備武器，右邊升級能力。每次購買後重新整理畫面
export default class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  init(data) {
    this.message = data && data.message;
  }

  create() {
    this.save = loadSave();
    this.cameras.main.setBackgroundColor('#05070d');

    this.add.text(30, 22, '軍火庫', { fontFamily: FONT, fontSize: '32px', color: '#ffd60a', fontStyle: 'bold' });
    this.add.text(GAME_W - 30, 28, `金幣 ${this.save.coins}`, {
      fontFamily: FONT, fontSize: '26px', color: '#ffd60a', fontStyle: 'bold',
    }).setOrigin(1, 0);

    Object.entries(WEAPONS).forEach(([key, w], i) => this.weaponRow(key, w, 20, TOP + i * ROW_H));
    Object.keys(UPGRADES).forEach((key, i) => this.upgradeRow(key, 580, TOP + i * ROW_H));

    makeButton(this, 160, 500, 200, 52, '主選單', 0x415a77, () => this.scene.start('Menu'));
    makeButton(this, GAME_W - 180, 500, 260, 52, `出發：任務 ${this.save.mission}`, 0x2a9d8f,
      () => this.scene.start('Game', { mission: this.save.mission }));
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('Menu'));

    if (this.message) toast(this, GAME_W / 2, 455, this.message.text, this.message.color);
  }

  weaponRow(key, w, x, y) {
    const owned = this.save.owned.includes(key);
    const equipped = this.save.equipped === key;
    this.add.rectangle(x, y, 540, ROW_H - 8, equipped ? 0x16324f : 0x111827)
      .setOrigin(0).setStrokeStyle(2, equipped ? 0x3a86ff : 0x2b2d42);
    this.add.text(x + 14, y + 8, w.name, { fontFamily: FONT, fontSize: '22px', color: '#ffffff', fontStyle: 'bold' });
    this.add.text(x + 14, y + 38, w.desc, { fontFamily: FONT, fontSize: '14px', color: '#8d99ae' });

    const perShot = w.pellets ? `${w.damage}×${w.pellets}` : `${w.damage}`;
    const rate = (1000 / w.fireRate).toFixed(1);
    this.add.text(x + 200, y + 10, `傷害 ${perShot}　射速 ${rate}/秒\n彈匣 ${w.magSize}　射程 ${Math.round(w.range / 20)}m`, {
      fontFamily: FONT, fontSize: '15px', color: '#f1faee', lineSpacing: 6,
    });

    const bx = x + 470;
    const by = y + (ROW_H - 8) / 2;
    if (equipped) {
      makeButton(this, bx, by, 120, 44, '裝備中', 0x3a86ff, () => {}, { fontSize: 18 });
    } else if (owned) {
      makeButton(this, bx, by, 120, 44, '裝備', 0x2a9d8f, () => {
        this.save.equipped = key;
        this.commit({ text: `已裝備 ${w.name}`, color: '#8ecae6' });
      }, { fontSize: 18 });
    } else {
      const affordable = this.save.coins >= w.price;
      makeButton(this, bx, by, 120, 44, `購買 ${w.price}`, 0xe85d04, () => {
        if (!affordable) {
          toast(this, GAME_W / 2, 455, `金幣不足，還差 ${w.price - this.save.coins}`, '#e63946');
          return;
        }
        this.save.coins -= w.price;
        this.save.owned.push(key);
        this.save.equipped = key;
        this.commit({ text: `購買並裝備 ${w.name}！`, color: '#2dc653' });
      }, { fontSize: 18, enabled: affordable });
    }
  }

  upgradeRow(key, x, y) {
    const u = UPGRADES[key];
    const level = this.save.upgrades[key];
    const maxed = level >= u.maxLevel;
    this.add.rectangle(x, y, 360, ROW_H - 8, 0x111827).setOrigin(0).setStrokeStyle(2, 0x2b2d42);
    this.add.text(x + 14, y + 8, `${u.name}　Lv ${level}/${u.maxLevel}`, {
      fontFamily: FONT, fontSize: '19px', color: '#ffffff', fontStyle: 'bold',
    });
    this.add.text(x + 14, y + 38, upgradeEffect(key, level), { fontFamily: FONT, fontSize: '15px', color: '#8ecae6' });

    const bx = x + 295;
    const by = y + (ROW_H - 8) / 2;
    if (maxed) {
      makeButton(this, bx, by, 110, 44, '已滿級', 0x343a40, () => {}, { fontSize: 18, enabled: false });
      return;
    }
    const price = upgradePrice(key, level);
    const affordable = this.save.coins >= price;
    makeButton(this, bx, by, 110, 44, `${level === 0 && u.prices ? '購買' : '升級'} ${price}`, 0x7b2cbf, () => {
      if (!affordable) {
        toast(this, GAME_W / 2, 455, `金幣不足，還差 ${price - this.save.coins}`, '#e63946');
        return;
      }
      this.save.coins -= price;
      this.save.upgrades[key] = level + 1;
      this.commit({ text: `${u.name} 升到 Lv ${level + 1}！`, color: '#2dc653' });
    }, { fontSize: 18, enabled: affordable });
  }

  commit(message) {
    writeSave(this.save);
    this.scene.restart({ message });
  }
}
