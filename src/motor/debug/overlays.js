// The dev overlays (PLAN.md 8.23's dev tools; the dev menu's OVERLAYS, ?dev=1): what the simulation thinks, drawn over
// the world in any of the three views through the Stage's projector, after everything else. Presentation only: it reads
// the simulation and changes nothing.
//   - lanes: the road graph's lanes round the focus, an arrow each way they run (the deck's in cyan, the ground's white);
//   - junctions: the junction boxes, red while someone holds one, its holders' count;
//   - walks: the sidewalk graph, its nodes and edges;
//   - minds: a word over each driver near the focus (what holds it up, or 'go') and each mission or crowd ped;
//   - boxes: every vehicle's box and every body's circle;
//   - perf: the frame's draw and update times and the counts drawn.
//   const O = new Overlays();  O.flags.lanes = true;  each frame after the scene: O.draw(stage, r, { graph, junctions,
//     walks, fleet, bodies, focus, reach, stats })
import { E } from '../engine.js';

export const OVERLAY_KINDS = ['lanes', 'junctions', 'walks', 'minds', 'boxes', 'perf'];

export class Overlays {
  constructor() { this.flags = Object.fromEntries(OVERLAY_KINDS.map(k => [k, false])); }
  /** is any on? */
  get any() { return OVERLAY_KINDS.some(k => this.flags[k]); }
  /** after the scene: o { graph, junctions, walks, fleet, bodies, focus: [x, y], reach, stats: { renderMs, updateMs, items } } */
  draw(stage, r, o) {
    if (!this.any || !r || !r.overlay) return;
    const F = this.flags, P = stage.projector(), [fx, fy] = o.focus, reach = Math.min(o.reach || 600, stage.depth && stage.depth === stage.side7 ? 300 : 1e9);   // (MODE 7: near the rail only, the horizon is a smear)
    const near = (x, y) => Math.abs(x - fx) < reach && Math.abs(y - fy) < reach;
    const pt = (x, y, z = 0) => { const q = P.proj(x, y, z); return q && q[2] > 0 && isFinite(q[0]) && isFinite(q[1]) ? q : null; };
    r.overlay(g => {
      g.save(); g.lineWidth = 1;
      const line = (a, b, color) => { if (!a || !b || Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) > r.bw) return; g.strokeStyle = color; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };   // (one across the whole screen: a point behind the camera)
      const label = (q, s, color) => { if (q) E.font.text(g, s, Math.round(q[0]), Math.round(q[1]) - 10, color, { align: 'center', outline: '#05030c' }); };
      if (F.lanes && o.graph) for (const L of o.graph.lanes) {
        const [ax, ay, az = 0] = L.a, [bx, by, bz = 0] = L.b; if (!near(ax, ay) && !near(bx, by)) continue;
        const c = az > 10 || bz > 10 ? '#5af0ff' : 'rgba(255,255,255,.7)', A = pt(ax, ay, az + 1), B = pt(bx, by, bz + 1); line(A, B, c);
        const m = pt(ax + (bx - ax) * .6, ay + (by - ay) * .6, az + (bz - az) * .6 + 1), dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, k = 6 / l;   // (the way it runs)
        if (m) for (const s of [1, -1]) line(m, pt(ax + (bx - ax) * .6 - dx * k - dy * k * s * .6, ay + (by - ay) * .6 - dy * k + dx * k * s * .6, az + 1), c);
      }
      if (F.junctions && o.graph && o.graph.regions) for (const R of o.graph.regions) {
        const [x0, y0, x1, y1] = R.box; if (!near((x0 + x1) / 2, (y0 + y1) / 2)) continue;
        const J = o.junctions && o.junctions.regions.get(R.id), held = J ? J.holders.size : 0, c = held ? '#ff5a4a' : '#ffe066', z = (R.z || 0) + 1;
        const q = [pt(x0, y0, z), pt(x1, y0, z), pt(x1, y1, z), pt(x0, y1, z)];
        for (let i = 0; i < 4; i++) line(q[i], q[(i + 1) % 4], c);
        if (held) label(pt((x0 + x1) / 2, (y0 + y1) / 2, z), String(held), c);
      }
      if (F.walks && o.walks) {
        for (const e of o.walks.edges) { const A = o.walks.nodes[e.a], B = o.walks.nodes[e.b]; if (near(A.x, A.y)) line(pt(A.x, A.y, (A.z || 0) + 1), pt(B.x, B.y, (B.z || 0) + 1), 'rgba(122,255,138,.55)'); }
        g.fillStyle = '#7aff8a'; for (const n of o.walks.nodes) if (near(n.x, n.y)) { const q = pt(n.x, n.y, (n.z || 0) + 1); if (q) g.fillRect(Math.round(q[0]) - 1, Math.round(q[1]) - 1, 2, 2); }
      }
      if (F.minds) {
        if (o.fleet) for (const v of o.fleet.vehicles) if (v.brain && near(v.x, v.y)) { const b = v.brain, s = b.cause ? String(b.cause.kind || b.cause) : b.speed > 2 ? 'go' : 'stop'; label(pt(v.x, v.y, (v.z || 0) + (v.height || 14) + 4), s, b.cause ? '#ffb43a' : '#7aff8a'); }
        if (o.bodies) for (const p of o.bodies) if (!p.dead && near(p.x, p.y)) { const s = p.mind || (p.brain && (p.brain.state || p.brain.mode)) || (p.hostile ? 'hostile' : null); if (s) label(pt(p.x, p.y, (p.z || 0) + 40), String(s), p.hostile ? '#ff5a4a' : '#c8c0e8'); }
      }
      if (F.boxes) {
        if (o.fleet) for (const v of o.fleet.vehicles) if (near(v.x, v.y) && v.toWorld) { const z = (v.z || 0) + 1, q = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => { const w = v.toWorld(a * v.hl, b * v.hw); return pt(w[0], w[1], z); }); for (let i = 0; i < 4; i++) line(q[i], q[(i + 1) % 4], '#ff5ac8'); }
        if (o.bodies) for (const p of o.bodies) if (!p.dead && near(p.x, p.y)) { const r0 = p.r || 6, z = (p.z || 0) + 1, q = []; for (let k = 0; k <= 8; k++) q.push(pt(p.x + Math.cos(k * Math.PI / 4) * r0, p.y + Math.sin(k * Math.PI / 4) * r0, z)); for (let k = 0; k < 8; k++) line(q[k], q[k + 1], '#5ab0ff'); }
      }
      if (F.perf && o.stats) { const s = o.stats, y = Math.round(r.bh * .42); E.ui.box(g, 4, y, 128, 22, { alpha: .75 }); E.font.text(g, `DRAW ${(+s.renderMs || 0).toFixed(1)} MS  UPD ${(+s.updateMs || 0).toFixed(2)}`, 8, y + 4, '#ffe066'); E.font.text(g, `ITEMS ${s.items || 0}`, 8, y + 12, '#d8e4f0'); }   // (the left edge, clear of the HUD's corners)
      g.restore(); g._c = null;
    });
  }
}
