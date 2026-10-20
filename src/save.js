// 存檔：累計擊殺（決定軍階）、目前關卡、金幣、武器與升級，存在瀏覽器的 localStorage
const KEY = 'shield-runner-save-v1';
const DEFAULT_SAVE = {
  totalKills: 0,
  mission: 1,
  coins: 0,
  owned: ['pistol'],
  equipped: 'pistol',
  upgrades: { hp: 0, shield: 0, speed: 0, coin: 0 },
  sound: true,
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
  };
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    // 無痕模式等情況可能無法存檔，遊戲照常進行
  }
}
