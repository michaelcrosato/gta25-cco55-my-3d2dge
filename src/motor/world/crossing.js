// The crossings (EXPANSION.md 2.1): where a road leaves its district for another's, over a bridge, one map at a time
// (PLAN.md 19). A district names its own:
//   crossings: [{ id, to, via, gate: [x0, y0, x1, y1], dir ('N' | 'S' | 'E' | 'W'), arrive: [cx, cy], opens, label }]
// gate: the cells at the map's edge a crossing is made from; dir: the way out across them; to: the district beyond,
// and via: its crossing one comes in by there; arrive: the cell one is set down at coming in (facing back in, against
// dir); opens: what opens it (a mission's id, once done; none: always open); label: its name on the map.
// A closed crossing is the city built without it (buildCity's open: its openings left uncut, the signs and props that
// bar it standing), so a city whose bridges are all shut is the one it was before they were drawn. The play scene asks
// at() for the open crossing the possessed one stands in and enters again with the other district; nothing here steps.
const DIR = { E: 0, S: Math.PI / 2, W: Math.PI, N: -Math.PI / 2 };

export class Crossings {
  /** city: a CityMap; isOpen(crossing) -> is it open (the save's story: the city was built with the same) */
  constructor(city, isOpen = () => true) {
    this.city = city; this.T = city.T;
    this.list = ((city.spec && city.spec.crossings) || []).map(c => ({ ...c, open: !!isOpen(c) }));
  }
  get(id) { return this.list.find(c => c.id === id) || null; }
  /** the ids of the open ones */
  get open() { return this.list.filter(c => c.open).map(c => c.id); }
  /** the open crossing whose gate holds the world point (x, y), or null */
  at(x, y) {
    const cx = Math.floor(x / this.T), cy = Math.floor(y / this.T);
    for (const c of this.list) { const [x0, y0, x1, y1] = c.gate; if (c.open && cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) return c; }
    return null;
  }
  /** where one coming in by crossing id is set down: { x, y, heading } (the arrival cell's centre, facing in), or null */
  arrival(id) {
    const c = this.get(id); if (!c) return null;
    const T = this.T, a = c.arrive || [(c.gate[0] + c.gate[2]) / 2, (c.gate[1] + c.gate[3]) / 2];
    return { x: (a[0] + .5) * T, y: (a[1] + .5) * T, heading: (DIR[c.dir] ?? 0) + Math.PI, crossing: c };
  }
}
