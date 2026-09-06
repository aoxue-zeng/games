/* 冒烟测试：用 DOM 桩在 Node 中模拟完整游戏流程，抓运行时错误 */
"use strict";
const fs = require("fs");
const vm = require("vm");

/* ---------- 浏览器环境桩 ---------- */
const elements = {};
function makeEl(id) {
  const el = {
    id, textContent: "", innerHTML: "", style: {}, disabled: false, onclick: null,
    dataset: {}, children: [],
    classList: {
      _s: new Set(id === "overlay-feedback" || id === "modal-help" ? ["hidden"] : []),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c) { return this._s.has(c) ? this._s.delete(c) : this._s.add(c); },
      contains(c) { return this._s.has(c); }
    },
    appendChild(child) { this.children.push(child); return child; },
    remove() {},
    querySelectorAll() { return []; },
    getContext() {
      return new Proxy({ canvas: {} }, {
        get: (t, k) => (k in t ? t[k] : (...a) => undefined),
        set: (t, k, v) => { t[k] = v; return true; }
      });
    }
  };
  return el;
}
global.document = {
  getElementById(id) { return elements[id] || (elements[id] = makeEl(id)); },
  querySelectorAll() { return []; },
  createElement(tag) { return makeEl("dyn_" + tag + "_" + Math.random().toString(36).slice(2)); },
  addEventListener() {},
  body: makeEl("body")
};
global.window = {};
global.localStorage = { _s: {}, getItem(k) { return k in this._s ? this._s[k] : null; }, setItem(k, v) { this._s[k] = v; } };
global.confirm = () => false;

/* ---------- 加载游戏 ---------- */
const code = fs.readFileSync(__dirname + "/game.js", "utf8");
vm.runInThisContext(code);

const $ = (id) => document.getElementById(id);
const click = (id) => { if ($(id) && $(id).onclick) $(id).onclick(); };
const stageHas = (s) => $("stage-box").innerHTML.includes(s);

/* ---------- 跑一整局（状态机驱动） ---------- */
function playGame(strategy, label) {
  startGame();
  G.tools = { mirror: true, uv: true, lie: true }; // 解锁全部工具，覆盖所有代码路径
  let serving = false;
  let guard = 0;

  while (guard++ < 3000) {
    if (stageHas("—— 结局 ——")) break;

    if (!serving) {
      if (stageHas("· 打烊")) { click("btn-day-go"); continue; }          // → 夜市
      if (stageHas("夜 市")) { click("btn-day-go"); continue; }           // → 睡觉 → 次日
      if (stageHas("开店营业")) { click("btn-day-go"); serving = true; $("stage-box").innerHTML = ""; continue; }
      break; // 未知阶段
    }

    // ---- 柜台接待 ----
    if (!G.cur) break;
    doInspect(); doMirror(); doUV(); doLie();
    askQuestion(QUESTIONS[rand(0, 3)]);
    askQuestion(QUESTIONS[rand(0, 3)]);
    decide(strategy());

    // ---- 决策反馈 ----
    $("overlay-feedback").classList.remove("hidden");
    click("btn-fb-next");
    $("overlay-feedback").classList.add("hidden");

    if (stageHas("· 打烊") || stageHas("—— 结局 ——")) serving = false;
  }
  if (guard >= 3000) throw new Error("[" + label + "] 陷入死循环");

  const m = $("stage-box").innerHTML.match(/ending-title \w+"?>([^<]+)</);
  const endingName = m ? m[1].trim() : "(无结局画面)";
  console.log(`[${label}] 完成于第 ${Math.min(G.day, 10)} 天 | 信誉 ${G.rep} | 现金 $${G.money} | 卖伪 ${G.stats.soldFake} | 冤枉 ${G.stats.rejectedReal} | 结局：${endingName}`);
}

/* ---------- 伪随机策略 ---------- */
let seed = 42;
function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
const coin = (p) => rnd() < p;

try {
  playGame(() => coin(0.7), "随机出售 70%");
  playGame(() => false, "全部拒绝");
  playGame(() => !G.cur.isFake ? coin(0.95) : coin(0.05), "上帝视角");
  playGame(() => true, "全部出售");
  playGame(() => (G.cur.special === "final") ? true : !G.cur.isFake, "完美经营·终客失手");
  console.log("SMOKE_TEST_OK");
} catch (e) {
  console.error("SMOKE_TEST_FAILED:", e);
  process.exit(1);
}
process.exit(0);
