// 临时调试: 为什么 update 没扣血/钓鱼不bite
var fs = require('fs'), vm = require('vm');
function mkCtx() { var f = function () { return anyP; }; var anyP = new Proxy(f, { get: function (t, k) { if (k === 'canvas') return { width: 480, height: 448 }; return anyP; }, set: function () { return true; }, apply: function () { return anyP; } }); return anyP; }
function mkEl(id) { var el = { _id: id, innerHTML: '', textContent: '', style: {}, dataset: {}, children: [], width: 0, height: 0, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, appendChild(c) { return c; }, remove() {}, addEventListener() {}, getAttribute() { return null; }, setAttribute() {}, querySelector() { return mkEl('q'); }, querySelectorAll() { return []; }, parentNode: null, getContext() { return mkCtx(); } }; if (id === 'gc') { el.width = 480; el.height = 448; } return el; }
var els = {};
var sb = {
  document: { getElementById(id) { if (!els[id]) els[id] = mkEl(id); return els[id]; }, querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, createElement(t) { return mkEl('n'); }, body: mkEl('body'), hidden: false },
  Math: Object.create(Math), Date, console, setTimeout, clearTimeout,
  requestAnimationFrame() { return 0; },
  localStorage: { _d: {}, getItem(k) { return (k in this._d) ? this._d[k] : null; }, setItem(k, v) { this._d[k] = String(v); } },
  navigator: { userAgent: 't' }, location: { pathname: '/x' },
  SFX: {}, AOXSound: { isEnabled() { return true; } }
};
sb.Math.random = function () { return 0.5; };
sb.window = sb;
sb.Site = { gainExp: function (n, k) { console.log('  [XP]', k); return true; } };
sb.toast = function (m) { console.log('  [toast]', m); };
vm.createContext(sb);
vm.runInContext(fs.readFileSync('starfarm/data.js', 'utf8'), sb, { filename: 'data.js' });
vm.runInContext(fs.readFileSync('starfarm/game.js', 'utf8'), sb, { filename: 'game.js' });
var t = sb.__SF_T, G = t.G;

t.panelAction('newGame');
console.log('screen=', G.screen, 'panel=', G.panel);

// 场景A: 怪物接触
t.buildMine(1);
G.monsters.length = 0;
G.monsters.push({ type: 'slime', x: G.px + 16, y: G.py + 16, hp: 14, maxHp: 14, hurt: 0, ph: 0, vx: 0, vy: 0 });
G.invul = 0;
console.log('A前: hp=', G.hp, 'px=', G.px, 'py=', G.py, 'm.x=', G.monsters[0].x, 'invul=', G.invul, 'screen=', G.screen, 'panel=', G.panel);
t.update(0.016);
console.log('A后: hp=', G.hp, 'monsters=', G.monsters.length);

// 场景B: 钓鱼
t.buildFarm();
G.mine = false;
G.px = 24 * 32; G.py = 15 * 32; G.dir = 2;
console.log('B: tile(24,16)=', t.tileAt(24, 16), 'WATER=', sb.SF.T.WATER, 'target=', JSON.stringify(t.targetTile()));
t.startFish(t.targetTile());
console.log('B: fish=', JSON.stringify(G.fish));
G.fish.t = 0;
t.update(0.016);
console.log('B: update后 fish=', JSON.stringify(G.fish), 'panel=', G.panel, 'screen=', G.screen);
