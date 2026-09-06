// ===== 深测主页: 真实卡片列表 + 全部脚本块按文档顺序执行 =====
var fs = require('fs'), vm = require('vm');
var html = fs.readFileSync(__dirname + '/index.html', 'utf8');

// --- 从真实 HTML 解析游戏卡片 ---
var cardRe = /<a href="([^"]+)" class="game-card" data-cat="([^"]+)">([\s\S]*?)<\/a>/g;
var cards = [], m;
while ((m = cardRe.exec(html))) {
  cards.push({ href: m[1], cat: m[2], title: (m[3].match(/<h3>([^<]*)<\/h3>/) || [])[1] || '' });
}
console.log('解析到卡片数:', cards.length, ' 含子目录路径:', cards.filter(c => c.href.includes('/')).map(c => c.href).join(','));

// --- DOM 桩: 关键是 querySelectorAll('.game-card') 返回真实卡片 ---
function mkAny() {
  var f = function () { return anyP; };
  var anyP = new Proxy(f, {
    get: function (t, k) {
      if (k === 'canvas') return {};
      if (k === Symbol.toPrimitive || k === 'valueOf') return function () { return 0; };
      return anyP;
    },
    set: function () { return true; }
  });
  return anyP;
}
function mkCardEl(c) {
  return {
    _card: c, innerHTML: '', textContent: '', style: {}, dataset: {}, children: [], disabled: false,
    classList: { _s: new Set(['game-card']), add(v) { this._s.add(v); }, remove(v) { this._s.delete(v); }, toggle() {}, contains(v) { return this._s.has(v); } },
    appendChild(ch) { this.children.push(ch); return ch; }, removeChild(ch) { return ch; },
    addEventListener() {}, onclick: null,
    getAttribute(n) { return n === 'href' ? c.href : (n === 'data-cat' ? c.cat : null); },
    setAttribute() {},
    querySelector() { return mkEl('q'); }, querySelectorAll() { return []; },
    getContext() { return mkAny(); }
  };
}
function mkEl(id) {
  return {
    _id: id, innerHTML: '', textContent: '', value: '', style: {}, dataset: {}, children: [], disabled: false, width: 0, height: 0,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { return c; }, removeChild(c) { return c; }, addEventListener() {}, onclick: null, focus() {}, blur() {},
    getAttribute() { return null; }, setAttribute() {},
    getContext() { return mkAny(); }, querySelectorAll() { return []; }, querySelector() { return mkEl('q'); }
  };
}
var cardEls = cards.map(mkCardEl);
var els = {}, rafQ = [];
var document = {
  getElementById(id) { if (!els[id]) els[id] = mkEl(id); return els[id]; },
  querySelector() { return mkEl('q'); },
  querySelectorAll(sel) {
    if (sel === '.game-card') return cardEls;
    return [];
  },
  addEventListener() {}, removeEventListener() {},
  body: mkEl('body'), createElement() { return mkEl('c'); },
  documentElement: mkEl('html'), head: mkEl('head')
};
var MATH = Object.create(Math); MATH.random = Math.random;
var sb = {
  document, Math: MATH, console, Date,
  setTimeout: function (fn, ms) { return setTimeout(fn, Math.max(1, (ms || 0) / 50)); }, clearTimeout,
  setInterval: function (fn, ms) { return setInterval(fn, Math.max(1, (ms || 0) / 50)); }, clearInterval,
  requestAnimationFrame: function (fn) { rafQ.push(fn); return rafQ.length; }, cancelAnimationFrame: function () {},
  addEventListener() {}, removeEventListener() {},
  performance: { now() { return Date.now(); } },
  localStorage: { _d: {}, getItem(k) { return k in this._d ? this._d[k] : null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } },
  navigator: { userAgent: 't', language: 'zh-CN', maxTouchPoints: 0 },
  alert() {}, confirm() { return true; }, prompt() { return null; },
  location: { href: 'https://zengaoxuan.com/', pathname: '/index.html', search: '', hash: '' },
  innerWidth: 960, innerHeight: 540, devicePixelRatio: 1,
  Image: function () { return { addEventListener() {}, onload: null, src: '' }; },
  Audio: function () { return { play() { return { catch() {} }; }, pause() {}, load() {}, volume: 1, addEventListener() {} }; },
  sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  AOXMobile: new Proxy({}, { get() { return function () {}; } }), AOXSound: new Proxy({}, { get() { return function () {}; } }),
  THREE: mkAny(), CSS: { escape(s) { return String(s).replace(/[^\w-]/g, ''); } },
  SFX: new Proxy({}, { get() { return function () {}; } }),
  fetch: function () { return Promise.resolve({ ok: false, json() { return Promise.resolve({}); }, text() { return Promise.resolve(''); } }); },
  matchMedia: function () { return { matches: false, addEventListener() {}, addListener() {} }; },
  IntersectionObserver: function () { return { observe() {}, unobserve() {}, disconnect() {} }; },
  MutationObserver: function () { return { observe() {}, disconnect() {} }; },
  ResizeObserver: function () { return { observe() {}, disconnect() {} }; },
  getComputedStyle: function () { return { getPropertyValue() { return ''; } }; },
  scrollTo() {}, scrollY: 0, pageYOffset: 0,
  history: { pushState() {}, replaceState() {} },
  Site: null // shared.js 会定义
};
sb.window = sb; sb.self = sb; sb.globalThis = sb; sb.toast = function () {};

// --- 按文档顺序执行: src 脚本 + 内联块 ---
var scriptRe = /<script([^>]*)>([\s\S]*?)<\/script>/g;
var order = [];
while ((m = scriptRe.exec(html))) {
  var src = (m[1].match(/src="([^"]+)"/) || [])[1];
  order.push(src ? { src } : { code: m[2] });
}
console.log('脚本总数(按文档顺序):', order.length, order.map(o => o.src || 'inline(' + o.code.length + ')').join(' → '));

var err = null;
function h(e) { if (!err) err = e; }
process.on('uncaughtException', h);
try {
  vm.createContext(sb);
  for (var oi = 0; oi < order.length && !err; oi++) {
    var o = order[oi];
    var code = o.src ? fs.readFileSync(__dirname + '/' + o.src, 'utf8') : o.code;
    try { vm.runInContext(code, sb, { filename: o.src || ('inline#' + oi) }); }
    catch (e) { console.log('❌ 执行失败 @', o.src || ('inline#' + oi), '→', e.message); throw e; }
    console.log('✓', o.src || ('inline#' + oi));
  }
  for (var fr = 0; fr < 200 && !err; fr++) {
    var q = rafQ.splice(0);
    if (!q.length) break;
    q.forEach(function (fn) { fn(); });
  }
} catch (e) { err = e; }
process.removeListener('uncaughtException', h);
if (err) { console.log('💥 黑屏元凶:', err.stack ? err.stack.split('\n').slice(0, 4).join('\n') : err.message); process.exit(1); }
console.log('✅ 主页深测通过, 无运行时错误');
process.exit(0);
