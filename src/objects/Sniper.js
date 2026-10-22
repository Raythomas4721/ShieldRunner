import { SNIPER, COLORS, CARD_VALUES } from '../config.js';

// 狙擊手站在高塔上：紅線追蹤 → 鎖定閃爍 → 開槍 → 休息，循環
// 可以被打：被打中會中斷瞄準（壓制），血量歸零或高塔被炸就會摔下來
export default class Sniper {
  constructor(scene, group, x) {
    this.scene = scene;
    this.type = 'sniper';
    this.def = SNIPER; // 與地面敵人共用 name / coins / tip，讓擊殺與提示走同一套流程
    this.x = x;
    this.baseY = scene.terrain.heightAt(x);
    const topY = this.baseY - SNIPER.towerHeight;
    // 廢墟城市的狙擊手躲在破損大樓頂樓
    const towerKey = scene.mission.theater.feature === 'windows' ? 'building' : 'tower';
    this.tower = scene.add.image(x, this.baseY, towerKey).setOrigin(0.5, 1).setDepth(2);
    this.sprite = group.create(x, topY, 'sniper').setOrigin(0.5, 1).setDepth(4);
    this.sprite.setData('ref', this);
    this.gunX = x - 30;
    this.gunY = topY - 30;
    this.laser = scene.add.graphics().setDepth(8);
    this.hp = SNIPER.hp;
    this.alive = true;
    this.seen = false;
    this.state = 'idle';
    this.stateUntil = 0;
    this.lockX = 0;
    this.lockY = 0;
  }

  get chestY() {
    return this.sprite.y - 29;
  }

  update(time, player) {
    this.laser.clear();
    if (!this.alive) return;
    const dist = this.x - player.x;
    if (!this.seen && dist < SNIPER.range) {
      this.seen = true;
      this.scene.onEnemySeen(this);
    }
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
        // 戰術卡「鷹眼」：鎖定後更久才開槍，比較好閃
        this.stateUntil = time + SNIPER.lockMs * (this.scene.has('hawkEye') ? CARD_VALUES.hawkEyeLockMul : 1);
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

  // 受到傷害，回傳是否被擊殺；沒死也會被打斷，重新從頭瞄準
  hit(damage) {
    if (!this.alive) return false;
    this.hp -= damage;
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => this.alive && this.sprite.clearTint());
    if (this.hp > 0) {
      if (this.state === 'track' || this.state === 'lock') {
        this.state = 'cooldown';
        this.stateUntil = this.scene.time.now + 500;
        this.scene.floatText(this.x, this.sprite.y - 70, '壓制！', '#8ecae6');
      }
      return false;
    }
    this.die(false);
    return true;
  }

  // 火箭爆炸：連塔一起炸倒
  topple() {
    if (!this.alive) return false;
    this.hp = 0;
    this.die(true);
    return true;
  }

  die(withTower) {
    this.alive = false;
    this.state = 'idle';
    this.laser.clear();
    this.sprite.body.enable = false;
    // 從塔上摔下來
    this.scene.tweens.add({
      targets: this.sprite, y: this.baseY, angle: 90, alpha: 0, duration: 600, ease: 'Quad.easeIn',
      onComplete: () => this.sprite.destroy(),
    });
    if (withTower) {
      this.scene.tweens.add({ targets: this.tower, angle: 75, alpha: 0.3, duration: 700, ease: 'Quad.easeIn' });
    }
  }

  stop() {
    this.state = 'idle';
    this.laser.clear();
  }

  destroy() {
    this.tower.destroy();
    if (this.sprite.active) this.sprite.destroy();
    this.laser.destroy();
  }
}
