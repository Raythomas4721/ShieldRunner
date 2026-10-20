import { SNIPER, COLORS } from '../config.js';

// 狙擊手站在高塔上：紅線追蹤 → 鎖定閃爍 → 開槍 → 休息，循環
export default class Sniper {
  constructor(scene, x) {
    this.scene = scene;
    this.x = x;
    const baseY = scene.terrain.heightAt(x);
    const topY = baseY - SNIPER.towerHeight;
    this.tower = scene.add.image(x, baseY, 'tower').setOrigin(0.5, 1).setDepth(2);
    this.sprite = scene.add.image(x, topY, 'sniper').setOrigin(0.5, 1).setDepth(4);
    this.gunX = x - 30;
    this.gunY = topY - 30;
    this.laser = scene.add.graphics().setDepth(8);
    this.state = 'idle';
    this.stateUntil = 0;
    this.lockX = 0;
    this.lockY = 0;
  }

  update(time, player) {
    this.laser.clear();
    const dist = this.x - player.x;
    // 玩家走到塔下或超過塔就打不到了
    if (player.dead || dist < 40 || dist > SNIPER.range) {
      this.state = 'idle';
      return;
    }

    if (this.state === 'idle' || (this.state === 'cooldown' && time >= this.stateUntil)) {
      this.state = 'track';
      this.stateUntil = time + SNIPER.trackMs;
    }
    if (this.state === 'track') {
      this.drawLine(player.x, player.y - 30, 0.4, 1);
      if (time >= this.stateUntil) {
        this.state = 'lock';
        this.lockX = player.x;
        this.lockY = player.y - 30;
        this.stateUntil = time + SNIPER.lockMs;
        this.scene.sfx('lock');
      }
    } else if (this.state === 'lock') {
      const blink = Math.floor(time / 80) % 2 === 0;
      this.drawLine(this.lockX, this.lockY, blink ? 1 : 0.3, 3);
      if (time >= this.stateUntil) {
        this.scene.sniperShot(this, this.lockX, this.lockY);
        this.state = 'cooldown';
        this.stateUntil = time + SNIPER.cooldownMs;
      }
    }
  }

  // 從槍口經過目標胸口，一路延伸到目標腳下的地面
  drawLine(targetX, targetY, alpha, width) {
    const groundY = this.scene.terrain.heightAt(targetX);
    const k = (groundY - this.gunY) / (targetY - this.gunY);
    const endX = this.gunX + (targetX - this.gunX) * k;
    this.laser.lineStyle(width, COLORS.laser, alpha).lineBetween(this.gunX, this.gunY, endX, groundY);
  }

  stop() {
    this.state = 'idle';
    this.laser.clear();
  }

  destroy() {
    this.tower.destroy();
    this.sprite.destroy();
    this.laser.destroy();
  }
}
