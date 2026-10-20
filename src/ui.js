import { FONT } from './config.js';
import { sfx } from './systems/Sound.js';

// 共用的矩形按鈕；enabled 為 false 時變灰但仍可點（讓呼叫端顯示原因，例如「金幣不足」）
export function makeButton(scene, x, y, w, h, label, color, onClick, { fontSize = 22, enabled = true } = {}) {
  const bg = scene.add.rectangle(x, y, w, h, enabled ? color : 0x343a40)
    .setStrokeStyle(2, 0xffffff, enabled ? 0.5 : 0.15)
    .setInteractive({ useHandCursor: true });
  const text = scene.add.text(x, y, label, {
    fontFamily: FONT, fontSize: `${fontSize}px`, color: enabled ? '#ffffff' : '#8d99ae', fontStyle: 'bold',
  }).setOrigin(0.5);
  bg.on('pointerdown', () => {
    sfx('click');
    onClick();
  });
  return { bg, text };
}

// 畫面下方短暫出現的提示文字
export function toast(scene, x, y, msg, color = '#ffffff') {
  const t = scene.add.text(x, y, msg, {
    fontFamily: FONT, fontSize: '22px', color, fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
  }).setOrigin(0.5).setDepth(200);
  scene.tweens.add({ targets: t, y: y - 20, alpha: 0, delay: 900, duration: 400, onComplete: () => t.destroy() });
}
