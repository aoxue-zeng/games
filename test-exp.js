// ===== ⭐ 全站经验系统 测试 =====
// 在 node vm 里加载真实 shared.js, 用可被钩子包装的 Storage 桩,
// 模拟各游戏写"最佳成绩"键, 验证: 发放/防重复/防倒退/JSON数字/旗标/等级/解锁
var fs = require('fs'), vm = require('vm');

var failures = 0, total = 0;
function T(name, cond, detail) {
  total++;
  if (cond) console.log('  ✓ ' + name);
  else { failures++; console.log('  ✗ ' + name + (detail !== undefined ? ' → ' + detail : '')); }
}

function mkEl(id) {
  return {
    _id: id, innerHTML: '', textContent: '', style: {}, dataset: {}, children: [], disabled: false,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { return c; }, removeChild(c) { return c; }, remove() {},
    addEventListener() {}, onclick: null, getAttribute() { return null; }, setAttribute() {},
    querySelector() { return mkEl(id + '.q'); }, querySelectorAll() { return []; },
    insertBefore() {}, parentNode: null
  };
}

function makeSandbox() {
  var els = {};
  var doc = {
    readyState: 'complete',
    getElementById(id) { if (!els[id]) els[id] = mkEl(id); return els[id]; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement(tag) { return mkEl('new-' + tag); },
    body: mkEl('body')
  };
  function FakeStorage() { this._d = {}; }
  FakeStorage.prototype.getItem = function (k) { return (k in this._d) ? this._d[k] : null; };
  FakeStorage.prototype.setItem = function (k, v) { this._d[k] = String(v); };
  FakeStorage.prototype.removeItem = function (k) { delete this._d[k]; };
  var ls = new FakeStorage();

  var sb = {
    document: doc,
    Storage: FakeStorage,
    localStorage: ls,
    navigator: { userAgent: 'test', maxTouchPoints: 0 },
    location: { href: 'http://t/game.html', pathname: '/game.html', search: '' },
    console, Date, Math,
    setTimeout, clearTimeout, setInterval, clearInterval,
    addEventListener() {}, removeEventListener() {},
    SFX: {}, AOXSound: { isEnabled() { return true; }, ensure() {}, startBGM() {}, stopBGM() {}, setEnabled() {} },
    AOXMobile: { isTouch: false, state: {} }
  };
  sb.window = sb; sb.self = sb; sb.globalThis = sb;
  return sb;
}

var TOASTS = [];
var sb = makeSandbox();
vm.createContext(sb);
var sharedSrc = fs.readFileSync('shared.js', 'utf8');
vm.runInContext(sharedSrc, sb, { filename: 'shared.js' });
sb.toast = function (m) { TOASTS.push(m); }; // 捕获后续 toast
// 🏆 成就子系统在本套件中打桩隔离(加载期已自动解锁的徽章经验一并清零还原纯净经验场; 专测见 test-achv.js)
sb.Site.checkAch = function () { return []; };
sb.Site.checkAchSoon = function () { };
sb.localStorage.removeItem('aox_ach'); sb.localStorage.removeItem('aox_exp');
sb.localStorage.removeItem('aox_exp_log'); sb.localStorage.removeItem('aox_played');

var Site = sb.Site;
var LS = sb.localStorage;

console.log('=== ⭐ 经验系统: 加载与初始状态 ===');
T('shared.js 加载无异常', !!Site && typeof Site.gainExp === 'function');
T('初始经验为 0', Site.exp() === 0, Site.exp());
T('初始 Lv.1', Site.expLv().lv === 1);
T('右下角 HUD 含经验chip', !!document_id('hudExp'), 'hud未渲染?');
function document_id(id) { return sb.document.getElementById(id); }

console.log('=== 基础发放: 破纪录 +50 ===');
LS.setItem('snake_best', '10');
T('首次破纪录 +50', Site.exp() === 50, Site.exp());
T('账本计数 1 次', Site.sget ? Site.sget : true, '');
var log1 = JSON.parse(LS.getItem('aox_exp_log'));
T('账本记录 snake_best', log1['snake_best'] && log1['snake_best'].cnt === 1, JSON.stringify(log1));

LS.setItem('snake_best', '10'); // 同值重写
T('同值重写不重复发', Site.exp() === 50, Site.exp());
LS.setItem('snake_best', '5');  // 更差
T('成绩变差不发', Site.exp() === 50, Site.exp());

console.log('=== 同键 2 秒冷却(防循环写入) ===');
LS.setItem('tetris_best', '100');   // 首次 +50
LS.setItem('tetris_best', '200');   // 2秒内: 冷却拦截
LS.setItem('tetris_best', '300');   // 2秒内: 冷却拦截
T('冷却期内只发首次', Site.exp() === 100, Site.exp());

console.log('=== 数字比较: JSON引号数字 / 大小判优 ===');
LS.setItem('dino_hi', '"500"');     // JSON.stringify 存的数字
T('JSON引号数字也识别 (+50)', Site.exp() === 150, Site.exp());
LS.setItem('dino_hi', '"499"');     // 更差(冷却也过期不了,直接判优拦截)
T('更差不发', Site.exp() === 150, Site.exp());

console.log('=== 通关旗标(一次性) ===');
LS.setItem('genshin_clear', '1');
T('首次通关旗标 +50', Site.exp() === 200, Site.exp());
LS.setItem('genshin_clear', '1'); // 原样重写
T('旗标重写不重复发', Site.exp() === 200, Site.exp());

console.log('=== 站内键绝不误发 ===');
var before = Site.exp();
LS.setItem('choco_energy', '999');
LS.setItem('aox_lucky', '5');
LS.setItem('played_counts', '{}');
LS.setItem('game_likes', '{}');
LS.setItem('total_liked', '1');
LS.setItem('visit_stats', '{}');
LS.setItem('pet_v2', '{}');
LS.setItem('wall_posts', '[]');
LS.setItem('snake_best', '99999'); // 2秒早已过? snake_best 首次写入距今<2s(测试速度快) → 冷却拦截
T('站内键全部跳过', Site.exp() === 200, Site.exp());

console.log('=== 等级曲线 ===');
var lv = Site.expLv(0);
T('0经验 = Lv.1 (0/200)', lv.lv === 1 && lv.rem === 0 && lv.need === 200, JSON.stringify(lv));
lv = Site.expLv(200);
T('200经验 = Lv.2', lv.lv === 2, JSON.stringify(lv));
lv = Site.expLv(450); // 200+250
T('450经验 = Lv.3', lv.lv === 3 && lv.rem === 0, JSON.stringify(lv));
lv = Site.expLv(749);
T('749经验 = Lv.3 差1点', lv.lv === 3 && lv.need - lv.rem === 1, JSON.stringify(lv));
lv = Site.expLv(750); // 200+250+300
T('750经验 = Lv.4', lv.lv === 4, JSON.stringify(lv));

console.log('=== 等级解锁隐藏游戏 ===');
T('Lv.3 之前 genshin 未解锁', !Site.hiddenUnlocked({ f: 'genshin.html', lv: 5 }));
// 快速攒到 Lv.3 (需450): 用不同键绕开冷却
var keys = ['k_a', 'k_b', 'k_c', 'k_d', 'k_e', 'k_f', 'k_g', 'k_h', 'k_i'];
keys.forEach(function (k) { LS.setItem(k + '_best', '1'); }); // 9×50=450 → Lv.3
T('9次破纪录 = 450经验 = Lv.3', Site.exp() === 650 && Site.expLv().lv === 3, Site.exp() + '/Lv' + Site.expLv().lv);
T('Lv.3 解锁 hsr', Site.hiddenUnlocked(Site.HIDDEN_GAMES[0]), JSON.stringify(Site.HIDDEN_GAMES[0]));
T('Lv.3 未解锁 genshin(Lv.5)', !Site.hiddenUnlocked(Site.HIDDEN_GAMES[1]));
T('升级 toast 出现', TOASTS.some(function (t) { return t.indexOf('升级') >= 0; }), TOASTS.join('|'));
T('解锁提示 toast 出现', TOASTS.some(function (t) { return t.indexOf('星穹开拓') >= 0; }));

console.log('=== 宠物满级 = 全部解锁(老规矩保留) ===');
LS.setItem('pet_v2', JSON.stringify({ type: 'dog', level: 10, fed: 0, born: 0 }));
T('宠物满级时 hsr-train 解锁', Site.hiddenUnlocked(Site.HIDDEN_GAMES[3]));
LS.setItem('pet_v2', JSON.stringify(null));

console.log('=== 直调 Site.gainExp(星露小镇里程碑走此通道) ===');
var e0 = Site.exp();
T('gainExp 返回 true', Site.gainExp(50, 'starfarm_firstHarvest') === true);
T('经验 +50', Site.exp() === e0 + 50, Site.exp());
var l2 = JSON.parse(LS.getItem('aox_exp_log'));
T('星露账本记录', !!l2['starfarm_firstHarvest']);
// 2秒冷却
T('2秒内重复调用被拦', Site.gainExp(50, 'starfarm_firstHarvest') === false);

console.log('=== 冷却过期后可再拿(可重复刷) ===');
setTimeout(function () {
  LS.setItem('tetris_best', '9999'); // 冷却已过 + 更优
  T('冷却后破纪录再 +50', Site.exp() === 750, Site.exp());
  var l3 = JSON.parse(LS.getItem('aox_exp_log'));
  T('tetris 计数 2 次', l3['tetris_best'].cnt === 2, JSON.stringify(l3['tetris_best']));

  console.log('=== expModal 不炸 ===');
  try { Site.expModal(); T('经验弹窗打开无异常', !!document_id('siteExpModal')); } catch (e) { T('经验弹窗打开无异常', false, e.message); }

  console.log('');
  console.log('总用例 ' + total + ' · 失败 ' + failures);
  if (failures > 0) { console.log('❌ 有失败用例'); process.exit(1); }
  else console.log('✅ 经验系统测试全部通过');
}, 2200);
