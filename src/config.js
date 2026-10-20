// 遊戲全域設定與平衡數值：武器、敵人、關卡、軍階都集中在這裡調整

export const GAME_W = 960;
export const GAME_H = 540;
export const GROUND_Y = 350;        // 地面基準高度（最低處），下方留給觸控按鈕；實際高度見 Terrain.heightAt
export const PX_PER_METER = 20;     // 20px = 1 公尺
export const PLAYER_SCREEN_X = 250; // 玩家固定在畫面上的 x 位置
export const FONT = '"Microsoft JhengHei", "Noto Sans TC", "PingFang TC", sans-serif';

// 地形：平地與坡道交錯，只會往上隆起（不低於 GROUND_Y，避免擋到按鈕）
export const TERRAIN = {
  flatStart: 500,      // 起點後這段距離保持平坦
  evacFlat: 350,       // 撤離點前這段距離保持平坦
  maxHeight: 80,       // 最高可以比基準高多少 px
  flatLen: [180, 420], // 平地長度
  slopeLen: [140, 300],
  minRise: 30,         // 一段坡至少上升或下降多少
  maxSlope: 0.45,      // 坡度上限（高度差 / 水平距離）
  uphillSpeedMul: 0.85,
  downhillSpeedMul: 1.1,
};

// 暗色系配色：主角藍、敵人紫
export const COLORS = {
  skyTop: 0x050816,
  skyBottom: 0x1b2a4a,
  ground: 0x0d0d12,
  groundTop: 0x3a506b,
  groundLayer: 0x1a1f2e,
  player: 0x3a86ff,
  enemy: 0x9d4edd,
  sniper: 0x7b2cbf,
  heli: 0x3c096c,
  skin: 0xffd6a5,
  gun: 0x6c757d,
  aim: 0xffd60a,   // 步兵準備開火時變黃
  laser: 0xff2d2d, // 狙擊手紅線
};

// 基礎數值，實際值會再套用軍火庫的升級（見 playerStats）
export const PLAYER = {
  maxHp: 100,
  speed: 180,
  shieldSpeedMul: 0.5,      // 舉盾時移動速度倍率
  stunMs: 1500,             // 破盾後的硬直時間
  autoReloadIdleMs: 1500,   // 停火超過這個時間會自動補滿彈匣
};

export const SHIELD = {
  max: 100,
  costPerHit: 18,  // 每擋一發步兵子彈消耗的耐久
  regenPerSec: 30, // 放下盾牌時每秒回復
  recoverAt: 40,   // 破盾後要回復到這個值才能再舉盾
};

// range：子彈飛行多遠後消失（px）；magSize：彈匣容量；reloadMs：換彈時間
// pellets/spread：一次射出幾發、扇形角度；pierce：貫穿敵人（會被掩體擋下）；explosive：命中或飛到射程盡頭時爆炸
// sound：開火音效名稱（見 systems/Sound.js）
export const WEAPONS = {
  pistol: {
    name: '手槍', price: 0, desc: '基本武器，平衡好用', sound: 'pistol',
    fireRate: 280, damage: 25, bulletSpeed: 750, range: 420, magSize: 12, reloadMs: 1200,
  },
  smg: {
    name: '衝鋒槍', price: 300, desc: '射速超快，火力壓制', sound: 'smg',
    fireRate: 100, damage: 14, bulletSpeed: 800, range: 380, magSize: 30, reloadMs: 1800,
  },
  shotgun: {
    name: '霰彈槍', price: 600, desc: '一次 5 發散彈，近距離爆發', sound: 'shotgun',
    fireRate: 750, damage: 20, pellets: 5, spread: 16, bulletSpeed: 700, range: 260, magSize: 6, reloadMs: 2000,
    texture: 'pellet',
  },
  rifle: {
    name: '狙擊槍', price: 1000, desc: '一發一個，可貫穿多名敵人', sound: 'rifle',
    fireRate: 1100, damage: 110, pierce: true, bulletSpeed: 1400, range: 700, magSize: 5, reloadMs: 2200,
    texture: 'sbullet',
  },
  rocket: {
    name: '火箭筒', price: 2000, desc: '範圍爆炸，可炸毀掩體', sound: 'rocket',
    fireRate: 1000, damage: 120, explosive: { radius: 110, coverMul: 2 }, bulletSpeed: 520, range: 700, magSize: 2, reloadMs: 1800,
    texture: 'rocket',
  },
};

