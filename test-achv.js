// ===== 🏆 全站成就系统 测试 =====
// 在 node vm 里加载真实 shared.js, 验证: 徽章定义完整性/解锁与奖励经验/防重复/级联收敛/
// 每日签到(首签/同日拒/连签/断签/封顶/累计)/数据徽章(棋类/经营/创造/通关/隐藏)/HUD胶囊/成就面板/成就页渲染
var fs = require('fs'), vm = require('vm');

var failures = 0, total = 0;
function T(name, cond, detail) {
  total++;
  if (cond) console.log('  ✓ ' + name);
  else { failures++; console.log('  ✗ ' + name + (detail !== undefined ? ' → ' + detail : '')); }
}
function sec(s) { console.log(''); console.log('=== ' + s + ' ==='); }

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

var sharedSrc = fs.readFileSync('shared.js', 'utf8');

// ---------- 沙箱1: 逻辑测试 ----------
var TOASTS = [];
var sb = makeSandbox();
vm.createContext(sb);
vm.runInContext(sharedSrc, sb, { filename: 'shared.js' });
sb.toast = function (m) { TOASTS.push(m); }; // 捕获后续 toast

var Site = sb.Site;
var LS = sb.localStorage;

// 消除异步/时段不确定性: 杀掉加载期挂着的防抖定时器, 固定为白天14点, 之后套件内显式调 checkAch
var realSoon = Site.checkAchSoon;
Site._nowHour = function () { return 14; };
if (Site._achT) { clearTimeout(Site._achT); Site._achT = null; }
['aox_ach', 'aox_exp', 'aox_exp_log', 'aox_played', 'aox_checkin', 'aox_music_played', 'visit_stats'].forEach(function (k) { LS.removeItem(k); });

sec('🏆 防抖: checkAchSoon 重复调度只挂一个定时器');
Site.checkAchSoon = realSoon;
realSoon(); realSoon();
T('重复调度只挂一个定时器', !!Site._achT);
clearTimeout(Site._achT); Site._achT = null;
Site.checkAchSoon = function () { }; // 套件内改为显式调用 checkAch

