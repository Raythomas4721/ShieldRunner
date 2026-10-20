# 盾擊前線 Shield Runner

2D 橫向捲軸射擊網頁遊戲，手機橫向遊玩。用盾牌擋子彈、開槍推進，抵達撤離點完成任務，賺金幣買武器、累積擊殺升軍階。

## 執行

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
- **敵人**：步兵、機槍兵（任務 2）、衝鋒兵（任務 3）、盾兵（任務 4）、高塔狙擊手、直升機空襲
- **地形**：沙包、木箱可擋子彈；補血包
- **成長**：金幣（距離＋擊殺＋任務獎勵，陣亡減半）、軍火庫 5 種武器與 4 種升級、16 階軍階
- **存檔**：瀏覽器 localStorage
- **音效**：Web Audio 即時合成，主選單可開關

## 程式結構

- `src/config.js`：所有平衡數值（武器、敵人、關卡、軍階）
- `src/scenes/`：Boot（產生色塊貼圖）、Menu、Game、Result、Shop
- `src/objects/`：Player、Shield、Enemy、Sniper、Cover
- `src/systems/`：Spawner、AirRaid、TouchControls、HUD、Sound

使用 [Phaser 3](https://phaser.io/)（目前從 CDN 載入）。
