# Content guide

Grand Theft Moto grows by **adding content, not architecture**. Every `.js` file under `src/game/` is found at build
time and imported, in path order, so content registers itself with `def(kind, id, spec)` from `src/motor/index.js`. No
index file needs editing.

Every recipe below names the test to run. From M12 on, `tests/recipes/*.test.js` follows each recipe to the letter.

## Recipes

| Content | Recipe | Test |
|---|---|---|
| A scene | `def('scenes', id, { make({ game, views, links }) { return { enter, update, draw, ... } } })` in `src/game/scenes/` | `npm test` (`#<id>` opens it) |
| A small test map | `def('maps', id, { build() { return new E.TileMap({...}) } })` | `npm test` |

More recipes are added as each system lands: vehicle, variant, weapon, ped, outfit, gang, mission, activity, station,
song, shop, property, interior, reel, district.
