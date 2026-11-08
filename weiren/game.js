/* =========================================================================
 *  伟人商店 (The Great People Shop)
 *  类型：伪人甄别 × 商店经营 × 生存剧情
 *  玩法：10 天营业。鉴别伪人与人类，出售/拒绝。信誉归零或破产即失败。
 * ========================================================================= */
"use strict";

/* ========================= 工具函数 ========================= */
const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const randf = (a, b) => a + Math.random() * (b - a);
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pad2 = (n) => String(n).padStart(2, "0");

/* ========================= 音效系统 (WebAudio) ========================= */
const AudioSys = {
  ctx: null,
  muted: false,
  ensure() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  },
  tone(freq, dur, type, vol, delay) {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || "square";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.08, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  },
  knock() { this.tone(80, 0.14, "sine", 0.22); this.tone(65, 0.18, "sine", 0.2, 0.16); },
  bell() { this.tone(880, 0.25, "triangle", 0.07); this.tone(1318, 0.35, "triangle", 0.05, 0.08); },
  chime() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, "triangle", 0.06, i * 0.09)); },
  buzz() { this.tone(110, 0.35, "sawtooth", 0.09); this.tone(104, 0.35, "sawtooth", 0.09); },
  coin() { this.tone(1046, 0.07, "square", 0.05); this.tone(1568, 0.12, "square", 0.05, 0.07); },
  heartbeat() { this.tone(55, 0.1, "sine", 0.25); this.tone(50, 0.12, "sine", 0.22, 0.22); },
  pageflip() { this.tone(300, 0.05, "noise", 0.02); this.tone(200, 0.06, "triangle", 0.03); },
  alarm() { [0, 0.2, 0.4].forEach(d => { this.tone(880, 0.12, "square", 0.06, d); this.tone(660, 0.12, "square", 0.06, d + 0.1); }); }
};

/* ========================= 数据池 ========================= */
const SURNAMES = ["赵", "钱", "孙", "李", "周", "吴", "郑", "王", "冯", "陈", "蒋", "沈", "韩", "杨", "朱", "秦", "许", "何", "吕", "张", "孔", "曹", "严", "金", "魏", "姜"];
const GIVEN = ["伟", "芳", "娜", "敏", "静", "丽", "强", "磊", "军", "洋", "勇", "杰", "涛", "明", "超", "霞", "平", "刚", "兰", "婷", "玉", "欣", "泽", "宇", "浩", "梅", "鑫", "波", "斌", "莉"];
const STREETS = ["梧桐街", "雾雨巷", "钟楼路", "旧河沿", "北山道", "石灰桥", "纸马巷", "乌鸦街", "南井胡同", "断碑弄"];
const ITEMS = [
  { n: "白蜡烛", p: 15 }, { n: "旧铜镜", p: 30 }, { n: "粗盐", p: 12 }, { n: "手电筒", p: 25 },
  { n: "缝纫针线", p: 18 }, { n: "红绳", p: 10 }, { n: "布娃娃", p: 35 }, { n: "老照片", p: 22 },
  { n: "药膏", p: 40 }, { n: "灯泡", p: 8 }, { n: "手套", p: 20 }, { n: "胶带", p: 14 },
  { n: "火柴", p: 6 }, { n: "黄纸", p: 9 }
];
const WEATHERS = ["阴，雾很重", "小雨", "无风的闷天", "浓雾", "阴转多云", "冷雨夹雾"];
const SKINS = ["#e8c39e", "#d7b899", "#f0d0b0", "#caa27e"];
const SKIN_FAKE = "#9aa39b";
const HAIRS = ["#17130f", "#3a2a1a", "#574033", "#736b66", "#232323"];
const COATS = ["#3d4650", "#4a3f38", "#384236", "#52453b", "#2f3a45"];
const ARRIVAL_LINES = [
  "晚上好，买点东西。",
  "老板，最近生意还好吗？",
  "急用，麻烦快一点。",
  "外面雾真大，看不清路了……",
  "听说了吗？镇口又有人失踪了。",
  "老样子，拿一件就走。",
  "（搓着手）今天可真冷。"
];
const NEWS = {
  1: "镇卫生院提醒：近日流感高发，请居民注意保暖。",
  2: "雾山小学一班级连夜自习后，多名学生称「教室后排多了一位同学」。",
  3: "警方通告：请居民核对来访亲友的身份，发现异常请立即上报。",
  4: "本报读者来信：『我的邻居一周没眨过眼，我应该搬走吗？』",
  5: "卫生局今日起对全镇商户进行突击检查，重点排查「异常交易」。",
  6: "殡仪馆声明：近期并未接收新遗体，但深夜排队的「人」越来越多。",
  7: "气象台称浓雾无害。但记者发现，雾中行走的人没有影子。",
  8: "镇东药铺连夜关门。老板留字条：『它们也会生病，也会疼。』",
  9: "教堂钟声连续三夜自鸣。神父说：『来的不是恶魔，是模仿者。』",
  10: "今日雾山全城大雾。请居民闭门不出，无论谁敲门，都不要开门。"
};

/* ========================= 全局状态 ========================= */
const SAVE_KEY = "weiren_shop_v1";
const G = {
  day: 1,
  money: 50,
  rep: 100,
  tools: { mirror: false, uv: false, lie: false },
  queue: [],
  qIndex: 0,
  cur: null,
  asked: 0,
  usedInspect: false, usedMirror: false, usedUV: false, usedLie: false,
  stats: { soldFake: 0, rejectedReal: 0, correct: 0, income: 0 },
  dayStats: { sold: 0, mistakes: 0, income: 0 },
  buffs: {},        // 夜市每日特供增益(次日生效, 当日结束清空)
  streak: 0,        // 连续零失误天数
  askMax: 2,        // 每位客人可提问数(浓咖啡+1)
  flags: { kind: false, cold: false, inspectorPassed: false },
  over: false
};

/* ========================= 存档/成就 ========================= */
function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || { bestDay: 0, ach: {}, endings: {} }; }
  catch (e) { return { bestDay: 0, ach: {}, endings: {} }; }
}
function persist() {
  const s = loadSave();
  s.bestDay = Math.max(s.bestDay, G.day);
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  return s;
}
const ACH_DEFS = {
  first_day: "🏪 初次营业 —— 完成第 1 天",
  sharp_eye: "👁️ 火眼金睛 —— 累计正确判断 10 次",
  soft_heart: "💊 心软的老板 —— 把药膏卖给了乞求者",
  iron_face: "🧊 铁面无私 —— 拒绝了乞求者",
  flawless: "✨ 无懈可击 —— 单日零失误",
  rich: "💰 小镇富翁 —— 持有 300 元以上",
  collector: "🧰 收藏家 —— 集齐全部工具",
  night_owl: "🌙 夜市常客 —— 购买过一件每日特供",
  survivor: "🏆 幸存者 —— 活过 10 天",
  darkness: "🌑 夜幕降临 —— 触发黑暗结局"
};
function unlockAch(key) {
  const s = loadSave();
  if (s.ach[key]) return;
  s.ach[key] = true;
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  toast("🏅 成就解锁：" + ACH_DEFS[key]);
}
function toast(msg) {
  const d = document.createElement("div");
  d.className = "toast";
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.classList.add("show"), 30);
  setTimeout(() => { d.classList.remove("show"); setTimeout(() => d.remove(), 600); }, 3200);
}

/* ========================= 客人生成 ========================= */
function fakeProb(day) { return clamp(0.25 + day * 0.045, 0, 0.6); }

function randomName() { return choice(SURNAMES) + (Math.random() < 0.5 ? choice(GIVEN) : choice(GIVEN) + choice(GIVEN)); }
function randomBirth() { const y = rand(1950, 1980), m = rand(1, 12), d = rand(1, 28); return { y, m, d }; }
function fmtBirth(b) { return b.y + " 年 " + b.m + " 月 " + b.d + " 日"; }

const APP_TELL_TEXT = {
  pupils: "⚠️ 瞳孔呈竖线状，像猫、像蛇。",
  stitch: "⚠️ 嘴角延伸出一道细密的缝合线。",
  skin: "⚠️ 皮肤灰白如纸，没有血色，也没有毛孔。",
  teeth: "⚠️ 牙齿数量多得数不清，一直排到腮边。",
  extraEye: "⚠️ 额头正中藏着第三只眼睛，正在看你。",
  noBlink: "⚠️ 从进门到现在，一次都没有眨过眼。"
};
const REAL_QUIRKS = [
  "手在微微发抖，但只是紧张。",
  "面色有些苍白，像是熬了夜。",
  "眼里有血丝，大概是劳累所致。",
  "身上有淡淡的酒味。"
];

