# 盾擊前線 Shield Runner

2D 橫向捲軸射擊網頁遊戲，手機橫向遊玩。用盾牌擋子彈、開槍推進，抵達撤離點完成任務，賺金幣買武器、累積擊殺升軍階。

## 遊玩

手機或電腦直接開：**https://raythomas4721.github.io/ShieldRunner/**

**加到主畫面**（像 App 一樣全螢幕開啟，第一次開過後離線也能玩）：
- Android Chrome：右上角選單 →「加到主畫面」或「安裝應用程式」
- iPhone Safari：下方分享鈕 →「加入主畫面」

## 本機執行

需要 Node.js，不用安裝任何套件：

```bash
node serve.js
```

開啟 `http://localhost:8080`。手機連同一個 Wi-Fi，用終端機印出的區網網址開啟。

## 操作

| 動作 | 手機 | 電腦 |
|---|---|---|
| 前進（放開停下） | 左下「前進」 | → / D |
| 開火 | 右下「開火」 | J / 空白鍵 |
| 正面舉盾 | 右下「盾牌」 | K / Shift |
| 對空舉盾 | 右下「對空」 | L / ↑ / W |

## 內容

- **關卡**：每關走到撤離點完成，越後面越長越難；每 3 關有 Boss（裝甲指揮官）
- **敵人**：步兵、機槍兵（任務 2）、衝鋒兵（任務 3）、盾兵（任務 4）、高塔狙擊手（可打斷瞄準、火箭可炸塔）、直升機空襲
- **完美格擋**：子彈快到時才舉盾，不扣盾值並把子彈反彈回去
- **暫停選單**：右上角 II 鈕或 P / Esc；可繼續、撤退（金幣減半結算）、重新開始
- **地形**：坡道與高台（子彈會依高低差斜著飛，山坡可擋子彈）；沙包、木箱可擋子彈；補血包
- **背景**：漸層夜空、月亮、流星，三層視差捲動的山與樹林
- **成長**：金幣（距離＋擊殺＋任務獎勵，陣亡減半）、軍火庫 5 種武器與 4 種升級、16 階軍階
- **存檔**：瀏覽器 localStorage
- **音效**：Web Audio 即時合成，主選單可開關

## 程式結構

- `src/config.js`：所有平衡數值（武器、敵人、關卡、軍階）
- `src/scenes/`：Boot（產生色塊貼圖）、Menu、Game、Result、Shop
- `src/objects/`：Player、Shield、Enemy、Sniper、Cover
- `src/systems/`：Terrain、Background、Spawner、AirRaid、TouchControls、HUD、Sound

- `sw.js`：Service Worker（有網路抓最新版，沒網路用快取）；新增檔案時記得加進 `PRECACHE`
- `manifest.webmanifest`、`icons/`：PWA 設定與圖示

使用 [Phaser 3.80.1](https://phaser.io/)（`lib/phaser.min.js`，MIT 授權）。
