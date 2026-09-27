/* CDP 全场景验证: 桌面+手机 × 新玩家+老玩家(有宠物/能量0) */
"use strict";
const { spawn } = require("child_process");
const fs = require("fs");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const child = spawn(EDGE, [
  "--headless=new", "--disable-gpu", "--remote-debugging-port=9781",
  "--user-data-dir=" + __dirname + "\\.edge-tmp4",
  "--no-first-run", "about:blank"
], { stdio: "ignore" });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const r = await fetch("http://127.0.0.1:9781/json/list");
      const list = await r.json();
      const page = list.find(t => t.type === "page");
      if (page) return page.webSocketDebuggerUrl;
    } catch (e) { }
  }
  throw new Error("无法连接调试端口");
}
function rpc(ws, id, method, params) {
  return new Promise((resolve) => {
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id === id) { ws.removeEventListener("message", onMsg); resolve(m); }
    };
    ws.addEventListener("message", onMsg);
    ws.send(JSON.stringify({ id, method, params: params || {} }));
  });
}

const SEED_RETURNING = `
try{
  localStorage.setItem('pet_v2', JSON.stringify({type:'dog',level:3,fed:5,born:Date.now()-86400000*30}));
  localStorage.setItem('choco_energy','0');
  localStorage.setItem('aox_pet_later','1');
  localStorage.setItem('played_counts', JSON.stringify({'weiren/index.html':88,'faker-mart.html':120}));
}catch(e){}
`;

async function scenario(ws, mid, name, url, mobile, seed) {
  const exceptions = [];
  const onMsg = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === "Runtime.exceptionThrown") {
      const d = m.params.exceptionDetails;
      exceptions.push((d.exception && d.exception.description || d.text || "").slice(0, 200));
    }
  };
  ws.addEventListener("message", onMsg);
  if (seed) await rpc(ws, ++mid.id, "Page.addScriptToEvaluateOnNewDocument", { source: seed });
  await rpc(ws, ++mid.id, "Emulation.setDeviceMetricsOverride", mobile
    ? { width: 414, height: 896, deviceScaleFactor: 2, mobile: true }
    : { width: 1280, height: 1600, deviceScaleFactor: 1, mobile: false });
  await rpc(ws, ++mid.id, "Emulation.setUserAgentOverride", mobile
    ? { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" }
    : { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36 Edg/120" });
  await rpc(ws, ++mid.id, "Page.navigate", { url });
  await sleep(6000);
  const stat = await rpc(ws, ++mid.id, "Runtime.evaluate", {
    expression: `(function(){
      var v=document.querySelectorAll('.screen.active').length;
      var cards=document.querySelectorAll('.game-card').length;
      var bodyBg=document.body?getComputedStyle(document.body).background.slice(0,60):'-';
      var modals=document.querySelectorAll('[style*="position:fixed"]').length;
      return JSON.stringify({activeScreens:v,cards:cards,bodyLen:document.body?document.body.children.length:0,modals:modals});
    })()`, returnByValue: true
  });
  console.log("[" + name + "]", stat.result && stat.result.result && stat.result.result.value, "| JS异常:", exceptions.length ? exceptions[0] : "无");
  const shot = await rpc(ws, ++mid.id, "Page.captureScreenshot", { format: "png" });
  if (shot.result && shot.result.data) fs.writeFileSync(__dirname + "/" + name + ".png", Buffer.from(shot.result.data, "base64"));
  ws.removeEventListener("message", onMsg);
}

(async () => {
  try {
    const ws = new WebSocket(await getWsUrl());
    await new Promise(r => ws.addEventListener("open", r));
    const mid = { id: 0 };
    await rpc(ws, ++mid.id, "Runtime.enable", {});
    await rpc(ws, ++mid.id, "Page.enable", {});
    // 同一 target 依次跑四个场景(独立 context 每次导航重置, 种子脚本会重复添加—无妨, 值幂等)
    await scenario(ws, mid, "A-desktop-returning-weiren", "https://zengaoxuan.com/weiren/", false, SEED_RETURNING);
    await scenario(ws, mid, "B-mobile-fresh-weiren", "https://zengaoxuan.com/weiren/", true, null);
    await scenario(ws, mid, "C-mobile-returning-home", "https://zengaoxuan.com/", true, SEED_RETURNING);
    await scenario(ws, mid, "D-desktop-returning-home", "https://zengaoxuan.com/", false, SEED_RETURNING);
    ws.close();
  } catch (e) {
    console.error("CDP失败:", e.message);
  } finally {
    child.kill();
    process.exit(0);
  }
})();
