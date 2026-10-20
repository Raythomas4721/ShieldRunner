import { GAME_W, GAME_H, FONT } from '../config.js';

const BUTTONS = [
  { key: 'move', label: '前進', x: 120, y: GAME_H - 95, r: 70, color: 0x2a9d8f },
  { key: 'air', label: '對空', x: GAME_W - 430, y: GAME_H - 75, r: 50, color: 0x4361ee },
  { key: 'shield', label: '盾牌', x: GAME_W - 290, y: GAME_H - 85, r: 58, color: 0x4cc9f0 },
  { key: 'fire', label: '開火', x: GAME_W - 120, y: GAME_H - 95, r: 70, color: 0xe76f51 },
];
const HIT_SCALE = 1.2; // 判定範圍比按鈕外觀大一點，比較好按

// 每幀檢查所有按下中的觸控點，支援多指同時按住不同按鈕
export default class TouchControls {
  constructor(scene) {
    this.scene = scene;
    this.buttons = BUTTONS.map((b) => {
      const circle = scene.add.circle(b.x, b.y, b.r, b.color, 0.35)
        .setStrokeStyle(3, 0xffffff, 0.6)
        .setScrollFactor(0)
        .setDepth(100);
      scene.add.text(b.x, b.y, b.label, {
        fontFamily: FONT, fontSize: b.r < 60 ? '22px' : '26px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
      return { ...b, circle };
    });
    this.keys = scene.input.keyboard.addKeys('RIGHT,D,SPACE,J,SHIFT,K,L,UP,W');
    this.debug = null; // 測試用：可從主控台強制指定輸入，例如 { move: true }
  }

  read() {
    const state = { move: false, fire: false, shield: false, air: false };
    for (const p of this.scene.input.manager.pointers) {
      if (!p.isDown) continue;
      for (const b of this.buttons) {
        if (Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) <= b.r * HIT_SCALE) state[b.key] = true;
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
