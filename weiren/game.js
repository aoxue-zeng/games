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
  G.over = false;
  showScreen("screen-game");
  startDay();
}

function buildQueue(day) {
  const count = Math.min(4 + Math.floor(day / 2), 8);
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
  stageScreen(`
    <div class="stage-date">${gameDateStr(G.day)} · ${weather}</div>
    <div class="stage-title">第 ${G.day} 天</div>
    <div class="stage-desc">${dayFlavor(G.day)}</div>
    ${NEWS[G.day] ? `<div class="news">${NEWS[G.day]}</div>` : ""}
    <div class="stage-buttons"><button class="btn btn-big btn-green" id="btn-day-go">开店营业</button></div>
  `, () => { AudioSys.bell(); nextCustomer(); });
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
  G.usedInspect = G.usedMirror = G.usedUV = G.usedLie = false;
  showScreen("screen-game");
  updateHUD();
  renderAvatar();
  renderIdCard();
  renderAskButtons();
  $("inspect-result").innerHTML = "使用放大镜查看客人外貌。";
  $("tools-result").innerHTML = "尚未使用任何工具。";
  $("ask-count").textContent = "剩 2";
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
      return Math.random() < 0.5
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
    if (c.isFake && t.interview && Math.random() < 0.5) {
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
  if (G.asked >= 2 || !G.cur) return;
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
  Array.from(list.querySelectorAll(".ask-btn")).forEach(b => b.disabled = G.asked >= 2);
  $("ask-count").textContent = "剩 " + (2 - G.asked);
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

  // 常规判定
  if (sell && isFake) {
    G.money += c.wants.p; G.stats.income += c.wants.p; G.dayStats.income += c.wants.p;
    G.rep = clamp(G.rep - 25, 0, 100);
    G.stats.soldFake++; G.dayStats.mistakes++;
    AudioSys.buzz();
    return finishDecision("你把东西卖给了一个伪人", "err",
      "它接过货品的手指，比人类多 bend 了一个关节。<br>信誉 -25，收入 +$" + c.wants.p + "。<br><span class='warn'>它离开时回头看了你一眼——像在记住你。</span>",
      choice(["「谢谢。我们会再来。」", "「你分不出来呢。」", "（它笑的时候，嘴角咧到了耳根）"]));
  }
  if (sell && !isFake) {
    G.money += c.wants.p; G.stats.income += c.wants.p; G.dayStats.income += c.wants.p; G.dayStats.sold++;
    G.rep = clamp(G.rep + 2, 0, 100); G.stats.correct++;
    AudioSys.chime(); setTimeout(() => AudioSys.coin(), 250);
    return finishDecision("交易完成", "ok", "客人满意地离开了。<br>收入 +$" + c.wants.p + "，信誉 +2。", choice(["「谢了，老板。」", "「下次还来。」", "「天黑了，早点关门吧。」"]));
  }
  if (!sell && isFake) {
    G.rep = clamp(G.rep + 2, 0, 100); G.stats.correct++;
    AudioSys.chime();
    return finishDecision("识破成功", "ok", "「它」的笑脸凝固了一瞬，随后一言不发地退出店门，融进雾里。<br>你守住了柜台。信誉 +2。", choice(["「……可惜。」", "（门外传来指甲刮擦木门的声音）", "「下次，我会更像一点。」"]));
  }
  if (!sell && !isFake) {
    G.rep = clamp(G.rep - 10, 0, 100); G.stats.rejectedReal++; G.dayStats.mistakes++;
    AudioSys.buzz();
    return finishDecision("你冤枉了一个真人", "err", "「我？我是伪人？！你疯了！」<br>他摔门而去，说明天全镇都会知道这件事。<br>信誉 -10。", "「伪人的是你！」");
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
  const rent = 20 + G.day * 5;
  G.money -= rent;
  persist();
  if (G.day === 1) unlockAch("first_day");
  if (G.dayStats.mistakes === 0 && G.dayStats.sold > 0) unlockAch("flawless");
  if (G.money >= 300) unlockAch("rich");
  if (G.tools.mirror && G.tools.uv && G.tools.lie) unlockAch("collector");
  if (G.stats.correct >= 10) unlockAch("sharp_eye");

  if (G.money <= -40) { endingBankrupt(); return; }

  if (G.day >= 10) { endingFinal(); return; }

  stageScreen(`
    <div class="stage-date">${gameDateStr(G.day)} · 打烊</div>
    <div class="stage-title">第 ${G.day} 天 结束</div>
    <div class="stage-stats">
      今日售出：<b>${G.dayStats.sold}</b> 件　｜　今日收入：<b>$${G.dayStats.income}</b><br>
      今日失误：<b>${G.dayStats.mistakes}</b> 次　｜　经营成本：-$${rent}<br>
      现金：<b>$${G.money}</b>　｜　信誉：<b>${G.rep}</b>
    </div>
    ${G.money < 0 ? "<div class='news'>账上已经透支。再亏下去，商店就完了。（低于 -$40 破产）</div>" : ""}
    <div class="stage-buttons"><button class="btn btn-big" id="btn-day-go">前往夜市 🌙</button></div>
  `, () => nightShop());
  G.dayStats = { sold: 0, mistakes: 0, income: 0 };
}

function nightShop() {
  const goods = [
    { key: "mirror", n: "🪞 穿衣柜镜", d: "伪人往往在镜中没有倒影。", p: 80 },
    { key: "uv", n: "🔦 紫外灯", d: "照出皮肤下的黑色纹路。", p: 150 },
    { key: "lie", n: "📈 掌上测谎仪", d: "对任何伪人必定报警——没有心跳。", p: 260 }
  ];
  let html = `
    <div class="stage-date">深夜 · 镇西黑市</div>
    <div class="stage-title">夜 市</div>
    <div class="stage-desc dim">黑市老板压低声音：「伪人越来越多，老板，你店里……还缺家伙吗？」</div>
    <div class="shop-goods">`;
  goods.forEach(g => {
    const owned = G.tools[g.key];
    html += `
      <div class="goods-item ${owned ? "owned" : ""}">
        <div class="goods-info"><b>${g.n}</b><span>${g.d}</span></div>
        ${owned ? "<div class='goods-price'>已购入</div>"
        : `<button class="btn goods-buy" data-key="${g.key}" data-p="${g.p}" ${G.money < g.p ? "disabled" : ""}>购买 $${g.p}</button>`}
      </div>`;
  });
  html += `</div>
    <div class="stage-stats">现金：<b>$${G.money}</b></div>
    <div class="stage-buttons"><button class="btn btn-big btn-green" id="btn-day-go">回家睡觉 💤</button></div>`;
  stageScreen(html, () => { G.day++; startDay(); });
  document.querySelectorAll(".goods-buy").forEach(b => {
    b.onclick = () => {
      const p = +b.dataset.p;
      if (G.money < p) return;
      G.money -= p;
      G.tools[b.dataset.key] = true;
      AudioSys.coin();
      if (G.tools.mirror && G.tools.uv && G.tools.lie) unlockAch("collector");
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
