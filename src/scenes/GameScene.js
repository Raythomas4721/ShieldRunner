import {
  GAME_W, PX_PER_METER, PLAYER_SCREEN_X, FONT, COLORS,
  COVER_SHOOT_OVER, SNIPER, AIR_RAID, HEALTH_PACK, WEAPONS, COINS,
  missionConfig, raidPoints, difficultyAt, playerStats,
} from '../config.js';
import Terrain from '../systems/Terrain.js';
import Background from '../systems/Background.js';
import { loadSave, writeSave } from '../save.js';
import Player from '../objects/Player.js';
import Enemy from '../objects/Enemy.js';
import Cover from '../objects/Cover.js';
import Sniper from '../objects/Sniper.js';
import Spawner from '../systems/Spawner.js';
import AirRaid from '../systems/AirRaid.js';
import TouchControls from '../systems/TouchControls.js';
import HUD from '../systems/HUD.js';
import { sfx } from '../systems/Sound.js';

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

    this.startX = PLAYER_SCREEN_X;
    this.evacX = this.startX + this.mission.length * PX_PER_METER;
    this.background = new Background(this);
    this.terrain = new Terrain(this, this.startX, this.evacX);
    this.createEvac();

    this.stats = playerStats(this.save.upgrades);
    this.player = new Player(this, this.startX, this.stats, WEAPONS[this.save.equipped] || WEAPONS.pistol);
    this.enemies = [];
    this.boss = null;
    this.tipBusyUntil = 0;
    this.snipers = [];
    this.pickups = [];
    this.enemyGroup = this.physics.add.group();
    this.playerBullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.airBullets = this.physics.add.group();
    this.coverGroup = this.physics.add.group();
    this.kills = 0;
    this.killCoins = 0;
    this.meters = 0;
    this.over = false;

    // 碰撞登記順序 = 判定順序：掩體 → 盾牌 → 身體，同一幀內子彈會先被前面的擋下
    const shield = this.player.shield;
    for (const bullets of [this.enemyBullets, this.playerBullets, this.airBullets]) {
      this.physics.add.overlap(bullets, this.coverGroup, (b, c) => this.onCoverHit(b, c));
    }
    this.physics.add.overlap(shield.front, this.enemyBullets, (_s, b) => this.onShieldBlock(b));
    this.physics.add.overlap(shield.air, this.airBullets, (_s, b) => this.onShieldBlock(b));
    this.physics.add.overlap(this.player.sprite, this.enemyBullets, (_p, b) => this.onPlayerHit(b));
    this.physics.add.overlap(this.player.sprite, this.airBullets, (_p, b) => this.onPlayerHit(b));
    this.physics.add.overlap(this.playerBullets, this.enemyGroup, (b, e) => this.onEnemyHit(b, e));

    this.spawner = new Spawner(this, this.startX, this.evacX, this.mission);
    this.airRaid = new AirRaid(this);
    this.raidPoints = raidPoints(this.mission.raids);
    this.raidIndex = 0;
    this.controls = new TouchControls(this);
    this.hud = new HUD(this);
    this.banner(`任務 ${this.mission.number}：前進 ${this.mission.length} 公尺，抵達撤離點`, '#ffffff', 2500);

    // 物理更新後再移動鏡頭，避免畫面延遲一幀
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncCamera, this);
    });
  }

  update(time, delta) {
    if (this.over) return;

    const input = this.controls.read();
    let blockX = null;
    for (const e of this.enemies) {
      if (e.alive && e.x > this.player.x && (blockX === null || e.x - 70 < blockX)) blockX = e.x - 70;
    }
    this.player.update(time, delta, input, blockX);

    this.meters = Phaser.Math.Clamp(Math.floor((this.player.x - this.startX) / PX_PER_METER), 0, this.mission.length);
    const progress = this.meters / this.mission.length;
    const difficulty = difficultyAt(this.mission, progress);
    this.spawner.update(this.player.x, difficulty);
    for (const e of this.enemies) e.update(time, this.player.x, difficulty);
    for (const s of this.snipers) s.update(time, this.player);

    if (!this.airRaid.active && this.raidIndex < this.raidPoints.length && progress >= this.raidPoints[this.raidIndex]) {
      this.raidIndex++;
      this.airRaid.start(time);
    }
    this.airRaid.update(time);

    this.checkPickups();
    this.cleanup();
    this.hud.update(this, time);

    if (this.player.x >= this.evacX) this.finish(true);
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

  createEvac() {
    const y = this.groundAt(this.evacX);
    this.add.image(this.evacX, y, 'evac').setOrigin(0.15, 1).setDepth(2);
    this.add.text(this.evacX + 10, y - 140, '撤離點', {
      fontFamily: FONT, fontSize: '22px', color: '#2dc653', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);
    const beacon = this.add.circle(this.evacX, y - 4, 30, 0x2dc653, 0.35).setDepth(1);
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
    this.snipers.push(new Sniper(this, x));
  }

  spawnHealthPack(x) {
    const y = this.groundAt(x);
    const kit = this.add.image(x, y - 4, 'medkit').setOrigin(0.5, 1).setDepth(3);
    this.tweens.add({ targets: kit, y: y - 12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.pickups.push(kit);
  }

  // ---------- 子彈 ----------

  // 自動瞄準前方射程內最近的敵人（有高低差時子彈會斜著飛），沒有目標就水平射擊
  aimAngle(x, y, weapon) {
    let target = null;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.x - x;
      if (dx <= 0 || dx > weapon.range + 40) continue;
      if (!target || e.x < target.x) target = e;
    }
    if (!target) return 0;
    return Phaser.Math.Clamp(Math.atan2(target.chestY - y, target.x - x), -0.6, 0.6);
  }

  // 霰彈槍一次射出多發，呈上下扇形散開
  firePlayerBullet(x, y, weapon) {
    this.sfx(weapon.sound);
    const base = this.aimAngle(x, y, weapon);
    const count = weapon.pellets || 1;
    for (let i = 0; i < count; i++) {
      const angle = base + (count > 1 ? Phaser.Math.DegToRad(weapon.spread * (i / (count - 1) - 0.5)) : 0);
      const b = this.playerBullets.create(x, y, weapon.texture || 'pbullet').setRotation(angle);
      b.setData({
        damage: weapon.damage,
        originX: x,
        maxX: x + weapon.range,
        pierce: !!weapon.pierce,
        explosive: weapon.explosive || null,
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
  }

  // 衝鋒兵貼身攻擊：盾牌擋不住
  meleeHit(enemy) {
    if (this.over) return;
    this.spark(this.player.x + 14, this.player.y - 30, 0xff4d6d);
    this.sfx('melee');
    this.damagePlayer(enemy.def.meleeDamage);
  }

  // 空中子彈垂直落下，地上先顯示紅色落點
  fireAirBullet(x, y) {
    this.sfx('airShot');
    const b = this.airBullets.create(x, y, 'abullet');
    b.setData({ damage: AIR_RAID.damage, shieldCost: AIR_RAID.shieldCost, originX: -Infinity });
    b.setVelocityY(AIR_RAID.bulletSpeed);
    const groundY = this.groundAt(x);
    const fallMs = ((groundY - y) / AIR_RAID.bulletSpeed) * 1000;
    const mark = this.add.ellipse(x, groundY - 2, 18, 6, 0xff2d2d, 0.7).setDepth(3);
    this.tweens.add({ targets: mark, alpha: 0, duration: fallMs, onComplete: () => mark.destroy() });
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

  // 貫穿彈對每個敵人只算一次傷害，回傳這次是否為第一次打到
  firstHit(bullet, target) {
    const refs = bullet.getData('hitRefs');
    if (refs.has(target)) return false;
    refs.add(target);
    return true;
  }

  onShieldBlock(bullet) {
    if (!bullet.active || this.over) return;
    const cost = bullet.getData('shieldCost');
    const { x, y } = bullet;
    bullet.destroy();
    this.blockWithShield(cost, x, y);
  }

  blockWithShield(cost, x, y) {
    this.spark(x, y, 0x4cc9f0);
    if (this.player.shield.absorb(cost)) {
      this.player.stun(this.time.now);
      this.cameras.main.shake(200, 0.01);
      this.floatText(this.player.x, this.player.y - 90, '破盾！', '#ffd60a');
      this.sfx('shieldBreak');
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

  damagePlayer(amount) {
    if (this.over) return;
    this.cameras.main.shake(100, 0.006);
    this.sfx('hurt');
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
    const pierce = bullet.getData('pierce');
    // 盾兵舉著盾：一般子彈被彈開，只有貫穿彈打得穿
    if (enemy.guarding && !pierce) {
      this.spark(bullet.x, bullet.y, 0xdee2e6);
      this.sfx('ting');
      bullet.destroy();
      return;
    }
    const damage = bullet.getData('damage');
    if (pierce) {
      if (!this.firstHit(bullet, enemy)) return;
    } else {
      bullet.destroy();
    }
    this.spark(bullet.x, bullet.y, 0xffd60a);
    this.damageEnemy(enemy, damage);
  }

  damageEnemy(enemy, damage) {
    if (!enemy.hit(damage)) {
      this.sfx('enemyHit');
      return;
    }
    this.sfx('enemyDie');
    this.kills++;
    this.killCoins += enemy.def.coins;
    this.enemies = this.enemies.filter((e) => e !== enemy);
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
    for (const c of this.coverGroup.getChildren().slice()) {
      if (c.body.enable && Math.abs(c.x - x) <= radius) c.getData('ref').hit(damage * coverMul);
    }
  }

  checkPickups() {
    const p = this.player;
    if (p.hp >= p.maxHp) return; // 滿血時不撿，留著待會用
    this.pickups = this.pickups.filter((kit) => {
      if (Math.abs(kit.x - p.x) > 26) return true;
      p.heal(HEALTH_PACK.amount);
      this.floatText(p.x, p.y - 90, `+${HEALTH_PACK.amount}`, '#2dc653');
      this.sfx('pickup');
      this.tweens.killTweensOf(kit);
      kit.destroy();
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
    const total = Math.round(subtotal * this.stats.coinMul * (victory ? 1 : COINS.deathMul));
    return { distance, kills: this.killCoins, bonus, mul: this.stats.coinMul, halved: !victory, total };
  }

  finish(victory) {
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
    if (victory) save.mission = this.missionNo + 1;
    writeSave(save);

    this.sfx(victory ? 'victory' : 'defeat');
    if (victory) {
      this.banner('抵達撤離點！任務完成', '#2dc653', 0);
    } else {
      this.player.sprite.setTint(0x555555);
      this.tweens.add({ targets: this.player.sprite, angle: -80, duration: 400 });
      this.banner('陣亡', '#e63946', 0).setFontSize(56);
    }
    this.time.delayedCall(1300, () => {
      this.scene.start('Result', {
        victory,
        mission: this.missionNo,
        meters: this.meters,
        kills: this.kills,
        totalBefore,
        totalAfter: save.totalKills,
        reward,
        coins: save.coins,
      });
    });
  }
}
