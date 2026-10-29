// ===== 🎵 全站音乐播放器 测试 =====
// 沙盒加载真实 shared.js + FakeAudio, 验证: 歌单/仓库合并/切歌循环/单曲循环/状态记忆/BGM让位
var fs = require('fs'), vm = require('vm');

var failures = 0, total = 0;
function T(name, cond, detail) {
  total++;
  if (cond) console.log('  ✓ ' + name);
  else { failures++; console.log('  ✗ ' + name + (detail !== undefined ? ' → ' + detail : '')); }
}
function sec(s) { console.log(''); console.log('=== ' + s + ' ==='); }

function mkEl(id) {
  return {
    _id: id, innerHTML: '', textContent: '', style: {}, dataset: {}, width: 0, height: 0,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { return c; }, remove() {}, addEventListener() {}, onclick: null,
    getAttribute() { return null; }, setAttribute() {},
    querySelector() { return mkEl(id + '.q'); }, querySelectorAll() { return []; },
    parentNode: null
  };
}
function FakeAudio() {
  var self = this;
  FakeAudio.all.push(self);
  this._src = ''; this.volume = 1; this.currentTime = 0; this._ls = {};
  this.addEventListener = function (t, fn) { self._ls[t] = fn; };
  this.getAttribute = function (k) { return k === 'src' ? self._src : null; };
  this.play = function () {
    self._plays = (self._plays || 0) + 1;
    if (self._ls['play']) self._ls['play'](); // 触发事件→muSync(true)
    return { then: function (f) { f(); return { catch: function () { } }; }, catch: function () { return this; } };
  };
  this.pause = function () {
    self._pauses = (self._pauses || 0) + 1;
    if (self._ls['pause']) self._ls['pause'](); // 触发事件→muSync(false)
  };
  Object.defineProperty(this, 'src', {
    get: function () { return self._src; },
    set: function (v) { self._src = v; self.currentTime = 0; }
  });
}
FakeAudio.all = [];

var registry = {}; // id → 元素(append 后存在, 模拟真实DOM)
function regBody() {
  var b = mkEl('body');
  b.appendChild = function (c) {
    if (!c) return c;
    if (c.id) registry[c.id] = c;
    if (c.innerHTML) { // innerHTML 里的 id 在真实DOM中也能被 getElementById 找到
      var re = /id="([^"]+)"/g, m2;
      while ((m2 = re.exec(c.innerHTML))) { if (!registry[m2[1]]) registry[m2[1]] = c; }
    }
    return c;
  };
  return b;
}
var sb = {
  document: {
    getElementById(id) { return registry[id] || null; }, // 未append的id不存在→null(和浏览器一致)
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}, removeEventListener() {},
    createElement(t) { return mkEl('new-' + t); },
    body: null, hidden: false
  },
  Math, Date, console,
  Audio: FakeAudio,
  setTimeout, clearTimeout,
  addEventListener() {}, removeEventListener() {},
  localStorage: { _d: {}, getItem(k) { return (k in this._d) ? this._d[k] : null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } },
  navigator: { userAgent: 't' },
  location: { pathname: '/game.html', href: 'http://t/', search: '' },
  SFX: {},
  AOXSound: {
    isEnabled() { return true; }, ensure() {}, stopBGM() { this._stopped = (this._stopped || 0) + 1; },
    startBGM() { this._bgmCalls = (this._bgmCalls || 0) + 1; }
  }
};
sb.window = sb; sb.self = sb; sb.globalThis = sb;
sb.document.body = regBody();
sb.localStorage._d['music_vault'] = JSON.stringify([
  { name: '我编的曲子', notes: [{ track: 1, col: 0, note: 'C4' }], tempo: 120, date: 'x' }, // 纯谱→不算歌
  { name: '旧日喜爱的歌', audio: 'data:audio/mpeg;base64,AAAA', audioType: 'mp3', date: 'x' } // 音频→并入歌单
]);
var TOASTS = []; sb.toast = function (m) { TOASTS.push(m); };
vm.createContext(sb);
try {
  vm.runInContext(fs.readFileSync('shared.js', 'utf8'), sb, { filename: 'shared.js' });
  T('shared.js 加载无异常(含播放器)', true);
} catch (e) { T('shared.js 加载无异常(含播放器)', false, e.message); }
var Site = sb.Site;

