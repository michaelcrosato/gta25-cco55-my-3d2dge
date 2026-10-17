// GRAND THEFT MOTO: the entry point. It makes the game, imports every content module (they register themselves), and
// starts the scene named by the deep link (#title by default). Nothing here touches the DOM, so the same bundle runs
// headless in Node for the tests.
import { E, all, readLinks, route, installHandle, expose, ViewManager } from './motor/index.js';
import { GAME } from './about.js';
import { CONTENT_FILES } from 'virtual:content';

const links = readLinks(), parts = route(links.hash);
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: { maxW: 560, maxH: 320 }, view: 'iso', menu: false, corner: false, id: GAME.id });
const views = new ViewManager(game);
const H = installHandle(game);
expose('views', views); expose('content', CONTENT_FILES); expose('links', links);

const scenes = Object.fromEntries(all('scenes').map(s => [s.id, s.make({ game, views, links })]));
const scene = scenes[parts[0]] ? parts[0] : 'title';
game.start({ scenes, scene, data: { route: parts }, boot: { title: GAME.title, messages: ['Paving Lowtown', 'Waking the traffic lights'] } });
H.ready = true;