function genCustomer(day, forced) {
  const isFake = forced && typeof forced.isFake === "boolean" ? forced.isFake : Math.random() < fakeProb(day);
  const c = {
    isFake,
    name: randomName(),
    sex: Math.random() < 0.5 ? "男" : "女",
    birth: randomBirth(),
    addr: "雾山镇 " + choice(STREETS) + " " + rand(1, 99) + " 号",
    app: {
      skin: choice(SKINS), hair: choice(HAIRS), hairStyle: rand(0, 3),
      glasses: Math.random() < 0.25, beard: false, coat: choice(COATS)
    },
    tells: { appearance: [], id: [], interview: false, mirror: false, uv: false, photoMismatch: false },
    wants: choice(ITEMS),
    special: null,
    askedLog: []
  };
  if (c.sex === "男") c.app.beard = Math.random() < 0.3;

  // 身份证号（含生日，异常生日会直接体现在号码里）
  c.idNum = "530102" + c.birth.y + pad2(c.birth.m) + pad2(c.birth.d) + pad2(rand(1, 99)) + String(rand(0, 9)) + (Math.random() < 0.1 ? "X" : String(rand(0, 9)));
  c.issue = rand(1990, 1996) + "-" + pad2(rand(1, 12)) + "-" + pad2(rand(1, 28));

  if (isFake) {
    const pool = shuffle(["pupils", "stitch", "skin", "teeth", "extraEye", "noBlink"]);
    let appCount = 0;
    if (day <= 2) appCount = rand(1, 2);
    else if (day <= 4) appCount = Math.random() < 0.75 ? 1 : 0;
    else if (day <= 6) appCount = Math.random() < 0.5 ? 1 : 0;
    else appCount = Math.random() < 0.35 ? 1 : 0;
    c.tells.appearance = pool.slice(0, appCount);

    // 隐性破绽：保证每个伪人至少有一个可查证的破绽
    const hidden = shuffle(["interview", "mirror", "uv", "id_expiry", "id_birth", "photo"]);
    const hiddenCount = day <= 2 ? 1 : rand(1, 2);
    for (let i = 0; i < hiddenCount; i++) {
      const t = hidden[i];
      if (t === "interview") c.tells.interview = true;
      else if (t === "mirror") c.tells.mirror = true;
      else if (t === "uv") c.tells.uv = true;
      else if (t === "id_expiry") { c.tells.id.push("expiry"); c.expiry = (Math.random() < 0.5 ? 1996 : 1997) + "-" + pad2(rand(1, 12)) + "-" + pad2(rand(1, 28)); }
      else if (t === "id_birth") { c.tells.id.push("birth"); impossibleBirth(c); }
      else if (t === "photo") { if (day >= 3) c.tells.photoMismatch = true; else c.tells.mirror = true; }
    }
    // 兜底：若一个破绽都没有
    if (c.tells.appearance.length === 0 && !c.tells.interview && !c.tells.mirror && !c.tells.uv && c.tells.id.length === 0 && !c.tells.photoMismatch) {
      c.tells.mirror = true;
    }
    if (c.tells.appearance.includes("skin")) c.app.skin = SKIN_FAKE;
  }
  if (!c.expiry) c.expiry = rand(2005, 2015) + "-" + pad2(rand(1, 12)) + "-" + pad2(rand(1, 28));
  c.quirk = choice(REAL_QUIRKS);
  c.arrival = choice(ARRIVAL_LINES);
  return c;
}

function impossibleBirth(c) {
  const styles = [
    () => { c.birth = { y: rand(1955, 1975), m: 2, d: 30 }; },          // 2月30日
    () => { c.birth = { y: rand(1955, 1975), m: 13, d: rand(1, 28) }; }, // 13月
    () => { c.birth = { y: 1875, m: rand(1, 12), d: rand(1, 28) }; },    // 太老
    () => { c.birth = { y: 2049, m: rand(1, 12), d: rand(1, 28) }; }     // 未来
  ];
  choice(styles)();
}

/* ========================= 像素头像绘制 ========================= */
function px(ctx, x, y, w, h, color, s) { ctx.fillStyle = color; ctx.fillRect(x * s, y * s, w * s, h * s); }

function drawPerson(ctx, app, opts) {
  opts = opts || {};
  const s = opts.scale || 4;
  const W = 40;
  ctx.clearRect(0, 0, W * s, 44 * s);
  if (opts.empty) return;
  const dark = opts.reflection ? 0.55 : 1;
  const skin = shade(app.skin, dark);
  const hair = shade(app.hair, dark);
  const coat = shade(app.coat, dark);
  const white = opts.reflection ? "#7d8a86" : "#e8ecea";
  const darkInk = "#101214";

  // 身体（大衣）
  px(ctx, 10, 33, 20, 11, coat, s);
  px(ctx, 8, 36, 24, 8, coat, s);
  px(ctx, 19, 33, 2, 11, shade("#1c2226", dark), s); // 衣缝
  // 领口 & 脖子
  px(ctx, 17, 29, 6, 5, skin, s);
  px(ctx, 14, 33, 4, 2, shade("#20262a", dark), s);
  px(ctx, 22, 33, 4, 2, shade("#20262a", dark), s);
  // 头
  px(ctx, 12, 8, 16, 20, skin, s);
  px(ctx, 11, 12, 1, 10, skin, s);
  px(ctx, 28, 12, 1, 10, skin, s);
  // 头发
  if (app.hairStyle === 0) { px(ctx, 11, 7, 18, 5, hair, s); px(ctx, 11, 12, 2, 4, hair, s); px(ctx, 27, 12, 2, 4, hair, s); }
  else if (app.hairStyle === 1) { px(ctx, 11, 6, 18, 7, hair, s); px(ctx, 11, 13, 3, 6, hair, s); px(ctx, 26, 13, 3, 6, hair, s); }
  else if (app.hairStyle === 2) { px(ctx, 11, 7, 18, 4, hair, s); px(ctx, 22, 8, 3, 3, hair, s); }
  else { px(ctx, 11, 7, 18, 5, hair, s); px(ctx, 13, 12, 2, 2, hair, s); }
  // 眉毛
  px(ctx, 14, 15, 4, 1, hair, s);
  px(ctx, 22, 15, 4, 1, hair, s);
  // 眼睛
  px(ctx, 14, 17, 4, 2, white, s);
  px(ctx, 22, 17, 4, 2, white, s);
  const pupilColor = opts.evil ? "#c0453e" : darkInk;
  if (opts.slitPupils) { px(ctx, 16, 17, 1, 2, pupilColor, s); px(ctx, 24, 17, 1, 2, pupilColor, s); }
  else { px(ctx, 16, 17, 2, 2, pupilColor, s); px(ctx, 23, 17, 2, 2, pupilColor, s); }
  // 第三只眼
  if (opts.extraEye) {
    px(ctx, 18, 11, 4, 2, white, s);
    px(ctx, 19, 11, 2, 2, "#c0453e", s);
  }
  // 眼镜
  if (app.glasses) {
    ctx.strokeStyle = shade("#8a9296", dark); ctx.lineWidth = 1;
    ctx.strokeRect(14 * s + .5, 16.5 * s, 4 * s, 3 * s);
    ctx.strokeRect(22 * s + .5, 16.5 * s, 4 * s, 3 * s);
    ctx.beginPath(); ctx.moveTo(18 * s, 18 * s); ctx.lineTo(22 * s, 18 * s); ctx.stroke();
  }
  // 鼻子
  px(ctx, 19, 19, 2, 2, shade(app.skin, dark * 0.85), s);
  // 嘴
  if (opts.smile) { px(ctx, 17, 22, 6, 1, darkInk, s); px(ctx, 16, 21, 1, 1, darkInk, s); px(ctx, 23, 21, 1, 1, darkInk, s); }
  else px(ctx, 17, 23, 6, 1, darkInk, s);
  if (opts.stitchMouth) {
    for (let i = 0; i < 4; i++) px(ctx, 17 + i * 2, 22, 1, 3, "#5c5450", s);
  }
  if (opts.manyTeeth) {
    px(ctx, 17, 24, 6, 2, "#d8dde0", s);
    px(ctx, 17, 26, 6, 1, "#b8bfc2", s);
    px(ctx, 15, 23, 2, 2, "#d8dde0", s);
    px(ctx, 23, 23, 2, 2, "#d8dde0", s);
  }
  // 胡子
  if (app.beard) { px(ctx, 14, 24, 12, 4, hair, s); px(ctx, 18, 23, 4, 1, hair, s); }
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return "rgb(" + r + "," + g + "," + b + ")";
}

function renderAvatar() {
  const cv = $("avatar"), ctx = cv.getContext("2d");
  const t = G.cur.tells;
  drawPerson(ctx, G.cur.app, {
    slitPupils: t.appearance.includes("pupils"),
    stitchMouth: t.appearance.includes("stitch"),
    manyTeeth: t.appearance.includes("teeth"),
    extraEye: t.appearance.includes("extraEye")
  });
}

function renderIdPhoto() {
  const cv = $("id-photo"), ctx = cv.getContext("2d");
  // 照片破绽：证件照的发色/眼镜与本人不一致
  const app = Object.assign({}, G.cur.app);
  if (G.cur.tells.photoMismatch) {
    if (app.glasses) app.glasses = false; else app.glasses = true;
    app.hair = choice(HAIRS.filter(h => h !== G.cur.app.hair));
  }
  drawPerson(ctx, app, { scale: 1.2 });
}

/* ========================= 界面渲染 ========================= */
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(id).classList.add("active");
}
function gameDateStr(day) {
  const d = new Date(1998, 9, 1);
  d.setDate(d.getDate() + (day - 1));
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}
function updateHUD() {
  $("hud-day").textContent = "第 " + G.day + " 天";
  $("hud-date").textContent = gameDateStr(G.day);
  $("hud-queue").textContent = "排队 " + G.qIndex + "/" + G.queue.length;
  $("hud-money").textContent = G.money;
  $("hud-rep").textContent = G.rep;
  $("rep-fill").style.width = clamp(G.rep, 0, 100) + "%";
  const bk = Object.keys(G.buffs).filter(k => G.buffs[k]);
  const bt = bk.map(k => (CONSUMABLES.find(c => c.key === k) || {}).i || "").join("");
  $("hud-buffs").textContent = bt ? "增益 " + bt : "";
}
let typeTimer = null;
function typewrite(el, text, speed, done) {
  clearInterval(typeTimer);
  el.textContent = "";
  let i = 0;
  typeTimer = setInterval(() => {
    el.textContent = text.slice(0, ++i);
    if (i >= text.length) { clearInterval(typeTimer); if (done) done(); }
  }, speed || 38);
}

/* ========================= 流程：开始 ========================= */
const INTRO_STORY = "1998 年秋，雾山小镇。你从失踪的舅舅手里继承了这家「伟人商店」。\n货架上的蜡烛、铜镜、粗盐……都是小镇居民离不开的东西。\n\n但最近，镇上混进了「伪人」。它们穿着人的衣服，学着人的表情，敲开一扇扇门。\n而它们，也会来商店买东西。\n\n舅舅在账本最后一页写着：\n「卖给它们，你就是下一个。」";

function startGame() {
  AudioSys.ensure();
  // 接入网站巧克力经济：开局消耗 1🍫（不足会弹补给窗），并显示 AI 简报
  if (window.Site && Site.beginGame) {
    Site.beginGame("伟人商店", { duo: true }, function () { resetGame(); });
  } else {
    resetGame();
  }
}

