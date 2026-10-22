import {
  GAME_W, PX_PER_METER, PLAYER_SCREEN_X, FONT, COLORS,
  COVER_SHOOT_OVER, SNIPER, PARRY, AIR_RAID, HEALTH_PACK, WEAPONS, COINS, DIFFICULTY, STREAK, STARS,
  SUPPLY, RARITY, CARDS, CARD_VALUES as CV, THEATER_FX, GROUND_Y, OBJECTIVES,
  missionConfig, raidPoints, difficultyAt, playerStats, parTime,
} from '../config.js';
import Terrain from '../systems/Terrain.js';
import Tutorial from '../systems/Tutorial.js';
import Background from '../systems/Background.js';
import { loadSave, writeSave } from '../save.js';
import Player from '../objects/Player.js';
import Enemy from '../objects/Enemy.js';
import Cover from '../objects/Cover.js';
import Sniper from '../objects/Sniper.js';
import Buddy from '../objects/Buddy.js';
import Spawner from '../systems/Spawner.js';
import AirRaid from '../systems/AirRaid.js';
import TouchControls from '../systems/TouchControls.js';
import HUD from '../systems/HUD.js';
import { sfx, vibrate } from '../systems/Sound.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.save = loadSave();
    this.missionNo = (data && data.mission) || this.save.mission;
  }

  create() {
    // 重新進入時 Arcade 世界會沿用上一局的暫停狀態
    this.physics.resume();
    this.mission = missionConfig(this.missionNo);
    this.mode = DIFFICULTY[this.save.difficulty] || DIFFICULTY.normal;

    this.startX = PLAYER_SCREEN_X;
    this.evacX = this.startX + this.mission.length * PX_PER_METER;
    this.theater = this.mission.theater;
    this.objective = this.mission.objective;
    this.trucksTotal = this.objective === 'destroy' ? OBJECTIVES.destroy.truckAt.length : 0;
    this.trucksDestroyed = 0;
    this.hold = null; // 守點任務：抵達無線電站後的倒數狀態
    this.timeLimit = this.objective === 'timed' ? Math.round(parTime(this.mission.length) * OBJECTIVES.timed.timeMul) : null;
    this.background = new Background(this, this.theater);
    this.terrain = new Terrain(this, this.startX, this.evacX, this.theater.ground);
    this.createEvac();

    this.stats = playerStats(this.save.upgrades);
    this.player = new Player(this, this.startX, this.stats, WEAPONS[this.save.equipped] || WEAPONS.pistol);
    if (this.theater.feature === 'ice') this.player.slideDecel = THEATER_FX.ice.slideDecel;
    this.buddy = this.stats.buddy ? new Buddy(this, this.player, this.stats.buddy) : null;
    this.enemies = [];
    this.boss = null;
    this.tipBusyUntil = 0;
    this.snipers = [];
    this.pickups = [];
    this.enemyGroup = this.physics.add.group();
    this.playerBullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.airBullets = this.physics.add.group();
    this.grenades = this.physics.add.group();
    this.coverGroup = this.physics.add.group();
    this.counters = { blocks: 0, parries: 0 }; // 教學提示用
    this.kills = 0;
    this.killCoins = 0;
    this.meters = 0;
    this.elapsed = 0;             // 任務經過時間（暫停時不算），用來算限時星
    this.streak = 0;
    this.bestStreak = 0;
    this.lastKillAt = -Infinity;
    this.perks = new Set();       // 這一局選到的戰術卡 id
    this.over = false;

    // 碰撞登記順序 = 判定順序：掩體 → 盾牌 → 身體，同一幀內子彈會先被前面的擋下
    const shield = this.player.shield;
    for (const bullets of [this.enemyBullets, this.playerBullets, this.airBullets]) {
      this.physics.add.overlap(bullets, this.coverGroup, (b, c) => this.onCoverHit(b, c));
    }
    this.physics.add.overlap(shield.front, this.enemyBullets, (_s, b) => this.onShieldBlock(b));
    this.physics.add.overlap(shield.air, this.airBullets, (_s, b) => this.onShieldBlock(b));
    this.physics.add.overlap(shield.air, this.grenades, (_s, gr) => this.onGrenadeBlocked(gr));
    this.physics.add.overlap(this.player.sprite, this.enemyBullets, (_p, b) => this.onPlayerHit(b));
    this.physics.add.overlap(this.player.sprite, this.airBullets, (_p, b) => this.onPlayerHit(b));
    this.physics.add.overlap(this.playerBullets, this.enemyGroup, (b, e) => this.onEnemyHit(b, e));

    this.spawner = new Spawner(this, this.startX, this.evacX, this.mission);
    this.airRaid = new AirRaid(this);
    this.raidPoints = raidPoints(this.mission.raids);
    this.raidIndex = 0;
    this.controls = new TouchControls(this, { size: this.save.buttonSize, leftHanded: this.save.leftHanded });
    this.hud = new HUD(this);
    this.createPauseButton();
    // 第一次玩任務 1 才有新手教學（設定裡可以重看）
    this.tutorial = this.missionNo === 1 && !this.save.tutorialDone ? new Tutorial(this, this.controls) : null;
    this.banner(`任務 ${this.mission.number}｜${this.theater.name}\n${this.objectiveBrief()}`, '#ffffff', 2500);
    this.tipBusyUntil = this.time.now + 2900; // 開場說明有兩行，提示等它消失再出現
    this.setupSupply();
    this.setupWeather();

    // 物理更新後再移動鏡頭，避免畫面延遲一幀
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncCamera, this);
    // 切到別的 App 或關掉螢幕時自動暫停
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.openPause, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncCamera, this);
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.openPause, this);
    });
  }

  // 右上角暫停鈕（鍵盤 P / Esc）
  createPauseButton() {
    const x = GAME_W - 36;
    const y = 104;
    const btn = this.add.circle(x, y, 22, 0x415a77, 0.6).setStrokeStyle(2, 0xffffff, 0.6)
      .setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true });
    this.add.text(x, y, 'II', { fontFamily: FONT, fontSize: '18px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(101);
    btn.on('pointerdown', () => this.openPause());
    this.input.keyboard.on('keydown-P', () => this.openPause());
    this.input.keyboard.on('keydown-ESC', () => this.openPause());
  }

  openPause() {
    if (this.over || !this.scene.isActive()) return;
    this.sfx('click');
    this.scene.launch('Pause');
    this.scene.pause();
  }

  update(time, delta) {
    if (this.over) return;

    const input = this.controls.read();
    // 守點任務：走到無線電站就停住，不能再往前
    let blockX = this.objective === 'defend' ? this.evacX : null;
    for (const e of this.enemies) {
      if (e.def.flying) continue; // 無人機在空中，不擋路
      if (e.alive && e.x > this.player.x && (blockX === null || e.x - 70 < blockX)) blockX = e.x - 70;
    }
    this.player.update(time, delta, input, blockX);
    if (this.buddy) this.buddy.update(time);

    this.elapsed += delta;
    this.meters = Phaser.Math.Clamp(Math.floor((this.player.x - this.startX) / PX_PER_METER), 0, this.mission.length);
    const progress = this.meters / this.mission.length;
    const difficulty = difficultyAt(this.mission, progress) * this.mode.fireMul;
    this.spawner.update(this.player.x, difficulty);
    this.updateWeather();
    const enemyPace = difficulty * (this.storm && this.storm.active ? THEATER_FX.sandstorm.fireMul : 1);
    for (const e of this.enemies) e.update(time, this.player.x, enemyPace);
    for (const s of this.snipers) s.update(time, this.player);

    if (!this.airRaid.active && this.raidIndex < this.raidPoints.length && progress >= this.raidPoints[this.raidIndex]) {
      this.raidIndex++;
      this.airRaid.start(time);
    }
    this.airRaid.update(time);

    this.updateSupply();
    this.checkPickups();
    this.cleanup();
    this.hud.update(this, time);
    if (this.tutorial) this.tutorial.update(time);

    this.updateObjective(time);
  }

  // ---------- 任務目標 ----------

  // 開場說明的第二行
  objectiveBrief() {
    const len = this.mission.length;
    switch (this.objective) {
      case 'defend': return `前進 ${len} 公尺到無線電站，守住 ${OBJECTIVES.defend.holdMs / 1000} 秒`;
      case 'destroy': return `摧毀路上 ${this.trucksTotal} 台敵方補給車，再抵達撤離點`;
      case 'timed': return `${this.timeLimit} 秒內抵達 ${len} 公尺外的撤離點！直升機不等人`;
      default: return `前進 ${len} 公尺，抵達撤離點`;
    }
  }

  updateObjective(time) {
    if (this.objective === 'timed' && this.elapsed >= this.timeLimit * 1000) {
      this.finish(false, false, 'timeout');
      return;
    }
    if (this.objective !== 'defend') {
      if (this.player.x >= this.evacX) this.finish(true);
      return;
    }
    if (!this.hold) {
      if (this.player.x >= this.evacX - 4) this.startHold();
      return;
    }
    const h = this.hold;
    const d = OBJECTIVES.defend;
    if (this.elapsed >= h.nextWave) {
      h.nextWave = this.elapsed + Phaser.Math.Between(...d.waveEvery);
      this.spawnReinforcement();
    }
    if (!h.raided && this.elapsed >= h.startAt + d.holdMs * d.raidAt && !this.airRaid.active) {
      h.raided = true;
      this.airRaid.start(time);
    }
    if (this.elapsed >= h.endAt) this.finish(true);
  }

  // 抵達無線電站：開始守點倒數，敵人從右邊一波波過來
  startHold() {
    const d = OBJECTIVES.defend;
    this.hold = { startAt: this.elapsed, endAt: this.elapsed + d.holdMs, nextWave: this.elapsed + 800, raided: false };
    this.sfx('siren');
    this.queueTip(`守住無線電站 ${d.holdMs / 1000} 秒！敵人會從右邊增援`, '#4cc9f0', 2500);
  }

  // 守點增援：在畫面右側外生成，走進來到定位才開火（停在霰彈槍也打得到的距離）
  spawnReinforcement() {
    const x = this.cameras.main.scrollX + GAME_W + 60;
    this.spawnEnemy(x, this.spawner.pickType());
    const enemy = this.enemies[this.enemies.length - 1];
    enemy.walkTo = this.player.x + Phaser.Math.Between(...OBJECTIVES.defend.standAt);
  }

  // HUD 上顯示的目標狀態
  objectiveStatus() {
    switch (this.objective) {
      case 'destroy':
        return { text: `補給車 ${this.trucksDestroyed} / ${this.trucksTotal}`, color: '#ffd60a' };
      case 'timed': {
        const left = Math.max(0, Math.ceil(this.timeLimit - this.elapsed / 1000));
        const label = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
        return { text: `撤離倒數 ${label}`, color: left <= OBJECTIVES.timed.warnSec ? '#ff4d6d' : '#ffd60a' };
      }
      case 'defend': {
        if (!this.hold) return { text: '目標：抵達無線電站', color: '#4cc9f0' };
        const left = Math.max(0, Math.ceil((this.hold.endAt - this.elapsed) / 1000));
        return { text: `守住無線電站 ${left} 秒`, color: '#4cc9f0', ratio: 1 - left / (OBJECTIVES.defend.holdMs / 1000) };
      }
      default: return null;
    }
  }

  // 補給車被摧毀：大爆炸，不算擊殺但有金幣
  onTruckDestroyed(truck) {
    this.trucksDestroyed++;
    const y = truck.sprite.y - 26;
    const blast = this.add.circle(truck.x, y, 70, 0xff7b00, 0.6).setDepth(20).setScale(0.3);
    this.tweens.add({ targets: blast, scale: 1, alpha: 0, duration: 400, onComplete: () => blast.destroy() });
    this.cameras.main.shake(250, 0.012);
    this.sfx('explosion');
    const done = this.trucksDestroyed >= this.trucksTotal;
    this.banner(`補給車 ${this.trucksDestroyed} / ${this.trucksTotal} 摧毀！+${truck.def.coins}${done ? '\n全部摧毀，前往撤離點' : ''}`,
      '#ffd60a', 2000, 200).setFontSize(24);
  }

  syncCamera() {
    const cam = this.cameras.main;
    cam.scrollX = this.player.x - PLAYER_SCREEN_X;
    this.background.update(cam.scrollX, this.time.now);
    this.terrain.draw(cam.scrollX - 20, cam.scrollX + GAME_W + 20);
  }

  groundAt(x) {
    return this.terrain.heightAt(x);
  }

  // ---------- 生成 ----------

  // 終點：撤離點旗子；守點任務是無線電站
  createEvac() {
    const y = this.groundAt(this.evacX);
    const defend = this.objective === 'defend';
    const color = defend ? 0x4cc9f0 : 0x2dc653;
    if (defend) this.add.image(this.evacX + 30, y, 'radio').setOrigin(0.5, 1).setDepth(2);
    else this.add.image(this.evacX, y, 'evac').setOrigin(0.15, 1).setDepth(2);
    this.add.text(this.evacX + 10, y - 140, defend ? '無線電站' : '撤離點', {
      fontFamily: FONT, fontSize: '22px', color: defend ? '#4cc9f0' : '#2dc653', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);
    const beacon = this.add.circle(this.evacX, y - 4, 30, color, 0.35).setDepth(1);
    this.tweens.add({ targets: beacon, scale: 1.8, alpha: 0, duration: 1200, repeat: -1 });
  }

  spawnEnemy(x, type) {
    const enemy = new Enemy(this, this.enemyGroup, x, type);
    if (enemy.def.boss) {
      enemy.maxHp = Math.round(enemy.def.hp * this.mission.bossHpMul);
      enemy.hp = enemy.maxHp;
      this.boss = enemy;
    }
    this.enemies.push(enemy);
  }

  // 敵人第一次進入畫面：Boss 每次都警告；其他新敵人在這次遊玩中只提示一次
  onEnemySeen(enemy) {
    const { def, type } = enemy;
    if (def.boss) {
      this.sfx('bossWarn');
      this.cameras.main.shake(300, 0.008);
      this.queueTip(def.tip, '#ff006e', 3000);
      return;
    }
    const seen = this.registry.get('seenEnemies') || [];
    if (!def.tip || seen.includes(type)) return;
    this.registry.set('seenEnemies', [...seen, type]);
    this.queueTip(def.tip, '#ffd60a', 3500);
  }

  // 提示排隊顯示，避免兩則同時出現疊在一起
  queueTip(msg, color, duration) {
    const now = this.time.now;
    const startAt = Math.max(now, this.tipBusyUntil || 0);
    this.tipBusyUntil = startAt + duration + 400;
    this.time.delayedCall(startAt - now, () => {
      if (!this.over) this.banner(msg, color, duration, 200).setFontSize(24);
    });
  }

  sfx(name) {
    sfx(name);
  }

  spawnCover(x, type) {
    new Cover(this, this.coverGroup, x, type);
  }

  spawnSniper(x) {
    this.snipers.push(new Sniper(this, this.enemyGroup, x));
  }

  // 地上的可撿物品：補血包（受傷時才撿）、金幣（戰術卡「戰利品」掉落）
  spawnPickup(x, type, amount, scale = 1) {
    const y = this.groundAt(x);
    const item = this.add.image(x, y - 4, type === 'coin' ? 'coin' : 'medkit').setOrigin(0.5, 1).setDepth(3).setScale(scale);
    item.setData({ type, amount });
    this.tweens.add({ targets: item, y: y - 12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.pickups.push(item);
  }

  spawnHealthPack(x) {
    this.spawnPickup(x, 'medkit', HEALTH_PACK.amount);
  }

  // ---------- 戰區天氣 ----------

  // 雪地一直飄雪；沙漠週期性颳沙塵暴。第一次來到新戰區時說明環境特性
  setupWeather() {
    const { feature, tip, id } = this.theater;
    this.storm = null;
    if (feature === 'ice') {
      this.add.particles(0, 0, 'flake', {
        x: { min: 0, max: GAME_W + 200 }, y: -10, lifespan: 7000,
        speedY: { min: 40, max: 90 }, speedX: { min: -50, max: -15 },
        scale: { min: 0.35, max: 1 }, alpha: { min: 0.4, max: 0.9 }, frequency: 60,
      }).setScrollFactor(0).setDepth(25);
    }
    if (feature === 'sandstorm') {
      const fx = THEATER_FX.sandstorm;
      const overlay = this.add.graphics().setScrollFactor(0).setDepth(24).setAlpha(0);
      overlay.fillGradientStyle(0xc98b4f, 0xc98b4f, 0xc98b4f, 0xc98b4f, 0.12, 0.72, 0.12, 0.72);
      overlay.fillRect(0, 0, GAME_W, GROUND_Y + 60);
      const sand = this.add.particles(0, 0, 'sand', {
        x: GAME_W + 20, y: { min: 0, max: GROUND_Y + 40 }, lifespan: 1600,
        speedX: { min: -950, max: -600 }, speedY: { min: -20, max: 40 },
        alpha: { start: 0.8, end: 0 }, frequency: 12, emitting: false,
      }).setScrollFactor(0).setDepth(25);
      this.storm = { active: false, nextAt: Phaser.Math.Between(...fx.firstAt), endAt: 0, overlay, sand };
    }
    const seen = this.registry.get('seenTheaters') || [];
    if (tip && !seen.includes(id)) {
      this.registry.set('seenTheaters', [...seen, id]);
      this.queueTip(tip, '#ffd60a', 3500);
    }
  }

  updateWeather() {
    const s = this.storm;
    if (!s) return;
    const fx = THEATER_FX.sandstorm;
    if (!s.active && this.elapsed >= s.nextAt) {
      s.active = true;
      s.endAt = this.elapsed + fx.durationMs;
      s.sand.start();
      this.tweens.add({ targets: s.overlay, alpha: 1, duration: 900 });
      this.queueTip('沙塵暴來襲！看不清楚，但敵人也瞄不準', '#e9c46a', 2200);
    } else if (s.active && this.elapsed >= s.endAt) {
      s.active = false;
      s.nextAt = this.elapsed + Phaser.Math.Between(...fx.every);
      s.sand.stop();
      this.tweens.add({ targets: s.overlay, alpha: 0, duration: 1200 });
    }
  }

  // ---------- 空投補給與戰術卡 ----------

  has(cardId) {
    return this.perks.has(cardId);
  }

  // 一半機率在 40% 路程前空投補給箱
  setupSupply() {
    this.supply = Math.random() < SUPPLY.chance
      ? { x: this.startX + this.mission.length * PX_PER_METER * SUPPLY.atProgress, state: 'waiting' }
      : null;
  }

  updateSupply() {
    const s = this.supply;
    if (!s) return;
    // 玩家接近時開始空投，落點在畫面右側，走過去就能看到它落地
    if (s.state === 'waiting' && this.player.x >= s.x - 520) this.dropSupply();
    // 走到箱子旁邊就打開（落地前已經走過頭也算）
    if (s.state === 'landed' && this.player.x > s.x - 34) this.openSupply();
  }

  dropSupply() {
    const s = this.supply;
    s.state = 'falling';
    const groundY = this.groundAt(s.x);
    s.crate = this.add.image(s.x, -10, 'supply').setOrigin(0.5, 1).setDepth(6);
    s.chute = this.add.image(s.x, -40, 'parachute').setOrigin(0.5, 1).setDepth(6);
    this.tweens.add({ targets: s.crate, y: groundY, duration: 2200, ease: 'Sine.easeIn' });
    this.tweens.add({
      targets: s.chute, y: groundY - 30, duration: 2200, ease: 'Sine.easeIn',
      onComplete: () => {
        this.tweens.add({ targets: s.chute, alpha: 0, x: s.x + 40, duration: 500, onComplete: () => s.chute.destroy() });
        s.glow = this.add.circle(s.x, groundY - 15, 30, 0xffd60a, 0.25).setDepth(5);
        this.tweens.add({ targets: s.glow, scale: 1.6, alpha: 0, duration: 900, repeat: -1 });
        s.state = 'landed';
      },
    });
    this.sfx('supply');
    this.queueTip('補給空投！走過去打開，選一張戰術卡', '#4cc9f0', 3000);
  }

  openSupply() {
    const s = this.supply;
    s.state = 'opened';
    this.tweens.killTweensOf(s.glow);
    s.glow.destroy();
    this.tweens.add({ targets: s.crate, alpha: 0, scale: 1.4, duration: 250, onComplete: () => s.crate.destroy() });
    this.sfx('pickup');
    this.scene.launch('Cards', { cards: this.drawCards(SUPPLY.cardsShown) });
    this.scene.pause();
  }

  // 依稀有度權重抽卡，不重複
  drawCards(count) {
    const pool = CARDS.filter((c) => !this.has(c.id));
    const picked = [];
    while (picked.length < count && pool.length) {
      const rarities = [...new Set(pool.map((c) => c.rarity))];
      const total = rarities.reduce((sum, r) => sum + RARITY[r].weight, 0);
      let roll = Math.random() * total;
      const rarity = rarities.find((r) => (roll -= RARITY[r].weight) < 0) || rarities[0];
      const options = pool.filter((c) => c.rarity === rarity);
      const card = Phaser.Utils.Array.GetRandom(options);
      picked.push(card);
      pool.splice(pool.indexOf(card), 1);
    }
    return picked;
  }

  // 套用戰術卡：一次性的效果在這裡處理，持續效果在各處用 has() 判斷
  applyCard(card) {
    this.perks.add(card.id);
    const p = this.player;
    const shield = p.shield;
    switch (card.id) {
      case 'fastReload': p.reloadMul = CV.reloadMul; break;
      case 'bigMag': p.magSize = Math.round(p.weapon.magSize * CV.magMul); p.ammo = p.magSize; break;
      case 'parryWindow': shield.parryWindowMs *= CV.parryWindowMul; break;
      case 'sturdy':
        shield.max += CV.sturdyShield;
        shield.durability += CV.sturdyShield;
        shield.regenMul = CV.sturdyRegenMul;
        break;
      case 'speed': p.speed *= CV.speedMul; break;
      case 'fieldMedic': p.maxHp += CV.fieldMedicHp; p.hp = p.maxHp; break;
      case 'glass': p.maxHp -= CV.glassHp; p.hp = Math.min(p.hp, p.maxHp); break;
      default: break;
    }
    this.floatText(p.x, p.y - 100, card.name, Phaser.Display.Color.IntegerToColor(RARITY[card.rarity].color).rgba);
  }

  // ---------- 子彈 ----------

  // 自動瞄準前方射程內最近的敵人（含塔上的狙擊手），有高低差時子彈會斜著飛；沒有目標就水平射擊
  aimAngle(x, y, weapon) {
    const target = this.findTarget(x, weapon.range);
    if (!target) return 0;
    return Phaser.Math.Clamp(Math.atan2(target.chestY - y, target.x - x), -1.1, 0.9);
  }

  // 前方射程內最近的敵人（含狙擊手），支援無人機也用來判斷要不要開火
  findTarget(x, range) {
    let target = null;
    for (const e of [...this.enemies, ...this.snipers]) {
      if (!e.alive) continue;
      const dx = e.x - x;
      if (dx <= 10 || dx > range + 40) continue;
      if (!target || e.x < target.x) target = e;
    }
    return target;
  }

  // 開火：戰術卡「雙發子彈」會上下各射一發（每發傷害打折）
  firePlayerBullet(x, y, weapon) {
    this.sfx(weapon.sound);
    this.muzzleFlash(x, y, 0xffd60a);
    if (this.has('double')) {
      this.spawnPlayerShot(x, y - CV.doubleOffsetY, weapon, CV.doubleDamageMul);
      this.spawnPlayerShot(x, y + CV.doubleOffsetY, weapon, CV.doubleDamageMul);
    } else {
      this.spawnPlayerShot(x, y, weapon, 1);
    }
  }

  // 霰彈槍一次射出多發，呈上下扇形散開
  spawnPlayerShot(x, y, weapon, damageMul) {
    const base = this.aimAngle(x, y, weapon);
    const count = weapon.pellets || 1;
    // 可貫穿幾個敵人：狙擊槍無限、戰術卡「穿甲彈」一個
    const pierceLeft = weapon.pierce ? Infinity : this.has('pierce') ? 1 : 0;
    // 同一發霰彈共用：記錄每個敵人被打中幾顆（震開盾兵）、已擊退過誰
    const volley = weapon.stagger ? { shieldHits: new Map(), knocked: new Set() } : null;
    for (let i = 0; i < count; i++) {
      const angle = base + (count > 1 ? Phaser.Math.DegToRad(weapon.spread * (i / (count - 1) - 0.5)) : 0);
      const b = this.playerBullets.create(x, y, weapon.texture || 'pbullet').setRotation(angle);
      b.setData({
        damage: weapon.damage * damageMul,
        originX: x,
        maxX: x + weapon.range,
        pierceLeft,
        armorPierce: !!weapon.pierce, // 能打穿盾兵的盾（只有狙擊槍）
        explosive: weapon.explosive || null,
        closeRange: weapon.closeRange || null,
        stagger: weapon.stagger || null,
        volley,
        hitRefs: new Set(), // 貫穿彈已經打過的目標，避免同一個目標每幀重複受傷
      });
      b.setVelocity(Math.cos(angle) * weapon.bulletSpeed, Math.sin(angle) * weapon.bulletSpeed);
    }
  }

  // 敵人子彈瞄準玩家胸口，站在高處就會往下打
  // heavy：Boss 的重砲，傷害高、耗盾多、飛得慢
  fireEnemyBullet(x, y, def, heavy = null) {
    const b = this.enemyBullets.create(x, y, heavy ? 'heavy' : 'ebullet');
    const angle = Math.atan2(this.player.chestY - y, this.player.x - x);
    const speed = heavy ? heavy.speed : def.bulletSpeed;
    if (heavy) {
      b.setData({ damage: heavy.damage, shieldCost: heavy.shieldCost, originX: x });
      this.sfx('heavyShot');
    } else {
      b.setData({ damage: def.bulletDamage, shieldCost: def.shieldCost, originX: x });
      this.sfx('enemyShot');
    }
    b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.muzzleFlash(x, y, 0xff7b00);
  }

  // 擲彈兵丟手榴彈：拋物線飛向玩家（稍微預判移動），落點先畫紅圈
  throwGrenade(enemy) {
    const d = enemy.def;
    const T = (d.flightMs / 1000) * (this.has('hawkEye') ? CV.hawkEyeGrenadeMul : 1);
    const p = this.player;
    const tx = p.x + p.sprite.body.velocity.x * T * 0.6;
    const ty = this.groundAt(tx);
    const sx = enemy.x - 20;
    const sy = enemy.sprite.y - 50;
    const gr = this.grenades.create(sx, sy, 'grenade');
    gr.body.setGravityY(d.gravity);
    gr.setVelocity((tx - sx) / T, (ty - sy - 0.5 * d.gravity * T * T) / T);
    gr.setAngularVelocity(-420);
    const mark = this.add.ellipse(tx, ty - 2, d.blastRadius * 2, 14, 0xff2d2d, 0.2)
      .setStrokeStyle(2, 0xff2d2d, 0.9).setDepth(3);
    this.tweens.add({ targets: mark, alpha: 0.5, duration: 180, yoyo: true, repeat: -1 });
    gr.setData({ def: d, mark });
    this.sfx('throw');
  }

  // 手榴彈落地爆炸：範圍內的玩家受傷；舉著對空盾就擋得住，正面盾擋不住
  explodeGrenade(gr) {
    const { x } = gr;
    const d = gr.getData('def');
    const y = this.groundAt(x);
    this.removeGrenade(gr);
    const blast = this.add.circle(x, y - 10, d.blastRadius, 0xff7b00, 0.55).setDepth(20).setScale(0.3);
    this.tweens.add({ targets: blast, scale: 1, alpha: 0, duration: 280, onComplete: () => blast.destroy() });
    this.cameras.main.shake(120, 0.008);
    this.sfx('explosion');
    if (this.over || Math.abs(this.player.x - x) > d.blastRadius + 10) return;
    const shield = this.player.shield;
    if (shield.mode !== 'air') {
      this.damagePlayer(d.damage);
    } else if (shield.canParry(this.time.now)) {
      this.parryEffect(this.player.x, this.player.y - 66);
    } else {
      this.blockWithShield(d.shieldCost, this.player.x, this.player.y - 66);
    }
  }

  // 對空盾在空中擋下手榴彈（剛舉起時一樣算完美格擋）
  onGrenadeBlocked(gr) {
    if (!gr.active || this.over) return;
    const { x, y } = gr;
    const d = gr.getData('def');
    this.removeGrenade(gr);
    const puff = this.add.circle(x, y, 22, 0xff7b00, 0.6).setDepth(20);
    this.tweens.add({ targets: puff, scale: 1.8, alpha: 0, duration: 200, onComplete: () => puff.destroy() });
    if (this.player.shield.canParry(this.time.now)) this.parryEffect(x, y);
    else this.blockWithShield(d.shieldCost, x, y);
  }

  removeGrenade(gr) {
    const mark = gr.getData('mark');
    this.tweens.killTweensOf(mark);
    mark.destroy();
    gr.destroy();
  }

  // 衝鋒兵貼身攻擊：盾牌擋不住
  meleeHit(enemy) {
    if (this.over) return;
    this.spark(this.player.x + 14, this.player.y - 30, 0xff4d6d);
    this.sfx('melee');
    this.damagePlayer(enemy.def.meleeDamage);
  }

  // 空中子彈垂直落下，地上先顯示紅色落點
  // opts：無人機炸彈用，可以斜著飛（vx）、換貼圖和傷害
  fireAirBullet(x, y, opts = {}) {
    const {
      damage = AIR_RAID.damage, shieldCost = AIR_RAID.shieldCost, vx = 0, vy = AIR_RAID.bulletSpeed,
      texture = 'abullet', sound = 'airShot', markW = 18,
    } = opts;
    this.sfx(sound);
    const b = this.airBullets.create(x, y, texture);
    b.setData({ damage, shieldCost, originX: -Infinity });
    b.setVelocity(vx, vy);
    // 地上先顯示落點（斜著飛的炸彈用目前高度估計）
    const fallSec = (this.groundAt(x) - y) / vy;
    const landX = x + vx * fallSec;
    const mark = this.add.ellipse(landX, this.groundAt(landX) - 2, markW, 6, 0xff2d2d, 0.7).setDepth(3);
    this.tweens.add({ targets: mark, alpha: 0, duration: fallSec * 1000, onComplete: () => mark.destroy() });
  }

  // 無人機投彈：朝玩家頭頂斜著丟下去，要用對空盾擋
  dropDroneBomb(drone) {
    const d = drone.def;
    const sx = drone.x - 6;
    const sy = drone.sprite.y;
    const p = this.player;
    const tx = p.x + p.sprite.body.velocity.x * 0.35; // 稍微預判玩家移動
    const ty = p.y - 60;
    const angle = Math.atan2(ty - sy, tx - sx);
    this.fireAirBullet(sx, sy, {
      damage: d.bombDamage, shieldCost: d.shieldCost, texture: 'dbomb', sound: 'throw', markW: 30,
      vx: Math.cos(angle) * d.bombSpeed, vy: Math.sin(angle) * d.bombSpeed,
    });
  }

  sniperShot(sniper, lockX, lockY) {
    const tracer = this.add.graphics().setDepth(9);
    tracer.lineStyle(3, 0xffffff, 1).lineBetween(sniper.gunX, sniper.gunY, lockX, lockY);
    this.tweens.add({ targets: tracer, alpha: 0, duration: 200, onComplete: () => tracer.destroy() });
    this.sfx('sniperShot');

    const p = this.player;
    if (Math.abs(p.x - lockX) > SNIPER.hitRadius) {
      this.spark(lockX, this.groundAt(lockX) - 4, COLORS.laser);
      this.floatText(p.x, p.y - 90, '閃過！', '#8ecae6');
      return;
    }
    if (p.shield.mode === 'front') {
      if (p.shield.canParry(this.time.now)) {
        // 完美格擋狙擊：子彈原路彈回塔上
        this.parryEffect(p.x + 26, p.y - 30);
        const back = this.add.graphics().setDepth(9);
        back.lineStyle(3, 0x4cc9f0, 1).lineBetween(p.x + 26, p.y - 30, sniper.x, sniper.chestY);
        this.tweens.add({ targets: back, alpha: 0, duration: 250, onComplete: () => back.destroy() });
        if (sniper.hit(PARRY.sniperDamage * this.reflectMul())) this.onKill(sniper);
        return;
      }
      this.blockWithShield(SNIPER.shieldCost, p.x + 26, p.y - 30);
      return;
    }
    this.spark(p.x, p.y - 30, COLORS.laser);
    this.damagePlayer(SNIPER.damage);
  }

  // ---------- 碰撞 ----------

  onCoverHit(bullet, coverSprite) {
    if (!bullet.active || !coverSprite.active) return;
    // 射擊者就躲在這個掩體後面：子彈越過掩體
    if (Math.abs(coverSprite.x - bullet.getData('originX')) < COVER_SHOOT_OVER) return;
    const cover = coverSprite.getData('ref');
    if (bullet.getData('explosive')) {
      this.explode(bullet);
      return;
    }
    const damage = bullet.getData('damage');
    this.spark(bullet.x, bullet.y, 0xd4a373);
    this.sfx('cover');
    bullet.destroy();
    cover.hit(damage);
  }

  // 每顆子彈對每個敵人只算一次傷害，回傳這次是否為第一次打到
  firstHit(bullet, target) {
    const refs = bullet.getData('hitRefs');
    if (refs.has(target)) return false;
    refs.add(target);
    return true;
  }

  onShieldBlock(bullet) {
    if (!bullet.active || this.over) return;
    if (this.player.shield.canParry(this.time.now)) {
      this.parry(bullet);
      return;
    }
    const cost = bullet.getData('shieldCost');
    const { x, y } = bullet;
    bullet.destroy();
    this.blockWithShield(cost, x, y);
  }

  // 完美格擋：不扣盾值；正面子彈原路反彈回去打敵人（對空的子彈只擋掉）
  parry(bullet) {
    const { x, y } = bullet;
    const { x: vx, y: vy } = bullet.body.velocity;
    const damage = Math.max(PARRY.minReflectDamage, bullet.getData('damage') * PARRY.reflectDamageMul) * this.reflectMul();
    const texture = bullet.texture.key;
    bullet.destroy();
    this.parryEffect(x, y);
    if (texture === 'abullet') return;

    const b = this.playerBullets.create(x + 8, y, texture === 'heavy' ? 'heavy' : 'pbullet').setTint(0x4cc9f0);
    b.setData({ damage, originX: x, maxX: x + 900, pierceLeft: 0, armorPierce: false, explosive: null, hitRefs: new Set() });
    b.setVelocity(-vx * 1.5, -vy * 1.5);
    b.setRotation(Math.atan2(-vy, -vx));
  }

  reflectMul() {
    return this.has('reflect') ? CV.reflectMul : 1;
  }

  parryEffect(x, y) {
    this.counters.parries++;
    this.lifesteal();
    this.sfx('parry');
    vibrate(20);
    const ring = this.add.circle(x, y, 10).setStrokeStyle(3, 0x4cc9f0).setDepth(20);
    this.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 250, onComplete: () => ring.destroy() });
    this.floatText(this.player.x, this.player.y - 90, '完美格擋！', '#4cc9f0');
  }

  // 戰術卡「吸血盾」：每次擋下攻擊回血
  lifesteal() {
    if (!this.has('lifesteal') || this.player.hp >= this.player.maxHp) return;
    this.player.heal(CV.lifesteal);
    this.damageNumber(this.player.x - 20, this.player.y - 70, `+${CV.lifesteal}`, '#2dc653');
  }

  blockWithShield(cost, x, y) {
    this.counters.blocks++;
    this.lifesteal();
    this.spark(x, y, 0x4cc9f0);
    if (this.player.shield.absorb(cost)) {
      if (!this.has('noStun')) this.player.stun(this.time.now);
      this.cameras.main.shake(200, 0.01);
      this.floatText(this.player.x, this.player.y - 90, '破盾！', '#ffd60a');
      this.sfx('shieldBreak');
      vibrate(90);
    } else {
      this.sfx('block');
    }
  }

  onPlayerHit(bullet) {
    if (!bullet.active || this.over) return;
    const damage = bullet.getData('damage');
    bullet.destroy();
    this.damagePlayer(damage);
  }

  // 所有玩家受到的傷害都經過這裡，套用難度倍率與戰術卡「賭徒」
  damagePlayer(rawAmount) {
    if (this.over) return;
    const gambler = this.has('gambler') ? CV.gamblerDamageMul : 1;
    const amount = Math.max(1, Math.round(rawAmount * this.mode.damageMul * gambler));
    this.cameras.main.shake(100, 0.006);
    this.sfx('hurt');
    vibrate(40);
    this.damageNumber(this.player.x, this.player.y - 70, amount, '#ff4d6d');
    if (this.player.takeDamage(amount)) this.finish(false);
  }

  onEnemyHit(bullet, enemySprite) {
    if (!bullet.active || !enemySprite.active) return;
    const enemy = enemySprite.getData('ref');
    if (!enemy || !enemy.alive) return;
    if (bullet.getData('explosive')) {
      this.explode(bullet);
      return;
    }
    // 盾兵舉著盾：一般子彈被彈開，只有狙擊槍打得穿
    if (enemy.guarding && !bullet.getData('armorPierce')) {
      this.spark(bullet.x, bullet.y, 0xdee2e6);
      this.sfx('ting');
      this.staggerShield(bullet, enemy);
      bullet.destroy();
      return;
    }
    // 同一顆子彈對同一個敵人只算一次（貫穿彈穿過時會連續好幾幀重疊）
    if (!this.firstHit(bullet, enemy)) return;
    let damage = bullet.getData('damage');
    // 霰彈槍近距離命中：傷害加成
    const close = bullet.getData('closeRange');
    if (close && Math.abs(bullet.x - bullet.getData('originX')) <= close.within) damage *= close.mul;
    this.knockbackCharger(bullet, enemy); // 要在子彈銷毀前讀它的資料
    const pierceLeft = bullet.getData('pierceLeft');
    if (pierceLeft > 0) {
      // 貫穿彈：打中後繼續飛，可貫穿的數量減一
      bullet.setData('pierceLeft', pierceLeft - 1);
    } else {
      bullet.destroy();
    }
    this.spark(bullet.x, bullet.y, 0xffd60a);
    this.damageEnemy(enemy, damage);
  }

  // 霰彈槍：同一發有好幾顆打在盾兵的盾上，就把盾震開一下
  staggerShield(bullet, enemy) {
    const st = bullet.getData('stagger');
    const volley = bullet.getData('volley');
    if (!st || !volley) return;
    const hits = (volley.shieldHits.get(enemy) || 0) + 1;
    volley.shieldHits.set(enemy, hits);
    if (hits !== st.pellets) return;
    enemy.openUntil = this.time.now + st.openMs;
    this.floatText(enemy.x, enemy.sprite.y - 80, '震開！', '#4cc9f0');
  }

  // 霰彈槍：把衝鋒兵往後打退，並讓他停頓一下（同一發只退一次）
  knockbackCharger(bullet, enemy) {
    const st = bullet.getData('stagger');
    const volley = bullet.getData('volley');
    if (!st || !volley || enemy.def.ai !== 'charger' || volley.knocked.has(enemy)) return;
    volley.knocked.add(enemy);
    enemy.knockback(st.knockback, st.chargerStunMs);
  }

  // 玩家造成的傷害倍率：戰術卡「玻璃大砲」、「狂戰士」
  damageMul() {
    let mul = 1;
    if (this.has('glass')) mul *= CV.glassDamageMul;
    if (this.has('berserk') && this.player.hp < this.player.maxHp * CV.berserkHpRatio) mul *= CV.berserkMul;
    return mul;
  }

  // 玩家打到敵人都經過這裡：套用傷害倍率與暴擊
  damageEnemy(enemy, baseDamage) {
    const crit = this.has('crit') && Math.random() < CV.critChance;
    const damage = baseDamage * this.damageMul() * (crit ? 2 : 1);
    this.damageNumber(enemy.x, enemy.chestY - 30, crit ? `暴擊 ${Math.round(damage)}` : damage, crit ? '#ff4d6d' : '#ffd60a');
    if (!enemy.hit(damage)) {
      this.sfx('enemyHit');
      return;
    }
    this.onKill(enemy);
  }

  // 擊殺結算：地面敵人、狙擊手、Boss 共用
  onKill(enemy) {
    this.sfx('enemyDie');
    this.killCoins += enemy.def.coins;
    this.enemies = this.enemies.filter((e) => e !== enemy);
    if (enemy.def.vehicle) {
      this.onTruckDestroyed(enemy);
      return;
    }
    this.kills++;
    this.countStreak();
    // 戰術卡掉落物：掉在敵人腳下（狙擊手掉在塔下）
    if (this.has('medkitDrop') && Math.random() < CV.medkitChance) this.spawnPickup(enemy.x, 'medkit', CV.medkitAmount, 0.75);
    if (this.has('coinDrop') && Math.random() < CV.coinChance) this.spawnPickup(enemy.x + 12, 'coin', CV.coinAmount);
    if (enemy.def.boss) {
      // Boss 倒下：連續爆炸
      this.sfx('explosion');
      this.cameras.main.shake(500, 0.015);
      for (let i = 0; i < 4; i++) {
        this.time.delayedCall(i * 150, () => this.spark(enemy.x + Phaser.Math.Between(-30, 30), enemy.sprite.y - Phaser.Math.Between(10, 80), 0xff7b00));
      }
      this.banner(`擊倒${enemy.def.name}！+${enemy.def.coins} 金幣`, '#ffd60a', 2500, 200);
    }
  }

  // 連殺：短時間內連續擊殺有額外金幣
  countStreak() {
    const now = this.time.now;
    this.streak = now - this.lastKillAt <= STREAK.windowMs ? this.streak + 1 : 1;
    this.lastKillAt = now;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    if (this.streak < 2) return;
    const bonus = STREAK.coinPer * (this.streak - 1);
    this.killCoins += bonus;
    this.sfx('streak');
    this.floatText(this.player.x + 40, this.player.y - 125, `${this.streak} 連殺！+${bonus}`, '#ff7b00');
  }

  // 火箭爆炸：範圍內的敵人受傷，掩體受到加倍傷害
  explode(bullet) {
    const { x, y } = bullet;
    const { radius, coverMul } = bullet.getData('explosive');
    const damage = bullet.getData('damage');
    bullet.destroy();

    const blast = this.add.circle(x, y, radius, 0xff7b00, 0.6).setDepth(20).setScale(0.3);
    this.tweens.add({ targets: blast, scale: 1, alpha: 0, duration: 300, onComplete: () => blast.destroy() });
    this.cameras.main.shake(150, 0.012);
    this.sfx('explosion');

    for (const e of this.enemies.slice()) {
      if (e.alive && Math.abs(e.x - x) <= radius) this.damageEnemy(e, damage);
    }
    // 炸到狙擊塔：連塔帶人一起倒
    for (const s of this.snipers) {
      if (s.alive && Math.abs(s.x - x) <= radius && s.topple()) {
        this.floatText(s.x, s.baseY - 160, '炸倒高塔！', '#ff7b00');
        this.onKill(s);
      }
    }
    for (const c of this.coverGroup.getChildren().slice()) {
      if (c.body.enable && Math.abs(c.x - x) <= radius) c.getData('ref').hit(damage * coverMul);
    }
  }

  checkPickups() {
    const p = this.player;
    this.pickups = this.pickups.filter((item) => {
      if (Math.abs(item.x - p.x) > 26) return true;
      const { type, amount } = item.data.values;
      if (type === 'medkit') {
        if (p.hp >= p.maxHp) return true; // 滿血時不撿，留著待會用
        p.heal(amount);
        this.floatText(p.x, p.y - 90, `+${amount}`, '#2dc653');
        this.sfx('pickup');
      } else {
        this.killCoins += amount;
        this.floatText(p.x, p.y - 90, `+${amount} 金幣`, '#ffd60a');
        this.sfx('coin');
      }
      this.tweens.killTweensOf(item);
      item.destroy();
      return false;
    });
  }

  // 子彈打到山坡就停下（地形可以當掩護）；玩家子彈超過射程就消失；其他東西離開畫面左側就清掉
  cleanup() {
    const left = this.cameras.main.scrollX - 40;
    const right = left + GAME_W + 80;
    for (const b of this.playerBullets.getChildren().slice()) {
      const hitGround = b.y >= this.groundAt(b.x);
      if (b.x > b.getData('maxX') || hitGround) {
        // 火箭飛到射程盡頭或撞到地面也會爆炸
        if (b.getData('explosive')) this.explode(b);
        else {
          if (hitGround) this.spark(b.x, b.y, 0x8d99ae);
          b.destroy();
        }
      } else if (b.y < 0) {
        b.destroy();
      }
    }
    for (const b of this.enemyBullets.getChildren().slice()) {
      if (b.y >= this.groundAt(b.x)) {
        this.spark(b.x, b.y, 0x8d99ae);
        b.destroy();
      } else if (b.x < left || b.x > right || b.y < 0) {
        b.destroy();
      }
    }
    for (const gr of this.grenades.getChildren().slice()) {
      if (gr.body.velocity.y > 0 && gr.y >= this.groundAt(gr.x) - 4) this.explodeGrenade(gr);
    }
    for (const b of this.airBullets.getChildren().slice()) {
      const groundY = this.groundAt(b.x);
      if (b.y >= groundY) {
        this.spark(b.x, groundY - 2, 0xff4d6d);
        b.destroy();
      }
    }
    for (const c of this.coverGroup.getChildren().slice()) {
      if (c.x < left - 200) c.destroy();
    }
    this.snipers = this.snipers.filter((s) => {
      if (s.x > left - 200) return true;
      s.destroy();
      return false;
    });
    this.pickups = this.pickups.filter((kit) => {
      if (kit.x > left - 100) return true;
      this.tweens.killTweensOf(kit);
      kit.destroy();
      return false;
    });
  }

  // ---------- 特效 ----------

  spark(x, y, color) {
    const c = this.add.circle(x, y, 6, color).setDepth(20);
    this.tweens.add({ targets: c, scale: 2.5, alpha: 0, duration: 180, onComplete: () => c.destroy() });
  }

  // 槍口火光
  muzzleFlash(x, y, color) {
    const f = this.add.circle(x, y, 7, color, 0.9).setDepth(20);
    this.tweens.add({ targets: f, scale: 1.6, alpha: 0, duration: 70, onComplete: () => f.destroy() });
  }

  // 傷害數字：小字往上飄，位置稍微錯開避免連射時疊在一起
  damageNumber(x, y, amount, color) {
    const label = typeof amount === 'number' ? `${Math.round(amount)}` : amount;
    const t = this.add.text(x + Phaser.Math.Between(-10, 10), y, label, {
      fontFamily: FONT, fontSize: '18px', color, fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: 450, onComplete: () => t.destroy() });
  }

  floatText(x, y, msg, color) {
    const t = this.add.text(x, y, msg, {
      fontFamily: FONT, fontSize: '28px', color, fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  // 畫面中央的大字提示，duration 為 0 時不會自動消失
  banner(msg, color, duration, y = 150) {
    const t = this.add.text(GAME_W / 2, y, msg, {
      fontFamily: FONT, fontSize: '30px', color, fontStyle: 'bold', stroke: '#000000', strokeThickness: 5, align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(160);
    if (duration) this.tweens.add({ targets: t, alpha: 0, delay: duration, duration: 400, onComplete: () => t.destroy() });
    return t;
  }

  // ---------- 結算 ----------

  // 目前累積的金幣（尚未套用加成與陣亡減半）
  runCoins() {
    return Math.floor(this.meters / COINS.perMeters) + this.killCoins;
  }

  calcReward(victory) {
    const distance = Math.floor(this.meters / COINS.perMeters);
    const bonus = victory ? COINS.missionBonus(this.missionNo) : 0;
    const subtotal = distance + this.killCoins + bonus;
    const gambler = this.has('gambler') ? CV.gamblerCoinMul : 1;
    const timed = victory && this.objective === 'timed' ? OBJECTIVES.timed.coinMul : 1;
    const mul = this.stats.coinMul * this.mode.coinMul * gambler * timed; // 升級加成 × 難度倍率 × 賭徒 × 限時任務
    const total = Math.round(subtotal * mul * (victory ? 1 : COINS.deathMul));
    return { distance, kills: this.killCoins, bonus, mul, halved: !victory, total };
  }

  // retreat：從暫停選單撤退，跟陣亡一樣結算（金幣減半、重打本關）
  // reason 'timeout'：限時任務時間到，同樣算失敗
  finish(victory, retreat = false, reason = null) {
    if (this.over) return;
    this.over = true;
    this.physics.pause();
    this.airRaid.end();
    this.snipers.forEach((s) => s.stop());

    const save = loadSave();
    const totalBefore = save.totalKills;
    const reward = this.calcReward(victory);
    save.totalKills += this.kills;
    save.coins += reward.total;
    if (victory) save.mission = Math.max(save.mission, this.missionNo + 1); // 重打舊關卡不會讓進度倒退
    if (victory && this.missionNo === 1) save.tutorialDone = true;
    const stars = this.calcStars(victory);
    if (stars.count > (save.stars[this.missionNo] || 0)) save.stars[this.missionNo] = stars.count;
    stars.best = save.stars[this.missionNo] || 0;
    writeSave(save);
    if (this.tutorial) this.tutorial.hide();

    this.sfx(victory ? 'victory' : 'defeat');
    if (victory) {
      this.banner(this.objective === 'defend' ? '守住無線電站！任務完成' : '抵達撤離點！任務完成', '#2dc653', 0);
    } else if (reason === 'timeout') {
      this.banner('時間到！直升機已經離開', '#e63946', 0).setFontSize(40);
    } else if (retreat) {
      this.banner('撤退', '#ffd60a', 0).setFontSize(56);
    } else {
      this.player.sprite.setTint(0x555555);
      this.tweens.add({ targets: this.player.sprite, angle: -80, duration: 400 });
      this.banner('陣亡', '#e63946', 0).setFontSize(56);
    }
    this.time.delayedCall(retreat ? 700 : 1300, () => {
      this.scene.start('Result', {
        victory,
        retreat,
        timeout: reason === 'timeout',
        mission: this.missionNo,
        meters: this.meters,
        kills: this.kills,
        totalBefore,
        totalAfter: save.totalKills,
        reward,
        coins: save.coins,
        stars,
        bestStreak: this.bestStreak,
      });
    });
  }

  // 三顆星：完成任務、剩餘生命夠多、限時內完成（沒完成任務就沒有星）
  calcStars(victory) {
    // 守點任務的限時要加上守點時間
    const par = parTime(this.mission.length) + (this.objective === 'defend' ? OBJECTIVES.defend.holdMs / 1000 : 0);
    const timeSec = Math.round(this.elapsed / 1000);
    const earned = victory
      ? [true, this.player.hp / this.player.maxHp >= STARS.hpRatio, timeSec <= par]
      : [false, false, false];
    return { earned, count: earned.filter(Boolean).length, par, timeSec };
  }
}
