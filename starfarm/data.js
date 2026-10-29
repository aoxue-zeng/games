// ===== 星露小镇 · 数据配置 =====
// 全部物品/作物/鱼/怪物/商店/季节定义。window.SF 命名空间, game.js 读取。
(function () {
  var SF = window.SF = window.SF || {};

  SF.TILE = 32;                 // 图块尺寸(逻辑像素)
  SF.FARM_W = 44; SF.FARM_H = 32;   // 农场地图(图块) — 10-29 大扩建
  SF.MINE_W = 32; SF.MINE_H = 22;   // 矿洞地图(图块)
  SF.DAY_START = 6 * 60;        // 6:00 起床(游戏分钟)
  SF.DAY_END = 26 * 60;         // 26:00(凌晨2点) 强制昏倒
  SF.MIN_PER_SEC = 60 / 7;      // 1现实秒 = 60/7 游戏分 → 一天约2分20秒
  SF.SEASON_DAYS = 28;          // 每季28天

  // ---- 四季 ----
  SF.SEASONS = [
    { n: '春', i: '🌸', grass: '#58a447', grass2: '#4c923c', dirt: '#a3763f' },
    { n: '夏', i: '☀️', grass: '#3f9142', grass2: '#357d36', dirt: '#9c7040' },
    { n: '秋', i: '🍂', grass: '#b07f33', grass2: '#9c6d29', dirt: '#96683a' },
    { n: '冬', i: '❄️', grass: '#d7dee3', grass2: '#c3ccd3', dirt: '#8d7f6d' }
  ];

  // ---- 图块类型 ----
  SF.T = { GRASS: 0, WATER: 1, TILL: 2, HOUSE: 3, DOOR: 4, SHOP: 5, MINE: 6, ROCK: 7, TREE: 8, FENCE: 9, BED: 10, STUMP: 11, ORE_FE: 12, ORE_AU: 13, ORE_DI: 14, LADDER_DOWN: 15, LADDER_UP: 16, PATH: 17 };

  // ---- 作物 (season: 0春1夏2秋3冬, days: 需浇水生长天数) ----
  SF.CROPS = {
    parsnip:   { n: '防风草', seedI: '🌰', cropI: '🥕', days: 3, season: 0, buy: 20,  sell: 40 },
    potato:    { n: '土豆',   seedI: '🥔', cropI: '🥔', days: 5, season: 0, buy: 50,  sell: 95 },
    strawberry:{ n: '草莓',   seedI: '🍓', cropI: '🍓', days: 6, season: 0, buy: 100, sell: 130 },
    chili:     { n: '辣椒',   seedI: '🌶️', cropI: '🌶️', days: 5, season: 1, buy: 40,  sell: 85 },
    tomato:    { n: '番茄',   seedI: '🍅', cropI: '🍅', days: 6, season: 1, buy: 55,  sell: 120 },
    melon:     { n: '甜瓜',   seedI: '🍈', cropI: '🍈', days: 8, season: 1, buy: 80,  sell: 280 },
    eggplant:  { n: '茄子',   seedI: '🍆', cropI: '🍆', days: 6, season: 2, buy: 35,  sell: 90 },
    corn:      { n: '玉米',   seedI: '🌽', cropI: '🌽', days: 8, season: 2, buy: 150, sell: 200 },
    pumpkin:   { n: '南瓜',   seedI: '🎃', cropI: '🎃', days: 9, season: 2, buy: 100, sell: 350 },
    crystal:   { n: '水晶果', seedI: '🔮', cropI: '💎', days: 7, season: 3, buy: 120, sell: 260 }
  };

  // ---- 物品 ----
  // tool=工具; seed=对应作物id; eat=吃回体力; heal=回血; sell=卖价; buy=商店价(0=不可买)
  SF.ITEMS = {
    hoe:   { n: '锄头',   i: '🥄', tool: 'till',  desc: '开垦农田(草地→耕地)' },
    pick:  { n: '镐子',   i: '⛏️', tool: 'pick',  desc: '敲碎石头与矿石' },
    axe:   { n: '斧头',   i: '🪓', tool: 'axe',   desc: '砍树获得木材' },
    sword: { n: '剑',     i: '🗡️', tool: 'sword', desc: '挥砍攻击怪物' },
    can:   { n: '洒水壶', i: '🚿', tool: 'water', desc: '给作物浇水(雨天不用浇)' },
    rod:   { n: '鱼竿',   i: '🎣', tool: 'fish',  desc: '在水边钓鱼' },
    seed_parsnip:   { n: '防风草种子', i: '🌰', seed: 'parsnip',    sell: 10, buy: 20 },
    seed_potato:    { n: '土豆种子',   i: '🥔', seed: 'potato',     sell: 25, buy: 50 },
    seed_strawberry:{ n: '草莓种子',   i: '🍓', seed: 'strawberry', sell: 50, buy: 100 },
    seed_chili:     { n: '辣椒种子',   i: '🌶️', seed: 'chili',      sell: 20, buy: 40 },
    seed_tomato:    { n: '番茄种子',   i: '🍅', seed: 'tomato',     sell: 27, buy: 55 },
    seed_melon:     { n: '甜瓜种子',   i: '🍈', seed: 'melon',      sell: 40, buy: 80 },
    seed_eggplant:  { n: '茄子种子',   i: '🍆', seed: 'eggplant',   sell: 18, buy: 35 },
    seed_corn:      { n: '玉米种子',   i: '🌽', seed: 'corn',       sell: 75, buy: 150 },
    seed_pumpkin:   { n: '南瓜种子',   i: '🎃', seed: 'pumpkin',    sell: 50, buy: 100 },
    seed_crystal:   { n: '水晶种子',   i: '🔮', seed: 'crystal',    sell: 60, buy: 120 },
    crop_parsnip:   { n: '防风草', i: '🥕', sell: 40,  eat: 18 },
    crop_potato:    { n: '土豆',   i: '🥔', sell: 95,  eat: 25 },
    crop_strawberry:{ n: '草莓',   i: '🍓', sell: 130, eat: 22 },
    crop_chili:     { n: '辣椒',   i: '🌶️', sell: 85,  eat: 15 },
    crop_tomato:    { n: '番茄',   i: '🍅', sell: 120, eat: 22 },
    crop_melon:     { n: '甜瓜',   i: '🍈', sell: 280, eat: 40 },
    crop_eggplant:  { n: '茄子',   i: '🍆', sell: 90,  eat: 20 },
    crop_corn:      { n: '玉米',   i: '🌽', sell: 200, eat: 30 },
    crop_pumpkin:   { n: '南瓜',   i: '🎃', sell: 350, eat: 45 },
    crop_crystal:   { n: '水晶果', i: '💎', sell: 260, eat: 0 },
    wood:  { n: '木材',   i: '🪵', sell: 8 },
    stone: { n: '石头',   i: '🪨', sell: 6 },
    coal:  { n: '煤炭',   i: '⚫', sell: 18 },
    iron:  { n: '铁矿石', i: '⚙️', sell: 65 },
    gold:  { n: '金矿石', i: '🥇', sell: 130 },
    gem:   { n: '钻石',   i: '💎', sell: 420 },
    slime: { n: '史莱姆泥', i: '🟢', sell: 14 },
    wing:  { n: '蝙蝠翅', i: '🦇', sell: 24 },
    bone:  { n: '骨头',   i: '🦴', sell: 20 },
    salad: { n: '田园沙拉', i: '🥗', buy: 60,  sell: 25, eat: 45, desc: '吃掉恢复45体力' },
    juice: { n: '精力果汁', i: '🧃', buy: 160, sell: 60, eat: 100, desc: '吃掉恢复全部体力' },
    potion:{ n: '生命药水', i: '❤️', buy: 120, sell: 50, heal: 60, desc: '喝掉恢复60生命' },
    junk:  { n: '垃圾',   i: '🗑️', sell: 2 }
  };

  // ---- 鱼 (seasons: 可钓季节数组, night: 仅夜间, rate: 权重) ----
  SF.FISH = [
    { id: 'carp',    n: '鲤鱼',     i: '🐠', sell: 40,  eat: 20, seasons: [0, 1, 2, 3], night: false, rate: 30 },
    { id: 'trout',   n: '鳟鱼',     i: '🐟', sell: 60,  eat: 25, seasons: [0, 1, 2],    night: false, rate: 22 },
    { id: 'icefish', n: '冰鱼',     i: '🐟', sell: 85,  eat: 25, seasons: [3],          night: false, rate: 22 },
    { id: 'eel',     n: '鳗鱼',     i: '🐡', sell: 110, eat: 30, seasons: [0, 2, 3],    night: true,  rate: 14 },
    { id: 'salmon',  n: '三文鱼',   i: '🐠', sell: 130, eat: 35, seasons: [2],          night: false, rate: 12 },
    { id: 'puffer',  n: '河豚',     i: '🐡', sell: 180, eat: 10, seasons: [1],          night: false, rate: 8 },
    { id: 'squid',   n: '鱿鱼',     i: '🦑', sell: 150, eat: 25, seasons: [1, 3],       night: true,  rate: 10 },
    { id: 'legend',  n: '传说之鱼', i: '🐳', sell: 900, eat: 80, seasons: [0, 1, 2, 3], night: false, rate: 2 },
    { id: 'junk',    n: '垃圾',     i: '🗑️', sell: 2,   eat: 0,  seasons: [0, 1, 2, 3], night: true,  rate: 16, junk: true }
  ];

  // ---- 怪物 ----
  SF.MONSTERS = {
    slime: { n: '史莱姆',   i: '🟢', hp: 14, dmg: 6,  speed: 26, fly: false, drops: [['slime', 1], ['slime', 0.5], ['coal', 0.2]] },
    bat:   { n: '蝙蝠',     i: '🦇', hp: 9,  dmg: 5,  speed: 46, fly: true,  drops: [['wing', 1], ['wing', 0.4]] },
    skel:  { n: '骷髅兵',   i: '💀', hp: 24, dmg: 10, speed: 20, fly: false, drops: [['bone', 1], ['coal', 0.5], ['iron', 0.25]] },
    king:  { n: '史莱姆王', i: '👑', hp: 70, dmg: 14, speed: 18, fly: false, big: true, drops: [['slime', 1], ['slime', 1], ['gem', 0.6], ['gold', 0.8]] }
  };

  // ---- 商店 ----
  SF.SHOP_FOOD = ['salad', 'juice', 'potion'];
  SF.UPGRADES = [
    { id: 'sword1', n: '铁剑',   i: '🗡️', cost: 600,  desc: '剑伤害 6 → 13' },
    { id: 'sword2', n: '钢剑',   i: '⚔️', cost: 2200, desc: '剑伤害 13 → 24 (需铁剑)' },
    { id: 'can1',   n: '铜洒水壶', i: '🚿', cost: 900,  desc: '一次浇灌面前3格' },
    { id: 'pack1',  n: '大背包', i: '🎒', cost: 1500, desc: '快捷栏解锁全部格子(10→12)' },
    { id: 'boots',  n: '轻跑鞋', i: '👟', cost: 500,  desc: '移动速度 +25%' }
  ];

  // ---- 一次性经验里程碑 (走全站经验系统, 每个首次达成 +50) ----
  SF.MILESTONES = {
    firstTill:   '第一次开垦土地',
    firstHarvest:'第一次收获作物',
    firstKill:   '第一次打倒怪物',
    firstFish:   '第一次钓到鱼',
    mine5:       '抵达矿洞5层',
    mine10:      '抵达矿洞10层',
    rich:        '存款突破 5000 金'
  };
})();
