// The characters registry (PLAN.md 8.11): def('characters', id, spec) for every protagonist (and, later, the named
// cast). A character is data: its name, its looks (outfits: PedRig looks), its ability, where it starts and what it
// carries, the colour the UI marks it with, and its switch vignette (where it is found, a pose and a line).
import { declare } from '../core/registry.js';
import { shape } from '../core/schema.js';

declare('characters', shape({
  name: { type: 'string', req: true }, short: { type: 'string', def: s => s.name.split(' ')[0].toUpperCase() },
  role: { type: 'string', def: '' }, color: { type: 'string', def: '#ffe066' },
  outfits: { type: 'array', req: true }, outfitNames: { type: 'array', def: [] },
  ability: { type: 'string', def: '' }, protagonist: { type: 'boolean', def: false },
  start: { type: 'object', def: { poi: 'safehouse', weapons: ['fists'], ammo: {} } },
  vignette: { type: 'object', def: null }, bio: { type: 'string', def: '' },
}));
