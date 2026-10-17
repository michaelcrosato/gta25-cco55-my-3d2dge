// Actors (PLAN.md 7.5): everything that lives in the world has an id, a kind, a position and a facing; peds,
// vehicles, projectiles, pickups, props and fires build on this. Ids come from a counter reset per world, so the same
// seed and inputs give the same ids (the state hash reads them).
let nextId = 1;
export const resetActorIds = () => { nextId = 1; };

export class Actor {
  /** kind: 'ped' | 'vehicle' | 'pickup' | 'prop' | 'projectile' | 'fire' ...; o: any field below */
  constructor(kind, o = {}) {
    this.id = o.id ?? nextId++; this.kind = kind;
    this.x = o.x || 0; this.y = o.y || 0; this.z = o.z || 0; this.facing = o.facing || 0;
    this.health = o.health ?? 100; this.maxHealth = o.maxHealth ?? this.health; this.armor = o.armor || 0;
    /** faction: a gang id, 'police', 'civilian', 'crew' (the protagonists) */ this.faction = o.faction || 'civilian';
    this.tags = new Set(o.tags || []);
    /** owner: 'world' or 'mission' (mission-owned actors are released when it ends) */ this.owner = o.owner || 'world';
    /** lod: 0 near (full simulation), 1 far (coarse), 2 outside the footprint */ this.lod = 0;
    this.dead = false; this.removed = false;
  }
  get alive() { return !this.dead; }
}