function resetGame() {
  G.day = 1; G.money = 50; G.rep = 100;
  G.tools = { mirror: false, uv: false, lie: false };
  G.stats = { soldFake: 0, rejectedReal: 0, correct: 0, income: 0 };
  G.flags = { kind: false, cold: false, inspectorPassed: false };
  G.buffs = {}; G.streak = 0; G.askMax = 2;
  G.over = false;
  showScreen("screen-game");
  startDay();
}

function buildQueue(day) {
  const count = Math.max(3, Math.min(10, Math.min(4 + Math.floor(day / 2), 8) + buffSum("more") - buffSum("fewer")));
  const q = [];
  for (let i = 0; i < count; i++) q.push(genCustomer(day));
  // ---- 剧情特殊客人 ----
  if (day === 3) {
    const c = genCustomer(day, { isFake: false });
    c.name = "小雨"; c.sex = "女"; c.birth = { y: 1987, m: 6, d: 15 };
    c.wants = { n: "白蜡烛", p: 15 };
    c.arrival = "叔叔……我妈妈说，让我买一根蜡烛回去。她说外面黑。";
    c.special = "girl";
    c.quirk = "小女孩的手冰凉冰凉，在发抖。但她说完就眨了眨眼。";
    q[rand(0, q.length - 1)] = c;
  }
  if (day === 5) {
    const c = genCustomer(day, { isFake: false });
    c.name = "郑科长"; c.sex = "男";
    c.wants = { n: "手电筒", p: 25 };
    c.arrival = "卫生局例行检查。顺便，买一支手电筒。你的执照没问题吧？";
    c.special = "inspector";
    c.quirk = "制服笔挺，证件齐全，眼神锐利。";
    q[rand(0, q.length - 1)] = c;
  }
  if (day === 7) {
    const c = genCustomer(day, { isFake: true });
    c.name = "陈默"; c.sex = "男";
    c.tells = { appearance: ["noBlink"], id: [], interview: false, mirror: false, uv: true, photoMismatch: true };
    c.wants = { n: "旧铜镜", p: 30 };
    c.arrival = "老板，这面镜子……我在梦里见过它。";
    c.special = "perfect";
    c.quirk = "他安静得像一件家具。";
    q[rand(0, q.length - 1)] = c;
  }
  if (day === 8) {
    const c = genCustomer(day, { isFake: true });
    c.name = "佝偻的旅人"; c.sex = "男";
    c.tells = { appearance: ["pupils"], id: [], interview: true, mirror: false, uv: false, photoMismatch: false };
    c.wants = { n: "药膏", p: 40 };
    c.arrival = "求你……我的孩子病了。他只是病了。药膏，多少钱都行。";
    c.special = "beggar";
    c.quirk = "竖瞳在兜帽阴影里发着微光，但那双眼睛在流泪。";
    q[rand(0, q.length - 1)] = c;
  }
  if (day === 9) {
    const c = genCustomer(day, { isFake: true });
    c.name = "张发财"; c.idName = randomName();
    c.tells = { appearance: [], id: [], interview: true, mirror: true, uv: false, photoMismatch: false };
    c.wants = { n: "老照片", p: 22 };
    c.arrival = "老伙计，我可是天天来你这买东西的张发财啊！";
    c.special = "regular";
    c.quirk = "他很热情。热情得……和昨天那位一模一样。";
    q[rand(0, q.length - 1)] = c;
  }
  if (day === 10) {
    const c = genCustomer(day, { isFake: true });
    c.name = "白裙女人"; c.sex = "女";
    c.tells = { appearance: ["noBlink"], id: ["birth"], interview: false, mirror: false, uv: true, photoMismatch: false };
    impossibleBirth(c);
    c.idNum = "530102" + c.birth.y + pad2(c.birth.m) + pad2(c.birth.d) + "0427";
    c.wants = { n: "布娃娃", p: 35 };
    c.arrival = "老板，快打烊了吧？……卖给我最后一个娃娃，好不好？";
    c.special = "final";
    c.quirk = "她站在灯下，影子却比她晚了半拍。";
    q[q.length - 1] = c;
  }
  return q;
}

function startDay() {
  G.queue = buildQueue(G.day);
  G.qIndex = 0;
  const weather = choice(WEATHERS);
  const fakeN = G.queue.filter(c => c.isFake).length;
  const bribe = buffSum("bribe");
  if (bribe) G.money += bribe;
  const repUp = buffSum("repUp");
  if (repUp) G.rep = clamp(G.rep + repUp, 0, 100);
  const intel = buffOn("intel") ? `<div class="news">📋 情报到手：今日排队的人里，混着 <b>${fakeN}</b> 个伪人。</div>` : "";
  const peek = buffOn("peek") ? `<div class="news">👁 门镜里的预兆：排头那位——<b>${G.queue[0].isFake ? "不是人" : "是人"}</b>。</div>` : "";
  const buffLine = Object.keys(G.buffs).filter(k => G.buffs[k]).length
    ? `<div class="stage-stats">今日生效：${activeBuffText()}</div>` : "";
  stageScreen(`
    <div class="stage-date">${gameDateStr(G.day)} · ${weather}</div>
    <div class="stage-title">第 ${G.day} 天</div>
    <div class="stage-desc">${dayFlavor(G.day)}</div>
    ${intel}
    ${peek}
    ${buffLine}
    ${bribe ? `<div class="news">🏺 开张进账：昨晚收的杂货出手了，+$${bribe}。</div>` : ""}
    ${repUp ? `<div class="news">🕊 开张纳福：今日信誉 +${repUp}。</div>` : ""}
    ${NEWS[G.day] ? `<div class="news">${NEWS[G.day]}</div>` : ""}
    <div class="stage-buttons"><button class="btn btn-big btn-green" id="btn-day-go">开店营业</button></div>
  `, () => { AudioSys.bell(); nextCustomer(); });
}

/* ========================= 夜市每日特供 =========================
   商品总库 111 = 一次性杂货 108 + 永久装备 3 (PERM_GOODS)
   每晚以天数做种子随机上架 20 件一次性杂货(次日生效), 永久装备常驻 */
