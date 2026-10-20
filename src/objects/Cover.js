import { COVERS } from '../config.js';

// 掩體：擋下雙方子彈，受損會變暗，耐久歸零就碎掉
export default class Cover {
  constructor(scene, group, x, type) {
    this.scene = scene;
    this.def = COVERS[type];
    // 畫在角色前面，躲在後面時看起來像真的藏身其後；稍微埋進地面，坡上也不會懸空
    this.sprite = group.create(x, scene.terrain.heightAt(x) + 3, this.def.texture).setOrigin(0.5, 1).setDepth(7);
    this.sprite.setData('ref', this);
    this.hp = this.def.hp;
  }

  get x() {
    return this.sprite.x;
  }

  // 受到傷害，回傳是否被打壞
  hit(damage) {
    this.hp -= damage;
    if (this.hp > 0) {
      const shade = Math.round(140 + 115 * (this.hp / this.def.hp));
      this.sprite.setTint(Phaser.Display.Color.GetColor(shade, shade, shade));
      return false;
    }
    this.sprite.body.enable = false;
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: 0.2,
      alpha: 0,
      duration: 250,
      onComplete: () => this.sprite.destroy(),
    });
    return true;
  }
}
