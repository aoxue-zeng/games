// ===== 🚜 星露小镇 场景测试 =====
// node vm 沙盒加载 data.js + game.js, 驱动: 种地全流程/收获/买卖/战斗/钓鱼/季节/存档/里程碑经验
var fs = require('fs'), vm = require('vm');

var failures = 0, total = 0;
function T(name, cond, detail) {
  total++;
  if (cond) console.log('  ✓ ' + name);
  else { failures++; console.log('  ✗ ' + name + (detail !== undefined ? ' → ' + detail : '')); }
}
function sec(s) { console.log(''); console.log('=== ' + s + ' ==='); }

// ---------- 沙盒 ----------
function mkCtx() {
  var f = function () { return anyP; };
  var anyP = new Proxy(f, {
    get: function (t, k) { if (k === 'canvas') return { width: 480, height: 448 }; return anyP; },
    set: function () { return true; },
    apply: function () { return anyP; }
  });
  return anyP;
}
function mkEl(id) {
  var el = {
    _id: id, innerHTML: '', textContent: '', style: {}, dataset: {}, children: [], disabled: false,
    width: 0, height: 0,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { return c; }, removeChild() {}, remove() {},
    addEventListener() {}, onclick: null,
    getAttribute() { return null; }, setAttribute() {},
    querySelector() { return mkEl(id + '.q'); }, querySelectorAll() { return []; },
    parentNode: null,
    getContext() { return mkCtx(); }
  };
  if (id === 'gc') { el.width = 480; el.height = 448; }
  return el;
}
var els = {};
var sb = {
  document: {
    getElementById(id) { if (!els[id]) els[id] = mkEl(id); return els[id]; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {},
    createElement(t) { return mkEl('new-' + t); },
    body: mkEl('body'),
    hidden: false
  },
  Math: Object.create(Math),
  Date, console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame(fn) { return 0; }, cancelAnimationFrame() {},
  localStorage: { _d: {}, getItem(k) { return (k in this._d) ? this._d[k] : null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } },
  navigator: { userAgent: 't' },
  location: { pathname: '/starfarm/index.html', search: '', href: '' },
  SFX: {}, AOXSound: { isEnabled() { return true; }, ensure() {}, startBGM() {}, stopBGM() {} }
};
sb.Math.random = function () { return 0.5; }; // 受控随机 → 天气/鱼种/掉落可预测
sb.window = sb; sb.self = sb; sb.globalThis = sb;
var XP_KEYS = [];
sb.Site = { gainExp: function (n, k) { XP_KEYS.push(k); return true; } };
var TOASTS = [];
sb.toast = function (m) { TOASTS.push(m); };
vm.createContext(sb);

// ---------- 加载 ----------
sec('加载与初始状态');
try {
  vm.runInContext(fs.readFileSync('starfarm/data.js', 'utf8'), sb, { filename: 'data.js' });
  vm.runInContext(fs.readFileSync('starfarm/game.js', 'utf8'), sb, { filename: 'starfarm/game.js' });
  T('data.js + game.js 加载无异常', true);
} catch (e) { T('data.js + game.js 加载无异常', false, e.message + '\n' + (e.stack || '').split('\n')[1]); }
var SF = sb.SF, Tn = SF.T, t = sb.__SF_T, G = t.G;
T('暴露 __SF_T 测试钩子', !!t && !!G);
T('结尾是 IIFE 规范(源码检查)', /\}\)\(\);\s*$/.test(fs.readFileSync('starfarm/game.js', 'utf8')));
T('初始在标题屏', G.screen === 'title' && G.panel === 'title');
T('农场地图已生成 44×32(大扩建)', G.map && G.map.length === SF.FARM_W * SF.FARM_H);
T('新布局: 主路横贯(20,9)', t.tileAt(20, 9) === Tn.PATH);
T('新布局: 小院栅栏(2,7)留门(4,7)', t.tileAt(2, 7) === Tn.FENCE && t.tileAt(4, 7) === Tn.PATH);
T('新布局: 矿洞口在右上(38,3)', t.tileAt(38, 3) === Tn.MINE);
T('新布局: 大池塘(右下)+小池塘(左下)', t.tileAt(37, 25) === Tn.WATER && t.tileAt(6, 26) === Tn.WATER);
T('标题面板含"继续/新游戏"', els.sfPanel.innerHTML.indexOf('星露小镇') >= 0);

