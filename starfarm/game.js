// ===== 星露小镇 · 游戏引擎 =====
// 星露谷式种田 RPG: 种地/矿洞打怪/钓鱼/商店/四季/昼夜体力/自动存档
// 依赖: ../data.js (SF), ../sound.js (SFX/AOXSound), ../mobile.js (AOXMobile), ../shared.js (Site/toast)
(function () {
  'use strict';
  var T = SF.T, ITEMS = SF.ITEMS, CROPS = SF.CROPS, MONS = SF.MONSTERS;
  var cv = document.getElementById('gc');
  var ctx = cv.getContext('2d');
  var W = cv.width, H = cv.height;

  // ---------- 小工具 ----------
  function $(id) { return document.getElementById(id); }
  function sfx(n) { try { if (window.SFX && SFX[n]) SFX[n](); } catch (e) { } }
  function store(k, v) { try { if (v === undefined) { var s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function award(key) { try { if (window.Site && Site.gainExp) Site.gainExp(50, key); } catch (e) { } }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  var SAVE_KEY = 'starfarm_save_v1';

  // ---------- 游戏状态 ----------
  var G = {
    screen: 'title',        // title | play
    panel: null,            // null | 'shop' | 'bag' | 'sleep' | 'summary' | 'help' | 'confirmNew'
    day: 1, season: 0, min: SF.DAY_START,
    gold: 500, energy: 100, maxEnergy: 100, hp: 100, maxHp: 100,
    weather: 'sun', todayEarn: 0,
    map: null, mine: false, mineLv: 0,
    px: 4.5 * 32, py: 8 * 32, dir: 2, // dir: 0上1右2下3左
    moving: false, animT: 0,
    inv: {}, hotbar: ['hoe', 'pick', 'axe', 'sword', 'can', 'rod', 'seed_parsnip', null, null, null], sel: 0,
    plots: {}, hpMap: {},
    monsters: [], drops: [], flos: [], parts: [], rains: [],
    swing: 0, swingCd: 0, invul: 0,
    fish: null,             // {phase:'wait'|'bite', t, fx, fy}
    upgrades: {}, milestones: {}, totalSeasons: 0,
    camX: 0, camY: 0, t: 0, warned24: false
  };

  // ---------- 存档 ----------
  function persist() {
    store(SAVE_KEY, {
      v: 1, day: G.day, season: G.season, min: G.min, gold: G.gold,
      energy: G.energy, maxEnergy: G.maxEnergy, hp: G.hp, maxHp: G.maxHp,
      weather: G.weather, inv: G.inv, hotbar: G.hotbar, sel: G.sel,
      plots: G.plots, map: G.map, hpMap: G.hpMap, mine: G.mine, mineLv: G.mineLv,
      upgrades: G.upgrades, milestones: G.milestones, totalSeasons: G.totalSeasons,
      px: G.px, py: G.py
    });
  }
  function hasSave() { var s = store(SAVE_KEY); return !!s && s.v === 1; }
  function load() {
    var s = store(SAVE_KEY);
    if (!s || s.v !== 1) return false;
    try {
      G.day = s.day; G.season = s.season || 0; G.min = s.min; G.gold = s.gold;
      G.energy = s.energy; G.maxEnergy = s.maxEnergy || 100; G.hp = s.hp; G.maxHp = s.maxHp || 100;
      G.weather = s.weather || 'sun'; G.inv = s.inv || {}; G.hotbar = s.hotbar || G.hotbar;
      G.sel = s.sel || 0; G.plots = s.plots || {}; G.map = s.map; G.hpMap = s.hpMap || {};
      G.mine = !!s.mine; G.mineLv = s.mineLv || 0; G.upgrades = s.upgrades || {};
      G.milestones = s.milestones || {}; G.totalSeasons = s.totalSeasons || 0;
      G.px = s.px; G.py = s.py;
      // 地图尺寸校验: 旧版小地图存档→重建新图 (10-29 地图大扩建)
      var needLen = G.mine ? SF.MINE_W * SF.MINE_H : SF.FARM_W * SF.FARM_H;
      G.map = (s.map && s.map.length === needLen) ? s.map : null;
      if (G.mine) { buildMine(G.mineLv); } // 矿洞按层重新生成(顺带补怪物)
      if (!G.map || solid(tileAt(Math.floor((G.px + 16) / 32), Math.floor((G.py + 16) / 32)))) {
        // 重建/出生点被新地形卡住 → 回到家门口
        buildFarm();
        G.monsters = [];
        G.px = 4.5 * 32; G.py = 5.5 * 32; G.dir = 2;
      }
      return true;
    } catch (e) { return false; }
  }
  function milestone(key) {
    if (G.milestones[key]) return;
    G.milestones[key] = true;
    var desc = SF.MILESTONES[key] || key;
    toast('🏆 成就达成：' + desc + '！');
    award('starfarm_' + key);
    persist();
  }

  // ---------- 地图 ----------
  function tileAt(x, y) {
    var m = G.map, w = G.mine ? SF.MINE_W : SF.FARM_W, h = G.mine ? SF.MINE_H : SF.FARM_H;
    if (x < 0 || y < 0 || x >= w || y >= h) return T.ROCK;
    return m[y * w + x];
  }
  function setTile(x, y, t) {
    var w = G.mine ? SF.MINE_W : SF.FARM_W;
    if (x < 0 || y < 0) return;
    G.map[y * w + x] = t;
  }
  function solid(t, fly) {
    if (t === T.GRASS || t === T.TILL || t === T.PATH || t === T.LADDER_UP || t === T.LADDER_DOWN) return false;
    if (fly && (t === T.ROCK || t === T.ORE_FE || t === T.ORE_AU || t === T.ORE_DI)) return false; // 飞行怪越过岩石
    return true;
  }
  function buildFarm() {
    var w = SF.FARM_W, h = SF.FARM_H, m = [], x, y, n;
    for (var i = 0; i < w * h; i++) m.push(T.GRASS);
    for (x = 0; x < w; x++) { m[x] = T.TREE; m[(h - 1) * w + x] = T.TREE; }
    for (y = 0; y < h; y++) { m[y * w] = T.TREE; m[y * w + w - 1] = T.TREE; }
    // 自家(左上) + 栅栏小院
    for (y = 1; y <= 4; y++) for (x = 2; x <= 6; x++) m[y * w + x] = T.HOUSE;
    m[4 * w + 4] = T.DOOR; // 家门=睡觉
    for (y = 5; y <= 8; y++) m[y * w + 4] = T.PATH;
    for (x = 2; x <= 8; x++) if (x !== 4) m[7 * w + x] = T.FENCE; // 小院栅栏(留门)
    // 主路: 横贯东西
    for (x = 4; x <= 38; x++) m[9 * w + x] = T.PATH;
    // 商店(上中) + 竖道连主路
    for (x = 10; x <= 15; x++) { m[2 * w + x] = T.SHOP; m[3 * w + x] = T.PATH; }
    for (y = 4; y <= 8; y++) { m[y * w + 12] = T.PATH; m[y * w + 13] = T.PATH; }
    // 矿洞口(右上) + 竖道连主路
    m[3 * w + 38] = T.MINE; m[3 * w + 37] = T.PATH;
    for (y = 4; y <= 8; y++) m[y * w + 38] = T.PATH;
    // 大池塘(右下) + 小池塘(左下), 两处钓点
    for (y = 22; y <= 29; y++) for (x = 33; x <= 41; x++) m[y * w + x] = T.WATER;
    for (y = 24; y <= 28; y++) for (x = 4; x <= 9; x++) m[y * w + x] = T.WATER;
    var rng = mulberry32(20261029);
    var kept = 0;
    for (n = 0; n < 110 && kept < 52; n++) {
      x = 2 + ((rng() * (w - 4)) | 0); y = 5 + ((rng() * (h - 7)) | 0);
      if (m[y * w + x] !== T.GRASS) continue;
      // 设施周边留空: 家门口/商店前/矿洞前/两大池塘岸边
      if ((x >= 3 && x <= 6 && y >= 5 && y <= 10) || (x >= 9 && x <= 16 && y >= 3 && y <= 10) ||
          (x >= 35 && x <= 40 && y >= 3 && y <= 10) || (x >= 31 && x <= 42 && y >= 20 && y <= 30) ||
          (x >= 3 && x <= 10 && y >= 22 && y <= 29)) continue;
      m[y * w + x] = (kept % 3 === 0) ? T.ROCK : T.TREE; kept++;
    }
    G.map = m; G.mine = false;
  }
  function buildMine(lv) {
    var w = SF.MINE_W, h = SF.MINE_H, m = [], x, y;
    for (var i = 0; i < w * h; i++) m.push(T.GRASS);
    for (x = 0; x < w; x++) { m[x] = T.ROCK; m[(h - 1) * w + x] = T.ROCK; }
    for (y = 0; y < h; y++) { m[y * w] = T.ROCK; m[y * w + w - 1] = T.ROCK; }
    var rng = mulberry32(4451 + lv * 7717);
    var pFe = Math.min(0.13, 0.05 + lv * 0.012), pAu = lv >= 4 ? Math.min(0.08, 0.01 + lv * 0.008) : 0, pDi = lv >= 8 ? 0.03 : 0;
    for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) {
      var r = rng();
      if (r < 0.38) m[y * w + x] = T.ROCK;
      else if (r < 0.38 + pFe) m[y * w + x] = T.ORE_FE;
      else if (r < 0.38 + pFe + pAu) m[y * w + x] = T.ORE_AU;
      else if (r < 0.38 + pFe + pAu + pDi) m[y * w + x] = T.ORE_DI;
    }
    m[2 * w + 2] = T.LADDER_UP;
    m[2 * w + 3] = T.GRASS; m[3 * w + 2] = T.GRASS; m[3 * w + 3] = T.GRASS; m[2 * w + 1] = T.GRASS; m[1 * w + 2] = T.GRASS;
    G.map = m; G.mine = true; G.mineLv = lv;
    G.monsters = [];
    var count = Math.min(2 + lv, 10), rng2 = mulberry32(99 + lv * 13);
    for (var k = 0; k < count; k++) {
      var mx = 1 + ((rng2() * (w - 2)) | 0), my = 1 + ((rng2() * (h - 2)) | 0);
      if (tileAt(mx, my) !== T.GRASS) continue;
      if (Math.abs(mx - 2) + Math.abs(my - 2) < 6) continue;
      var type = 'slime';
      if (lv >= 4 && rng2() < 0.35) type = 'skel';
      else if (lv >= 2 && rng2() < 0.4) type = 'bat';
      if (lv % 5 === 0 && k === 0) type = 'king';
      spawnMonster(type, mx * 32 + 16, my * 32 + 16);
    }
    if (lv >= 5) milestone('mine5');
    if (lv >= 10) milestone('mine10');
    updHud();
  }
  function spawnMonster(type, x, y) {
    var d = MONS[type];
    G.monsters.push({ type: type, x: x, y: y, hp: d.hp, maxHp: d.hp, hurt: 0, ph: Math.random() * 6.28, vx: 0, vy: 0 });
  }

  // ---------- 背包 ----------
  var hotDirty = true;
  function invCount(id) { return G.inv[id] || 0; }
  function addItem(id, n) { G.inv[id] = (G.inv[id] || 0) + (n || 1); hotDirty = true; }
  function useItem(id, n) {
    if (!G.inv[id]) return false;
    G.inv[id] -= (n || 1);
    if (G.inv[id] <= 0) { delete G.inv[id]; for (var i = 0; i < G.hotbar.length; i++) if (G.hotbar[i] === id) G.hotbar[i] = null; }
    hotDirty = true;
    return true;
  }
  function selItem() { var id = G.hotbar[G.sel]; return id || null; }
  function swordDmg() { if (G.upgrades.sword2) return 24; if (G.upgrades.sword1) return 13; return 6; }
  function moveSpeed() { return G.upgrades.boots ? 150 : 120; } // px/秒

  // ---------- 提示 ----------
  function toast(msg) { try { if (window.toast) window.toast(msg); } catch (e) { } }
  function flo(x, y, txt, color) { G.flos.push({ x: x, y: y, txt: txt, t: 1.1, color: color || '#fff' }); }
  function burst(x, y, color) {
    for (var i = 0; i < 7; i++) G.parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * 130, vy: (Math.random() - 0.7) * 130, t: 0.5, color: color });
  }

  // ---------- 面前目标格 ----------
  function targetTile() {
    var cx = G.px + 16, cy = G.py + 16;
    var dx = [0, 1, 0, -1][G.dir], dy = [-1, 0, 1, 0][G.dir];
    return { x: Math.floor((cx + dx * 26) / 32), y: Math.floor((cy + dy * 26) / 32) };
  }
  function plotKey(x, y) { return x + ',' + y; }

  // ---------- 动作 ----------
  function spendEnergy(n) {
    G.energy -= n;
    flo(G.px + 16, G.py - 6, '-' + n + '⚡', '#ffd54f');
    if (G.energy <= 0) { G.energy = 0; faint('体力耗尽'); }
  }
  function interact() { // E键总入口
    if (G.panel) return;
    if (G.fish) { fishTry(); return; }
    var t = targetTile(), tt = tileAt(t.x, t.y);
    // 1. 设施交互
    if (tt === T.DOOR) { openPanel('sleep'); sfx('select'); return; }
    if (tt === T.SHOP) { openPanel('shop'); sfx('select'); return; }
    if (!G.mine && tt === T.MINE) { toast('⛏ 走进矿洞…'); buildMine(G.mineLv > 0 ? G.mineLv : 1); G.px = 2.5 * 32; G.py = 3 * 32; G.dir = 2; sfx('dig'); return; }
    if (G.mine && tt === T.LADDER_UP) { toast('☀️ 回到地面'); buildFarm(); G.px = 37.5 * 32; G.py = 4.2 * 32; G.dir = 1; sfx('back'); persist(); return; }
    if (G.mine && tt === T.LADDER_DOWN) { buildMine(G.mineLv + 1); G.px = 2.5 * 32; G.py = 3 * 32; toast('🪜 下到第 ' + G.mineLv + ' 层…越深越危险!'); sfx('dig'); return; }
    // 2. 收获(空手/任意都优先)
    if (!G.mine && G.plots[plotKey(t.x, t.y)]) { if (harvestAt(t.x, t.y)) return; }
    // 3. 工具/食物
    var id = selItem();
    if (id) useTool(id, t);
  }
  function useTool(id, t) {
    var it = ITEMS[id];
    if (!it) return;
    if (it.eat && !it.tool) { // 食物
      if (!useItem(id, 1)) return;
      G.energy = clamp(G.energy + (it.eat || 0), 0, G.maxEnergy);
      if (it.heal) G.hp = clamp(G.hp + it.heal, 0, G.maxHp);
      flo(G.px + 16, G.py - 8, '+' + (it.eat || it.heal) + (it.heal ? '❤️' : '⚡'), '#81c784');
      sfx('bubble'); updHud(); return;
    }
    var tool = it.tool;
    if (tool === 'till') tillAt(t.x, t.y);
    else if (tool === 'water') waterAt(t.x, t.y);
    else if (tool === 'pick') pickAt(t.x, t.y);
    else if (tool === 'axe') axeAt(t.x, t.y);
    else if (tool === 'sword') swingSword();
    else if (tool === 'fish') startFish(t);
  }
  function tillAt(x, y) {
    if (G.mine) { toast('矿洞里没法开垦'); return; }
    if (tileAt(x, y) !== T.GRASS) { if (tileAt(x, y) === T.TILL) toast('这里已经耕过了'); return; }
    var k = plotKey(x, y);
    G.plots[k] = { water: G.weather === 'rain', crop: null, stage: 0, dead: false };
    spendEnergy(2); sfx('dig');
    burst(x * 32 + 16, y * 32 + 16, '#8d5524');
    milestone('firstTill');
  }
  function plantAt(x, y, seedId) {
    var k = plotKey(x, y), p = G.plots[k];
    if (!p || p.crop) return false;
    var cid = ITEMS[seedId].seed, crop = CROPS[cid];
    if (crop.season !== G.season) { toast('🍂 ' + crop.n + '不适合' + SF.SEASONS[G.season].n + '天种'); return false; }
    if (!useItem(seedId, 1)) return false;
    p.crop = cid; p.stage = 0; p.dead = false;
    sfx('place');
    return true;
  }
  function waterAt(x, y) {
    var three = G.upgrades.can1 ? 3 : 1;
    var dx = [0, 1, 0, -1][G.dir], dy = [-1, 0, 1, 0][G.dir];
    var did = 0;
    for (var i = 0; i < three; i++) {
      var tx = x + dx * i * 0 - dy * i, ty = y + dy * i * 0 + dx * i; // 垂直于朝向展开
      var p = G.plots[plotKey(tx, ty)];
      if (p && !p.water) { p.water = true; did++; }
    }
    if (!did) { toast('这块地不需要浇水'); return; }
    spendEnergy(2); sfx('bubble');
  }
  function hitTile(x, y, tool) { // pick/axe 共用: 返回是否敲碎
    var tt = tileAt(x, y);
    var k = plotKey(x, y);
    var border = (x === 0 || y === 0 || x === (G.mine ? SF.MINE_W : SF.FARM_W) - 1 || y === (G.mine ? SF.MINE_H : SF.FARM_H) - 1);
    if (tt === T.ROCK || tt === T.ORE_FE || tt === T.ORE_AU || tt === T.ORE_DI) {
      if (border) { toast('敲不动, 太硬了!'); return false; }
      var hp = G.hpMap[k] === undefined ? (tt === T.ROCK ? 2 : 3) : G.hpMap[k];
      hp--;
      if (hp > 0) { G.hpMap[k] = hp; sfx('digStone'); burst(x * 32 + 16, y * 32 + 16, '#9e9e9e'); return false; }
      delete G.hpMap[k];
      setTile(x, y, T.GRASS);
      sfx('explode'); burst(x * 32 + 16, y * 32 + 16, '#616161');
      if (tt === T.ROCK) { dropLoot(x, y, 'stone', 1); if (Math.random() < 0.15) dropLoot(x, y, 'coal', 1); }
      else if (tt === T.ORE_FE) { dropLoot(x, y, 'iron', 1); }
      else if (tt === T.ORE_AU) { dropLoot(x, y, 'gold', 1); }
      else if (tt === T.ORE_DI) { dropLoot(x, y, 'gem', 1); }
      if (G.mine && Math.random() < 0.13) { setTile(x, y, T.LADDER_DOWN); toast('🪜 敲出了下行梯子!'); sfx('unlock'); }
      return true;
    }
    if (tt === T.TREE && tool === 'axe') {
      var th = G.hpMap[k] === undefined ? 3 : G.hpMap[k];
      th--;
      if (th > 0) { G.hpMap[k] = th; sfx('dig'); burst(x * 32 + 16, y * 32 + 16, '#2e7d32'); return false; }
      delete G.hpMap[k];
      setTile(x, y, T.GRASS);
      sfx('explode'); burst(x * 32 + 16, y * 32 + 16, '#43a047');
      dropLoot(x, y, 'wood', 3);
      return true;
    }
    return false;
  }
  function pickAt(x, y) {
    var tt = tileAt(x, y);
    if (tt !== T.ROCK && tt !== T.ORE_FE && tt !== T.ORE_AU && tt !== T.ORE_DI) return;
    spendEnergy(3);
    hitTile(x, y, 'pick');
  }
  function axeAt(x, y) {
    if (tileAt(x, y) !== T.TREE) { toast('斧头只能砍树'); return; }
    spendEnergy(3);
    hitTile(x, y, 'axe');
  }
  function harvestAt(x, y) {
    var p = G.plots[plotKey(x, y)];
    if (!p) return false;
    if (p.dead) { delete G.plots[plotKey(x, y)]; toast('🥀 清掉了枯萎的作物'); sfx('dig'); return true; }
    if (!p.crop) return false;
    var crop = CROPS[p.crop];
    if (p.stage < crop.days) return false;
    addItem('crop_' + p.crop, 1);
    delete G.plots[plotKey(x, y)];
    flo(x * 32 + 16, y * 32 + 8, '+' + crop.cropI, '#a5d6a7');
    toast('🌾 收获了 ' + crop.n + ' ' + crop.cropI + '！');
    sfx('coin');
    milestone('firstHarvest');
    return true;
  }
  function dropLoot(x, y, item, n) {
    G.drops.push({ x: x * 32 + 16 + (Math.random() * 12 - 6), y: y * 32 + 16 + (Math.random() * 12 - 6), item: item, n: n || 1, ph: Math.random() * 6.28 });
  }
  function swingSword() {
    if (G.swingCd > 0) return;
    G.swing = 0.22; G.swingCd = 0.38;
    sfx('shoot');
    var dmg = swordDmg();
    var cx = G.px + 16 + [0, 1, 0, -1][G.dir] * 26, cy = G.py + 16 + [-1, 0, 1, 0][G.dir] * 26;
    for (var i = 0; i < G.monsters.length; i++) {
      var m = G.monsters[i];
      if (Math.abs(m.x - cx) < 30 && Math.abs(m.y - cy) < 30) {
        m.hp -= dmg; m.hurt = 0.18;
        var d = MONS[m.type], sp = 90;
        var ang = Math.atan2(m.y - (G.py + 16), m.x - (G.px + 16));
        m.x += Math.cos(ang) * 16; m.y += Math.sin(ang) * 16;
        flo(m.x, m.y - 14, '-' + dmg, '#ff8a80');
        if (m.hp <= 0) killMonster(i);
      }
    }
  }
  function killMonster(i) {
    var m = G.monsters[i], d = MONS[m.type];
    G.monsters.splice(i, 1);
    sfx('roar'); burst(m.x, m.y, m.type === 'slime' || m.type === 'king' ? '#4caf50' : '#b0bec5');
    d.drops.forEach(function (dr) { if (Math.random() < dr[1]) dropLoot(Math.floor(m.x / 32), Math.floor(m.y / 32), dr[0], 1); });
    milestone('firstKill');
    if (m.type === 'king') toast('👑 打倒了史莱姆王！掉落豪华！');
  }

  // ---------- 钓鱼 ----------
  function startFish(t) {
    if (G.fish) return;
    if (tileAt(t.x, t.y) !== T.WATER) { toast('🎣 要面对水面才能钓鱼'); return; }
    G.fish = { phase: 'wait', t: 1.2 + Math.random() * 2.3, fx: t.x, fy: t.y };
    toast('🎣 甩竿…静待鱼上钩');
    sfx('arrow');
  }
  function fishTry() { // 玩家在钓鱼时按了 E
    var f = G.fish;
    if (!f) return;
    if (f.phase === 'wait') { G.fish = null; toast('💨 鱼还没咬钩就收竿了'); return; }
    // bite → 成功
    var pool = SF.FISH.filter(function (fs) {
      var night = G.min >= 19 * 60;
      if (fs.junk && Math.random() < 0.5) return true;
      return fs.seasons.indexOf(G.season) >= 0 && (fs.night ? night : !night || fs.rate <= 30);
    });
    var total = 0; pool.forEach(function (fs) { total += fs.rate; });
    var r = Math.random() * total, pick = pool[0];
    for (var i = 0; i < pool.length; i++) { r -= pool[i].rate; if (r <= 0) { pick = pool[i]; break; } }
    if (pick.junk) { addItem('junk', 1); toast('🗑️ 钓上来一袋垃圾…'); }
    else {
      addItem('fish_' + pick.id, 1);
      if (!ITEMS['fish_' + pick.id]) ITEMS['fish_' + pick.id] = { n: pick.n, i: pick.i, sell: pick.sell, eat: pick.eat };
      toast('🐟 钓到了 ' + pick.n + ' ' + pick.i + '！卖了能赚 ' + pick.sell + ' 金');
      milestone('firstFish');
    }
    spendEnergy(4); sfx('win');
    G.fish = null;
  }

  // ---------- 昼夜/睡觉/季节 ----------
  function faint(why) {
    var loss = Math.floor(G.gold * 0.1);
    G.gold -= loss;
    toast('😵 ' + why + '，昏倒被送回了家…损失 ' + loss + ' 金');
    sfx('lose');
    doSleep(true);
  }
  function doSleep(fainted) {
    // 1. 结算生长(用今天的浇水状态)
    var grown = 0;
    for (var k in G.plots) {
      var p = G.plots[k];
      if (p.crop && !p.dead && p.water) { p.stage = Math.min(p.stage + 1, CROPS[p.crop].days); grown++; }
    }
    // 2. 新的一天
    G.day++;
    var seasonChanged = false;
    if (G.day > SF.SEASON_DAYS) {
      G.day = 1; G.season = (G.season + 1) % 4; seasonChanged = true;
      G.totalSeasons++;
      award('starfarm_seasons_' + G.totalSeasons); // 每活过一季 +50(可重复累积)
      toast('🎊 活过了一整季！+50 经验');
    }
    // 3. 天气 + 浇水重置
    var r = Math.random();
    G.weather = (G.season === 3) ? (r < 0.35 ? 'snow' : 'sun') : (r < 0.25 ? 'rain' : 'sun');
    for (k in G.plots) {
      var p2 = G.plots[k];
      p2.water = (G.weather === 'rain');
      if (p2.crop) {
        var cs = CROPS[p2.crop];
        if (cs.season !== G.season && !p2.dead) { p2.dead = true; } // 换季枯死
      }
    }
    // 4. 恢复
    G.min = SF.DAY_START;
    G.energy = G.maxEnergy;
    G.hp = clamp(G.hp + 40, 0, G.maxHp);
    G.todayEarn = 0; G.warned24 = false;
    G.fish = null;
    if (G.mine) buildFarm();
    G.px = 4.5 * 32; G.py = 5.5 * 32; G.dir = 2; G.monsters = [];
    if (fainted) G.energy = Math.floor(G.maxEnergy * 0.7);
    if (G.gold >= 5000) milestone('rich');
    persist();
    // 5. 晨报
    var wTxt = G.weather === 'rain' ? '🌧️ 今天下雨——作物自动浇好水啦！' : G.weather === 'snow' ? '❄️ 下雪了，冷得很…' : '☀️ 晴天，记得给作物浇水！';
    G.summary = {
      day: G.day, season: SF.SEASONS[G.season], weather: wTxt, grown: grown,
      fainted: !!fainted, seasonChanged: seasonChanged
    };
    openPanel('summary');
    sfx('clear');
    updHud();
  }

  // ---------- 商店 ----------
  function seasonSeeds() {
    var out = [];
    for (var id in CROPS) if (CROPS[id].season === G.season) out.push('seed_' + id);
    return out;
  }
  function shopBuy(id) {
    var it = ITEMS[id];
    if (!it || !it.buy) return false;
    if (G.gold < it.buy) { toast('💰 金币不够！'); sfx('error'); return false; }
    G.gold -= it.buy; addItem(id, 1); sfx('coin');
    toast('买了 ' + it.n + ' ' + it.i);
    updHud(); if (G.panel === 'shop') openPanel('shop');
    return true;
  }
  function shopSell(id, all) {
    var it = ITEMS[id], n = invCount(id);
    if (!it || !n || !it.sell) return false;
    var cnt = all ? n : 1;
    G.gold += it.sell * cnt;
    G.todayEarn += it.sell * cnt;
    useItem(id, cnt);
    sfx('coin');
    toast('卖出 ' + it.n + '×' + cnt + '，+' + (it.sell * cnt) + ' 金');
    if (G.gold >= 5000) milestone('rich');
    updHud(); if (G.panel === 'shop') openPanel('shop');
    return true;
  }
  function buyUpgrade(id) {
    var u = null;
    SF.UPGRADES.forEach(function (x) { if (x.id === id) u = x; });
    if (!u || G.upgrades[id]) return false;
    if (id === 'sword2' && !G.upgrades.sword1) { toast('要先买铁剑！'); return false; }
    if (G.gold < u.cost) { toast('💰 金币不够！'); sfx('error'); return false; }
    G.gold -= u.cost; G.upgrades[id] = true;
    sfx('levelUp'); toast('⬆️ 购买了 ' + u.n + '！');
    if (id === 'pack1') { while (G.hotbar.length < 12) G.hotbar.push(null); hotDirty = true; }
    updHud(); if (G.panel === 'shop') openPanel('shop');
    return true;
  }

  // ---------- 更新 ----------
  var keys = {};
  function update(dt) {
    G.t += dt;
    if (G.screen !== 'play' || G.panel) { return; }
    // 时间流逝
    G.min += dt * SF.MIN_PER_SEC;
    if (G.min >= SF.DAY_END) { faint('熬到了凌晨2点'); return; }
    if (G.min >= 24 * 60 && !G.warned24) { G.warned24 = true; toast('🌚 已经午夜了，快回家睡觉！(床在自家门口)'); sfx('tick'); }
    if (G.swing > 0) G.swing -= dt;
    if (G.swingCd > 0) G.swingCd -= dt;
    if (G.invul > 0) G.invul -= dt;
    // 移动
    var mx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
    var my = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
    if (G.fish && (mx || my)) G.fish = null; // 走动收竿
    G.moving = !!(mx || my);
    if (G.moving) {
      if (Math.abs(mx) > Math.abs(my)) G.dir = mx > 0 ? 1 : 3; else G.dir = my > 0 ? 2 : 0;
      var sp = moveSpeed() * dt, nx = G.px + mx * sp, ny = G.py + my * sp;
      var fly = false;
      if (!hitWall(nx, G.py, fly)) G.px = nx;
      if (!hitWall(G.px, ny, fly)) G.py = ny;
      G.px = clamp(G.px, 0, (G.mine ? SF.MINE_W : SF.FARM_W) * 32 - 32);
      G.py = clamp(G.py, 0, (G.mine ? SF.MINE_H : SF.FARM_H) * 32 - 32);
      G.animT += dt;
      // 矿洞梯子踩上触发
      if (G.mine) {
        var tt2 = tileAt(Math.floor((G.px + 16) / 32), Math.floor((G.py + 16) / 32));
        if (tt2 === T.LADDER_UP) { toast('☀️ 回到地面'); buildFarm(); G.px = 37.5 * 32; G.py = 4.2 * 32; persist(); }
        else if (tt2 === T.LADDER_DOWN) { buildMine(G.mineLv + 1); G.px = 2.5 * 32; G.py = 3 * 32; toast('🪜 下到第 ' + G.mineLv + ' 层…'); }
      }
    }
    // 钓鱼
    if (G.fish) {
      G.fish.t -= dt;
      if (G.fish.phase === 'wait' && G.fish.t <= 0) { G.fish.phase = 'bite'; G.fish.t = 0.85; sfx('tick'); toast('❗ 咬钩了！快按 用/E！'); }
      else if (G.fish.phase === 'bite' && G.fish.t <= 0) { G.fish = null; toast('💨 鱼…溜走了'); sfx('error'); }
    }
    // 怪物
    var pcx = G.px + 16, pcy = G.py + 16;
    for (var i = 0; i < G.monsters.length; i++) {
      var m = G.monsters[i], d = MONS[m.type];
      if (m.hurt > 0) m.hurt -= dt;
      m.ph += dt * 3;
      var dx = pcx - m.x, dy = pcy - m.y, dist = Math.hypot(dx, dy) || 1;
      if (dist < 260) {
        var vx = dx / dist * d.speed * dt, vy = dy / dist * d.speed * dt;
        if (d.fly) { m.x += vx + Math.cos(m.ph) * 0.7; m.y += vy + Math.sin(m.ph) * 0.9; }
        else {
          if (!solid(tileAt(Math.floor((m.x + vx * 3) / 32), Math.floor(m.y / 32)))) m.x += vx;
          if (!solid(tileAt(Math.floor(m.x / 32), Math.floor((m.y + vy * 3) / 32)))) m.y += vy;
        }
      }
      // 接触伤害
      if (dist < 22 && G.invul <= 0) {
        G.hp -= d.dmg; G.invul = 0.9;
        flo(pcx, G.py - 8, '-' + d.dmg + '❤️', '#ff5252');
        sfx('hurt');
        G.px += (pcx - m.x) / dist * 14; G.py += (pcy - m.y) / dist * 14;
        if (G.hp <= 0) { G.hp = 0; faint('被怪物打倒了'); return; }
        updHud();
      }
    }
    // 掉落物
    for (i = G.drops.length - 1; i >= 0; i--) {
      var dr = G.drops[i]; dr.ph += dt * 4;
      if (Math.hypot(dr.x - pcx, dr.y - pcy) < 22) {
        addItem(dr.item, dr.n);
        var it = ITEMS[dr.item];
        toast('+' + dr.n + ' ' + (it ? it.n : dr.item) + ' ' + (it ? it.i : ''));
        sfx('coin');
        G.drops.splice(i, 1);
      }
    }
    // 粒子/飘字/雨雪
    for (i = G.parts.length - 1; i >= 0; i--) { var p3 = G.parts[i]; p3.t -= dt; p3.x += p3.vx * dt; p3.y += p3.vy * dt; if (p3.t <= 0) G.parts.splice(i, 1); }
    for (i = G.flos.length - 1; i >= 0; i--) { var f = G.flos[i]; f.t -= dt; f.y -= 22 * dt; if (f.t <= 0) G.flos.splice(i, 1); }
    updWeather(dt);
    // 相机
    var ww = (G.mine ? SF.MINE_W : SF.FARM_W) * 32, wh = (G.mine ? SF.MINE_H : SF.FARM_H) * 32;
    G.camX = clamp(pcx - W / 2, 0, Math.max(0, ww - W));
    G.camY = clamp(pcy - H / 2, 0, Math.max(0, wh - H));
    updHud();
  }
  function hitWall(nx, ny, fly) {
    // 玩家 24×28 盒, 检查四角
    var x0 = nx + 4, y0 = ny + 6, x1 = nx + 28, y1 = ny + 32;
    var c = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]];
    for (var i = 0; i < 4; i++) {
      if (solid(tileAt(Math.floor(c[i][0] / 32), Math.floor(c[i][1] / 32)), fly)) return true;
    }
    return false;
  }
  function updWeather(dt) {
    var want = (G.weather === 'rain') ? 70 : (G.weather === 'snow') ? 50 : 0;
    while (G.rains.length < want) G.rains.push({ x: Math.random() * W, y: Math.random() * H, v: 220 + Math.random() * 160 });
    while (G.rains.length > want) G.rains.pop();
    for (var i = 0; i < G.rains.length; i++) {
      var r = G.rains[i];
      r.y += (G.weather === 'snow' ? 40 : r.v) * dt;
      r.x += G.weather === 'snow' ? Math.sin(r.y / 18) * 0.5 : 0;
      if (r.y > H) { r.y = -8; r.x = Math.random() * W; }
    }
  }

  // ---------- HUD ----------
  function updHud() {
    var s = SF.SEASONS[G.season];
    var h = Math.floor(G.min / 60), mm = Math.floor(G.min % 60);
    $('sfDay').textContent = G.day;
    $('sfSeason').textContent = s.i + ' ' + s.n;
    $('sfTime').textContent = (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
    $('sfGold').textContent = G.gold;
    $('sfEnergyBar').style.width = Math.round(G.energy / G.maxEnergy * 100) + '%';
    $('sfHpBar').style.width = Math.round(G.hp / G.maxHp * 100) + '%';
    $('sfMine').textContent = G.mine ? ('⛏ ' + G.mineLv + ' 层') : (G.weather === 'rain' ? '🌧️雨' : G.weather === 'snow' ? '❄️雪' : '☀️晴');
    var hot = $('sfHotbar');
    if (hot && hotDirty) {
      var html = '';
      for (var i = 0; i < G.hotbar.length; i++) {
        var id = G.hotbar[i], it = id ? ITEMS[id] : null;
        html += '<div class="sf-slot' + (i === G.sel ? ' sel' : '') + '" data-i="' + i + '">' +
          (it ? '<span class="sf-ic">' + it.i + '</span>' + (invCount(id) > 1 || it.seed ? '<b class="sf-n">' + invCount(id) + '</b>' : '') : '') +
          '<i class="sf-key">' + ((i + 1) % 10) + '</i></div>';
      }
      hot.innerHTML = html; hotDirty = false;
    }
  }
  function refreshHotbar() { hotDirty = true; updHud(); }

  // ---------- 渲染 ----------
  function render() {
    var s = SF.SEASONS[G.season];
    // 底色
    ctx.fillStyle = G.mine ? '#151210' : s.grass2;
    ctx.fillRect(0, 0, W, H);
    var x0 = Math.floor(G.camX / 32), y0 = Math.floor(G.camY / 32);
    var x1 = Math.ceil((G.camX + W) / 32), y1 = Math.ceil((G.camY + H) / 32);
    var w = G.mine ? SF.MINE_W : SF.FARM_W, h = G.mine ? SF.MINE_H : SF.FARM_H;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var sx = x * 32 - G.camX, sy = y * 32 - G.camY;
      if (sx < -34 || sy < -34 || sx > W + 2 || sy > H + 2) continue;
      var tt = (x < 0 || y < 0 || x >= w || y >= h) ? T.ROCK : G.map[y * w + x];
      drawTile(tt, x, y, sx, sy, s);
    }
    // 耕地/作物 (农场)
    if (!G.mine) {
      for (var k in G.plots) {
        var pp = k.split(','), px = +pp[0], py = +pp[1];
        var psx = px * 32 - G.camX, psy = py * 32 - G.camY;
        if (psx < -34 || psy < -34 || psx > W || psy > H) continue;
        ctx.fillStyle = '#8d6136'; ctx.fillRect(psx + 1, psy + 1, 30, 30);
        ctx.fillStyle = '#7a522c'; ctx.fillRect(psx + 3, psy + 3, 26, 26);
        var plot = G.plots[k];
        if (plot.water) { ctx.fillStyle = 'rgba(30,60,120,.45)'; ctx.fillRect(psx + 3, psy + 3, 26, 26); }
        if (plot.crop) {
          var crop = CROPS[plot.crop];
          if (plot.dead) { ctx.font = '20px serif'; ctx.fillText('🥀', psx + 16, psy + 16); }
          else if (plot.stage >= crop.days) {
            var bob = Math.sin(G.t * 3 + px) * 2;
            ctx.font = '22px serif'; ctx.fillText(crop.cropI, psx + 16, psy + 16 + bob);
            ctx.font = '10px sans-serif'; ctx.fillStyle = '#ffd700'; ctx.fillText('✓', psx + 26, psy + 8);
          } else {
            var pct = plot.stage / crop.days;
            ctx.font = (pct < 0.34 ? 13 : 17) + 'px serif';
            ctx.fillText(pct < 0.34 ? '🌱' : '🌿', psx + 16, psy + 17);
          }
        }
      }
    }
    // 目标格高亮
    if (!G.panel && G.screen === 'play') {
      var tg = targetTile();
      var tgx = tg.x * 32 - G.camX, tgy = tg.y * 32 - G.camY;
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
      ctx.strokeRect(tgx + 2, tgy + 2, 28, 28);
    }
    // 掉落物
    G.drops.forEach(function (d) {
      var it = ITEMS[d.item];
      ctx.font = '16px serif';
      ctx.fillText(it ? it.i : '❓', d.x - G.camX, d.y - G.camY + Math.sin(d.ph) * 3);
    });
    // 怪物
    G.monsters.forEach(function (m) {
      var d = MONS[m.type];
      var mx = m.x - G.camX, my = m.y - G.camY + Math.sin(m.ph) * (d.fly ? 4 : 1.5);
      ctx.font = (d.big ? 34 : 24) + 'px serif';
      if (m.hurt > 0) { ctx.globalAlpha = 0.6; }
      ctx.fillText(d.i, mx, my);
      ctx.globalAlpha = 1;
      if (m.hp < m.maxHp) {
        ctx.fillStyle = '#000'; ctx.fillRect(mx - 16, my - 22, 32, 5);
        ctx.fillStyle = '#e53935'; ctx.fillRect(mx - 15, my - 21, 30 * (m.hp / m.maxHp), 3);
      }
    });
    // 玩家
    drawPlayer();
    // 挥砍弧
    if (G.swing > 0) {
      var pcx2 = G.px + 16 - G.camX, pcy2 = G.py + 16 - G.camY;
      var base = [ -Math.PI / 2, 0, Math.PI / 2, Math.PI ][G.dir];
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(pcx2, pcy2, 30, base - 1.1, base + 1.1);
      ctx.stroke();
    }
    // 钓鱼
    if (G.fish) {
      var fx = G.fish.fx * 32 + 16 - G.camX, fy = G.fish.fy * 32 + 16 - G.camY;
      ctx.font = '18px serif'; ctx.fillText('🎣', fx, fy);
      if (G.fish.phase === 'bite') { ctx.font = '26px serif'; ctx.fillStyle = '#ff5252'; ctx.fillText('❗', fx, fy - 26); }
    }
    // 粒子
    G.parts.forEach(function (p) { ctx.globalAlpha = Math.max(0, p.t * 2); ctx.fillStyle = p.color; ctx.fillRect(p.x - G.camX - 2, p.y - G.camY - 2, 4, 4); ctx.globalAlpha = 1; });
    // 飘字
    ctx.font = 'bold 13px sans-serif';
    G.flos.forEach(function (f) { ctx.globalAlpha = Math.min(1, f.t); ctx.fillStyle = f.color; ctx.fillText(f.txt, f.x - G.camX, f.y - G.camY); ctx.globalAlpha = 1; });
    // 雨/雪
    if (G.rains.length) {
      ctx.strokeStyle = 'rgba(120,180,255,.55)'; ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      G.rains.forEach(function (r) {
        if (G.weather === 'snow') { ctx.beginPath(); ctx.arc(r.x, r.y, 2, 0, 6.29); ctx.fill(); }
        else { ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - 2, r.y - 9); ctx.stroke(); }
      });
    }
    // 夜色
    var na = G.mine ? 0 : clamp((G.min - 17.5 * 60) / (21 * 60 - 17.5 * 60), 0, 1) * 0.42;
    if (na > 0) { ctx.fillStyle = 'rgba(10,15,45,' + na + ')'; ctx.fillRect(0, 0, W, H); }
    if (G.mine) { // 矿洞黑暗+玩家光圈
      ctx.fillStyle = 'rgba(2,3,8,.78)'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'destination-out';
      var gx = G.px + 16 - G.camX, gy = G.py + 16 - G.camY;
      var grad = ctx.createRadialGradient(gx, gy, 12, gx, gy, 130);
      grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad; ctx.fillRect(gx - 140, gy - 140, 280, 280);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (G.hp < 30) { ctx.fillStyle = 'rgba(200,20,20,' + (0.12 + Math.sin(G.t * 5) * 0.06) + ')'; ctx.fillRect(0, 0, W, H); }
    // 面前交互提示
    if (!G.panel && G.screen === 'play' && !G.fish) {
      var t3 = targetTile(), tt3 = tileAt(t3.x, t3.y);
      if (tt3 === T.DOOR || tt3 === T.SHOP || tt3 === T.MINE || tt3 === T.LADDER_UP || tt3 === T.LADDER_DOWN) {
        var bx = t3.x * 32 + 16 - G.camX, by = t3.y * 32 - 10 - G.camY;
        ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(bx - 14, by - 10, 28, 18);
        ctx.fillStyle = '#ffd700'; ctx.font = 'bold 11px sans-serif';
        ctx.fillText('E键', bx, by);
      }
    }
  }
  function drawTile(tt, x, y, sx, sy, s) {
    if (tt === T.WATER) {
      ctx.fillStyle = '#2b7bd1'; ctx.fillRect(sx, sy, 32, 32);
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      ctx.fillRect(sx + 4 + Math.sin(G.t * 2 + x) * 4, sy + 8, 12, 2);
      ctx.fillRect(sx + 14 + Math.sin(G.t * 2.4 + y) * 4, sy + 22, 10, 2);
      return;
    }
    if (tt === T.PATH) { ctx.fillStyle = '#b3946a'; ctx.fillRect(sx, sy, 32, 32); ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(sx + 3, sy + 3, 26, 26); return; }
    if (tt === T.HOUSE) { ctx.fillStyle = '#b5533c'; ctx.fillRect(sx, sy, 32, 32); ctx.fillStyle = '#8d3f2e'; ctx.fillRect(sx, sy + 24, 32, 8); return; }
    if (tt === T.DOOR) { ctx.fillStyle = '#b5533c'; ctx.fillRect(sx, sy, 32, 32); ctx.fillStyle = '#5d3a1a'; ctx.fillRect(sx + 5, sy + 4, 22, 28); ctx.font = '15px serif'; ctx.fillText('🚪', sx + 16, sy + 16); return; }
    if (tt === T.SHOP) { ctx.fillStyle = '#4a6fa5'; ctx.fillRect(sx, sy, 32, 32); ctx.fillStyle = '#37474f'; ctx.fillRect(sx, sy + 22, 32, 10); if ((x % 3) === 1) { ctx.font = '16px serif'; ctx.fillText('🛒', sx + 16, sy + 14); } return; }
    if (tt === T.MINE) { ctx.fillStyle = '#4c4a45'; ctx.fillRect(sx, sy, 32, 32); ctx.fillStyle = '#111'; ctx.fillRect(sx + 4, sy + 6, 24, 26); ctx.font = '14px serif'; ctx.fillText('🕳️', sx + 16, sy + 14); return; }
    if (tt === T.FENCE) { ctx.fillStyle = s.grass; ctx.fillRect(sx, sy, 32, 32); ctx.fillStyle = '#8d5524'; ctx.fillRect(sx + 2, sy + 12, 28, 6); ctx.fillRect(sx + 12, sy + 4, 6, 24); return; }
    if (tt === T.BED) { ctx.fillStyle = s.grass; ctx.fillRect(sx, sy, 32, 32); ctx.font = '20px serif'; ctx.fillText('🛏️', sx + 16, sy + 16); return; }
    if (tt === T.LADDER_UP) { ctx.fillStyle = G.mine ? '#2b2622' : s.grass; ctx.fillRect(sx, sy, 32, 32); ctx.font = '20px serif'; ctx.fillText('🪜', sx + 16, sy + 16); ctx.fillStyle = '#ffd700'; ctx.font = '9px sans-serif'; ctx.fillText('上去', sx + 16, sy + 28); return; }
    if (tt === T.LADDER_DOWN) { ctx.fillStyle = '#2b2622'; ctx.fillRect(sx, sy, 32, 32); ctx.fillStyle = '#0a0806'; ctx.fillRect(sx + 6, sy + 6, 20, 22); ctx.font = '16px serif'; ctx.fillText('🪜', sx + 16, sy + 16); return; }
    // 地面
    ctx.fillStyle = ((x + y) % 2 === 0) ? s.grass : s.grass2;
    ctx.fillRect(sx, sy, 32, 32);
    if (G.mine) { ctx.fillStyle = '#241f1b'; ctx.fillRect(sx, sy, 32, 32); }
    if (tt === T.TREE) { ctx.font = '26px serif'; ctx.fillText(G.season === 2 ? '🌳' : '🌲', sx + 16, sy + 15); }
    else if (tt === T.ROCK) { ctx.font = '18px serif'; ctx.fillText('🪨', sx + 16, sy + 16); }
    else if (tt === T.ORE_FE) { ctx.font = '18px serif'; ctx.fillText('🪨', sx + 16, sy + 16); ctx.font = '11px serif'; ctx.fillText('⚙️', sx + 21, sy + 10); }
    else if (tt === T.ORE_AU) { ctx.font = '18px serif'; ctx.fillText('🪨', sx + 16, sy + 16); ctx.font = '11px serif'; ctx.fillText('🟡', sx + 21, sy + 10); }
    else if (tt === T.ORE_DI) { ctx.font = '18px serif'; ctx.fillText('🪨', sx + 16, sy + 16); ctx.font = '11px serif'; ctx.fillText('💎', sx + 21, sy + 10); }
  }
  function drawPlayer() {
    var x = G.px - G.camX, y = G.py - G.camY;
    if (G.invul > 0 && Math.floor(G.t * 14) % 2 === 0) return; // 受击闪烁
    var bob = G.moving ? Math.sin(G.animT * 12) * 1.6 : 0;
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath(); ctx.ellipse(x + 16, y + 31, 10, 3.4, 0, 0, 6.29); ctx.fill();
    // 腿
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(x + 9, y + 24 + bob, 5, 7);
    ctx.fillRect(x + 18, y + 24 - bob, 5, 7);
    // 身体
    ctx.fillStyle = '#1565c0';
    ctx.fillRect(x + 7, y + 13 + bob * 0.4, 18, 12);
    // 头
    ctx.fillStyle = '#ffcc80';
    ctx.fillRect(x + 8, y + 2 + bob * 0.4, 16, 12);
    // 头发
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(x + 7, y + bob * 0.4, 18, 5);
    // 眼睛(朝向)
    ctx.fillStyle = '#212121';
    var ex = x + 12, ey = y + 9 + bob * 0.4;
    if (G.dir === 1) { ex = x + 17; }
    else if (G.dir === 3) { ex = x + 10; }
    if (G.dir !== 0) { ctx.fillRect(ex, ey, 2.6, 3); ctx.fillRect(ex + 6, ey, 2.6, 3); }
    else { ctx.fillStyle = '#4e342e'; ctx.fillRect(x + 8, y + 6 + bob * 0.4, 16, 4); }
  }

  // ---------- 面板 ----------
  function openPanel(type) {
    G.panel = type;
    var el = $('sfPanel');
    el.style.display = 'flex';
    if (type === 'shop') el.innerHTML = shopHtml();
    else if (type === 'bag') el.innerHTML = bagHtml();
    else if (type === 'sleep') el.innerHTML = sleepHtml();
    else if (type === 'summary') el.innerHTML = summaryHtml();
    else if (type === 'help') el.innerHTML = helpHtml();
    else if (type === 'title') el.innerHTML = titleHtml();
    else if (type === 'confirmNew') el.innerHTML = confirmNewHtml();
  }
  function closePanel() {
    G.panel = null;
    var el = $('sfPanel');
    el.style.display = 'none'; el.innerHTML = '';
  }
  function shopHtml() {
    var tab = G.shopTab || 'buy';
    function tabOn(t) { return t === tab; }
    function show(t) { return t === tab ? '' : 'display:none'; }
    var h = '<div class="sf-pbox"><div class="sf-phead"><b>🛒 星露商店</b><button class="sf-x" data-act="close">✕</button></div>';
    h += '<div class="sf-tabs">' +
      '<button class="sf-tab' + (tabOn('buy') ? ' on' : '') + '" data-tab="buy">🛍 买</button>' +
      '<button class="sf-tab' + (tabOn('sell') ? ' on' : '') + '" data-tab="sell">💰 卖</button>' +
      '<button class="sf-tab' + (tabOn('up') ? ' on' : '') + '" data-tab="up">⬆ 升级</button></div>';
    h += '<div class="sf-pbody" data-pg="buy" style="' + show('buy') + '">';
    seasonSeeds().forEach(function (id) {
      var it = ITEMS[id];
      h += shopRow(it.i, it.n, '种子 · 长成卖 ' + CROPS[it.seed].sell + '金 / ' + CROPS[it.seed].days + '天', it.buy, 'buyItem:' + id, invCount(id));
    });
    SF.SHOP_FOOD.forEach(function (id) {
      var it = ITEMS[id];
      h += shopRow(it.i, it.n, it.desc, it.buy, 'buyItem:' + id, invCount(id));
    });
    h += '</div>';
    // 卖
    h += '<div class="sf-pbody" data-pg="sell" style="' + show('sell') + '">';
    var any = false;
    for (var id2 in G.inv) {
      var it2 = ITEMS[id2];
      if (!it2 || !it2.sell || !G.inv[id2]) continue;
      any = true;
      h += shopRow(it2.i, it2.n, '单价 ' + it2.sell + '金 × ' + G.inv[id2], it2.sell, 'sellItem:' + id2, G.inv[id2], true);
    }
    if (!any) h += '<div class="sf-empty">背包里没有能卖的东西…先去种地/挖矿/钓鱼吧！</div>';
    h += '</div>';
    // 升级
    h += '<div class="sf-pbody" data-pg="up" style="' + show('up') + '">';
    SF.UPGRADES.forEach(function (u) {
      var owned = !!G.upgrades[u.id];
      h += '<div class="sf-row"><span class="sf-ricon">' + u.i + '</span><span class="sf-rname">' + u.n +
        (owned ? ' <b style="color:#4caf50">✅已拥有</b>' : '') + '</span><span class="fdesc">' + u.desc + '</span>' +
        (owned ? '' : '<button class="sf-buy" data-act="buyUp:' + u.id + '">' + u.cost + '💰</button>') + '</div>';
    });
    h += '</div>';
    h += '<div class="sf-pfoot">💰 ' + G.gold + ' 金 · 今日卖出 +' + G.todayEarn + '</div></div>';
    return h;
  }
  function shopRow(icon, name, desc, price, act, owned, sellable) {
    var btns = '<button class="sf-buy" data-act="' + act + '">' + (sellable ? '卖1 ' + price + '💰' : price + '💰 买') + '</button>';
    if (sellable && owned > 1) btns += '<button class="sf-buy alt" data-act="' + act + 'All">全卖</button>';
    return '<div class="sf-row"><span class="sf-ricon">' + icon + '</span><span class="sf-rname">' + name +
      (owned ? ' <i style="color:#78909c;font-style:normal">×' + owned + '</i>' : '') + '</span><span class="fdesc">' + desc + '</span>' + btns + '</div>';
  }
  function bagHtml() {
    var h = '<div class="sf-pbox"><div class="sf-phead"><b>🎒 背包</b><button class="sf-x" data-act="close">✕</button></div>';
    h += '<div class="sf-tip">点物品→放进快捷栏第 ' + (G.sel + 1) + ' 格 (被选中的格子)</div><div class="sf-pbody"><div class="sf-baggrid">';
    var ids = Object.keys(G.inv).filter(function (k) { return G.inv[k] > 0; });
    if (!ids.length) h += '<div class="sf-empty">空空如也…</div>';
    ids.forEach(function (id) {
      var it = ITEMS[id];
      h += '<div class="sf-bagit" data-act="bagTo:' + id + '" title="' + (it.desc || (it.sell ? '卖 ' + it.sell + '金' : '')) + (it.eat ? ' · 吃+' + it.eat + '⚡' : '') + '">' +
        '<span>' + it.i + '</span><b>' + G.inv[id] + '</b><i>' + it.n + '</i></div>';
    });
    h += '</div></div>';
    h += '<div class="sf-pfoot">快捷栏: ';
    G.hotbar.forEach(function (id, i) { var it = id ? ITEMS[id] : null; h += (i === G.sel ? '<b style="color:#ffd700">[' + ((i + 1) % 10) + ']' + (it ? it.i : '·') + '</b> ' : ((i + 1) % 10) + (it ? it.i : '·') + ' '); });
    h += '</div></div>';
    return h;
  }
  function sleepHtml() {
    return '<div class="sf-pbox small"><div class="sf-phead"><b>🛏️ 睡觉?</b><button class="sf-x" data-act="close">✕</button></div>' +
      '<div class="sf-pbody"><p style="color:#b0bec5;font-size:13px;line-height:1.8">睡觉会存档并进入第 ' + (G.day + 1) + ' 天。<br>浇过水的作物会生长 · 换季会枯死不当季的作物。</p></div>' +
      '<div class="sf-pfoot"><button class="sf-go" data-act="sleep">😴 睡觉</button></div></div>';
  }
  function summaryHtml() {
    var s = G.summary || {};
    return '<div class="sf-pbox small"><div class="sf-phead"><b>🌅 新的一天</b></div>' +
      '<div class="sf-pbody" style="text-align:center">' +
      '<div style="font-size:34px">' + (s.season ? s.season.i : '🌸') + '</div>' +
      '<h3 style="color:#ffd700;margin:6px 0">' + (s.season ? s.season.n : '') + '天 第 ' + s.day + ' 天</h3>' +
      '<p style="color:#b0bec5;font-size:13px;line-height:1.9">' + (s.weather || '') +
      (s.grown ? '<br>🌱 昨夜 ' + s.grown + ' 株作物生长了' : '') +
      (s.seasonChanged ? '<br>🎊 <b style="color:#ffd700">换季啦！</b>不当季的作物已枯死' : '') +
      (s.fainted ? '<br>😵 昨天昏倒了, 体力只恢复了70%' : '') +
      '</p></div>' +
      '<div class="sf-pfoot"><button class="sf-go" data-act="close">开始干活！</button></div></div>';
  }
  function helpHtml() {
    return '<div class="sf-pbox"><div class="sf-phead"><b>📖 玩法说明</b><button class="sf-x" data-act="close">✕</button></div>' +
      '<div class="sf-pbody" style="font-size:13px;color:#b0bec5;line-height:2">' +
      '🚜 <b style="color:#fff">星露谷式种田循环</b>：锄头开垦 → 种子播种 → 洒水壶浇水 → 睡觉过天 → 成熟收获 → 商店卖钱<br>' +
      '🛏️ 走到<b style="color:#fff">自家门口(🚪)按E</b>睡觉存档。一天=现实约2分半, 凌晨2点会昏倒扣钱!<br>' +
      '⛏ <b style="color:#fff">矿洞</b>：右侧洞口按E进入。镐子敲石头, 13%敲出下行梯子, 越深怪越多矿越贵。剑挥砍打怪, 蝙蝠会飞!<br>' +
      '🎣 <b style="color:#fff">钓鱼</b>：装备鱼竿面对池塘按E, ❗出现后0.85秒内再按E。不同季节/昼夜的鱼不一样!<br>' +
      '🌸 <b style="color:#fff">四季</b>：28天一换。种子要当季才能种, 换季枯死。冬天只能种水晶果。<br>' +
      '⌨️ <b style="color:#fff">操作</b>：WASD/方向键移动 · E或空格=用工具/互动 · 数字键1-0换快捷栏 · B=背包<br>' +
      '📱 手机：左下方向键 + 右下「用」「包」按钮<br>' +
      '⭐ 破纪录成就都会给全站经验(升级解锁隐藏游戏)' +
      '</div><div class="sf-pfoot"><button class="sf-go" data-act="close">明白了！</button></div></div>';
  }
  function titleHtml() {
    var sv = hasSave();
    return '<div class="sf-pbox small" style="text-align:center">' +
      '<div style="font-size:44px;margin-top:6px">🚜</div>' +
      '<h2 style="color:#ffd700;margin:4px 0">星露小镇</h2>' +
      '<p style="color:#9ab;font-size:12px;margin-bottom:12px">种田 · 打怪 · 钓鱼 · 四季物语</p>' +
      '<div class="sf-pfoot" style="flex-direction:column;gap:8px">' +
      (sv ? '<button class="sf-go" data-act="continue">▶ 继续游戏 (第' + store(SAVE_KEY).day + '天)</button>' : '') +
      '<button class="sf-go ' + (sv ? '' : '') + '" data-act="' + (sv ? 'confirmNew' : 'newGame') + '">' + (sv ? '🆕 新游戏' : '▶ 开始新生活') + '</button>' +
      '<button class="sf-go ghost" data-act="help">📖 玩法说明</button>' +
      '</div></div>';
  }
  function confirmNewHtml() {
    return '<div class="sf-pbox small"><div class="sf-phead"><b>⚠️ 覆盖存档?</b><button class="sf-x" data-act="title">✕</button></div>' +
      '<div class="sf-pbody"><p style="color:#b0bec5;font-size:13px">新游戏会覆盖现在的存档进度，确定吗？</p></div>' +
      '<div class="sf-pfoot"><button class="sf-go ghost" data-act="title">手滑了</button><button class="sf-go" data-act="newGame">确定重来</button></div></div>';
  }
  function panelAction(act) {
    if (act === 'close') {
      if (G.summary && G.panel === 'summary') { G.summary = null; }
      closePanel(); sfx('back'); return;
    }
    if (act === 'sleep') { closePanel(); doSleep(false); return; }
    if (act === 'title') { openPanel('title'); return; }
    if (act === 'help') { openPanel('help'); return; }
    if (act === 'confirmNew') { openPanel('confirmNew'); return; }
    if (act === 'newGame') { newGame(); return; }
    if (act === 'continue') {
      if (load()) { startPlay(); toast('📖 欢迎回来！今天是第 ' + G.day + ' 天'); }
      else startPlay();
      return;
    }
    if (act.indexOf('buyItem:') === 0) { shopBuy(act.slice(8)); return; }
    if (act.indexOf('sellItem:') === 0) {
      var sid = act.slice(9);
      if (sid.slice(-3) === 'All') shopSell(sid.slice(0, -3), true);
      else shopSell(sid, false);
      return;
    }
    if (act.indexOf('buyUp:') === 0) { buyUpgrade(act.slice(6)); return; }
    if (act.indexOf('bagTo:') === 0) {
      var id = act.slice(6);
      G.hotbar[G.sel] = id; sfx('select'); refreshHotbar(); closePanel(); return;
    }
    if (act.indexOf('tab:') === 0) {
      var tab = act.slice(4);
      G.shopTab = tab;
      var panels = document.querySelectorAll('#sfPanel [data-pg]');
      for (var i = 0; i < panels.length; i++) panels[i].style.display = (panels[i].getAttribute('data-pg') === tab) ? '' : 'none';
      var tabs = document.querySelectorAll('#sfPanel .sf-tab');
      for (i = 0; i < tabs.length; i++) tabs[i].className = 'sf-tab' + (tabs[i].getAttribute('data-tab') === tab ? ' on' : '');
      sfx('select'); return;
    }
  }
  function newGame() {
    buildFarm();
    G.day = 1; G.season = 0; G.min = SF.DAY_START;
    G.gold = 500; G.energy = 100; G.maxEnergy = 100; G.hp = 100; G.maxHp = 100;
    G.weather = 'sun'; G.todayEarn = 0;
    G.inv = { seed_parsnip: 15 };
    G.hotbar = ['hoe', 'pick', 'axe', 'sword', 'can', 'rod', 'seed_parsnip', null, null, null];
    G.sel = 0; G.plots = {}; G.hpMap = {}; G.mine = false; G.mineLv = 0;
    G.monsters = []; G.drops = []; G.upgrades = {}; G.milestones = {}; G.totalSeasons = 0;
    G.px = 4.5 * 32; G.py = 5.5 * 32; G.dir = 2; G.summary = null;
    persist();
    startPlay();
    toast('🚜 欢迎来到星露小镇！先用锄头开垦, 种下防风草吧!');
    setTimeout(function () { openPanel('help'); }, 600);
  }
  function startPlay() {
    closePanel();
    G.screen = 'play';
    if (!G.map) buildFarm();
    try { AOXSound.ensure(); AOXSound.startBGM('game'); } catch (e) { }
    updHud();
  }

  // ---------- 输入 ----------
  document.addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight' || k === ' ') e.preventDefault();
    var lk = (k || '').toLowerCase();
    if (G.screen !== 'play') return;
    if (lk === 'e' || k === 'Enter' || k === ' ') { e.preventDefault(); if (!G.panel) interact(); return; }
    if (lk === 'b' || lk === 'i' || k === 'Escape') {
      if (G.panel === 'bag') closePanel();
      else if (!G.panel) openPanel('bag');
      return;
    }
    if (k === 'Escape' && G.panel) { closePanel(); return; }
    if (k.indexOf('Arrow') === 0 || 'wasd'.indexOf(lk) >= 0) { keys[k] = true; if ('wasd'.indexOf(lk) >= 0) keys[lk] = true; return; }
    if (/^[0-9]$/.test(k)) {
      var idx = k === '0' ? 9 : +k - 1;
      if (idx < G.hotbar.length) { G.sel = idx; sfx('select'); refreshHotbar(); }
    }
  });
  document.addEventListener('keyup', function (e) {
    var k = e.key, lk = (k || '').toLowerCase();
    keys[k] = false; keys[lk] = false;
  });
  // 面板点击委托
  document.addEventListener('click', function (ev) {
    var el = ev.target;
    while (el && el !== document.body) {
      if (el.getAttribute && el.getAttribute('data-act')) { panelAction(el.getAttribute('data-act')); return; }
      if (el.getAttribute && el.getAttribute('data-tab')) { panelAction('tab:' + el.getAttribute('data-tab')); return; }
      if (el.classList && el.classList.contains('sf-slot')) {
        var i = +el.getAttribute('data-i');
        if (i < G.hotbar.length) { G.sel = i; sfx('select'); refreshHotbar(); }
        return;
      }
      el = el.parentNode;
    }
  });
  // 手机虚拟键
  try {
    if (window.AOXMobile && AOXMobile.isTouch) {
      AOXMobile.virtualKeys({
        dpad: true,
        keys: [
          { key: 'e', label: '用', color: '#43a047', big: true },
          { key: 'b', label: '包', color: '#1565c0' }
        ]
      });
    }
  } catch (e) { }
  // 页面隐藏自动存档
  document.addEventListener('visibilitychange', function () { if (document.hidden && G.screen === 'play') persist(); });

  // ---------- 主循环 ----------
  var last = 0;
  function loop(ts) {
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    if (G.screen !== 'play') return;
    update(dt);
    render();
  }
  requestAnimationFrame(loop);

  // ---------- 启动 ----------
  buildFarm();
  openPanel('title');
  updHud();

  // ---------- 测试钩子 ----------
  window.__SF_T = {
    G: G, addItem: addItem, useItem: useItem, invCount: invCount,
    interact: interact, useTool: useTool, tillAt: tillAt, plantAt: plantAt,
    waterAt: waterAt, pickAt: pickAt, axeAt: axeAt, harvestAt: harvestAt,
    swingSword: swingSword, startFish: startFish, fishTry: fishTry,
    doSleep: doSleep, buildMine: buildMine, buildFarm: buildFarm,
    shopBuy: shopBuy, shopSell: shopSell, buyUpgrade: buyUpgrade,
    tileAt: tileAt, targetTile: targetTile, panelAction: panelAction,
    openPanel: openPanel, closePanel: closePanel, hasSave: hasSave, persist: persist, load: load,
    update: update, render: render, milestone: milestone, swordDmg: swordDmg
  };
})();
