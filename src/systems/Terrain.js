import { GAME_H, GROUND_Y, TERRAIN, COLORS } from '../config.js';

// 地形高度線：一串 (x, y) 折線點，平地與坡道交錯，玩家往前走時再往後補
export default class Terrain {
  constructor(scene, startX, evacX) {
    this.evacX = evacX;
    this.points = [
      { x: -2000, y: GROUND_Y },
      { x: startX + TERRAIN.flatStart, y: GROUND_Y },
    ];
    this.nextIsSlope = true;
    this.cursor = 0; // 上次查詢到的線段，往前走時查詢幾乎是連續的
    this.g = scene.add.graphics().setDepth(0.5);
  }

  // 確保地形至少產生到 x
  ensure(x) {
    while (this.points[this.points.length - 1].x < x) this.addSegment();
  }

  addSegment() {
    const last = this.points[this.points.length - 1];
    const flatFrom = this.evacX - TERRAIN.evacFlat;
    // 撤離點附近一路平坦
    if (last.x >= flatFrom - 60) {
      this.points.push({ x: last.x + 600, y: last.y });
      return;
    }
    if (this.nextIsSlope) {
      const top = GROUND_Y - TERRAIN.maxHeight;
      let rise = Phaser.Math.Between(TERRAIN.minRise, TERRAIN.maxHeight);
      // 已經在高處就比較可能往下，在低處就往上
      const goUp = last.y - rise >= top && (last.y + rise > GROUND_Y || Math.random() < 0.5);
      const targetY = goUp ? last.y - rise : Math.min(GROUND_Y, last.y + rise);
      rise = Math.abs(targetY - last.y);
      const len = Math.max(Phaser.Math.Between(TERRAIN.slopeLen[0], TERRAIN.slopeLen[1]), rise / TERRAIN.maxSlope);
      const endX = Math.min(last.x + len, flatFrom);
      if (rise < 10) {
        // 高度差太小就當作一段平地
        this.points.push({ x: Math.min(last.x + TERRAIN.flatLen[0], flatFrom), y: last.y });
      } else if (endX - last.x < rise / TERRAIN.maxSlope) {
        // 剩下的距離不夠一段坡，就直接以平地接到撤離點
        this.points.push({ x: flatFrom, y: last.y });
      } else {
        this.points.push({ x: endX, y: targetY });
      }
    } else {
      const len = Phaser.Math.Between(TERRAIN.flatLen[0], TERRAIN.flatLen[1]);
      this.points.push({ x: Math.min(last.x + len, flatFrom), y: last.y });
    }
    this.nextIsSlope = !this.nextIsSlope;
  }

  // x 位置的地面高度（角色腳底的 y）
  heightAt(x) {
    this.ensure(x + 1);
    const pts = this.points;
    let i = Phaser.Math.Clamp(this.cursor, 0, pts.length - 2);
    while (i > 0 && pts[i].x > x) i--;
    while (i < pts.length - 2 && pts[i + 1].x < x) i++;
    this.cursor = i;
    const a = pts[i];
    const b = pts[i + 1];
    if (x <= a.x) return a.y;
    return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  }

  // 坡度：負值代表往右是上坡
  slopeAt(x) {
    return (this.heightAt(x + 10) - this.heightAt(x - 10)) / 20;
  }

  // 只畫畫面範圍內的地形
  draw(left, right) {
    this.ensure(right);
    const g = this.g;
    const top = [{ x: left, y: this.heightAt(left) }];
    for (const p of this.points) {
      if (p.x > left && p.x < right) top.push({ x: p.x, y: p.y });
    }
    top.push({ x: right, y: this.heightAt(right) });

    g.clear();
    g.fillStyle(COLORS.ground).fillPoints([...top, { x: right, y: GAME_H }, { x: left, y: GAME_H }], true);
    // 地層紋路：沿著地表往下偏移的兩條線
    g.lineStyle(10, COLORS.groundLayer, 0.8).strokePoints(top.map((p) => ({ x: p.x, y: p.y + 26 })));
    g.lineStyle(6, COLORS.groundLayer, 0.5).strokePoints(top.map((p) => ({ x: p.x, y: p.y + 60 })));
    g.lineStyle(5, COLORS.groundTop).strokePoints(top);
  }
}
