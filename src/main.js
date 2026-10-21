import { GAME_W, GAME_H } from './config.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import ResultScene from './scenes/ResultScene.js';
import ShopScene from './scenes/ShopScene.js';
import PauseScene from './scenes/PauseScene.js';
import SettingsScene from './scenes/SettingsScene.js';
import MissionSelectScene from './scenes/MissionSelectScene.js';
import { loadSave } from './save.js';
import { initSound, setSoundEnabled, setVibrateEnabled } from './systems/Sound.js';

initSound();
setSoundEnabled(loadSave().sound);
setVibrateEnabled(loadSave().vibrate);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  input: { activePointers: 4 }, // 多點觸控：同時按前進與開火
  scene: [BootScene, MenuScene, GameScene, ResultScene, ShopScene, PauseScene, SettingsScene, MissionSelectScene],
});

// 方便在主控台除錯
window.__game = game;

// ---------- 修正切出去再回來畫面變大、被切掉 ----------
// 手機切 App、旋轉、退出全螢幕時，視窗大小會改變，但不一定會通知到遊戲（或通知時畫面還沒穩定）。
// 所以在這些時機主動重新計算畫面大小，並延遲再算兩次，等手機畫面穩定。
const viewportMeta = document.querySelector('meta[name="viewport"]');
const VIEWPORT = viewportMeta.getAttribute('content');

function refitScreen() {
  // iPhone Safari 不理會「禁止縮放」，網頁可能被放大；重新套用 viewport 讓縮放回到 1 倍
  if (window.visualViewport && Math.abs(window.visualViewport.scale - 1) > 0.01) {
    viewportMeta.setAttribute('content', `${VIEWPORT}, minimum-scale=1`);
    setTimeout(() => viewportMeta.setAttribute('content', VIEWPORT), 50);
  }
  game.scale.refresh();
}

function refitSoon() {
  refitScreen();
  setTimeout(refitScreen, 200);
  setTimeout(refitScreen, 700);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refitSoon();
});
window.addEventListener('pageshow', refitSoon);
window.addEventListener('focus', refitSoon);
window.addEventListener('orientationchange', refitSoon);
if (window.visualViewport) window.visualViewport.addEventListener('resize', refitSoon);

// 阻止 iPhone 的雙指縮放、連點兩下放大（遊戲需要很多快速連按）
document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });
