import { GAME_W, GROUND_Y, AIR_RAID, FONT } from '../config.js';

// 空襲事件：警報 → 直升機從右往左飛過畫面頂端，一路往下掃射
export default class AirRaid {
  constructor(scene) {
    this.scene = scene;
    this.state = 'idle';
  }

  get active() {
    return this.state !== 'idle';
  }

  start(time) {
    const s = this.scene;
    this.state = 'warn';
    this.stateUntil = time + AIR_RAID.warnMs;
    this.border = s.add.rectangle(GAME_W / 2, GROUND_Y / 2, GAME_W - 6, GROUND_Y - 6)
      .setStrokeStyle(6, 0xff2d2d, 0.8)
      .setScrollFactor(0)
      .setDepth(150);
    this.banner = s.add.text(GAME_W / 2, 130, '！空襲警報！\n按住「對空」把盾牌舉到頭頂', {
      fontFamily: FONT, fontSize: '28px', color: '#ff4d6d', fontStyle: 'bold', align: 'center',
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(151);
    s.tweens.add({ targets: [this.banner, this.border], alpha: 0.2, duration: 250, yoyo: true, repeat: -1 });
    s.sfx('siren');
  }

  update(time) {
    if (this.state === 'warn' && time >= this.stateUntil) {
      this.state = 'pass';
      this.passStart = time;
      this.nextShot = time;
      this.heli = this.scene.add.image(GAME_W + 80, AIR_RAID.heliY, 'heli').setScrollFactor(0).setDepth(9);
      this.scene.tweens.killTweensOf(this.banner);
      this.banner.setText('直升機掃射中！').setAlpha(1).setFontSize(22).setY(140);
    }
    if (this.state !== 'pass') return;

    const t = (time - this.passStart) / AIR_RAID.passMs;
    this.heli.x = GAME_W + 80 - (GAME_W + 160) * t;
    this.heli.y = AIR_RAID.heliY + Math.sin(time / 200) * 4;
    if (this.heli.x > 20 && this.heli.x < GAME_W - 20 && time >= this.nextShot) {
      this.nextShot = time + AIR_RAID.fireEveryMs;
      const worldX = this.scene.cameras.main.scrollX + this.heli.x + Phaser.Math.Between(-12, 12);
      this.scene.fireAirBullet(worldX, this.heli.y + 20);
    }
    if (t >= 1) this.end();
  }

  end() {
    if (!this.active) return;
    this.scene.tweens.killTweensOf([this.banner, this.border]);
    this.banner.destroy();
    this.border.destroy();
    if (this.heli) this.heli.destroy();
    this.heli = null;
    this.state = 'idle';
  }
}
