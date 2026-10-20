import { GROUND_Y, SHIELD } from '../config.js';

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
  }

  get raised() {
    return this.mode !== null;
  }

  update(delta, wantMode, playerX) {
    if (this.broken && this.durability >= SHIELD.recoverAt) this.broken = false;
    this.mode = this.broken ? null : wantMode;
    if (!this.mode) {
      this.durability = Math.min(this.max, this.durability + SHIELD.regenPerSec * delta / 1000);
    }
    this.front.x = playerX + 26;
    this.air.x = playerX + 2;
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
