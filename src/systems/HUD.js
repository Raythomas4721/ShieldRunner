import { GAME_W, FONT } from '../config.js';

const PROGRESS_W = 300;

export default class HUD {
  constructor(scene) {
    const style = {
      fontFamily: FONT, fontSize: '18px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
    };
    const fixed = (obj) => obj.setScrollFactor(0).setDepth(101);
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(100);
    fixed(scene.add.text(20, 16, '生命', style));
    fixed(scene.add.text(20, 44, '盾牌', style));
    this.missionText = fixed(scene.add.text(GAME_W / 2, 10, '', { ...style, fontSize: '22px' }).setOrigin(0.5, 0));
    this.killText = fixed(scene.add.text(GAME_W - 20, 16, '', style).setOrigin(1, 0));
    this.ammoText = fixed(scene.add.text(GAME_W - 20, 44, '', style).setOrigin(1, 0));
    this.bossText = fixed(scene.add.text(GAME_W / 2, 62, '', { ...style, fontSize: '15px', color: '#ff006e' }).setOrigin(0.5, 0));
  }

  update(game, time) {
    const { player, mission, meters, kills } = game;
    const g = this.g;
    g.clear();
    this.bar(70, 20, 220, 16, player.hp / player.maxHp, 0xe63946);
    const shield = player.shield;
    this.bar(70, 48, 220, 16, shield.durability / shield.max, shield.broken ? 0x6c757d : 0x4cc9f0);

    // 任務進度條
    this.missionText.setText(`任務 ${mission.number}　${meters} / ${mission.length} m`);
    this.bar(GAME_W / 2 - PROGRESS_W / 2, 44, PROGRESS_W, 8, meters / mission.length, 0x2dc653);

    // Boss 進入畫面後顯示血條
    const boss = game.boss;
    if (boss && boss.alive && boss.x - player.x < 800) {
      this.bossText.setText(boss.def.name);
      this.bar(GAME_W / 2 - PROGRESS_W / 2, 84, PROGRESS_W, 10, boss.hp / boss.maxHp, 0xff006e);
    } else {
      this.bossText.setText('');
    }

    this.killText.setText(`擊殺 ${kills}　金幣 +${game.runCoins()}`);
    const reload = player.reloadProgress(time);
    const w = player.weapon;
    if (reload === null) {
      const low = player.ammo <= Math.ceil(w.magSize / 4);
      this.ammoText.setText(`${w.name} ${player.ammo} / ${w.magSize}`).setColor(low ? '#ffd60a' : '#ffffff');
    } else {
      this.ammoText.setText(`${w.name} 換彈中…`).setColor('#ffd60a');
      this.bar(GAME_W - 120, 70, 100, 5, reload, 0xffd60a);
    }
  }

  bar(x, y, w, h, ratio, color) {
    this.g.fillStyle(0x000000, 0.6).fillRect(x - 2, y - 2, w + 4, h + 4);
    this.g.fillStyle(color).fillRect(x, y, w * Phaser.Math.Clamp(ratio, 0, 1), h);
  }
}