const CONSUMABLES = [
  // ---- 追问 ask: 明日每位客人可多问 N 个问题 ----
  { key: "coffee", n: "☕ 浓咖啡", p: 15, d: "明日每位客人可多问 1 个问题", i: "☕", eff: ["ask", 1] },
  { key: "tobacco", n: "🚬 老烟枪的烟丝", p: 13, d: "明日每位客人可多问 1 个问题。客人抽一口,就多聊一句", i: "🚬", eff: ["ask", 1] },
  { key: "liquor", n: "🍶 烧刀子", p: 16, d: "明日每位客人可多问 1 个问题。一口下肚,话匣子关不上", i: "🍶", eff: ["ask", 1] },
  { key: "gossip", n: "💬 巷口闲话", p: 12, d: "明日每位客人可多问 1 个问题。先聊八卦,再谈买卖", i: "💬", eff: ["ask", 1] },
  { key: "teaPot", n: "🍵 高末一壶", p: 11, d: "明日每位客人可多问 1 个问题。茶水管够,话就管够", i: "🍵", eff: ["ask", 1] },
  { key: "riddle", n: "🃏 纸牌戏法", p: 17, d: "明日每位客人可多问 1 个问题。一局牌,套出半辈子", i: "🃏", eff: ["ask", 1] },
  { key: "candy", n: "🍬 麦芽糖", p: 12, d: "明日每位客人可多问 1 个问题。小客人吃了糖,什么都肯说", i: "🍬", eff: ["ask", 1] },
  { key: "storyBook", n: "📖 睡前故事集", p: 27, d: "明日每位客人可多问 2 个问题。故事讲得好,人就放松", i: "📖", eff: ["ask", 2] },
  { key: "photoCam", n: "📷 旧拍立得", p: 29, d: "明日每位客人可多问 2 个问题。拍照的功夫,足够多聊两句", i: "📷", eff: ["ask", 2] },
  { key: "gramophone", n: "📻 手摇留声机", p: 30, d: "明日每位客人可多问 2 个问题。音乐一响,戒心就散了", i: "📻", eff: ["ask", 2] },
  { key: "miGang", n: "🀄 麻将一副", p: 28, d: "明日每位客人可多问 2 个问题。三圈下来,家里几口都摸清", i: "🀄", eff: ["ask", 2] },
  { key: "puppy", n: "🐕 摇尾小奶狗", p: 31, d: "明日每位客人可多问 2 个问题。没人能一边摸狗一边撒谎", i: "🐕", eff: ["ask", 2] },
  // ---- 货款 income: 明日所有货款 +N% ----
  { key: "lucky", n: "🍀 幸运符", p: 12, d: "明日所有货款 +50%", i: "🍀", eff: ["income", 50] },
  { key: "catBless", n: "🐈‍⬛ 黑猫洗脸", p: 18, d: "明日所有货款 +20%。黑猫在你门口洗脸,是招财的兆头", i: "🐈‍⬛", eff: ["income", 20] },
  { key: "coinRope", n: "🪙 铜钱红绳", p: 22, d: "明日所有货款 +30%。拴在柜台腿上,钱进不出", i: "🪙", eff: ["income", 30] },
  { key: "goldTooth", n: "🦷 金牙一颗", p: 20, d: "明日所有货款 +30%。笑的时候露出来,财气跟着来", i: "🦷", eff: ["income", 30] },
  { key: "silkCord", n: "🧵 五色线", p: 19, d: "明日所有货款 +20%。缠在钱箱提手上", i: "🧵", eff: ["income", 20] },
  { key: "richPaint", n: "🖼 年画:财神", p: 26, d: "明日所有货款 +50%。贴一年,富三年——先富明天", i: "🖼", eff: ["income", 50] },
  { key: "redPaper", n: "🧧 开张红纸", p: 25, d: "明日所有货款 +40%。贴在门框上,账面看涨", i: "🧧", eff: ["income", 40] },
  { key: "windChime", n: "🎐 铜铃一串", p: 27, d: "明日所有货款 +40%。风响一声,钱近一声", i: "🎐", eff: ["income", 40] },
  { key: "fengShui", n: "🧭 罗盘", p: 33, d: "明日所有货款 +60%。针一偏,财位就在你柜台", i: "🧭", eff: ["income", 60] },
  { key: "godown", n: "🏮 招财灯笼", p: 32, d: "明日所有货款 +60%。挂一晚,明日账面好看", i: "🏮", eff: ["income", 60] },
  { key: "luckyCat", n: "🐱 招手电动猫", p: 38, d: "明日所有货款 +80%。手臂永远停在「欢迎光临」", i: "🐱", eff: ["income", 80] },
  { key: "goldPig", n: "🐷 瓷储蓄罐", p: 36, d: "明日所有货款 +70%。投进去的是分,吐出来的是元", i: "🐷", eff: ["income", 70] },
  { key: "juBao", n: "🔴 聚宝盆残片", p: 42, d: "明日所有货款 +90%。盆是假的,运气是真的", i: "🔴", eff: ["income", 90] },
  { key: "abacus", n: "🧮 老掌柜算盘", p: 45, d: "明日所有货款 +100%。拨一颗珠,进三笔钱", i: "🧮", eff: ["income", 100] },
  // ---- 免誉盾 shield: 明日前 N 次卖给伪人, 不扣信誉(一次性) ----
  { key: "candle", n: "🕯 驱邪蜡烛", p: 18, d: "明日第一次卖给伪人，不扣信誉", i: "🕯", eff: ["shield", 1] },
  { key: "saltPack", n: "🧂 粗盐包", p: 21, d: "明日前 1 次卖给伪人不扣信誉。撒在门槛上,坏名声也进不来", i: "🧂", eff: ["shield", 1] },
  { key: "redString", n: "🧶 红绳缠腕", p: 24, d: "明日前 1 次卖给伪人不扣信誉。错事记不到你头上", i: "🧶", eff: ["shield", 1] },
  { key: "twinEgg", n: "🥚 双黄蛋", p: 23, d: "明日前 1 次卖给伪人不扣信誉。吉兆,替你圆一次场", i: "🥚", eff: ["shield", 1] },
  { key: "silenceBell", n: "🔔 哑铃铛", p: 26, d: "明日前 1 次卖给伪人不扣信誉。铃不响,事就传不开", i: "🔔", eff: ["shield", 1] },
  { key: "jadeChip", n: "🪢 平安扣", p: 28, d: "明日前 1 次卖给伪人不扣信誉。裂了,就是替你挡了", i: "🪢", eff: ["shield", 1] },
  { key: "paperMan", n: "📄 纸剪小人", p: 33, d: "明日前 2 次卖给伪人不扣信誉。烧给谁,谁替你受过", i: "📄", eff: ["shield", 2] },
  { key: "dollEff", n: "🎎 替身木偶", p: 36, d: "明日前 2 次卖给伪人不扣信誉。它替你挨两次骂", i: "🎎", eff: ["shield", 2] },
  // ---- 信誉减损 repCut: 明日所有信誉损失 -N%(上限90%) ----
  { key: "stone", n: "🧿 镇店石", p: 20, d: "明日所有信誉损失减半", i: "🧿", eff: ["repCut", 50] },
  { key: "saltLine", n: "〰 门槛盐线", p: 14, d: "明日所有信誉损失 -30%。一道盐线,闲话进不来", i: "〰", eff: ["repCut", 30] },
  { key: "cinnabar", n: "🟥 朱砂一点", p: 17, d: "明日所有信誉损失 -30%。点在门楣,邪祟绕行,闲话也是", i: "🟥", eff: ["repCut", 30] },
  { key: "incenseAsh", n: "🪔 香灰一圈", p: 21, d: "明日所有信誉损失 -40%。灶王像前刮的,辟谣", i: "🪔", eff: ["repCut", 40] },
  { key: "oldFace", n: "👴 老主顾情面", p: 24, d: "明日所有信誉损失 -50%。镇上人给你三分情面", i: "👴", eff: ["repCut", 50] },
  { key: "templeSign", n: "🛕 庙里求的签", p: 27, d: "明日所有信誉损失 -50%。上上签压在玻璃板下", i: "🛕", eff: ["repCut", 50] },
  { key: "landlordWord", n: "🗝 房东打包票", p: 29, d: "明日所有信誉损失 -50%。「这家人,我担保」", i: "🗝", eff: ["repCut", 50] },
  { key: "witnessMan", n: "🧑‍🌾 老农作证", p: 30, d: "明日所有信誉损失 -60%。「这店我买了三十年,我信」", i: "🧑‍🌾", eff: ["repCut", 60] },
  { key: "pressCut", n: "📰 报社熟人", p: 35, d: "明日所有信誉损失 -60%。明天报纸上没有你的坏话", i: "📰", eff: ["repCut", 60] },
  { key: "sealBox", n: "🪣 公章木盒", p: 40, d: "明日所有信誉损失 -70%。盖过章的话,份量重三分", i: "🪣", eff: ["repCut", 70] },
  // ---- 情报 intel: 开店时得知今日伪人数量 ----
  { key: "intel", n: "📋 线人情报", p: 25, d: "开店时得知今日伪人数量", i: "📋", eff: ["intel", 1] },
  { key: "crowLetter", n: "🐦‍⬛ 乌鸦传信", p: 22, d: "开店时得知今日伪人数量。乌鸦落在谁头上,它记着呢", i: "🐦‍⬛", eff: ["intel", 1] },
  { key: "teaLeaves", n: "🫖 茶叶渣占卜", p: 24, d: "开店时得知今日伪人数量。渣的形状从不说谎", i: "🫖", eff: ["intel", 1] },
  { key: "beggarInfo", n: "🥣 乞儿密语", p: 23, d: "开店时得知今日伪人数量。讨饭孩子数过排队的人头", i: "🥣", eff: ["intel", 1] },
  { key: "nightPaper", n: "📰 夜班号外", p: 26, d: "开店时得知今日伪人数量。排版工半夜塞给你的", i: "🗞", eff: ["intel", 1] },
  // ---- 鹰眼 eye: 外貌检查干净时, 提示破绽藏在哪类检查 ----
  { key: "eye", n: "🔎 鹰眼药水", p: 22, d: "明日外貌检查干净时，提示破绽藏在哪类检查", i: "🔎", eff: ["eye", 1] },
  { key: "dogNose", n: "👃 猎犬鼻烟壶", p: 20, d: "明日外貌检查干净时，提示破绽藏在哪类检查。鼻子比眼睛诚实", i: "👃", eff: ["eye", 1] },
  { key: "owlEye", n: "🦉 猫头鹰之瞳", p: 26, d: "明日外貌检查干净时，提示破绽藏在哪类检查。夜里的眼睛更毒", i: "🦉", eff: ["eye", 1] },
  { key: "glassBead", n: "🔮 琉璃珠", p: 24, d: "明日外貌检查干净时，提示破绽藏在哪类检查。对着光看人,皮下的藏不住", i: "🔮", eff: ["eye", 1] },
  { key: "deadGlasses", n: "👓 亡妻的老花镜", p: 28, d: "明日外貌检查干净时，提示破绽藏在哪类检查。「她总说,她看得见不一样的人」", i: "👓", eff: ["eye", 1] },
  // ---- 租金 rentCut: 明日经营成本 -$N ----
  { key: "landlordBeer", n: "🍺 房东的酒", p: 10, d: "明日经营成本 -$10。陪房东喝一杯,房租好说", i: "🍺", eff: ["rentCut", 10] },
  { key: "diceWin", n: "🎲 一局牌赢的", p: 14, d: "明日经营成本 -$15。昨晚替房东输了钱,今晚他还你", i: "🎲", eff: ["rentCut", 15] },
  { key: "fakeReceipt", n: "🧾 模糊收据", p: 18, d: "明日经营成本 -$20。数字被水泡过,怎么算都对", i: "🧾", eff: ["rentCut", 20] },
  { key: "rentNote", n: "📝 房东字条", p: 24, d: "明日经营成本 -$30。「本月免一半。别问。」", i: "📝", eff: ["rentCut", 30] },
  { key: "templeRent", n: "🛖 庙祝的招呼", p: 29, d: "明日经营成本 -$45。庙产的铺面,这月不收钱", i: "🛖", eff: ["rentCut", 45] },
  { key: "rentFree", n: "📜 泛黄地契", p: 34, d: "明日经营成本 -$60。地契边角写着你的名字……吧?", i: "📜", eff: ["rentCut", 60] },
  // ---- 客流 more: 明日多 N 位客人(收入机会与风险同增) ----
  { key: "horn", n: "📣 铜皮喇叭", p: 8, d: "明日多 1 位客人。吆喝一嗓子,多引来一个", i: "📣", eff: ["more", 1] },
  { key: "banner", n: "🎏 老字号幌子", p: 12, d: "明日多 1 位客人。布幌子一挑,老招牌就有人认", i: "🎏", eff: ["more", 1] },
  { key: "wetPaint", n: "🖌 油漆未干", p: 9, d: "明日少 1 位客人。木牌立在门口,真的管用", i: "🖌", eff: ["fewer", 1] },
  { key: "saltDoor", n: "🧹 门槛撒盐", p: 6, d: "明日少 1 位客人。求个清净", i: "🧹", eff: ["fewer", 1] },
  { key: "blackCloth", n: "⬛ 门挂黑布", p: 9, d: "明日少 1 位客人。像办丧事,闲人绕道", i: "⬛", eff: ["fewer", 1] },
  { key: "closeSign", n: "🌫 闭门符", p: 12, d: "明日少 2 位客人。「今日谢客半天,清净」", i: "🌫", eff: ["fewer", 2] },
  { key: "howlDog", n: "🐺 邻村狗吠", p: 14, d: "明日少 2 位客人。一叫一整夜,人就不来了", i: "🐺", eff: ["fewer", 2] },
  { key: "firecrack", n: "🧨 残炮一支", p: 16, d: "明日多 2 位客人。响声传两条街", i: "🧨", eff: ["more", 2] },
  { key: "samplePlate", n: "🍩 试吃瓷盘", p: 18, d: "明日多 2 位客人。摆出来,路人就想进来看看", i: "🍩", eff: ["more", 2] },
  { key: "trotLamp", n: "🎡 走马灯", p: 22, d: "明日多 2 位客人。灯一转,半条街都来看", i: "🎡", eff: ["more", 2] },
  { key: "puppetShow", n: "🪆 提线小戏", p: 26, d: "明日多 3 位客人。开演前,门口先排队", i: "🪆", eff: ["more", 3] },
  // ---- 装备折扣 discount: 今晚永久装备立减 $N(不超过六成) ----
  { key: "toolbox", n: "🧰 旧工具箱", p: 10, d: "今晚永久装备立减 $30。给老铁匠修家伙,收你人情价", i: "🧰", eff: ["discount", 30] },
  { key: "grease", n: "🛢 润滑油脂", p: 12, d: "今晚永久装备立减 $40。「手顺,价就顺」", i: "🛢", eff: ["discount", 40] },
  { key: "barter", n: "🔄 以物易物", p: 16, d: "今晚永久装备立减 $50。你不要的,正好是别人要的", i: "🔄", eff: ["discount", 50] },
  { key: "forgeGift", n: "⚒ 炉火炭包", p: 20, d: "今晚永久装备立减 $60。铁匠家的炭,永远是好炭", i: "⚒", eff: ["discount", 60] },
  { key: "vipCard", n: "🎟 黑市老票", p: 26, d: "今晚永久装备立减 $90。磨得发亮的旧票,老板认", i: "🎟", eff: ["discount", 90] },
  { key: "marketFace", n: "🎭 黑市面子", p: 30, d: "今晚永久装备立减 $100。老板算你半个自己人", i: "🎭", eff: ["discount", 100] },
  // ---- 开张进账 bribe: 明日开店时 +$N ----
  { key: "jarCoins", n: "🏺 罐底私房钱", p: 10, d: "明日开店时 +$15。埋在罐底,压箱底的体己", i: "🏺", eff: ["bribe", 15] },
  { key: "eggBasket", n: "🍳 篮底鸡蛋", p: 12, d: "明日开店时 +$20。后院母鸡争气", i: "🍳", eff: ["bribe", 20] },
  { key: "fishCatch", n: "🐟 夜网收鱼", p: 14, d: "明日开店时 +$25。后半夜下的网,清晨就卖", i: "🐟", eff: ["bribe", 25] },
  { key: "oldCoin", n: "🥇 民国银毫", p: 18, d: "明日开店时 +$30。银毫子,收老货的都认", i: "🥇", eff: ["bribe", 30] },
  { key: "foundWallet", n: "👛 捡到的钱夹", p: 24, d: "明日开店时 +$45。失主?雾里找去吧", i: "👛", eff: ["bribe", 45] },
  { key: "pawnTicket", n: "🎫 死当金条", p: 26, d: "明日开店时 +$50。死当不赎,明早进账", i: "🎫", eff: ["bribe", 50] },
  // ---- 无良货 fakePay: 明日卖给伪人的货款 +N% ----
  { key: "blindEye", n: "🪙 蒙眼铜钱", p: 10, d: "明日卖给伪人的货款 +50%。有些钱,睁只眼闭只眼才赚得多", i: "🪙", eff: ["fakePay", 50] },
  { key: "coldLamp", n: "💡 绿罩灯", p: 14, d: "明日卖给伪人的货款 +60%。灯是绿的,账是热的", i: "💡", eff: ["fakePay", 60] },
  { key: "darkDeal", n: "🕳 地下秤", p: 16, d: "明日卖给伪人的货款 +80%。称什么都是八两,多出的二两是它们的", i: "🕳", eff: ["fakePay", 80] },
  { key: "hollowBook", n: "📕 掏空的书", p: 18, d: "明日卖给伪人的货款 +90%。夹层里全是它们爱听的话", i: "📕", eff: ["fakePay", 90] },
  { key: "foxMask", n: "🦊 狐狸面具", p: 20, d: "明日卖给伪人的货款 +100%。戴上它,你和它们算同行", i: "🦊", eff: ["fakePay", 100] },
  // ---- 纳福 repUp: 明日开局信誉 +N ----
  { key: "peaceIncense", n: "🕊 和平安香", p: 8, d: "明日开局信誉 +10。给灶王上柱香,也给镇上一个好脸色", i: "🕊", eff: ["repUp", 10] },
  { key: "flagFix", n: "🚩 修旗杆", p: 18, d: "明日开局信誉 +20。把歪了半年的旗杆扶正", i: "🚩", eff: ["repUp", 20] },
  { key: "donateBoard", n: "🪧 义捐木匾", p: 20, d: "明日开局信誉 +25。「乐善好施」四个字挂在门口", i: "🪧", eff: ["repUp", 25] },
  { key: "freeBread", n: "🍞 施粥一锅", p: 22, d: "明日开局信誉 +25。明早门口一锅粥,全镇说你好", i: "🍞", eff: ["repUp", 25] },
  { key: "stoveCandy", n: "🍯 灶王糖", p: 16, d: "明日开局信誉 +20。甜住灶王的嘴,也甜住镇上的嘴", i: "🍯", eff: ["repUp", 20] },
  { key: "returnHead", n: "🐂 还愿猪首", p: 24, d: "明日开局信誉 +30。还了愿,人人夸你讲信义", i: "🐂", eff: ["repUp", 30] },
  // ---- 套话 chat: 明日伪人盘问时更容易说漏嘴 ----
  { key: "hookWord", n: "🎣 钓话的饵", p: 18, d: "明日伪人盘问时更容易说漏嘴。抛个话头,它们自己咬钩", i: "🎣", eff: ["chat", 25] },
  { key: "threadIncense", n: "🪡 引线香", p: 26, d: "明日伪人盘问时更容易说漏嘴。点一支,话顺着烟走", i: "🪡", eff: ["chat", 50] },
  { key: "wineLantern", n: "🍷 醉仙壶", p: 30, d: "明日伪人盘问时更容易说漏嘴。不是人,也贪杯", i: "🍷", eff: ["chat", 60] },
  { key: "lullaby", n: "🎵 催眠八音盒", p: 34, d: "明日伪人盘问时更容易说漏嘴。听着听着,就忘了该编什么", i: "🎵", eff: ["chat", 75] },
  // ---- 预兆 peek: 开店前得知排头客人是否伪人 ----
  { key: "doorLens", n: "👁 猫眼门镜", p: 21, d: "开店前得知排头客人是否伪人。门镜不骗人,骗人的在门外", i: "👁", eff: ["peek", 1] },
  { key: "morningBird", n: "🐦 报晓鸟", p: 24, d: "开店前得知排头客人是否伪人。它对「不是人」的东西会炸毛", i: "🐦", eff: ["peek", 1] },
  { key: "dreamRead", n: "🌙 梦境解读", p: 27, d: "开店前得知排头客人是否伪人。昨晚的梦,就是明天的预告", i: "🌙", eff: ["peek", 1] },
  // ---- 场面 pardon: 明日前 N 次冤枉真人, 不扣信誉(一次性) ----
  { key: "sorryCandy", n: "🍡 赔礼点心", p: 17, d: "明日前 1 次冤枉真人不扣信誉。「误会误会,这点心是赔罪」", i: "🍡", eff: ["pardon", 1] },
  { key: "sceneWords", n: "🗒 场面话手册", p: 19, d: "明日前 1 次冤枉真人不扣信誉。说错一句,有人替你圆场", i: "🗒", eff: ["pardon", 1] },
  { key: "guestCup", n: "🥃 待客酒杯", p: 20, d: "明日前 1 次冤枉真人不扣信誉。先递一杯,气就消一半", i: "🥃", eff: ["pardon", 1] },
  { key: "smileTeach", n: "😊 笑脸面具", p: 21, d: "明日前 1 次冤枉真人不扣信誉。挂在柜台后,火气就小", i: "😊", eff: ["pardon", 1] },
  { key: "oldLetter", n: "✉ 旧道歉信", p: 23, d: "明日前 1 次冤枉真人不扣信誉。照着念,比真诚还管用", i: "✉", eff: ["pardon", 1] },
  { key: "neighborMed", n: "🩹 邻里和好膏", p: 25, d: "明日前 1 次冤枉真人不扣信誉。膏药治外伤,也治口角", i: "🩹", eff: ["pardon", 1] },
  { key: "kidFlower", n: "💐 孩子的野花", p: 28, d: "明日前 2 次冤枉真人不扣信誉。一束花,两个台阶下", i: "💐", eff: ["pardon", 2] }
];
const PERM_GOODS = [ // 永久装备 3 件(买断制), 与一次性杂货合计 111 件
  { key: "mirror", n: "🪞 穿衣柜镜", d: "伪人往往在镜中没有倒影。（永久）", p: 80 },
  { key: "uv", n: "🔦 紫外灯", d: "照出皮肤下的黑色纹路。（永久）", p: 150 },
  { key: "lie", n: "📈 掌上测谎仪", d: "对任何伪人必定报警——没有心跳。（永久）", p: 260 }
];
const BUFF_MAP = {};
CONSUMABLES.forEach(g => { BUFF_MAP[g.key] = g; });
function buffSum(kind) { // 汇总今晚所购杂货的某类效果值
  let v = 0;
  for (const k in G.buffs) {
    const g = BUFF_MAP[k];
    if (G.buffs[k] && g && g.eff && g.eff[0] === kind) v += g.eff[1];
  }
  return v;
}
function buffOn(kind) { return buffSum(kind) > 0; }
function consumeBuff(kind) { // 用掉一件 shield/pardon 类, 返回该商品
  for (const k in G.buffs) {
    const g = BUFF_MAP[k];
    if (G.buffs[k] && g && g.eff && g.eff[0] === kind) { G.buffs[k] = 0; return g; }
  }
  return null;
}
function chatP() { // 盘问说漏嘴概率(基础50%, 套话类加成, 封顶95%)
  return Math.min(0.95, 0.5 + buffSum("chat") / 100);
}
function dailySpecials(nextDay) { // 以天数做种子 → 每晚固定上架 20 件
  let s = (nextDay * 9301 + 49297) % 233280;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const pool = CONSUMABLES.slice();
  const out = [];
  for (let i = 0; i < 20 && pool.length; i++) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}
