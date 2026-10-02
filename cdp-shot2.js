/* 通用截图工具: node cdp-shot2.js <url> <输出名> [端口] */
"use strict";
const { spawn } = require("child_process");
const fs = require("fs");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const url = process.argv[2] || "http://127.0.0.1:8899/index.html";
const name = process.argv[3] || "shot";
const port = process.argv[4] || "9787";
const gpu = process.argv[5] === "gpu" ? [] : ["--disable-gpu"];
(async () => {
  const child = spawn(EDGE, ["--headless=new", ...gpu, "--remote-debugging-port=" + port,
    "--user-data-dir=" + __dirname + "\\.edge-tmp-shot" + port, "--no-first-run", "about:blank"], { stdio: "ignore" });
  let wsUrl = null;
  for (let i = 0; i < 30 && !wsUrl; i++) { await sleep(500); try { const r = await fetch("http://127.0.0.1:" + port + "/json/list"); wsUrl = (await r.json()).find(t => t.type === "page")?.webSocketDebuggerUrl; } catch (e) { } }
  const ws = new WebSocket(wsUrl); await new Promise(r => ws.addEventListener("open", r));
  let mid = 0; const pending = {};
  ws.addEventListener("message", ev => { const m = JSON.parse(ev.data); if (m.id && pending[m.id]) { pending[m.id](m); delete pending[m.id]; } });
  const rpc = (me, pa) => new Promise(res => { const id = ++mid; pending[id] = res; ws.send(JSON.stringify({ id, method: me, params: pa || {} })); });
  await rpc("Page.enable", {});
  await rpc("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await rpc("Page.navigate", { url });
  await sleep(5000);
  const shot = await rpc("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(__dirname + "\\" + name + ".png", Buffer.from(shot.result.data, "base64"));
  console.log("截图:", name + ".png");
  ws.close(); child.kill(); process.exit(0);
})();
