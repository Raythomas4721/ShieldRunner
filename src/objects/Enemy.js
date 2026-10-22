import { ENEMIES, COLORS, FONT } from '../config.js';

// 地面敵人：行為由 ENEMIES[type].ai 決定，腳底跟著地形高度
export default class Enemy {
  constructor(scene, group, x, type) {
    this.scene = scene;
    this.type = type;
    this.def = ENEMIES[type];
    const groundY = scene.terrain.heightAt(x);
    const y = this.def.flying ? groundY - this.def.flyHeight : groundY;
    this.sprite = group.create(x, y, this.def.texture).setOrigin(0.5, 1).setDepth(this.def.flying ? 7 : 4);
    if (this.def.flying) this.hover = Phaser.Math.Between(...this.def.hoverAhead); // 停在玩家前方多遠
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
    this.stunUntil = 0;  // 被霰彈槍擊退後停頓到這個時間
    this.seen = false;   // 是否已進入玩家視線（用來顯示新敵人提示）
    if (this.def.guard) {
      this.shield = scene.add.image(x - 26, groundY - 2, 'eshield').setOrigin(0.5, 1).setDepth(5);
    }
  }

  get x() {
    return this.sprite.x;
  }

  // 身體中段：玩家自動瞄準的位置
  get chestY() {
    return this.sprite.y - this.sprite.displayHeight * 0.5;
  }

  // 盾兵正面持盾中：瞄準、連發和開火後的短暫時間會放下盾
  get guarding() {
    return !!this.def.guard && this.alive && !this.aiming && this.burstLeft === 0 && this.scene.time.now >= this.openUntil;
  }

  update(time, playerX, difficulty) {
    if (!this.alive) return;
    if (!this.def.flying) this.sprite.y = this.scene.terrain.heightAt(this.x);
    if (!this.seen && this.x - playerX < 700) {
      this.seen = true;
      this.scene.onEnemySeen(this);
    }
    if (this.walkTo !== undefined && !this.def.flying) {
      // 守點任務的增援：先從畫面外走進來，就定位後才開始攻擊
      if (this.x > this.walkTo) {
        this.sprite.setVelocityX(-110);
        this.syncShield();
        return;
      }
      this.sprite.setVelocityX(0);
      this.walkTo = undefined;
    }
    if (this.def.ai === 'charger') this.updateCharger(time, playerX);
    else if (this.def.ai === 'drone') this.updateDrone(time, playerX, difficulty);
    else if (this.def.ai !== 'static') this.updateShooter(time, playerX, difficulty);
    this.syncShield();
  }

  // 盾兵的盾跟著人移動，舉盾時才顯示
  syncShield() {
    if (this.shield) {
      this.shield.setPosition(this.x - 26, this.sprite.y - 2);
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
    if (this.def.ai === 'grenadier') {
      this.scene.throwGrenade(this);
      return;
    }
    const x = this.x - this.sprite.displayWidth / 2 - 4;
    const gunY = this.sprite.y - 25;
    if (this.heavyNext) this.scene.fireEnemyBullet(x, gunY, this.def, this.def.heavy);
    else this.scene.fireEnemyBullet(x, gunY, this.def);
  }

  // 衝鋒兵：玩家靠近就衝過來，貼身後持續近戰攻擊
  updateCharger(time, playerX) {
    const d = this.def;
    const dist = this.x - playerX;
    if (!this.charging && dist < d.triggerRange) {
      this.charging = true;
      this.alert = this.scene.add.text(this.x, this.sprite.y - 78, '！', {
        fontFamily: FONT, fontSize: '28px', color: '#ff4d6d', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(8);
      this.scene.sfx('charge');
    }
    if (!this.charging) return;
    if (this.alert) this.alert.setPosition(this.x, this.sprite.y - 78);

    if (time < this.stunUntil) {
      this.sprite.setVelocityX(0);
    } else if (dist > 34) {
      this.sprite.setVelocityX(-d.speed);
    } else {
      this.sprite.setVelocityX(0);
      if (time >= this.nextMelee) {
        this.nextMelee = time + d.meleeEveryMs;
        this.scene.meleeHit(this);
      }
    }
  }

  // 無人機：玩家接近後飛到玩家前上方盤旋，閃黃色後往玩家丟炸彈
  updateDrone(time, playerX, difficulty) {
    const d = this.def;
    const bob = Math.sin(time / 260) * 5;
    this.sprite.y = this.scene.terrain.heightAt(this.x) - d.flyHeight + bob;
    if (!this.engaged) {
      if (this.x - playerX > d.engageRange) return;
      this.engaged = true;
      this.nextShot = time + Phaser.Math.Between(...d.firstBomb);
    }
    const dx = playerX + this.hover - this.x;
    this.sprite.setVelocityX(Phaser.Math.Clamp(dx * 4, -d.speed, d.speed));

    if (!this.aiming && time >= this.nextShot - d.aimMs) {
      this.aiming = true;
      this.sprite.setTintFill(COLORS.aim);
    }
    if (time >= this.nextShot) {
      this.aiming = false;
      this.sprite.clearTint();
      this.scene.dropDroneBomb(this);
      const [min, max] = d.bombEvery;
      this.nextShot = time + Phaser.Math.Between(min, max) * difficulty;
    }
  }

  // 被霰彈槍擊退：往後退一段並停頓
  knockback(dx, stunMs) {
    if (!this.alive) return;
    this.sprite.x += dx;
    this.stunUntil = this.scene.time.now + stunMs;
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
    if (this.hp > 0) {
      // 被打中縮一下，看起來有被擊中的反應
      this.scene.tweens.killTweensOf(this.sprite);
      this.sprite.setScale(1);
      this.scene.tweens.add({ targets: this.sprite, scaleX: 0.88, scaleY: 1.05, duration: 50, yoyo: true });
      return false;
    }

    this.alive = false;
    this.sprite.setScale(1);
    this.sprite.setVelocityX(0);
    this.sprite.body.enable = false;
    if (this.shield) this.shield.destroy();
    if (this.alert) this.alert.destroy();
    if (this.def.vehicle) {
      // 補給車：燒成黑色後慢慢消失
      this.sprite.setTint(0x333333);
      this.scene.tweens.add({ targets: this.sprite, alpha: 0, delay: 400, duration: 600, onComplete: () => this.sprite.destroy() });
      return true;
    }
    if (this.def.flying) {
      // 無人機被擊落：打轉墜地後爆炸
      const groundY = this.scene.terrain.heightAt(this.x);
      this.scene.tweens.add({
        targets: this.sprite, y: groundY, angle: -160, duration: 450, ease: 'Quad.easeIn',
        onComplete: () => {
          this.scene.spark(this.x, groundY - 8, 0xff7b00);
          this.sprite.destroy();
        },
      });
      return true;
    }
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