function activeBuffText() {
  return Object.keys(G.buffs).filter(k => G.buffs[k] && BUFF_MAP[k])
    .map(k => BUFF_MAP[k].i + BUFF_MAP[k].n.slice(2)).join("　");
}

function dayFlavor(day) {
  const f = {
    1: "雾从山那边漫下来。第一位客人已经在敲门了。",
    2: "街对面的理发店三天没开门了。你把舅舅的旧放大镜擦了擦。",
    3: "今天来的客人里，好像有个很小的身影。",
    4: "镇上开始有人互相盘问。没人再敢赊账。",
    5: "听说卫生局的人今天要来镇上「看看」。",
    6: "浓雾。正午的天色像傍晚。蜡烛卖得很快。",
    7: "你数了数货架。有些东西，好像夜里被动过。",
    8: "今夜会有一个「不该存在的客人」上门。怎么做，由你决定。",
    9: "熟悉的脚步声。但熟悉，不代表安全。",
    10: "最后一天。雾山所有的大门都关上了，除了你的。"
  };
  return f[day] || "雾越来越浓。";
}

function stageScreen(html, onGo, btnText) {
  showScreen("screen-stage");
  $("stage-box").innerHTML = html;
  const btn = $("btn-day-go");
  if (btn) btn.onclick = () => { AudioSys.pageflip(); onGo(); };
}