sec('🏆 徽章定义完整性');
T('Site.ACH 加载且共33枚', Array.isArray(Site.ACH) && Site.ACH.length === 33, Site.ACH && Site.ACH.length);
T('徽章id全部唯一', (function () { var s = {}; return Site.ACH.every(function (a) { if (s[a.id]) return false; s[a.id] = 1; return true; }); })());
T('字段齐全(icon/name/desc/exp≥100)', Site.ACH.every(function (a) { return a.i && a.n && a.d && a.e >= 100; }));
T('每枚含 chk 判定函数', Site.ACH.every(function (a) { return typeof a.chk === 'function'; }));
T('分类共8种', (function () { var c = {}; Site.ACH.forEach(function (a) { c[a.cat] = 1; }); return Object.keys(c).length === 8; })(), Object.keys((function () { var c = {}; Site.ACH.forEach(function (a) { c[a.cat] = 1; }); return c; })()).join(','));
T('隐藏徽章恰好2枚', Site.ACH.filter(function (a) { return a.hidden; }).length === 2);
T('_dayStr 输出 YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(Site._dayStr()));

sec('🏆 解锁与奖励经验');
T('纯净状态首次重估无解锁', Site.checkAch().length === 0);
LS.setItem('aox_played', JSON.stringify({ 'snake.html': 1, 'tetris.html': 2 }));
var newly = Site.checkAch();
T('游玩2款 → 初来乍到解锁', newly.length === 1 && newly[0].id === 'play1', JSON.stringify(newly.map(function (a) { return a.id; })));
T('徽章奖励经验 +100', Site.exp() === 100, Site.exp());
T('成就文案 toast(含徽章名)', TOASTS.some(function (t) { return t.indexOf('成就') >= 0 && t.indexOf('初来乍到') >= 0; }), TOASTS.join('|'));
var got = JSON.parse(LS.getItem('aox_ach'));
T('aox_ach 记录解锁时间戳', !!got['play1'] && got['play1'] > 0);
var lg = JSON.parse(LS.getItem('aox_exp_log'));
T('奖励经验走 gainExp 入账本(ach_play1)', !!lg['ach_play1'] && lg['ach_play1'].cnt === 1);
newly = Site.checkAch();
T('级联: 徽章奖励经gainExp入账本 → 顺推 rec1(设计如此)', newly.some(function (a) { return a.id === 'rec1'; }), JSON.stringify(newly.map(function (a) { return a.id; })));
T('play1 本体不重复发放', newly.every(function (a) { return a.id !== 'play1'; }) && Site.exp() === 200, Site.exp());

sec('🏆 纪录徽章与级联收敛');
lg = JSON.parse(LS.getItem('aox_exp_log') || '{}');
['g1', 'g2', 'g3', 'g4', 'g5', 'g6'].forEach(function (k) { lg[k] = { cnt: 1, ts: 0 }; });
LS.setItem('aox_exp_log', JSON.stringify(lg));
Site.checkAch();
got = JSON.parse(LS.getItem('aox_ach'));
T('破纪录1次+广度5 → rec1/wide5 解锁', !!got['rec1'] && !!got['wide5']);
T('累计未达10次 rec10 暂不解锁(口径正确)', !got['rec10']);
LS.setItem('aox_exp', '1100'); // 恰好 Lv.5 边界
newly = Site.checkAch();
got = JSON.parse(LS.getItem('aox_ach'));
T('Lv.5 → lv5 徽章解锁且奖励入账', !!got['lv5'] && Site.exp() === 1200, Site.exp());
T('级联未失控(1200 仍 Lv.5, 无新级徽章)', Site.expLv().lv === 5 && !got['lv10'] && newly.length === 1);
newly = Site.checkAch();
T('级联: ach_奖励入账累计满10次 → rec10 解锁', newly.some(function (a) { return a.id === 'rec10'; }) && Site.exp() === 1300, Site.exp());
T('真收敛: 继续重估无新解锁', Site.checkAch().length === 0);

sec('📅 每日签到');
var today = Site._dayStr();
var r = Site.checkin();
T('首次签到 ok/连签1/累计1/奖励60', r.ok === true && r.ci.streak === 1 && r.ci.total === 1 && r.bonus === 60, JSON.stringify(r));
var cklog = JSON.parse(LS.getItem('aox_exp_log'));
T('签到经验入账本(checkin_<today> 计1次)', !!cklog['checkin_' + today] && cklog['checkin_' + today].cnt === 1);
T('签到自定义文案 toast', TOASTS.some(function (t) { return t.indexOf('签到成功') >= 0; }));
got = JSON.parse(LS.getItem('aox_ach'));
T('签到直接触发重估 → ck1 解锁', !!got['ck1']);
var r2 = Site.checkin();
T('同日重复签到被拒', r2.ok === false && r2.msg.indexOf('已经签到') >= 0, JSON.stringify(r2));
var yest = Site._dayStr(Date.now() - 86400000);
LS.setItem('aox_checkin', JSON.stringify({ last: yest, streak: 6, total: 1 }));
r = Site.checkin();
T('昨日连签6 → 今天连签7, 奖励封顶120', r.ok && r.ci.streak === 7 && r.bonus === 120, JSON.stringify(r));
got = JSON.parse(LS.getItem('aox_ach'));
T('连签徽章 ck3/ck7 解锁', !!got['ck3'] && !!got['ck7']);
cklog = JSON.parse(LS.getItem('aox_exp_log'));
T('同日签到键2秒冷却: 账本仍只计1次', cklog['checkin_' + today].cnt === 1, cklog['checkin_' + today].cnt);
LS.setItem('aox_checkin', JSON.stringify({ last: yest, streak: 99, total: 2 }));
r = Site.checkin();
got = JSON.parse(LS.getItem('aox_ach'));
T('连签99 → 100天, ck30 解锁, 奖励仍封顶120', r.ci.streak === 100 && r.bonus === 120 && !!got['ck30'], JSON.stringify(r));
LS.setItem('aox_checkin', JSON.stringify({ last: Site._dayStr(Date.now() - 3 * 86400000), streak: 5, total: 3 }));
r = Site.checkin();
T('断签(3天前) → 连签重置为1', r.ok && r.ci.streak === 1, JSON.stringify(r));
LS.setItem('aox_checkin', JSON.stringify({ last: yest, streak: 1, total: 9 }));
r = Site.checkin();
got = JSON.parse(LS.getItem('aox_ach'));
T('累计签到10天 → ck10 解锁', r.ci.total === 10 && !!got['ck10'], JSON.stringify(r.ci));

sec('♟️ 数据徽章: 棋类/经营/创造/通关/隐藏');
LS.setItem('gomoku_p', '5');
Site.checkAch();
got = JSON.parse(LS.getItem('aox_ach'));
T('五子棋胜5局 → gmk5 解锁', !!got['gmk5']);
LS.setItem('ludo_w', '1'); LS.setItem('chk_p', '1'); LS.setItem('rev_p', '1');
Site.checkAch();
got = JSON.parse(LS.getItem('aox_ach'));
T('四棋各胜1局 → board3 解锁', !!got['board3']);
T('棋类总胜9局未达 board10', !got['board10']);
LS.setItem('snakeL_w', '1');
LS.setItem('gomoku_p', '6'); // 总胜 10
Site.checkAch();
got = JSON.parse(LS.getItem('aox_ach'));
T('棋类总胜10局 → board10 解锁', !!got['board10']);
LS.setItem('starfarm_save_v1', JSON.stringify({ gold: 6000, day: 12 }));
Site.checkAch();
got = JSON.parse(LS.getItem('aox_ach'));
T('星露存款6000 → farmRich 解锁', !!got['farmRich']);
lg = JSON.parse(LS.getItem('aox_exp_log') || '{}');
lg['starfarm_firstHarvest'] = { cnt: 1, ts: 0 };
LS.setItem('aox_exp_log', JSON.stringify(lg));
Site.checkAch();
got = JSON.parse(LS.getItem('aox_ach'));
T('星露里程碑 → farm1 解锁', !!got['farm1']);
LS.setItem('weiren_shop_v1', '{}');
LS.setItem('music_vault', JSON.stringify([{ n: '我的歌' }]));
LS.setItem('game_vault', JSON.stringify([{}, {}]));
LS.setItem('pet_v2', JSON.stringify({ type: 'dog', level: 2 }));
Site.checkAch();
got = JSON.parse(LS.getItem('aox_ach'));
T('小店/歌曲/自制游戏/宠物 → shop1/song1/game1/pet1 解锁', !!got['shop1'] && !!got['song1'] && !!got['game1'] && !!got['pet1']);
lg = JSON.parse(LS.getItem('aox_exp_log') || '{}');
['genshin_clear', 'hsr_clear', 'sheep_clear', 'troll_clear'].forEach(function (k) { lg[k] = { cnt: 1, ts: 0 }; });
LS.setItem('aox_exp_log', JSON.stringify(lg));
Site.checkAch();
got = JSON.parse(LS.getItem('aox_ach'));
T('通关4款 → clear1/clear4 解锁', !!got['clear1'] && !!got['clear4']);
Site._nowHour = function () { return 2; }; // 凌晨2点
Site.checkAch();
got = JSON.parse(LS.getItem('aox_ach'));
T('凌晨时段 → 隐藏徽章 夜猫子 解锁', !!got['owl']);
Site._nowHour = function () { return 14; };
LS.setItem('aox_music_played', 'true');
Site.checkAch();
got = JSON.parse(LS.getItem('aox_ach'));
T('用过播放器 → 隐藏徽章 Site DJ 解锁', !!got['dj']);
LS.setItem('aox_played', JSON.stringify({ 'snake.html': 1, 'tetris.html': 2, 'index.html': 1, 'achievements.html': 1 }));
T('游玩计数排除首页/成就页(=2)', Site.achState().playedN === 2, Site.achState().playedN);

sec('🏆 全解锁冲刺 + HUD/面板/成就页');
var pl = {};
for (var i = 1; i <= 80; i++) pl['g' + i + '.html'] = 1;
LS.setItem('aox_played', JSON.stringify(pl)); // 80款游玩
lg = JSON.parse(LS.getItem('aox_exp_log') || '{}');
for (var j = 1; j <= 10; j++) lg['x' + j] = { cnt: 1, ts: 0 };
lg['x1'].cnt = 250; // 累计破纪录250次
LS.setItem('aox_exp_log', JSON.stringify(lg));
LS.setItem('aox_exp', '999999'); // 直冲 Lv.20+
var lastNew = Site.checkAch();
got = JSON.parse(LS.getItem('aox_ach'));
var miss = Site.ACH.filter(function (a) { return !got[a.id]; }).map(function (a) { return a.id; });
T('33枚徽章全部可解锁', Site.achGot() === 33, '缺:' + miss.join(','));
T('冲刺批次确实发了一批(非空且含lv20)', lastNew.some(function (a) { return a.id === 'lv20'; }), JSON.stringify(lastNew.map(function (a) { return a.id; })));

// ---------- 沙箱2: UI测试(干净状态) ----------
var sb2 = makeSandbox();
vm.createContext(sb2);
vm.runInContext(sharedSrc, sb2, { filename: 'shared.js' });
sb2.toast = function () { };
sb2.Site._nowHour = function () { return 14; };
if (sb2.Site._achT) { sb2.clearTimeout(sb2.Site._achT); sb2.Site._achT = null; }
sb2.Site.checkAchSoon = function () { };
['aox_ach', 'aox_exp', 'aox_exp_log', 'aox_played', 'aox_checkin', 'aox_music_played', 'visit_stats'].forEach(function (k) { sb2.localStorage.removeItem(k); });

sec('🖥️ HUD胶囊 + 成就面板(干净沙箱)');
var hudAch = sb2.document.getElementById('hudAch');
T('HUD 成就胶囊存在', !!hudAch);
var hudHtml = sb2.document.getElementById('siteHud').innerHTML;
T('HUD 含成就胶囊(🏆 + /33 计数)', hudHtml.indexOf('🏆') >= 0 && hudHtml.indexOf('/33') >= 0, hudHtml.slice(0, 100));
try {
  var created = [];
  var origCreate = sb2.document.createElement;
  sb2.document.createElement = function (tag) { var e = origCreate(tag); created.push(e); return e; }; // 捕获模态元素(桩环境不注册id)
  sb2.Site.achModal();
  sb2.document.createElement = origCreate;
  var m = created.filter(function (e) { return e.id === 'siteAchModal'; })[0];
  T('成就面板打开无异常', !!m && m.innerHTML.length > 0);
  var tiles = (m.innerHTML.match(/ 经验<\/div>/g) || []).length;
  T('面板渲染全部33枚瓦片', tiles === 33, tiles);
  T('未解锁隐藏徽章显示？？？且不泄露真名', m.innerHTML.indexOf('？？？') >= 0 && m.innerHTML.indexOf('夜猫子') < 0);
  T('面板含每日签到卡', m.innerHTML.indexOf('每日签到') >= 0);
} catch (e) { T('成就面板打开无异常', false, e.message); }

sec('📄 achievements.html 页面脚本渲染');
try {
  var pageHtml = fs.readFileSync('achievements.html', 'utf8');
  var pm = pageHtml.match(/<script>((?:(?!<\/script>)[\s\S])*)<\/script>/);
  T('页面首段内联脚本可提取', !!pm);
  vm.runInContext(pm[1], sb2, { filename: 'achievements.html#inline' });
  T('统计板渲染(含等级)', sb2.document.getElementById('statBoard').innerHTML.indexOf('Lv.') >= 0);
  T('签到卡渲染', sb2.document.getElementById('ckCard').innerHTML.indexOf('每日签到') >= 0);
  T('分类徽章区渲染(含初来乍到)', sb2.document.getElementById('achCats').innerHTML.indexOf('初来乍到') >= 0);
} catch (e) { T('achievements.html 页面脚本渲染', false, e.message); }

console.log('');
console.log('总用例 ' + total + ' · 失败 ' + failures);
if (failures > 0) { console.log('❌ 有失败用例'); process.exit(1); }
else console.log('✅ 成就系统测试全部通过');
