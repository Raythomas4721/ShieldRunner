import { GROUND_Y, ENEMIES, COLORS, FONT } from '../config.js';

const GUN_Y = GROUND_Y - 25; // 與玩家胸口同高

// 地面敵人：行為由 ENEMIES[type].ai 決定
export default class Enemy {
  constructor(scene, group, x, type) {
    this.scene = scene;
    this.type = type;
    this.def = ENEMIES[type];
    this.sprite = group.create(x, GROUND_Y, this.def.texture).setOrigin(0.5, 1).setDepth(4);
    this.sprite.setData('ref', this);
    this.hp = this.def.hp;
    this.alive = true;
    this.aiming = false;
    this.nextShot = 0;   // 0 = 尚未進入射程
    this.burstLeft = 0;  // 連發中還剩幾發
    this.volleys = 0;    // 已經打了幾輪（Boss 用來決定重砲）
    this.openUntil = 0;  // 盾兵開火後放下盾的時間
    this.charging = false;
    this.nextMelee = 0;
    this.seen = false;   // 是否已進入玩家視線（用來顯示新敵人提示）
    if (this.def.guard) {
      this.shield = scene.add.image(x - 26, GROUND_Y - 2, 'eshield').setOrigin(0.5, 1).setDepth(5);
    }
  }

  get x() {
    return this.sprite.x;
  }

  // 盾兵正面持盾中：瞄準、連發和開火後的短暫時間會放下盾
  get guarding() {
    return !!this.def.guard && this.alive && !this.aiming && this.burstLeft === 0 && this.scene.time.now >= this.openUntil;
  }

  update(time, playerX, difficulty) {
    if (!this.alive) return;
    if (!this.seen && this.x - playerX < 700) {
      this.seen = true;
      this.scene.onEnemySeen(this);
    }
    if (this.def.ai === 'charger') this.updateCharger(time, playerX);
    else this.updateShooter(time, playerX, difficulty);
    if (this.shield) {
      this.shield.x = this.x - 26;
      this.shield.setVisible(this.guarding);
    }
  }

  updateShooter(time, playerX, difficulty) {
    const d = this.def;
    // 連發中：照間隔一發一發打完
    if (this.burstLeft > 0) {
      if (time >= this.nextBurstShot) {
        this.fire();
        this.burstLeft--;
        this.nextBurstShot = time + (d.burstGapMs || 0);
        if (this.burstLeft === 0) {
          this.aiming = false;
          this.sprite.clearTint();
          this.openUntil = time + (d.openMs || 0);
          const [min, max] = d.fireInterval;
          this.nextShot = time + Phaser.Math.Between(min, max) * difficulty;
        }
      }
      return;
    }
    if (this.x - playerX > d.fireRange) return;

    if (this.nextShot === 0) {
      const [min, max] = d.firstShotDelay;
      this.nextShot = time + Phaser.Math.Between(min, max);
      return;
    }
    // 開火前先變黃色，提示玩家舉盾
    if (!this.aiming && time >= this.nextShot - d.aimMs) {
      this.aiming = true;
      this.sprite.setTintFill(COLORS.aim);
    }
    if (time >= this.nextShot) {
      this.volleys++;
      this.heavyNext = !!d.heavy && this.volleys % d.heavyEvery === 0;
      this.burstLeft = this.heavyNext ? 1 : d.burst;
      this.nextBurstShot = time;
    }
  }

  fire() {
    const x = this.x - this.sprite.displayWidth / 2 - 4;
    if (this.heavyNext) this.scene.fireEnemyBullet(x, GUN_Y, this.def, this.def.heavy);
    else this.scene.fireEnemyBullet(x, GUN_Y, this.def);
  }

  // 衝鋒兵：玩家靠近就衝過來，貼身後持續近戰攻擊
  updateCharger(time, playerX) {
    const d = this.def;
    const dist = this.x - playerX;
    if (!this.charging && dist < d.triggerRange) {
      this.charging = true;
      this.alert = this.scene.add.text(this.x, GROUND_Y - 78, '！', {
        fontFamily: FONT, fontSize: '28px', color: '#ff4d6d', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(8);
      this.scene.sfx('charge');
    }
    if (!this.charging) return;
    if (this.alert) this.alert.x = this.x;

    if (dist > 34) {
      this.sprite.setVelocityX(-d.speed);
    } else {
      this.sprite.setVelocityX(0);
      if (time >= this.nextMelee) {
        this.nextMelee = time + d.meleeEveryMs;
        this.scene.meleeHit(this);
      }
    }
  }

  // 受到傷害，回傳是否被擊殺
  hit(damage) {
    if (!this.alive) return false;
    this.hp -= damage;
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (!this.alive) return;
      if (this.aiming) this.sprite.setTintFill(COLORS.aim);
      else this.sprite.clearTint();
    });
    if (this.hp > 0) return false;

    this.alive = false;
    this.sprite.setVelocityX(0);
    this.sprite.body.enable = false;
    if (this.shield) this.shield.destroy();
    if (this.alert) this.alert.destroy();
    this.scene.tweens.add({
      targets: this.sprite,
      angle: 80,
      alpha: 0,
      duration: this.def.boss ? 900 : 350,
      onComplete: () => this.sprite.destroy(),
    });
    return true;
  }
}