/* ========================= 流程：接待客人 ========================= */
function nextCustomer() {
  if (G.over) return;
  if (G.qIndex >= G.queue.length) { endDay(); return; }
  G.cur = G.queue[G.qIndex];
  G.asked = 0;
  G.askMax = 2 + (G.buffs.coffee ? 1 : 0);
  G.usedInspect = G.usedMirror = G.usedUV = G.usedLie = false;
  showScreen("screen-game");
  updateHUD();
  renderAvatar();
  renderIdCard();
  renderAskButtons();
  $("inspect-result").innerHTML = "使用放大镜查看客人外貌。";
  $("tools-result").innerHTML = "尚未使用任何工具。";
  $("ask-count").textContent = "剩 " + G.askMax;
  $("ask-limit").textContent = G.askMax;
  $("cust-nameplate").textContent = "客人 #" + (G.qIndex + 1);
  $("cust-want").textContent = "想买：" + G.cur.wants.n + "（$" + G.cur.wants.p + "）";
  refreshToolButtons();
  AudioSys.knock();
  setTimeout(() => AudioSys.bell(), 350);
  typewrite($("dialogue"), "「" + G.cur.arrival + "」", 34);
  if (G.cur.special === "final") { AudioSys.heartbeat(); setTimeout(() => AudioSys.heartbeat(), 1400); }
}

function renderIdCard() {
  const c = G.cur;
  $("id-name").textContent = c.idName || c.name;
  $("id-sex").textContent = c.sex;
  $("id-birth").textContent = fmtBirth(c.birth);
  $("id-addr").textContent = c.addr;
  $("id-num").textContent = c.idNum;
  $("id-issue").textContent = c.issue;
  $("id-expiry").textContent = c.expiry;
  renderIdPhoto();
}

const QUESTIONS = [
  { key: "name", q: "你叫什么名字？" },
  { key: "birth", q: "你的生日是哪天？" },
  { key: "human", q: "你是人类吗？" },
  { key: "purpose", q: "这东西买来做什么？" }
];

function answerFor(c, key) {
  const t = c.tells;
  if (key === "name") {
    if (c.isFake && t.interview) {
      return Math.random() < chatP()
        ? "我叫" + randomName() + "。（和证件完全不同）"
        : "名字？……名字不重要。叫我什么都行，人类。";
    }
    return "我叫" + c.name + "。";
  }
  if (key === "birth") {
    if (c.isFake && t.interview) {
      return choice([
        "我的生日……是 2 月 30 日。每年都过。",
        "生日？我没有那种……我是说，我忘了。",
        "出生？我不是「出生」的。我是……来了。"
      ]);
    }
    return fmtBirth(c.birth) + "。";
  }
  if (key === "human") {
    if (c.isFake && t.interview) return "是……是的人类。我热爱呼吸氧气。";
    if (c.isFake) return "当然。有什么问题吗？（微笑）";
    return "当然是，不然呢？（皱眉）";
  }
  if (key === "purpose") {
    if (c.isFake && t.interview && Math.random() < chatP()) {
      return choice([
        "蜡烛的光……能看清「食物」的脸。",
        "镜子？镜子里的东西和我无关。",
        "盐撒在门槛上，有些东西就进不去了。你说是不是？"
      ]);
    }
    const flavor = {
      "白蜡烛": "家里停电了。", "旧铜镜": "送给老伴的。", "粗盐": "做菜。", "手电筒": "夜路太黑。",
      "缝纫针线": "补衣服。", "红绳": "给孩子编个绳。", "布娃娃": "女儿的生日快到了。", "老照片": "想念旧人。",
      "药膏": "腿疼老毛病。", "灯泡": "走廊的坏了。", "手套": "干活用。", "胶带": "修窗户。", "火柴": "生炉子。", "黄纸": "……写点东西。"
    };
    return flavor[c.wants.n] || "家里要用。";
  }
  return "……";
}

function renderAskButtons() {
  const list = $("ask-list");
  list.innerHTML = "";
  QUESTIONS.forEach(q => {
    const b = document.createElement("button");
    b.className = "ask-btn";
    b.textContent = "「" + q.q + "」";
    b.onclick = () => askQuestion(q);
    list.appendChild(b);
  });
}

function askQuestion(q) {
  if (G.asked >= G.askMax || !G.cur) return;
  G.asked++;
  AudioSys.pageflip();
  const ans = answerFor(G.cur, q.key);
  // 特殊客人覆盖
  const override = specialAnswer(G.cur, q.key);
  const final = override || ans;
  typewrite($("dialogue"), "「" + final + "」", 30);
  const list = $("ask-list");
  const entry = document.createElement("div");
  entry.className = "ask-log";
  entry.innerHTML = "<div class='dim'>▸ " + q.q + "</div><div>" + final + "</div>";
  list.appendChild(entry);
  Array.from(list.querySelectorAll(".ask-btn")).forEach(b => b.disabled = G.asked >= G.askMax);
  $("ask-count").textContent = "剩 " + (G.askMax - G.asked);
}

function specialAnswer(c, key) {
  if (c.special === "girl" && key === "purpose") return "妈妈说，蜡烛点起来，「假的爸爸」就不敢进屋了。";
  if (c.special === "beggar" && key === "human") return "我不是。但我的孩子是。他一半是。求你了……他只是发烧。";
  if (c.special === "beggar" && key === "purpose") return "药膏。孩子的高热。人类的孩子，也会死的。";
  if (c.special === "final" && key === "human") return "（她笑了）老板，这十天的客人里，你猜漏了几个？";
  if (c.special === "regular" && key === "name") return "张发财啊！老伙计，你连我都不认得了？（他自称张发财，可证件上是另一个名字）";
  return null;
}

/* ========================= 工具检查 ========================= */
function refreshToolButtons() {
  const set = (id, cond, used) => {
    const b = $(id);
    b.disabled = !cond || used;
    b.classList.toggle("used", !!used);
  };
  set("btn-inspect", true, G.usedInspect);
  set("btn-mirror", G.tools.mirror, G.usedMirror);
  set("btn-uv", G.tools.uv, G.usedUV);
  set("btn-lie", G.tools.lie, G.usedLie);
}

function doInspect() {
  if (G.usedInspect || !G.cur) return;
  G.usedInspect = true;
  AudioSys.pageflip();
  const t = G.cur.tells;
  const label = { pupils: "瞳孔", stitch: "嘴巴", skin: "皮肤", teeth: "牙齿", extraEye: "额头", noBlink: "眨眼" };
  let html = "";
  if (t.appearance.length === 0) {
    html = "<div>瞳孔：圆而湿润。</div><div>皮肤：健康的血色。</div><div>嘴部：正常。</div><div>额头：正常。</div><div>眨眼：频率正常。</div><div class='dim'>※ " + G.cur.quirk + "</div>";
    if (buffOn("eye")) html += "<div class='ok'>🔎 鹰眼之物在发热：外貌完全干净——破绽藏在<b>证件、盘问或工具</b>里。</div>";
  } else {
    const seen = shuffle(t.appearance);
    html += "<div>仔细看——</div>";
    seen.forEach(k => { html += "<div class='warn'>" + label[k] + "：" + APP_TELL_TEXT[k] + "</div>"; });
    ["瞳孔", "嘴巴", "皮肤", "牙齿", "额头", "眨眼"].forEach(part => {
      if (!t.appearance.some(k => label[k] === part)) {
        if (part === "瞳孔" && !t.appearance.includes("pupils")) html += "<div>" + part + "：正常。</div>";
        if (part === "嘴巴" && !t.appearance.includes("stitch") && !t.appearance.includes("teeth")) html += "<div>" + part + "：正常。</div>";
        if (part === "皮肤" && !t.appearance.includes("skin")) html += "<div>" + part + "：正常。</div>";
        if (part === "额头" && !t.appearance.includes("extraEye")) html += "<div>" + part + "：正常。</div>";
        if (part === "眨眼" && !t.appearance.includes("noBlink")) html += "<div>" + part + "：频率正常。</div>";
      }
    });
    if (G.cur.quirk && Math.random() < 0.5) html += "<div class='dim'>另外：" + G.cur.quirk + "</div>";
  }
  $("inspect-result").innerHTML = html;
  refreshToolButtons();
}

function doMirror() {
  if (!G.tools.mirror || G.usedMirror || !G.cur) return;
  G.usedMirror = true;
  AudioSys.tone(1200, 0.12, "triangle", 0.05);
  const t = G.cur.tells;
  let html = "<div class='mirror-frame'><canvas id='mirror-view' width='80' height='88'></canvas></div>";
  $("tools-result").innerHTML = html;
  const mv = $("mirror-view"), mctx = mv.getContext("2d");
  if (t.mirror) {
    drawPerson(mctx, G.cur.app, { empty: true, scale: 2 });
    $("tools-result").innerHTML += "<div class='warn'>⚠️ 镜子里空无一人。柜台前却站着「他」。</div>";
    AudioSys.buzz();
  } else {
    drawPerson(mctx, G.cur.app, { reflection: true, scale: 2, slitPupils: t.appearance.includes("pupils"), extraEye: t.appearance.includes("extraEye") });
    $("tools-result").innerHTML += "<div class='ok'>镜中倒影与本人一致。</div>";
    if (G.cur.special === "final") $("tools-result").innerHTML += "<div class='warn'>⚠️ 等等——镜子里的她，笑得更开了。</div>";
  }
  refreshToolButtons();
}