// 軍火庫升級：每級價格 = basePrice ×（目前等級 + 1）
export const UPGRADES = {
  hp: { name: '生命上限', maxLevel: 5, basePrice: 150 },
  shield: { name: '盾牌耐久', maxLevel: 5, basePrice: 150 },
  speed: { name: '移動速度', maxLevel: 5, basePrice: 120 },
  coin: { name: '金幣加成', maxLevel: 5, basePrice: 200 },
};
export const upgradePrice = (key, level) => UPGRADES[key].basePrice * (level + 1);

// 依升級等級算出這一局的玩家數值
export const playerStats = (upgrades) => ({
  maxHp: PLAYER.maxHp + 20 * upgrades.hp,
  shieldMax: SHIELD.max + 20 * upgrades.shield,
  speed: Math.round(PLAYER.speed * (1 + 0.08 * upgrades.speed)),
  coinMul: 1 + 0.1 * upgrades.coin,
});

// 升級說明文字，例如「生命 120 → 140」
export const upgradeEffect = (key, level) => {
  const now = playerStats({ hp: 0, shield: 0, speed: 0, coin: 0, [key]: level });
  const next = playerStats({ hp: 0, shield: 0, speed: 0, coin: 0, [key]: level + 1 });
  const show = {
    hp: (s) => `生命 ${s.maxHp}`,
    shield: (s) => `盾值 ${s.shieldMax}`,
    speed: (s) => `速度 ${Math.round((s.speed / PLAYER.speed) * 100)}%`,
    coin: (s) => `金幣 ×${s.coinMul.toFixed(1)}`,
  }[key];
  return level >= UPGRADES[key].maxLevel ? show(now) : `${show(now)} → ${show(next)}`;
};

export const COINS = {
  perMeters: 10,                        // 每走幾公尺得 1 金幣
  missionBonus: (n) => 50 + 20 * n,     // 完成任務獎勵
  deathMul: 0.5,                        // 陣亡時金幣倍率
};

// 連殺：前一次擊殺後 windowMs 內再殺一個就算連殺，第 N 連殺額外得 coinPer ×（N-1）金幣
export const STREAK = { windowMs: 2500, coinPer: 1 };

// 關卡星等：完成任務、剩餘生命 ≥ hpRatio、限時內完成（每公尺 parSecPerMeter 秒）
export const STARS = { hpRatio: 0.5, parSecPerMeter: 0.22 };
export const parTime = (lengthM) => Math.round(lengthM * STARS.parSecPerMeter);

// 難度：damageMul 玩家受到的傷害、fireMul 敵人開火間隔與間距（越大越輕鬆）、coinMul 金幣倍率
export const DIFFICULTY = {
  easy: { name: '簡單', damageMul: 0.6, fireMul: 1.25, coinMul: 0.8 },
  normal: { name: '普通', damageMul: 1, fireMul: 1, coinMul: 1 },
  hard: { name: '困難', damageMul: 1.3, fireMul: 0.85, coinMul: 1.3 },
};

// 觸控按鈕配置：標準與大按鈕兩種；左手模式時整組左右對調
export const CONTROL_LAYOUTS = {
  normal: {
    name: '標準',
    hitScale: 1.2, // 判定範圍比按鈕外觀大一點，比較好按
    buttons: [
      { key: 'move', label: '前進', x: 120, y: 445, r: 70, color: 0x2a9d8f },
      { key: 'air', label: '對空', x: 530, y: 465, r: 50, color: 0x4361ee },
      { key: 'shield', label: '盾牌', x: 670, y: 455, r: 58, color: 0x4cc9f0 },
      { key: 'fire', label: '開火', x: 840, y: 445, r: 70, color: 0xe76f51 },
    ],
  },
  large: {
    name: '大',
    hitScale: 1.1,
    buttons: [
      { key: 'move', label: '前進', x: 130, y: 440, r: 82, color: 0x2a9d8f },
      { key: 'air', label: '對空', x: 500, y: 468, r: 58, color: 0x4361ee },
      { key: 'shield', label: '盾牌', x: 668, y: 455, r: 68, color: 0x4cc9f0 },
      { key: 'fire', label: '開火', x: 840, y: 440, r: 82, color: 0xe76f51 },
    ],
  },
};

