/* CDP 诊断 weiren 页面: 收集异常 + 截图 + 状态 */
"use strict";
const { spawn } = require("child_process");
const fs = require("fs");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const URL = process.argv[2] || "http://localhost:8020/weiren/index.html";

const child = spawn(EDGE, [
  "--headless=new", "--disable-gpu", "--remote-debugging-port=9779",
  "--user-data-dir=" + __dirname + "\\.edge-tmp3",
  "--no-first-run", "about:blank"
], { stdio: "ignore" });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function getWsUrl() {
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const r = await fetch("http://127.0.0.1:9779/json/list");
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

(async () => {
  const exceptions = [];
  try {
    const ws = new WebSocket(await getWsUrl());
    await new Promise(r => ws.addEventListener("open", r));
    let mid = 0;
    ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.method === "Runtime.exceptionThrown") {
        const d = m.params.exceptionDetails;
        exceptions.push((d.text || "") + " " + (d.exception && d.exception.description || "").slice(0, 300));
      }
      if (m.method === "Log.entryAdded" && /error/i.test(m.params.entry.level)) {
        exceptions.push("[console] " + String(m.params.entry.text).slice(0, 200));
      }
    });
    await rpc(ws, ++mid, "Runtime.enable", {});
    await rpc(ws, ++mid, "Log.enable", {});
    await rpc(ws, ++mid, "Page.enable", {});
    await rpc(ws, ++mid, "Page.navigate", { url: URL });
    await sleep(5000);

    const stat = await rpc(ws, ++mid, "Runtime.evaluate", {
      expression: `(function(){
        var active=document.querySelectorAll('.screen.active').length;
        var title=document.getElementById('screen-title');
        var scripts=[].slice.call(document.scripts).map(function(s){return s.src?s.src.split('/').pop():'inline'});
        return JSON.stringify({activeScreens:active,titleClass:title?title.className:'NULL',scripts:scripts.join(','),bodyChildren:document.body.children.length});
      })()`, returnByValue: true
    });
    console.log("页面状态:", stat.result && stat.result.result && stat.result.result.value);
    console.log("异常数:", exceptions.length);
    exceptions.slice(0, 6).forEach(e => console.log("  💥", e));

    const shot = await rpc(ws, ++mid, "Page.captureScreenshot", { format: "png" });
    if (shot.result && shot.result.data) {
      fs.writeFileSync(__dirname + "/weiren-diag.png", Buffer.from(shot.result.data, "base64"));
      console.log("截图已保存 weiren-diag.png");
    }
    ws.close();
  } catch (e) {
    console.error("CDP失败:", e.message);
  } finally {
    child.kill();
    process.exit(0);
  }
})();
