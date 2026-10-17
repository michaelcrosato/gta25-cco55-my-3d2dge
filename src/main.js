// GRAND THEFT MOTO: the entry point. It makes the game and the app (MOTOR's shared pieces), imports every content
// module (they register themselves), and starts the scene named by the deep link (#title by default; kiosk devices
// start in the attract mode). Nothing here touches the DOM, so the same bundle runs headless in Node for the tests.
import * as MOTOR from './motor/index.js';
import { E, all, readLinks, route, installHandle, expose, createApp, wrapScenes } from './motor/index.js';
import { GAME } from './about.js';
import { CONTENT_FILES } from 'virtual:content';

const links = readLinks(), parts = route(links.hash);
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: { maxW: 560, maxH: 320 }, view: 'iso', menu: false, corner: false, id: GAME.id });
const H = installHandle(game);
const app = createApp({ game, links });
expose('content', CONTENT_FILES);
expose('motor', MOTOR);   // MOTOR's whole API on the console handle (tools, tests, the dev menu)

const scenes = wrapScenes(app, all('scenes'));
const scene = scenes[parts[0]] ? parts[0] : app.kiosk ? 'attract' : 'title';
game.start({ scenes, scene, data: { route: parts }, boot: { title: GAME.title, messages: ['Paving Lowtown', 'Waking the traffic lights'] } });
if (links.query.get('view') && game.views.includes(links.query.get('view'))) game.setView(links.query.get('view'));   // ?view=iso|top|side7
H.ready = true;