// ai：'shooter' 站著開槍；'charger' 衝過來近戰
// burst/burstGapMs：一次連發幾發、間隔；guard：正面持盾，開火前後才放下（openMs）
// tip：第一次遇到時畫面上的提示
export const ENEMIES = {
  infantry: {
    name: '步兵', texture: 'enemy', ai: 'shooter',
    hp: 100,
    coins: 5,                   // 擊殺獎勵金幣
    fireRange: 700,             // 與玩家距離小於此值才會開火（約為一進畫面就開火）
    firstShotDelay: [200, 600], // 進入射程後第一發的延遲
    fireInterval: [1400, 2200],
    aimMs: 350,                 // 開火前的瞄準提示時間
    burst: 1,
    bulletSpeed: 320,
    bulletDamage: 10,
  },
  gunner: {
    name: '機槍兵', texture: 'gunner', ai: 'shooter',
    hp: 130, coins: 8,
    fireRange: 700, firstShotDelay: [400, 900], fireInterval: [2400, 3000], aimMs: 550,
    burst: 5, burstGapMs: 110,
    bulletSpeed: 340, bulletDamage: 8,
    shieldCost: 12, // 每發耗盾比步兵少，一輪 60，舉盾撐得住

    tip: '機槍兵：會連續掃射 5 發，看到變黃就舉盾撐住！',
  },
  charger: {
    name: '衝鋒兵', texture: 'charger', ai: 'charger',
    hp: 60, coins: 6,
    triggerRange: 650,  // 玩家進入這個距離就開始衝
    speed: 230,
    meleeDamage: 15,    // 近戰傷害，盾牌擋不住
    meleeEveryMs: 1000,
    tip: '衝鋒兵：會衝過來砍人，盾牌擋不住，快開槍！',
  },
  shielder: {
    name: '盾兵', texture: 'shielder', ai: 'shooter', guard: true,
    hp: 150, coins: 12,
    fireRange: 700, firstShotDelay: [600, 1200], fireInterval: [2200, 3000], aimMs: 600,
    burst: 1, openMs: 500,
    bulletSpeed: 320, bulletDamage: 12,
    tip: '盾兵：正面有盾，趁他放下盾開槍時反擊（狙擊槍、火箭筒可直接破盾）',
  },
  boss: {
    name: '裝甲指揮官', texture: 'boss', ai: 'shooter', boss: true,
    hp: 600, coins: 100,  // 任務 6、9… 的 Boss 血量會再增加（見 bossHpMul）
    fireRange: 750, firstShotDelay: [800, 1200], fireInterval: [1800, 2400], aimMs: 500,
    burst: 3, burstGapMs: 150,
    bulletSpeed: 360, bulletDamage: 12,
    heavyEvery: 3, // 每 3 輪改射一發重砲
    heavy: { damage: 30, shieldCost: 45, speed: 260 },
    tip: '警告：裝甲指揮官！擊倒他才能撤離',
  },
};

// 各關會出現的敵人與權重，越後面種類越多
export const enemyPool = (n) => [
  ['infantry', 10],
  ...(n >= 2 ? [['gunner', 2 + n]] : []),
  ...(n >= 3 ? [['charger', 1 + n]] : []),
  ...(n >= 4 ? [['shielder', n]] : []),
];

// 狙擊手：站在高塔上，紅線鎖定後移動就能閃開
// 進入射程可以打他（被打中會中斷瞄準＝壓制），火箭爆炸能把整座塔炸倒
export const SNIPER = {
  name: '狙擊手',
  hp: 80,
  coins: 15,
  towerHeight: 130,
  range: 820,       // 與玩家距離小於此值開始瞄準
  trackMs: 1400,    // 紅線追蹤玩家的時間
  lockMs: 600,      // 鎖定後閃爍多久才開槍（閃避時間）
  cooldownMs: 1800, // 開槍後休息多久再瞄準
  hitRadius: 22,    // 開槍時玩家離鎖定點多近算命中
  damage: 30,
  shieldCost: 60,   // 用盾牌硬擋消耗的耐久
  tip: '狙擊手：紅線閃爍就移動閃開，靠近開槍可打斷瞄準（火箭筒能炸倒高塔）',
};

