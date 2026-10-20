import { GAME_W, FONT, CONTROL_LAYOUTS } from '../config.js';

// 每幀檢查所有按下中的觸控點，支援多指同時按住不同按鈕
// size：'normal' / 'large'；leftHanded：整組按鈕左右對調（左手開火）
export default class TouchControls {
  constructor(scene, { size = 'normal', leftHanded = false } = {}) {
    this.scene = scene;
    const layout = CONTROL_LAYOUTS[size] || CONTROL_LAYOUTS.normal;
    this.hitScale = layout.hitScale;
    this.buttons = layout.buttons.map((def) => {
      const b = { ...def, x: leftHanded ? GAME_W - def.x : def.x };
      b.circle = scene.add.circle(b.x, b.y, b.r, b.color, 0.35)
        .setStrokeStyle(3, 0xffffff, 0.6)
        .setScrollFactor(0)
        .setDepth(100);
      scene.add.text(b.x, b.y, b.label, {
        fontFamily: FONT, fontSize: b.r < 60 ? '22px' : '26px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
      return b;
    });
    this.keys = scene.input.keyboard.addKeys('RIGHT,D,SPACE,J,SHIFT,K,L,UP,W');
    this.debug = null; // 測試用：可從主控台強制指定輸入，例如 { move: true }
  }

  // 取得某個按鈕的位置與大小（教學提示用來標示按鈕）
  button(key) {
    return this.buttons.find((b) => b.key === key);
  }

  read() {
    const state = { move: false, fire: false, shield: false, air: false };
    for (const p of this.scene.input.manager.pointers) {
      if (!p.isDown) continue;
      for (const b of this.buttons) {
        if (Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) <= b.r * this.hitScale) state[b.key] = true;
      }
    }
    const k = this.keys;
    if (k.RIGHT.isDown || k.D.isDown) state.move = true;
    if (k.SPACE.isDown || k.J.isDown) state.fire = true;
    if (k.SHIFT.isDown || k.K.isDown) state.shield = true;
    if (k.L.isDown || k.UP.isDown || k.W.isDown) state.air = true;
    if (this.debug) Object.assign(state, this.debug);

    for (const b of this.buttons) b.circle.setFillStyle(b.color, state[b.key] ? 0.7 : 0.35);
    return state;
  }
}