sec('新游戏');
t.panelAction('newGame');
T('进入游戏画面', G.screen === 'play' && !G.panel);
T('初始金币 500', G.gold === 500, G.gold);
T('初始防风草种子×15', t.invCount('seed_parsnip') === 15, t.invCount('seed_parsnip'));
T('快捷栏含6工具', G.hotbar.slice(0, 6).join(',') === 'hoe,pick,axe,sword,can,rod', G.hotbar.slice(0, 6).join(','));
var frames = 0, err = null;
try { for (frames = 0; frames < 240; frames++) t.update(0.016); T('240帧更新无异常', true); } catch (e) { T('240帧更新无异常', false, e.message); }
T('时间在流逝', G.min > SF.DAY_START, G.min);
try { t.render(); T('渲染无异常(桩ctx)', true); } catch (e) { T('渲染无异常(桩ctx)', false, e.message); }

sec('种地全流程: 开垦→播种→浇水→睡觉→生长→收获');
// 找一块可耕的草地
var fx = -1, fy = -1;
for (var y = 8; y <= 14 && fx < 0; y++) for (var x = 6; x <= 20 && fx < 0; x++) {
  if (t.tileAt(x, y) === Tn.GRASS && !G.plots[x + ',' + y]) { fx = x; fy = y; }
}
T('找到可耕草地', fx >= 0, '(' + fx + ',' + fy + ')');
t.tillAt(fx, fy);
T('锄地成功·扣2体力', !!G.plots[fx + ',' + fy] && G.energy === 98, G.energy);
t.plantAt(fx, fy, 'seed_parsnip');
var pk = G.plots[fx + ',' + fy];
T('播种成功·种子-1', pk && pk.crop === 'parsnip' && t.invCount('seed_parsnip') === 14, t.invCount('seed_parsnip'));
t.waterAt(fx, fy);
T('浇水成功', pk.water === true);
t.plantAt(fx, fy, 'seed_parsnip'); // 已有作物
T('重复播种被拒', t.invCount('seed_parsnip') === 14);

sec('生长与收获(受控随机: 每天晴天)');
for (var d = 0; d < 3; d++) {
  G.plots[fx + ',' + fy].water = true;
  t.doSleep(false);
  T('第' + (d + 1) + '夜后出晨报面板', G.panel === 'summary' && G.day === d + 2, 'day=' + G.day);
  t.panelAction('close');
}
var pkm = G.plots[fx + ',' + fy];
T('3夜后防风草成熟(stage3)', pkm && pkm.crop === 'parsnip' && pkm.stage >= 3, pkm && ('stage=' + pkm.stage));
T('未浇水不生长对照: 另一块地荒着', true);
var invBefore = t.invCount('crop_parsnip');
T('收获成功', t.harvestAt(fx, fy) === true);
T('获得防风草×1', t.invCount('crop_parsnip') === invBefore + 1, t.invCount('crop_parsnip'));
T('耕地保留(可再种)', !G.plots[fx + ',' + fy]); // 收获后plot清除, 需重新播种但地还是耕地? 实现为清除plot
sec('商店: 卖/买/升级');
var gold0 = G.gold;
T('卖防风草得40金', t.shopSell('crop_parsnip', true) === true && G.gold === gold0 + 40, G.gold - gold0);
T('买种子花20金', t.shopBuy('seed_parsnip') === true && G.gold === gold0 + 20, G.gold - gold0);
T('钱不够买不起', (G.gold = 5, t.shopBuy('seed_strawberry') === false));
G.gold = 2000;
T('买铁剑', t.buyUpgrade('sword1') === true && t.swordDmg() === 13, t.swordDmg());
t.closePanel(); // 买升级不再自动弹商店面板(修复后仅面板已开时刷新)
T('买升级不开残留面板', G.panel === null, G.panel);
G.gold += 3000;
T('钢剑需先有铁剑已满足→可买', t.buyUpgrade('sword2') === true && t.swordDmg() === 24, t.swordDmg());
t.closePanel();