// 完美格擋：子彈快打到時才舉盾（舉起後 windowMs 內擋下），不扣盾值還會反彈
export const PARRY = {
  windowMs: 220,
  minDownMs: 300,        // 盾牌至少放下這麼久再舉起才算，避免一直連按
  reflectDamageMul: 3,   // 反彈子彈的傷害倍率
  minReflectDamage: 30,
  sniperDamage: 80,      // 完美格擋狙擊：直接反彈打中狙擊手
};

// 直升機空襲：從頭頂掃射，要用「對空」盾擋或閃開
export const AIR_RAID = {
  warnMs: 2000,     // 警報時間
  passMs: 9000,     // 直升機飛過畫面的時間
  fireEveryMs: 170,
  heliY: 80,
  bulletSpeed: 380,
  damage: 12,
  shieldCost: 10,
};

// 掩體：雙方子彈都會被擋下，打太多下會壞掉
export const COVERS = {
  sandbag: { name: '沙包', texture: 'sandbag', hp: 200 },
  crate: { name: '木箱', texture: 'crate', hp: 120 },
};
// 子彈不會打到射擊者身邊這個距離內的掩體（躲在掩體後可以越過它開槍）
export const COVER_SHOOT_OVER = 90;

export const HEALTH_PACK = { amount: 30, chance: 0.2 };

export const SPAWN = {
  firstAt: 700,          // 第一個敵人距離起點
  gap: [320, 520],       // 敵人之間的間距
  ahead: 1000,           // 在玩家前方多遠處預先生成
  evacClear: 250,        // 撤離點前這段距離不再生成敵人
  enemyCoverChance: 0.4, // 敵人前方放沙包的機率（第一個敵人不放）
  freeCoverChance: 0.5,  // 兩個敵人中間放一個掩體給玩家用的機率
  sniperForcedAt: 0.35,  // 每關在這個進度一定會出現一座狙擊塔
  sniperMinGap: 900,     // 兩座狙擊塔的最小間距
};

// 關卡：越後面越長、越難，空襲次數越多
export const missionConfig = (n) => ({
  number: n,
  length: Math.min(300 + (n - 1) * 100, 1000), // 公尺
  baseDifficulty: Math.max(0.55, 1 - (n - 1) * 0.05),
  sniperChance: Math.min(0.25, 0.08 + 0.03 * (n - 1)),
  raids: Math.min(1 + Math.floor((n - 1) / 2), 3),
  boss: n % 3 === 0,                                            // 每 3 關撤離點前有 Boss
  bossHpMul: 1 + 0.25 * (Math.floor(n / 3) - 1),                // 第 2 次出現起每次血量 +25%
  newEnemy: { 2: 'gunner', 3: 'charger', 4: 'shielder' }[n] || null, // 這關新登場的敵人
});

// 空襲發生的進度點，平均分布在 35%～85% 之間
export const raidPoints = (count) =>
  Array.from({ length: count }, (_, i) => 0.35 + (0.5 * (i + 1)) / (count + 1));

// 難度係數：越小越難，影響敵人開火間隔與間距
export const difficultyAt = (mission, progress) => Math.max(0.45, mission.baseDifficulty - 0.15 * progress);

// 軍階：依累計擊殺數晉升
export const RANKS = [
  { name: '二等兵', kills: 0 },
  { name: '一等兵', kills: 10 },
  { name: '上等兵', kills: 25 },
  { name: '下士', kills: 45 },
  { name: '中士', kills: 70 },
  { name: '上士', kills: 100 },
  { name: '士官長', kills: 140 },
  { name: '少尉', kills: 190 },
  { name: '中尉', kills: 250 },
  { name: '上尉', kills: 320 },
  { name: '少校', kills: 400 },
  { name: '中校', kills: 500 },
  { name: '上校', kills: 620 },
  { name: '少將', kills: 760 },
  { name: '中將', kills: 920 },
  { name: '上將', kills: 1100 },
];

export const rankIndexOf = (totalKills) => {
  let i = 0;
  while (i + 1 < RANKS.length && totalKills >= RANKS[i + 1].kills) i++;
  return i;
};
