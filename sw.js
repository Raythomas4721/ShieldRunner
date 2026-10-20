// Service Worker：讓遊戲離線也能玩
// 策略：有網路時一律抓最新版（更新馬上生效），同時存一份到快取；沒網路時改用快取
const CACHE = 'shield-runner-v1';

// 安裝時先把整個遊戲存起來，第一次開啟後就能離線玩
// 新增檔案時記得加進來；漏加也沒關係，玩的時候載入過的檔案也會自動存進快取
const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'lib/phaser.min.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'src/config.js',
  'src/main.js',
  'src/save.js',
  'src/ui.js',
  'src/objects/Cover.js',
  'src/objects/Enemy.js',
  'src/objects/Player.js',
  'src/objects/Shield.js',
  'src/objects/Sniper.js',
  'src/scenes/BootScene.js',
  'src/scenes/GameScene.js',
  'src/scenes/MenuScene.js',
  'src/scenes/PauseScene.js',
  'src/scenes/ResultScene.js',
  'src/scenes/ShopScene.js',
  'src/scenes/SettingsScene.js',
  'src/scenes/MissionSelectScene.js',
  'src/systems/Tutorial.js',
  'src/systems/AirRaid.js',
  'src/systems/Background.js',
  'src/systems/HUD.js',
  'src/systems/Sound.js',
  'src/systems/Spawner.js',
  'src/systems/Terrain.js',
  'src/systems/TouchControls.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // 逐一加入：其中一個失敗不影響其他檔案
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true })),
  );
});