function doUV() {
  if (!G.tools.uv || G.usedUV || !G.cur) return;
  G.usedUV = true;
  AudioSys.tone(300, 0.25, "sine", 0.06);
  if (G.cur.tells.uv) {
    $("tools-result").innerHTML = "<div class='uv-glow'>🔦 紫外光下……</div><div class='warn'>⚠️ 脖颈处浮现出蛛网般的黑色纹路，一直蔓延到衣领下。</div>";
    AudioSys.buzz();
  } else {
    $("tools-result").innerHTML = "<div class='uv-glow'>🔦 紫外光下……</div><div class='ok'>皮肤干干净净，没有异常。</div>";
  }
  refreshToolButtons();
}

function doLie() {
  if (!G.tools.lie || G.usedLie || !G.cur) return;
  G.usedLie = true;
  AudioSys.tone(440, 0.08, "square", 0.05);
  if (G.cur.isFake) {
    $("tools-result").innerHTML = "<div class='uv-glow'>📈 测谎仪贴上手腕……</div><div class='warn'>⚠️ 波形剧烈震荡，随后变成一条诡异的直线——<b>没有心跳</b>。</div>";
    AudioSys.alarm();
  } else {
    $("tools-result").innerHTML = "<div class='uv-glow'>📈 测谎仪贴上手腕……</div><div class='ok'>心率 78，波形平稳。是活人。</div>";
  }
  refreshToolButtons();
}

/* ========================= 决策 ========================= */
function decide(sell) {
  if (!G.cur) return;
  const c = G.cur;
  const isFake = c.isFake;

  // 特殊剧情分支
  if (c.special === "beggar" && sell) {
    G.money += c.wants.p; G.stats.income += c.wants.p; G.dayStats.income += c.wants.p;
    G.rep = clamp(G.rep - 12, 0, 100);
    G.flags.kind = true; G.stats.soldFake++;
    unlockAch("soft_heart");
    return finishDecision(
      "你把药膏递了过去", "err",
      "他的竖瞳在泪光里眨了眨：「谢谢。」<br>镇上有人看见了。信誉 -12，收入 +$" + c.wants.p + "。",
      "「孩子的烧，天亮前会退的。人类……也有好人。」"
    );
  }
  if (c.special === "beggar" && !sell) {
    G.flags.cold = true;
    unlockAch("iron_face");
    return finishDecision("你拒绝了他", "ok", "他沉默了很久，把一枚旧硬币放在柜台上，走进雾里。<br>门外的哭声，很久才消失。", "「……对不起，孩子。」");
  }
  if (c.special === "inspector") {
    if (sell) {
      G.money += c.wants.p; G.stats.income += c.wants.p; G.dayStats.income += c.wants.p;
      G.rep = clamp(G.rep + 5, 0, 100); G.stats.correct++;
      G.flags.inspectorPassed = true;
      return finishDecision("检查通过", "ok", "郑科长付了钱：「眼光不错，最近乱，好好干。」信誉 +5，收入 +$" + c.wants.p + "。", "「下个月还来。」");
    } else {
      G.rep = clamp(G.rep - 20, 0, 100); G.stats.rejectedReal++;
      return finishDecision("你拒绝了检查员", "err", "「呵，有意思。」他在本子上写了很久。<br>信誉 -20。", "「拒绝配合检查的商店，会被记在小本子上。」");
    }
  }
  if (c.special === "final" && sell) {
    G.stats.soldFake += 99;
    return finishDecision("夜幕降临", "dark", "她抱着布娃娃走进浓雾。<br>那天夜里，伟人商店的灯亮了一整晚——<br>第二天，镇上的人说，柜台后面站着的那个「老板」，再也不眨眼了。", "「晚安，老板。欢迎加入我们。」", true);
  }

  // 常规判定（夜市特供增益在此生效）
  const priceMult = 1 + buffSum("income") / 100;
  const fakeMult = priceMult * (1 + buffSum("fakePay") / 100);
  const repCut = Math.min(90, buffSum("repCut"));
  const repLoss = (n) => Math.max(1, Math.round(n * (1 - repCut / 100)));
  if (sell && isFake) {
    const gain = Math.round(c.wants.p * fakeMult);
    G.money += gain; G.stats.income += gain; G.dayStats.income += gain;
    const shieldG = consumeBuff("shield");
    let loss = repLoss(25), shieldNote = "";
    if (shieldG) { loss = 0; shieldNote = "<br><span class='ok'>" + shieldG.i + " " + shieldG.n.slice(2) + "挡下了这一刀！信誉无损（一次性）。</span>"; }
    G.rep = clamp(G.rep - loss, 0, 100);
    G.stats.soldFake++; G.dayStats.mistakes++;
    AudioSys.buzz();
    return finishDecision("你把东西卖给了一个伪人", "err",
      "它接过货品的手指，比人类多 bend 了一个关节。<br>信誉 -" + loss + "，收入 +$" + gain + (fakeMult > 1 ? "（今日加成 +" + Math.round((fakeMult - 1) * 100) + "%）" : "") + "。<br><span class='warn'>它离开时回头看了你一眼——像在记住你。</span>" + shieldNote,
      choice(["「谢谢。我们会再来。」", "「你分不出来呢。」", "（它笑的时候，嘴角咧到了耳根）"]));
  }
  if (sell && !isFake) {
    const gain = Math.round(c.wants.p * priceMult);
    G.money += gain; G.stats.income += gain; G.dayStats.income += gain; G.dayStats.sold++;
    G.rep = clamp(G.rep + 2, 0, 100); G.stats.correct++;
    AudioSys.chime(); setTimeout(() => AudioSys.coin(), 250);
    return finishDecision("交易完成", "ok", "客人满意地离开了。<br>收入 +$" + gain + (priceMult > 1 ? "（今日货款 +" + Math.round((priceMult - 1) * 100) + "%）" : "") + "，信誉 +2。", choice(["「谢了，老板。」", "「下次还来。」", "「天黑了，早点关门吧。」"]));
  }
  if (!sell && isFake) {
    G.rep = clamp(G.rep + 2, 0, 100); G.stats.correct++;
    AudioSys.chime();
    return finishDecision("识破成功", "ok", "「它」的笑脸凝固了一瞬，随后一言不发地退出店门，融进雾里。<br>你守住了柜台。信誉 +2。", choice(["「……可惜。」", "（门外传来指甲刮擦木门的声音）", "「下次，我会更像一点。」"]));
  }
  if (!sell && !isFake) {
    const pardonG = consumeBuff("pardon");
    const loss = pardonG ? 0 : repLoss(10);
    G.rep = clamp(G.rep - loss, 0, 100); G.stats.rejectedReal++; G.dayStats.mistakes++;
    AudioSys.buzz();
    const pardonNote = pardonG
      ? "<br><span class='ok'>" + pardonG.i + " " + pardonG.n.slice(2) + "替你圆了场！信誉无损（一次性）。</span>"
      : (repCut > 0 && loss < 10 ? "（信誉减损生效）" : "");
    return finishDecision("你冤枉了一个真人", "err", "「我？我是伪人？！你疯了！」<br>他摔门而去，说明天全镇都会知道这件事。<br>信誉 -" + loss + pardonNote + "。", "「伪人的是你！」");
  }
}

function finishDecision(verdict, cls, detail, quote, forceOver) {
  $("feedback-box").innerHTML =
    "<div class='fb-verdict " + cls + "'>" + verdict + "</div>" +
    "<div class='fb-detail'>" + detail + "</div>" +
    (quote ? "<div class='fb-quote'>“" + quote + "”</div>" : "") +
    "<div class='fb-button'><button class='btn btn-green' id='btn-fb-next'>继续</button></div>";
  const ov = $("overlay-feedback");
  ov.classList.remove("hidden");
  $("btn-fb-next").onclick = () => {
    ov.classList.add("hidden");
    if (forceOver) { endingDark(); return; }
    afterDecision();
  };
}

function afterDecision() {
  // 检查失败条件
  if (G.rep <= 0) { endingSealed(); return; }
  G.qIndex++;
  updateHUD();
  if (G.qIndex >= G.queue.length) endDay();
  else nextCustomer();
}

/* ========================= 日结 & 夜市 ========================= */
function endDay() {
  const rent = Math.max(0, (20 + G.day * 5) - buffSum("rentCut"));
  G.money -= rent;
  persist();
  if (G.day === 1) unlockAch("first_day");
  if (G.dayStats.mistakes === 0 && G.dayStats.sold > 0) unlockAch("flawless");
  if (G.money >= 300) unlockAch("rich");
  if (G.tools.mirror && G.tools.uv && G.tools.lie) unlockAch("collector");
  if (G.stats.correct >= 10) unlockAch("sharp_eye");

  // 连续零失误奖励
  if (G.dayStats.mistakes === 0 && G.dayStats.sold > 0) {
    G.streak++;
    if (G.streak >= 3) { G.rep = clamp(G.rep + 5, 0, 100); }
  } else G.streak = 0;

  if (G.money <= -40) { endingBankrupt(); return; }
  if (G.day >= 10) { endingFinal(); return; }

  stageScreen(`
    <div class="stage-date">${gameDateStr(G.day)} · 打烊</div>
    <div class="stage-title">第 ${G.day} 天 结束</div>
    <div class="stage-stats">
      今日售出：<b>${G.dayStats.sold}</b> 件　｜　今日收入：<b>$${G.dayStats.income}</b><br>
      今日失误：<b>${G.dayStats.mistakes}</b> 次　｜　经营成本：-$${rent}<br>
      现金：<b>$${G.money}</b>　｜　信誉：<b>${G.rep}</b>　｜　零失误连击：<b>${G.streak}</b> 🔥${G.streak >= 3 ? "（连击奖励：每日 +5 信誉）" : "（连击 3 天起每日 +5 信誉）"}
    </div>
    ${G.money < 0 ? "<div class='news'>账上已经透支。再亏下去，商店就完了。（低于 -$40 破产）</div>" : ""}
    <div class="stage-buttons"><button class="btn btn-big" id="btn-day-go">前往夜市 🌙</button></div>
  `, () => nightShop());
  G.dayStats = { sold: 0, mistakes: 0, income: 0 };
  G.buffs = {}; // 当日增益消耗完毕, 等待今夜新特供
}