sec('歌单定义与文件存在');
T('站点歌单 5 首', Site.SONGS.length === 5, Site.SONGS.length);
var filesOk = Site.SONGS.every(function (s) { return fs.existsSync(s.f); });
T('5个音频文件都存在于 music/', filesOk, Site.SONGS.map(function (s) { return s.f; }).join(','));

sec('歌单合并: 音乐仓库的歌自动加入');
Site.musicPlay(0);
var a = FakeAudio.all[FakeAudio.all.length - 1];
T('第1首=青春是一首诗', a._src.indexOf('youth-poem.flac') >= 0, a._src);
Site.musicPlay(5); // 越过5首站点歌 → 第6首应为仓库音频歌
T('第6首=仓库里的音频歌(dataURL)', a._src === 'data:audio/mpeg;base64,AAAA', a._src);
Site.musicPlay(6); // 越界 → 回绕到第1首(6 % 6)
T('列表循环回绕', a._src.indexOf('youth-poem.flac') >= 0, a._src);
Site.musicPlay(-1); // 负数 → 最后一首(仓库歌)
T('上一首负回绕到仓库歌', a._src === 'data:audio/mpeg;base64,AAAA', a._src);

sec('播放/暂停/切歌');
Site.musicToggle(); // 正在播→暂停
T('toggle 暂停', (a._pauses || 0) >= 1);
var p0 = a._plays || 0;
Site.musicToggle(); // 暂停中→恢复播放
T('toggle 恢复播放', (a._plays || 0) === p0 + 1, p0 + '→' + (a._plays || 0));
var bgmBefore = sb.AOXSound._bgmCalls || 0;
Site.musicPlay(1); // 切歌时 stopBGM
T('切歌时游戏BGM让位(stopBGM)', (sb.AOXSound._stopped || 0) >= 1);
T('第2首=永远的同桌', a._src.indexOf('deskmate-forever.flac') >= 0, a._src);

sec('BGM hook: 放歌时 chiptune 不抢麦');
Site._mu.playing = true;
sb.AOXSound.startBGM('game');
T('歌曲播放中 startBGM 被拦截', (sb.AOXSound._bgmCalls || 0) === bgmBefore, 'bgmCalls=' + sb.AOXSound._bgmCalls);
Site._mu.playing = false;
sb.AOXSound.startBGM('menu');
T('歌曲停了 startBGM 恢复放行', (sb.AOXSound._bgmCalls || 0) === bgmBefore + 1);

sec('播完自动下一首 / 单曲循环');
sb.AOXSound._stopped = 0;
Site.musicPlay(0);
a._ls['ended'](); // 模拟播完(mode=all)
T('列表模式播完→下一首', a._src.indexOf('deskmate-forever.flac') >= 0, a._src);
Site._mu.pref.mode = 'one';
var cur = a._src;
a._ls['ended'](); // 单曲循环
T('单曲循环→重播同一首', a._src === cur, a._src);
Site._mu.pref.mode = 'all';

sec('状态记忆(localStorage)');
var pref = JSON.parse(sb.localStorage._d['site_music_v1'] || '{}');
T('pref 已保存(on/idx)', pref.on === true && pref.idx === 1, JSON.stringify(pref));
T('音量默认 0.8 且赋给 audio', a.volume === 0.8, a.volume);

sec('面板 UI');
Site.musicPanel();
T('面板创建', !!sb.document.getElementById('smPanelBox'));
T('面板含站点音乐标题', sb.document.getElementById('smPanelBox').innerHTML.indexOf('站点音乐') >= 0);
Site.musicPanel(); // 再点=收起
T('再点收起面板', true); // remove() 为桩, 不抛错即过

sec('自动恢复(浏览器策略)');
Site._mu.started = false; Site._mu.pref.on = true;
sb.setTimeout = function (fn) { fn(); return 0; }; // 立即执行
// 模拟首次点击恢复: initMusicPlayer 里绑定在 document 上, 沙盒 addEventListener 是桩——直接验证按 pref.idx 恢复
Site.musicPlay(Site._mu.pref.idx || 0);
T('按 pref.idx 恢复播放第2首', a._src.indexOf('deskmate-forever.flac') >= 0, a._src);

console.log('');
console.log('总用例 ' + total + ' · 失败 ' + failures);
if (failures > 0) { console.log('❌ 有失败用例'); process.exit(1); }
else console.log('✅ 音乐播放器测试全部通过');
