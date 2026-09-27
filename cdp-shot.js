/* CDP 截图线上站: 真实时间渲染 + captureScreenshot */
"use strict";
const { spawn } = require("child_process");
const fs = require("fs");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const child = spawn(EDGE, [
  "--headless=new", "--disable-gpu", "--remote-debugging-port=9778",
  "--user-data-dir=" + __dirname + "\\.edge-tmp2",
  "--no-first-run", "--window-size=1280,2400", "about:blank"
], { stdio: "ignore" });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const r = await fetch("http://127.0.0.1:9778/json/list");
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
    ws.send(JSON.stringify({ id, method, params }));
  });
}

(async () => {
  try {
    const ws = new WebSocket(await getWsUrl());
    await new Promise(r => ws.addEventListener("open", r));
    let mid = 0;
    const ev = (expr) => rpc(ws, ++mid, "Runtime.evaluate", { expression: expr, returnByValue: true });
    await rpc(ws, ++mid, "Page.enable", {});
    await rpc(ws, ++mid, "Emulation.setDeviceMetricsOverride", { width: 1280, height: 2400, deviceScaleFactor: 1, mobile: false });
    await rpc(ws, ++mid, "Page.navigate", { url: "https://zengaoxuan.com/" });
    await sleep(6000); // 真实时间等待渲染

    const stat = await ev(`(function(){
      const c=document.querySelectorAll('.game-card');
      const vis=Array.from(c).filter(x=>{const s=getComputedStyle(x);return s.display!=='none'&&s.opacity!=='0'&&x.getBoundingClientRect().height>0;}).length;
      return JSON.stringify({cards:c.length,visible:vis,scrollH:document.documentElement.scrollHeight,err:window.__errs?window.__errs.length:'-'});
    })()`);
    console.log("线上状态:", stat.result && stat.result.result && stat.result.result.value);

    const shot = await rpc(ws, ++mid, "Page.captureScreenshot", { format: "png" });
    if (shot.result && shot.result.data) {
      fs.writeFileSync(__dirname + "/home-cdp.png", Buffer.from(shot.result.data, "base64"));
      console.log("截图已保存 home-cdp.png");
    }
    ws.close();
  } catch (e) {
    console.error("CDP失败:", e.message);
  } finally {
    child.kill();
    process.exit(0);
  }
})();
