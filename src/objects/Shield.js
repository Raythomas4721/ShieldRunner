import { GROUND_Y, SHIELD, PARRY } from '../config.js';

// 盾牌有兩種舉法：'front' 擋正面、'air' 舉到頭頂擋空中，兩者共用耐久
export default class Shield {
  constructor(scene, max = SHIELD.max) {
    this.max = max;
    this.front = scene.physics.add.image(0, GROUND_Y - 2, 'shield').setOrigin(0.5, 1).setDepth(6);
    this.air = scene.physics.add.image(0, GROUND_Y - 60, 'shieldAir').setOrigin(0.5, 1).setDepth(6);
    for (const s of [this.front, this.air]) {
      s.setVisible(false);
      s.body.enable = false;
    }
    this.durability = this.max;
    this.broken = false;
    this.mode = null;
    this.loweredAt = -Infinity; // 上次放下盾的時間
    this.parryUntil = 0;        // 完美格擋判定的截止時間
  }

  get raised() {
    return this.mode !== null;
  }

  // 剛舉起的一小段時間內擋下子彈 = 完美格擋
  canParry(time) {
    return this.mode !== null && time <= this.parryUntil;
  }

  // playerY：玩家腳底高度，盾牌跟著地形上下移動
  update(delta, wantMode, playerX, playerY = GROUND_Y, time = 0) {
    if (this.broken && this.durability >= SHIELD.recoverAt) this.broken = false;
    const prev = this.mode;
    this.mode = this.broken ? null : wantMode;
    if (this.mode !== prev) {
      if (prev && !this.mode) this.loweredAt = time;
      // 從放下狀態舉起、而且放下夠久，才有完美格擋判定（避免一直連按）
      if (this.mode) this.parryUntil = !prev && time - this.loweredAt >= PARRY.minDownMs ? time + PARRY.windowMs : 0;
    }
    if (!this.mode) {
      this.durability = Math.min(this.max, this.durability + SHIELD.regenPerSec * delta / 1000);
    }
    this.front.setPosition(playerX + 26, playerY - 2);
    this.air.setPosition(playerX + 2, playerY - 60);
    this.show();
  }

  show() {
    this.front.setVisible(this.mode === 'front');
    this.front.body.enable = this.mode === 'front';
    this.air.setVisible(this.mode === 'air');
    this.air.body.enable = this.mode === 'air';
  }

  // 擋下一發子彈，回傳是否因此破盾
  absorb(cost = SHIELD.costPerHit) {
    this.durability -= cost;
    if (this.durability > 0) return false;
    this.durability = 0;
    this.broken = true;
    this.mode = null;
    this.show();
    return true;
  }
}