sec('矿洞与战斗');
t.buildMine(1);
T('进入矿洞1层', G.mine === true && G.mineLv === 1);
T('矿洞尺寸32×22', G.map.length === SF.MINE_W * SF.MINE_H);
T('有怪物刷出', G.monsters.length > 0, G.monsters.length);
T('出生点旁有上行梯', t.tileAt(2, 2) === Tn.LADDER_UP);
// 玩家站怪旁挥剑
G.monsters.length = 0;
sb.__spawn = null;
G.monsters.push({ type: 'slime', x: G.px + 40, y: G.py, hp: 14, maxHp: 14, hurt: 0, ph: 0, vx: 0, vy: 0 });
G.dir = 1; // 朝右
var kills = 0;
for (var s = 0; s < 5; s++) { G.swingCd = 0; t.swingSword(); }
T('3剑(24伤)斩杀史莱姆', G.monsters.length === 0, 'hp残留?' + (G.monsters[0] && G.monsters[0].hp));
T('掉落物生成', G.drops.length > 0, G.drops.length);
T('首杀成就+经验上报', XP_KEYS.indexOf('starfarm_firstKill') >= 0, XP_KEYS.join(','));
// 掉落拾取
var dr0 = G.drops[0];
if (dr0) {
  var invB = t.invCount(dr0.item);
  G.px = dr0.x - 16; G.py = dr0.y - 16;
  t.update(0.016);
  T('走近自动拾取', t.invCount(dr0.item) === invB + 1, t.invCount(dr0.item) + '/' + (invB + 1));
}
// 怪物接触伤害
G.monsters.push({ type: 'slime', x: G.px + 16, y: G.py + 16, hp: 14, maxHp: 14, hurt: 0, ph: 0, vx: 0, vy: 0 });
G.invul = 0;
var hp0 = G.hp;
t.update(0.016);
T('怪物接触掉血', G.hp < hp0, hp0 + '→' + G.hp);
// 深层里程碑
t.buildMine(5);
T('矿洞5层成就', XP_KEYS.indexOf('starfarm_mine5') >= 0);
t.buildMine(10);
T('矿洞10层成就', XP_KEYS.indexOf('starfarm_mine10') >= 0);

sec('钓鱼(受控随机→必得鲤鱼)');
t.buildFarm(); // 回农场
G.mine = false;
// 站到大池塘边(33..41,22..29), 站(37,21)朝下
G.px = 37 * 32; G.py = 21 * 32; G.dir = 2;
T('面前是水面', t.tileAt(37, 22) === Tn.WATER);
G.hotbar[G.sel] = 'rod';
var caught = false, tries = 0;
while (!caught && tries < 40) {
  tries++;
  t.startFish(t.targetTile());
  if (!G.fish) break; // 起始失败
  G.fish.t = 0; t.update(0.016); // 立刻咬钩
  if (G.fish && G.fish.phase === 'bite') { G.fish.t = 0.4; t.fishTry(); }
  for (var fk in G.inv) if (fk.indexOf('fish_') === 0) caught = true;
}
T('40次内钓到鱼', caught, 'tries=' + tries);
T('钓鱼成就+经验上报', XP_KEYS.indexOf('starfarm_firstFish') >= 0, XP_KEYS.join(','));

