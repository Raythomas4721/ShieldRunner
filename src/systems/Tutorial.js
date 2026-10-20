import { GAME_W, FONT } from '../config.js';

// 新手教學：任務 1 在對的時機跳出提示，並用光圈標出要按的按鈕
// 每則提示：after 的提示出現過、且 start 條件成立就顯示；done 條件成立或超過 maxMs 就收起；一次只顯示一則
// done(s, base)：base 是提示出現當下的計數，用來判斷「出現之後」玩家有沒有照做
const STEPS = [
  {
    id: 'move', button: 'move', maxMs: 10000,
    text: '按住左下「前進」往前走，放開就停下',
    start: () => true,
    done: (s) => s.player.x - s.startX > 100,
  },
  {
    id: 'fire', button: 'fire', maxMs: 8000,
    text: '敵人出現！按住「開火」射擊（會自動瞄準）',
    start: (s) => s.enemies.some((e) => e.alive && e.x - s.player.x < 600),
    done: (s) => s.kills > 0,
  },
  {
    id: 'shield', button: 'shield', maxMs: 6000,
    text: '敵人變黃 = 要開槍了！按住「盾牌」擋子彈',
    start: (s) => s.enemies.some((e) => e.aiming),
    done: (s, base) => s.counters.blocks > base.blocks,
  },
  {
    id: 'parry', button: 'shield', maxMs: 6000, after: 'shield',
    text: '技巧：子彈快打到時才舉盾＝完美格擋，不扣盾值還會反彈！',
    start: (s) => s.counters.blocks >= 2,
    done: (s, base) => s.counters.parries > base.parries,
  },
  {
    id: 'cover', maxMs: 4500,
    text: '沙包、木箱擋得住子彈，可以躲在後面開槍',
    start: (s) => s.coverGroup.getChildren().some((c) => c.x > s.player.x && c.x - s.player.x < 400),
    done: () => false,
  },
  {
    id: 'reload', maxMs: 4000,
    text: '子彈打完會自動換彈，右上角可以看剩幾發',
    start: (s) => s.player.reloadUntil > 0 && s.player.ammo === 0,
    done: () => false,
  },
  {
    id: 'medkit', maxMs: 4000,
    text: '白色補血包：受傷時走過去就能撿',
    start: (s) => s.pickups.some((k) => k.x > s.player.x && k.x - s.player.x < 400),
    done: () => false,
  },
];

export default class Tutorial {
  constructor(scene, controls) {
    this.scene = scene;
    this.controls = controls;
    this.shown = new Set();
    this.active = null;
    this.cooldownUntil = 0;
    this.text = scene.add.text(GAME_W / 2, 252, '', {
      fontFamily: FONT, fontSize: '22px', color: '#ffd60a', fontStyle: 'bold',
      backgroundColor: '#000000b0', padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(150).setVisible(false);
    this.ring = scene.add.circle(0, 0, 10).setStrokeStyle(5, 0xffd60a)
      .setScrollFactor(0).setDepth(102).setVisible(false);
  }

  update(time) {
    const s = this.scene;
    if (this.active) {
      const { step, until, base } = this.active;
      if (step.done(s, base) || time > until) {
        this.hide();
        this.cooldownUntil = time + 800;
      } else if (this.ring.visible) {
        this.ring.setScale(1 + 0.12 * Math.sin(time / 110));
      }
      return;
    }
    if (time < this.cooldownUntil) return;
    const next = STEPS.find((st) => !this.shown.has(st.id) && (!st.after || this.shown.has(st.after)) && st.start(s));
    if (next) this.show(next, time);
  }

  show(step, time) {
    this.shown.add(step.id);
    this.active = { step, until: time + step.maxMs, base: { ...this.scene.counters } };
    this.text.setText(step.text).setVisible(true);
    const b = step.button && this.controls.button(step.button);
    if (b) this.ring.setPosition(b.x, b.y).setRadius(b.r + 10).setVisible(true);
  }

  hide() {
    this.active = null;
    this.text.setVisible(false);
    this.ring.setVisible(false);
  }
}
