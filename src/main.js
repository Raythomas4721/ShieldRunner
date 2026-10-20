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
