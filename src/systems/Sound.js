// 用 Web Audio 即時合成音效：不需要音效檔，離線也能用
// 瀏覽器規定要等玩家第一次點擊或按鍵後才能發聲，所以在那時才建立 AudioContext

let ctx = null;
let master = null;
let noiseBuffer = null;
let enabled = true;

export function initSound() {
  const unlock = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  };
  for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) {
    window.addEventListener(ev, unlock, { passive: true });
  }
}

export function setSoundEnabled(value) {
  enabled = value;
}

// 手機震動（Android 支援；iOS Safari 不支援，會直接略過）
let vibrateEnabled = true;

export function setVibrateEnabled(value) {
  vibrateEnabled = value;
}

export function vibrate(ms) {
  // 瀏覽器規定使用者點過畫面後才能震動
  const activated = !navigator.userActivation || navigator.userActivation.hasBeenActive;
  if (vibrateEnabled && navigator.vibrate && activated) navigator.vibrate(ms);
}

export function sfx(name) {
  if (!enabled || !ctx || ctx.state !== 'running') return;
  const play = SOUNDS[name];
  if (play) play(ctx.currentTime);
}

// 單音：freq 起始頻率，to 結束頻率（滑音），at 延遲秒數
function tone(t0, { freq, to = freq, dur, type = 'square', vol = 0.1, at = 0 }) {
  const t = t0 + at;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// 噪音：槍聲、爆炸；filter 越低聲音越悶
function noise(t0, { dur, vol = 0.2, filter = 2000, at = 0 }) {
  const t = t0 + at;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = filter;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(lp).connect(gain).connect(master);
  src.start(t, Math.random() * 0.25);
  src.stop(t + dur + 0.02);
}

const SOUNDS = {
  // 玩家武器
  pistol: (t) => { noise(t, { dur: 0.08, vol: 0.25, filter: 3000 }); tone(t, { freq: 700, to: 150, dur: 0.06, vol: 0.04 }); },
  smg: (t) => noise(t, { dur: 0.05, vol: 0.16, filter: 2600 }),
  shotgun: (t) => { noise(t, { dur: 0.22, vol: 0.4, filter: 1500 }); tone(t, { freq: 160, to: 60, dur: 0.15, type: 'sine', vol: 0.2 }); },
  rifle: (t) => { noise(t, { dur: 0.16, vol: 0.35, filter: 4500 }); tone(t, { freq: 1500, to: 120, dur: 0.18, vol: 0.05 }); },
  rocket: (t) => { noise(t, { dur: 0.35, vol: 0.25, filter: 900 }); tone(t, { freq: 220, to: 70, dur: 0.3, type: 'sawtooth', vol: 0.08 }); },
  reload: (t) => { tone(t, { freq: 2200, dur: 0.02, vol: 0.06 }); tone(t, { freq: 1600, dur: 0.03, vol: 0.06, at: 0.15 }); },

  // 命中與受傷
  enemyHit: (t) => tone(t, { freq: 320, to: 200, dur: 0.04, vol: 0.05 }),
  enemyDie: (t) => tone(t, { freq: 420, to: 70, dur: 0.22, type: 'sawtooth', vol: 0.08 }),
  ting: (t) => { tone(t, { freq: 2400, dur: 0.08, type: 'triangle', vol: 0.1 }); tone(t, { freq: 3600, dur: 0.05, type: 'sine', vol: 0.05 }); },
  cover: (t) => noise(t, { dur: 0.05, vol: 0.08, filter: 600 }),
  parry: (t) => { tone(t, { freq: 1800, dur: 0.12, type: 'triangle', vol: 0.14 }); tone(t, { freq: 2700, dur: 0.18, type: 'sine', vol: 0.1, at: 0.04 }); noise(t, { dur: 0.06, vol: 0.12, filter: 6000 }); },
  block: (t) => { tone(t, { freq: 1200, dur: 0.07, type: 'triangle', vol: 0.12 }); tone(t, { freq: 1800, dur: 0.05, type: 'triangle', vol: 0.06 }); },
  shieldBreak: (t) => { noise(t, { dur: 0.3, vol: 0.3, filter: 3000 }); tone(t, { freq: 600, to: 120, dur: 0.3, vol: 0.1 }); },
  hurt: (t) => tone(t, { freq: 220, to: 90, dur: 0.16, vol: 0.14 }),
  melee: (t) => { noise(t, { dur: 0.1, vol: 0.3, filter: 1200 }); tone(t, { freq: 160, to: 80, dur: 0.12, vol: 0.12 }); },
  explosion: (t) => { noise(t, { dur: 0.7, vol: 0.6, filter: 700 }); tone(t, { freq: 90, to: 30, dur: 0.6, type: 'sine', vol: 0.4 }); },

  // 敵人
  enemyShot: (t) => noise(t, { dur: 0.05, vol: 0.09, filter: 1800 }),
  heavyShot: (t) => { noise(t, { dur: 0.3, vol: 0.3, filter: 900 }); tone(t, { freq: 140, to: 50, dur: 0.3, type: 'sine', vol: 0.25 }); },
  throw: (t) => { noise(t, { dur: 0.15, vol: 0.08, filter: 900 }); tone(t, { freq: 300, to: 520, dur: 0.15, type: 'sine', vol: 0.05 }); },
  charge: (t) => tone(t, { freq: 300, to: 600, dur: 0.25, type: 'sawtooth', vol: 0.06 }),
  lock: (t) => [0, 0.18, 0.36].forEach((at) => tone(t, { freq: 1700, dur: 0.06, type: 'sine', vol: 0.08, at })),
  sniperShot: (t) => { noise(t, { dur: 0.2, vol: 0.4, filter: 5000 }); tone(t, { freq: 2200, to: 100, dur: 0.22, vol: 0.06 }); },
  airShot: (t) => noise(t, { dur: 0.03, vol: 0.06, filter: 2200 }),
  siren: (t) => [0, 0.5, 1.0].forEach((at) => tone(t, { freq: 600, to: 950, dur: 0.45, type: 'sawtooth', vol: 0.05, at })),
  bossWarn: (t) => [0, 0.35, 0.7].forEach((at) => tone(t, { freq: 180, to: 120, dur: 0.3, type: 'square', vol: 0.1, at })),

  // 系統
  streak: (t) => { tone(t, { freq: 880, to: 1320, dur: 0.12, type: 'triangle', vol: 0.1 }); tone(t, { freq: 1760, dur: 0.1, type: 'sine', vol: 0.06, at: 0.08 }); },
  supply: (t) => [660, 880, 1320].forEach((f, i) => tone(t, { freq: f, dur: 0.18, type: 'sine', vol: 0.1, at: i * 0.12 })),
  coin: (t) => { tone(t, { freq: 1300, dur: 0.06, type: 'square', vol: 0.05 }); tone(t, { freq: 1900, dur: 0.12, type: 'square', vol: 0.05, at: 0.06 }); },
  pickup: (t) => { tone(t, { freq: 660, dur: 0.1, type: 'sine', vol: 0.12 }); tone(t, { freq: 990, dur: 0.15, type: 'sine', vol: 0.12, at: 0.08 }); },
  click: (t) => tone(t, { freq: 1000, dur: 0.03, type: 'sine', vol: 0.08 }),
  victory: (t) => [523, 659, 784, 1047].forEach((f, i) => tone(t, { freq: f, dur: 0.22, type: 'triangle', vol: 0.12, at: i * 0.12 })),
  defeat: (t) => [392, 330, 262].forEach((f, i) => tone(t, { freq: f, dur: 0.35, type: 'triangle', vol: 0.12, at: i * 0.22 })),
  promote: (t) => [784, 988, 1175, 1568].forEach((f, i) => tone(t, { freq: f, dur: 0.25, type: 'square', vol: 0.06, at: i * 0.1 })),
};
