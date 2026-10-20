// 存檔：累計擊殺（決定軍階）、關卡進度、金幣、武器與升級、設定，存在瀏覽器的 localStorage
const KEY = 'shield-runner-save-v1';
const DEFAULT_SAVE = {
  totalKills: 0,
  mission: 1,             // 目前解鎖到第幾關
  coins: 0,
  owned: ['pistol'],
  equipped: 'pistol',
  upgrades: { hp: 0, shield: 0, speed: 0, coin: 0 },
  stars: {},              // 每關最佳星等 { 關卡編號: 0～3 }
  tutorialDone: false,
  // 設定
  sound: true,
  vibrate: true,
  difficulty: 'normal',   // easy / normal / hard
  buttonSize: 'normal',   // normal / large
  leftHanded: false,
};

export function loadSave() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch (e) {
    // 讀不到就用預設值
  }
  return {
    ...DEFAULT_SAVE,
    ...saved,
    owned: saved.owned || [...DEFAULT_SAVE.owned],
    upgrades: { ...DEFAULT_SAVE.upgrades, ...saved.upgrades },
    stars: { ...saved.stars },
  };
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    // 無痕模式等情況可能無法存檔，遊戲照常進行
  }
}