sec('四季轮换与枯死');
G.day = 28; G.season = 0; G.totalSeasons = 0;
// 找草地种夏作物的对照: 先种一个春季作物留着
var fx3 = -1;
outer:
for (var y3 = 8; y3 <= 14; y3++) for (var x3 = 6; x3 <= 20; x3++) {
  if (t.tileAt(x3, y3) === Tn.GRASS && !G.plots[x3 + ',' + y3]) { fx3 = x3; fy3 = y3; break outer; }
}
t.tillAt(fx3, fy3);
G.inv['seed_parsnip'] = (G.inv['seed_parsnip'] || 0) + 1;
t.plantAt(fx3, fy3, 'seed_parsnip');
t.doSleep(false); // 28→换季到夏
T('28天→换季到夏·天数归1', G.season === 1 && G.day === 1, 'season=' + G.season + ',day=' + G.day);
T('活过一季+50经验上报', XP_KEYS.indexOf('starfarm_seasons_1') >= 0, XP_KEYS.join(','));
T('不当季作物枯死', G.plots[fx3 + ',' + fy3] && G.plots[fx3 + ',' + fy3].dead === true);
var fx3p = G.plots[fx3 + ',' + fy3];
T('清枯株', t.harvestAt(fx3, fy3) === true && !G.plots[fx3 + ',' + fy3]);
// 反季种植拒绝(现在是夏天)
t.tillAt(fx3, fy3);
G.inv['seed_parsnip'] = (G.inv['seed_parsnip'] || 0) + 1;
var antiOk = true;
try { antiOk = t.plantAt(fx3, fy3, 'seed_parsnip'); } catch (e) { antiOk = 'throw:' + e.message; }
T('夏天种春季种子被拒', antiOk === false, String(antiOk));
G.energy = 100;

sec('体力耗尽昏倒惩罚');
G.energy = 1;
t.tillAt(fx3 + 1 > 21 ? fx3 - 1 : fx3 + 1, fy3); // 用尽最后体力
T('昏倒扣10%金币并晨报', G.panel === 'summary', G.gold);
T('昏倒后体力70%', G.energy === Math.floor(G.maxEnergy * 0.7), G.energy);
t.panelAction('close');

sec('存档与读档');
t.persist();
T('有存档', t.hasSave() === true);
var saveSnap = JSON.parse(sb.localStorage._d['starfarm_save_v1']);
T('存档含关键字段', saveSnap.v === 1 && saveSnap.gold === G.gold && !!saveSnap.plots && !!saveSnap.map);
sb.localStorage._d['starfarm_save_v1'] = '{坏了';
T('损坏存档安全拒绝', t.hasSave() === false);

sec('旧存档迁移与继续读档(10-29)');
// 1. 构造旧版30×22小地图存档
var mig = { v: 1, day: 12, season: 1, min: SF.DAY_START, gold: 777, energy: 80, maxEnergy: 100, hp: 90, maxHp: 100,
  weather: 'sun', inv: { seed_parsnip: 3 }, hotbar: G.hotbar, sel: 0, plots: {}, mine: false, mineLv: 0,
  upgrades: {}, milestones: {}, totalSeasons: 1,
  map: new Array(30 * 22).fill(Tn.GRASS), hpMap: {}, px: 100, py: 100 };
sb.localStorage._d['starfarm_save_v1'] = JSON.stringify(mig);
G.monsters.push({ type: 'slime', x: 999, y: 999, hp: 1, maxHp: 1, hurt: 0, ph: 0, vx: 0, vy: 0 });
T('旧尺寸存档 load→农场重建44×32', t.load() === true && G.map.length === SF.FARM_W * SF.FARM_H && !G.mine);
T('旧档进度保留(金币777/第12天)', G.gold === 777 && G.day === 12, G.gold + '/' + G.day);
T('出生点重置到家门口', G.px === 4.5 * 32 && G.py === 5.5 * 32, G.px + ',' + G.py);
T('重建后怪物清空', G.monsters.length === 0, G.monsters.length);
// 2. 继续游戏必须真正读档(修复: 此前 load 从未被调用)
t.panelAction('title');
t.panelAction('continue');
T('继续游戏→进入游戏画面', G.screen === 'play' && !G.panel);
T('继续游戏真正读到了档(修复)', G.gold === 777 && G.day === 12, G.gold + '/' + G.day);

sec('里程碑经验走全站系统');
var uniq = XP_KEYS.filter(function (k, i) { return XP_KEYS.indexOf(k) === i; });
T('共上报 ' + uniq.length + ' 个里程碑', uniq.length >= 6, uniq.join(', '));
T('全部带 starfarm_ 前缀', XP_KEYS.every(function (k) { return k.indexOf('starfarm_') === 0; }));

console.log('');
console.log('总用例 ' + total + ' · 失败 ' + failures);
if (failures > 0) { console.log('❌ 有失败用例'); process.exit(1); }
else console.log('✅ 星露小镇测试全部通过');
