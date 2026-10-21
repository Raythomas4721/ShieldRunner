import { GAME_W, GAME_H, FONT, RARITY, CARD_CATEGORY } from '../config.js';
import { sfx } from '../systems/Sound.js';

const CARD_W = 240;
const CARD_H = 290;

// 選卡畫面：疊在暫停的 GameScene 上面，點一張卡就套用並回到遊戲
export default class CardScene extends Phaser.Scene {
  constructor() {
    super('Cards');
  }

  init(data) {
    this.cards = data.cards;
  }

  create() {
    const cx = GAME_W / 2;
    this.add.rectangle(cx, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.75).setInteractive(); // 擋住下層的點擊
    this.add.text(cx, 52, '補給箱：選一張戰術卡', {
      fontFamily: FONT, fontSize: '32px', color: '#ffd60a', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(cx, 90, '效果只在這一局有效', { fontFamily: FONT, fontSize: '16px', color: '#a8dadc' }).setOrigin(0.5);

    this.chosen = false;
    this.cards.forEach((card, i) => this.drawCard(card, cx + (i - 1) * 280, 290, i));
  }

  drawCard(card, x, y, index) {
    const rarity = RARITY[card.rarity];
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, CARD_W, CARD_H, 0x111827).setStrokeStyle(4, rarity.color);
    const band = this.add.rectangle(0, -CARD_H / 2 + 18, CARD_W, 36, rarity.color, 0.25);
    const rarityText = this.add.text(0, -CARD_H / 2 + 18, `${rarity.name}・${CARD_CATEGORY[card.category]}`, {
      fontFamily: FONT, fontSize: '16px', color: Phaser.Display.Color.IntegerToColor(rarity.color).rgba, fontStyle: 'bold',
    }).setOrigin(0.5);
    const name = this.add.text(0, -60, card.name, {
      fontFamily: FONT, fontSize: '30px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    const desc = this.add.text(0, 30, card.desc, {
      fontFamily: FONT, fontSize: '19px', color: '#f1faee', align: 'center', lineSpacing: 8,
      wordWrap: { width: CARD_W - 30, useAdvancedWrap: true },
    }).setOrigin(0.5);
    const hint = this.add.text(0, CARD_H / 2 - 26, '點擊選擇', { fontFamily: FONT, fontSize: '15px', color: '#8d99ae' }).setOrigin(0.5);
    container.add([bg, band, rarityText, name, desc, hint]);

    // 依序翻出來
    container.setScale(0.6).setAlpha(0);
    this.tweens.add({ targets: container, scale: 1, alpha: 1, duration: 260, delay: index * 140, ease: 'Back.easeOut' });

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => !this.chosen && container.setScale(1.04));
    bg.on('pointerout', () => !this.chosen && container.setScale(1));
    bg.on('pointerdown', () => this.choose(card, container));
    // 鍵盤 1 / 2 / 3 也能選
    this.input.keyboard.once(`keydown-${['ONE', 'TWO', 'THREE'][index]}`, () => this.choose(card, container));
  }

  choose(card, container) {
    if (this.chosen) return;
    this.chosen = true;
    sfx('streak');
    this.tweens.add({
      targets: container, scale: 1.12, duration: 160, yoyo: true,
      onComplete: () => {
        const game = this.scene.get('Game');
        this.scene.resume('Game');
        game.applyCard(card);
        this.scene.stop();
      },
    });
  }
}
