import { GROUND_Y, PLAYER } from '../config.js';
import Shield from './Shield.js';

export default class Player {
  // stats：套用升級後的數值（見 config.playerStats）
  constructor(scene, x, stats, weapon) {
    this.scene = scene;
    this.sprite = scene.physics.add.image(x, GROUND_Y, 'player').setOrigin(0.5, 1).setDepth(5);
    this.shield = new Shield(scene, stats.shieldMax);
    this.maxHp = stats.maxHp;
    this.speed = stats.speed;
    this.hp = this.maxHp;
    this.weapon = weapon;
    this.ammo = this.weapon.magSize;
    this.reloadUntil = 0; // 0 = 沒有在換彈
    this.lastShot = -Infinity;
    this.stunnedUntil = 0;
    this.flashing = false;
    this.dead = false;
  }

  get x() {
    return this.sprite.x;
  }

  isStunned(time) {
    return time < this.stunnedUntil;
  }

  // 換彈進度 0～1，沒有在換彈時回傳 null
  reloadProgress(time) {
    if (!this.reloadUntil) return null;
    return Phaser.Math.Clamp(1 - (this.reloadUntil - time) / this.weapon.reloadMs, 0, 1);
  }

  // blockX：前方最近敵人擋住的位置，玩家不能穿過活著的敵人
  update(time, delta, input, blockX) {
    if (this.dead) {
      this.sprite.setVelocityX(0);
      return;
    }
    const stunned = this.isStunned(time);
    let shieldMode = null;
    if (!stunned && input.air) shieldMode = 'air';
    else if (!stunned && input.shield) shieldMode = 'front';
    this.shield.update(delta, shieldMode, this.x);
    const shielding = this.shield.raised;

    let vx = 0;
    if (input.move && !stunned) vx = this.speed * (shielding ? PLAYER.shieldSpeedMul : 1);
    if (blockX !== null && this.x >= blockX) vx = 0;
    this.sprite.setVelocityX(vx);

    this.updateWeapon(time, input.fire && !shielding && !stunned);

    if (stunned) this.sprite.setTint(0x999999);
    else if (!this.flashing) this.sprite.clearTint();
  }

  updateWeapon(time, wantFire) {
    const w = this.weapon;
    if (this.reloadUntil && time >= this.reloadUntil) {
      this.ammo = w.magSize;
      this.reloadUntil = 0;
    }
    // 自動補彈途中還有子彈就可以直接開火
    if (wantFire && this.reloadUntil && this.ammo > 0) this.reloadUntil = 0;

    if (wantFire && !this.reloadUntil && time - this.lastShot >= w.fireRate) {
      this.lastShot = time;
      this.ammo--;
      this.scene.firePlayerBullet(this.x + 26, GROUND_Y - 25, w);
      if (this.ammo === 0) this.startReload(time);
    } else if (!wantFire && !this.reloadUntil && this.ammo < w.magSize && time - this.lastShot > PLAYER.autoReloadIdleMs) {
      this.startReload(time);
    }
  }

  startReload(time) {
    this.reloadUntil = time + this.weapon.reloadMs;
    this.scene.sfx('reload');
  }

  // 受到傷害，回傳是否死亡
  takeDamage(amount) {
    if (this.dead) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.flashing = true;
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => {
      this.flashing = false;
      this.sprite.clearTint();
    });
    if (this.hp === 0) this.dead = true;
    return this.dead;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  stun(time) {
    this.stunnedUntil = time + PLAYER.stunMs;
  }
}