function nightShop() {
  const specials = dailySpecials(G.day + 1); // 明日生效, 每晚换 20 件
  const disc = buffSum("discount");
  let html = `
    <div class="stage-date">深夜 · 镇西黑市</div>
    <div class="stage-title">夜 市</div>
    <div class="stage-desc dim">黑市老板压低声音：「货架上共有 ${CONSUMABLES.length + PERM_GOODS.length} 件——今晚挑 ${specials.length} 件上桌，明晚再换一批。永久家什在下面，看好再买。」</div>
    <div class="panel-head" style="padding:6px 2px">🌙 每日特供 · 第 ${G.day + 1} 天上架（今晚 ${specials.length}/${CONSUMABLES.length} 件，明晚自动换新）</div>
    <div class="shop-goods">`;
  specials.forEach(g => {
    const owned = G.buffs[g.key];
    html += `
      <div class="goods-item ${owned ? "owned" : ""}">
        <div class="goods-info"><b>${g.n} <span class="dim" style="font-size:11px">一次性·明日生效</span></b><span>${g.d}</span></div>
        ${owned ? "<div class='goods-price'>已入手 ✓</div>"
        : `<button class="btn goods-buy" data-type="buff" data-key="${g.key}" data-p="${g.p}" ${G.money < g.p ? "disabled" : ""}>购买 $${g.p}</button>`}
      </div>`;
  });
  html += `</div>
    <div class="panel-head" style="padding:6px 2px">🔧 永久装备 · 买断制${disc ? `（🧰 折扣中：立减 $${Math.min(disc, 100)}）` : ""}</div>
    <div class="shop-goods">`;
  PERM_GOODS.forEach(g => {
    const owned = G.tools[g.key];
    const cut = Math.min(Math.round(g.p * 0.6), disc);
    const price = g.p - cut;
    html += `
      <div class="goods-item ${owned ? "owned" : ""}">
        <div class="goods-info"><b>${g.n}</b><span>${g.d}</span></div>
        ${owned ? "<div class='goods-price'>已购入</div>"
        : `<button class="btn goods-buy" data-type="tool" data-key="${g.key}" data-p="${price}" ${G.money < price ? "disabled" : ""}>购买 $${price}${cut ? `（↓$${cut}）` : ""}</button>`}
      </div>`;
  });
  html += `</div>
    <div class="stage-stats">现金：<b>$${G.money}</b>　｜　明日增益：${Object.keys(G.buffs).filter(k => G.buffs[k]).length ? activeBuffText() : "（无）"}</div>
    <div class="stage-buttons"><button class="btn btn-big btn-green" id="btn-day-go">回家睡觉 💤</button></div>`;
  stageScreen(html, () => { G.day++; startDay(); });
  document.querySelectorAll(".goods-buy").forEach(b => {
    b.onclick = () => {
      const p = +b.dataset.p;
      if (G.money < p) return;
      G.money -= p;
      if (b.dataset.type === "buff") {
        G.buffs[b.dataset.key] = 1;
        unlockAch("night_owl");
        AudioSys.coin();
      } else {
        G.tools[b.dataset.key] = true;
        AudioSys.coin();
        if (G.tools.mirror && G.tools.uv && G.tools.lie) unlockAch("collector");
      }
      nightShop();
    };
  });
}

/* ========================= 结局 ========================= */
function endingSealed() {
  G.over = true; persist();
  endingScreen("bad", "查 封",
    "卫生局的人贴上封条的时候，隔壁店铺的老板们都在看。<br>「早就觉得不对劲了。」有人说。<br>你守不住柜台，也守不住这个镇子。<br><br>雾山小镇的伪人，越来越多。",
    statsHTML());
}
function endingBankrupt() {
  G.over = true; persist();
  endingScreen("bad", "破 产",
    "债主搬空了货架，连舅舅的旧放大镜也被拿走抵债。<br>你锁上店门，把钥匙塞进雾里。<br><br>后来有人接手了这家店。生意很好。<br>好得，不太对劲。",
    statsHTML());
}
function endingDark() {
  G.over = true; persist();
  unlockAch("darkness");
  endingScreen("dark", "夜 幕 降 临",
    "你把布娃娃递过去的那一刻，她笑了。<br>当晚，商店的灯亮到天明。<br><br>第二天起，镇上的人发现：伟人商店的老板热情又周到，<br>只是——他再也不眨眼了。<br><br>「欢迎光临。」你说。",
    statsHTML());
}
function endingFinal() {
  G.over = true; persist();
  unlockAch("survivor");
  const f = G.stats.soldFake, r = G.rep;
  if (f >= 6) {
    unlockAch("darkness");
    endingScreen("dark", "新 老 板",
      "十天后，雾散了。<br>你数了数账本：卖给「它们」的东西，比卖给人的还多。<br>深夜打烊，你望着柜台玻璃里的倒影——<br>倒影比你，晚眨了半秒眼。<br><br><b>「欢迎光临。」</b>你听见自己说。",
      statsHTML());
  } else if (G.flags.kind && f <= 3) {
    endingScreen("good", "同 行 者",
      "雾散的那个清晨，有个孩子在店门口放了一束野花。<br>他的眼睛很亮，是人类的眼睛——只偶尔，在雾天里，竖成一条线。<br><br>你救过一个不该存在的孩子。<br>这世上的对错，有时比证件复杂得多。<br><br>伟人商店，明天照常营业。",
      statsHTML());
  } else if (r >= 75 && f <= 1) {
    endingScreen("good", "黎 明",
      "第十夜，最后一个「客人」被你拒之门外。<br>雾山小镇熬过了最长的十日。<br>镇上的人都说：是那家小商店的老板，替大家守住了门。<br><br>卫生局送来一块牌匾——<br><b>「伟人商店 · 雾山之光」</b>",
      statsHTML());
  } else {
    endingScreen("good", "长 夜 将 尽",
      "十天过去，你还站在柜台后面。<br>不算英雄，也没酿成大祸。<br>镇子还在，商店还在，你也还在。<br><br>雾山的夜很长——但总会亮的。<br><br><b>明天，照常营业。</b>",
      statsHTML());
  }
}

function statsHTML() {
  const s = G.stats;
  const achs = Object.keys(loadSave().ach);
  return `<div class="stage-stats">
    存活天数：<b>${Math.min(G.day, 10)}</b> / 10　｜　正确判断：<b>${s.correct}</b> 次<br>
    卖给伪人：<b>${s.soldFake >= 99 ? "……数不清了" : s.soldFake}</b> 次　｜　冤枉真人：<b>${s.rejectedReal}</b> 次<br>
    最终现金：<b>$${G.money}</b>　｜　最终信誉：<b>${G.rep}</b>
  </div>
  ${achs.length ? "<div class='ending-ach'>🏅 已解锁成就：<br>" + achs.map(k => "· " + ACH_DEFS[k]).join("<br>") + "</div>" : ""}`;
}

function endingScreen(cls, title, body, stats) {
  showScreen("screen-stage");
  $("stage-box").innerHTML = `
    <div class="stage-date">—— 结局 ——</div>
    <div class="ending-title ${cls}">${title}</div>
    <div class="stage-desc">${body}</div>
    ${stats}
    <div class="stage-buttons">
      <button class="btn btn-big btn-green" id="btn-again">再开一店</button>
      <button class="btn btn-big" id="btn-to-title">回到标题</button>
    </div>`;
  const s = loadSave();
  s.endings = s.endings || {};
  s.endings[title] = true;
  s.bestDay = Math.max(s.bestDay, Math.min(G.day, 10));
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  $("btn-again").onclick = () => { AudioSys.bell(); startGame(); };
  $("btn-to-title").onclick = () => toTitle();
  if (cls === "bad" || cls === "dark") AudioSys.buzz();
  else AudioSys.chime();
  // 网站奖励：好结局通关 +3🍫，失败结局 +1🍫
  try {
    if (window.Site && Site.winGame && Site.loseGame) {
      if (cls === "good") Site.winGame("存活 " + Math.min(G.day, 10) + " 天");
      else Site.loseGame();
    }
  } catch (e) {}
}

/* ========================= 标题 & 事件绑定 ========================= */
function toTitle() {
  showScreen("screen-title");
  const s = loadSave();
  const endings = s.endings ? Object.keys(s.endings) : [];
  $("title-records").textContent = "最深纪录：第 " + s.bestDay + " 天" + (endings.length ? "　已见结局：" + endings.join(" / ") : "");
  typewrite($("title-story"), INTRO_STORY, 26);
}

function bindEvents() {
  $("btn-start").onclick = () => { AudioSys.ensure(); AudioSys.bell(); startGame(); };
  $("btn-help-title").onclick = () => $("modal-help").classList.remove("hidden");
  $("btn-help").onclick = () => $("modal-help").classList.remove("hidden");
  $("btn-close-help").onclick = () => $("modal-help").classList.add("hidden");
  $("btn-mute").onclick = () => {
    AudioSys.muted = !AudioSys.muted;
    $("btn-mute").textContent = AudioSys.muted ? "🔇" : "🔊";
  };
  $("btn-quit").onclick = () => {
    if (confirm("放弃本局并回到标题？")) { G.over = true; persist(); toTitle(); }
  };
  $("btn-inspect").onclick = doInspect;
  $("btn-mirror").onclick = doMirror;
  $("btn-uv").onclick = doUV;
  $("btn-lie").onclick = doLie;
  $("btn-sell").onclick = () => decide(true);
  $("btn-reject").onclick = () => decide(false);
  $("btn-toggle-id").onclick = () => {
    const card = $("id-card");
    const hidden = card.classList.toggle("hidden");
    $("btn-toggle-id").textContent = hidden ? "展开" : "收起";
  };
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  toTitle();
});
