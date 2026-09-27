/* 模拟被墙环境: Google域名→黑洞IP, 验证主页是否被字体@import阻塞 */
"use strict";
const { spawn } = require("child_process");
const fs = require("fs");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const child = spawn(EDGE, [
  "--headless=new", "--disable-gpu", "--remote-debugging-port=9783",
  "--user-data-dir=" + __dirname + "\\.edge-tmp6",
  "--host-resolver-rules=MAP fonts.googleapis.com 10.255.255.1, MAP fonts.gstatic.com 10.255.255.1",
  "--no-first-run", "about:blank"
], { stdio: "ignore" });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function getWs() {
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const r = await fetch("http://127.0.0.1:9783/json/list");
      const list = await r.json();
      const p = list.find(t => t.type === "page");
      if (p) return p.webSocketDebuggerUrl;
    } catch (e) { }
  }
  throw new Error("无法连接");
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

(async () => {
  try {
    const ws = new WebSocket(await getWs());
    await new Promise(r => ws.addEventListener("open", r));
    let mid = 0;
    await rpc(ws, ++mid, "Page.enable", {});
    await rpc(ws, ++mid, "Emulation.setDeviceMetricsOverride", { width: 1280, height: 1200, deviceScaleFactor: 1, mobile: false });
    await rpc(ws, ++mid, "Page.navigate", { url: "https://zengaoxuan.com/" });

    // 多时间点采样: 观察渲染是否被卡住
    for (const t of [4000, 12000, 25000]) {
      await sleep(t === 4000 ? 4000 : t === 12000 ? 8000 : 13000);
      const s = await rpc(ws, ++mid, "Runtime.evaluate", {
        expression: `(function(){
          var cards=document.querySelectorAll('.game-card').length;
          var vis=Array.prototype.filter.call(document.querySelectorAll('.game-card'),function(c){return c.getBoundingClientRect().height>0}).length;
          var links=[].slice.call(document.querySelectorAll('link[rel=stylesheet]')).map(function(l){return (l.sheet?'✓':'⏳');}).join('');
          return JSON.stringify({t:${t},ready:document.readyState,cards:cards,visible:vis,css:links});
        })()`, returnByValue: true
      });
      console.log("[" + t + "ms]", s.result && s.result.result && s.result.result.value);
    }
    const shot = await rpc(ws, ++mid, "Page.captureScreenshot", { format: "png" });
    if (shot.result && shot.result.data) fs.writeFileSync(__dirname + "/walled.png", Buffer.from(shot.result.data, "base64"));
    console.log("截图: walled.png");
    ws.close();
  } catch (e) { console.error("失败:", e.message); }
  finally { child.kill(); process.exit(0); }
})();
