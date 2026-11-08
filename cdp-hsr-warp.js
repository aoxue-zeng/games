/* CDP: hsr.html 星穹开拓 跃迁系统端到端 (绕过等级门) */
"use strict";
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const ROOT = path.join(__dirname, "..");
const PORT = 8023;
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  fs.readFile(path.join(ROOT, p), (err, data) => {
    if (err) { res.writeHead(404); res.end("404"); return; }
    const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".woff2": "font/woff2", ".flac": "audio/flac" }[path.extname(p).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime, "Cache-Control": "no-cache" });
    res.end(data);
  });
});
server.listen(PORT);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function getWsUrl(port) {
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const r = await fetch("http://127.0.0.1:" + port + "/json/list");
      const page = (await r.json()).find(t => t.type === "page");
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
const GATE_BYPASS = `
Object.defineProperty(window,'Site',{configurable:true,
 get:function(){var s=this._rs;if(!s)return undefined;
  return Object.assign(Object.create(s),{pet:function(){return {level:99};}});},
 set:function(v){this._rs=v;}});`;
(async () => {
  const child = spawn(EDGE, ["--headless=new", "--disable-gpu", "--remote-debugging-port=9833",
    "--user-data-dir=" + __dirname + "\\.edge-tmp-hsr", "--no-first-run", "about:blank"], { stdio: "ignore" });
  const failures = []; let total = 0;
  const T = (name, cond, detail) => {
    total++;
    if (cond) console.log("  ✓ " + name);
    else { failures.push(name); console.log("  ✗ " + name + (detail ? " → " + detail : "")); }
  };
  try {
    const ws = new WebSocket(await getWsUrl(9833));
    await new Promise(r => ws.addEventListener("open", r));
    let mid = 0;
    const evalJs = async (expr) => {
      const r = await rpc(ws, ++mid, "Runtime.evaluate", { expression: expr, returnByValue: true });
      if (r.result.exceptionDetails) throw new Error((r.result.exceptionDetails.exception && r.result.exceptionDetails.exception.description || r.result.exceptionDetails.text || "").slice(0, 200));
      return r.result.result.value;
    };
    await rpc(ws, ++mid, "Page.enable", {});
    await rpc(ws, ++mid, "Runtime.enable", {});
    await rpc(ws, ++mid, "Page.addScriptToEvaluateOnNewDocument", { source: GATE_BYPASS });
    await rpc(ws, ++mid, "Page.navigate", { url: "http://localhost:" + PORT + "/hsr.html" });
    await sleep(4000);

    console.log("=== hsr 星穹开拓 跃迁端到端 ===");
    const gate = await evalJs("document.getElementById('btnWarp')?'ok':document.body.textContent.slice(0,40)");
    T("等级门已绕过,跃迁按钮存在", gate === "ok", gate);
    // 进游戏(作战简报)
    await evalJs("var g=document.getElementById('rpGo');if(g)g.click();");
    await sleep(1500);
    // 星琼0时点跃迁 → 应提示不足
    await evalJs("document.getElementById('btnWarp').click()");
    await sleep(500);
    const poor = await evalJs("document.getElementById('log').textContent.indexOf('星琼不够')>=0");
    T("0星琼点跃迁提示不足", poor);
    // 打第1站: 循环攻击(2只扑满共110hp, 我方3人轮着打)
    for (let i = 0; i < 30; i++) {
      const st = await evalJs(`(function(){
        var log=document.getElementById('log').textContent;
        if(log.indexOf('抵达第2站')>=0)return 'next';
        if(log.indexOf('开拓完成')>=0||log.indexOf('任务失败')>=0)return 'end';
        var b=document.getElementById('btnAtk');
        if(b){b.click();return 'atk';}
        return 'none';
      })()`);
      await sleep(850);
      if (st === 'next' || st === 'end') break;
    }
    const gemsNow = await evalJs(`(function(){
      var log=document.getElementById('log').textContent;
      return JSON.stringify({gems:document.getElementById('gems').textContent,
        next:log.indexOf('抵达第2站')>=0});
    })()`);
    const gemsV = JSON.parse(gemsNow);
    T("打完第1站抵达第2站", gemsV.next, JSON.stringify(gemsV));
    // 跃迁到出金为止(__T钩子: 给足星琼+把保底拨到85, 5抽内必金)
    var lastLog = "";
    var teamN = 3;
    for (let i = 0; i < 8; i++) {
      const r = await evalJs(`(function(){
        var t=window.__T;
        if(!t)return JSON.stringify({err:'no __T'});
        t.gems=Math.max(t.gems,500);t.warpPity=${Math.max(0, 85 - i)};
        t.warp();
        return JSON.stringify({gems:t.gems,pity:t.warpPity,teamN:t.team.length});
      })()`);
      const rv = JSON.parse(r);
      teamN = rv.teamN;
      await sleep(350);
      lastLog = await evalJs("document.getElementById('log').textContent");
      if (lastLog.indexOf('登上列车') >= 0 || lastLog.indexOf('满编') >= 0) break;
    }
    T("跃迁出金且角色入队", lastLog.indexOf('登上列车') >= 0 && teamN > 3, lastLog.slice(-150) + " teamN=" + teamN);
    const roster = await evalJs(`(function(){
      var log=document.getElementById('log').textContent;
      var names=['姬子','瓦尔特','希儿','景元','克拉拉','白露'].filter(function(n){return log.indexOf(n)>=0;});
      return JSON.stringify({stage:document.getElementById('stage').textContent,joined:names});
    })()`);
    console.log("  入队名单:", roster);
    const shot = await rpc(ws, ++mid, "Page.captureScreenshot", { format: "png" });
    if (shot.result && shot.result.data) fs.writeFileSync(__dirname + "/hsr-warp.png", Buffer.from(shot.result.data, "base64"));
    console.log("\n结果: " + total + " 项, 失败 " + failures.length);
    ws.close();
    process.exit(failures.length ? 1 : 0);
  } catch (e) {
    console.error("CDP失败:", e.message);
    process.exit(1);
  } finally {
    child.kill();
    server.close();
  }
})();
