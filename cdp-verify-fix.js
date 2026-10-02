/* 验证黑屏修复: 新配置打开主页 → 检查遮罩透明度 → 截图 → 点✕ → 验证关闭+标记 */
"use strict";
const { spawn } = require("child_process");
const fs = require("fs");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const url = process.argv[2] || "file:///C:/Users/aoxua/ZCodeProject/index.html";
const shot = process.argv[3] || "fix-verify";

(async () => {
  const child = spawn(EDGE, [
    "--headless=new", "--disable-gpu", "--remote-debugging-port=9785",
    "--user-data-dir=" + __dirname + "\\.edge-tmp8", // 全新配置=新访客
    "--no-first-run", "about:blank"
  ], { stdio: "ignore" });
  try {
    let wsUrl = null;
    for (let i = 0; i < 30 && !wsUrl; i++) {
      await sleep(500);
      try {
        const r = await fetch("http://127.0.0.1:9785/json/list");
        const p = (await r.json()).find(t => t.type === "page");
        if (p) wsUrl = p.webSocketDebuggerUrl;
      } catch (e) {}
    }
    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.addEventListener("open", r));
    let mid = 0; const pending = {};
    ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending[m.id]) { pending[m.id](m); delete pending[m.id]; }
    });
    const rpc = (method, params) => new Promise(res => { const id = ++mid; pending[id] = res; ws.send(JSON.stringify({ id, method, params: params || {} })); });
    const ev = (expr) => rpc("Runtime.evaluate", { expression: expr, returnByValue: true });

    await rpc("Page.enable", {});
    await rpc("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    console.log("打开:", url);
    await rpc("Page.navigate", { url });
    await sleep(3000); // 等1.2s延迟的弹窗出现
    let s = await ev(`(function(){
      var m=document.getElementById('sitePetModal'); if(!m) return JSON.stringify({modal:false});
      return JSON.stringify({modal:true, bg:getComputedStyle(m).backgroundColor, blur:getComputedStyle(m).backdropFilter});
    })()`);
    console.log("[弹窗状态]", s.result.result.value);
    const shot1 = await rpc("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(__dirname + "\\" + shot + "-modal.png", Buffer.from(shot1.result.data, "base64"));
    // 点✕
    await ev(`document.getElementById('petCloseX').click(); 'ok'`);
    await sleep(300);
    s = await ev(`JSON.stringify({modalGone:!document.getElementById('sitePetModal'),
      flag:localStorage.getItem('aox_pet_later'),
      bodyVisible:(function(){var h=document.querySelector('.hero-scene');return h&&h.getBoundingClientRect().height>0;})()})`);
    console.log("[点✕后]", s.result.result.value);
    // 刷新验证不再弹
    await rpc("Page.navigate", { url });
    await sleep(3000);
    s = await ev(`JSON.stringify({modalAgain:!!document.getElementById('sitePetModal'), flag:localStorage.getItem('aox_pet_later')})`);
    console.log("[刷新后]", s.result.result.value);
    const shot2 = await rpc("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(__dirname + "\\" + shot + "-home.png", Buffer.from(shot2.result.data, "base64"));
    console.log("截图:", shot + "-modal.png / " + shot + "-home.png");
    ws.close();
  } catch (e) { console.error("失败:", e.message); }
  finally { child.kill(); process.exit(0); }
})();
