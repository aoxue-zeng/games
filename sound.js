// ===== AoXuan 像素世界 · 音效引擎 (Web Audio API) =====
// 程序化生成 8-bit 复古音效，无需外部音频文件
(function (global) {
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  var masterGain = null;
  var enabled = true;
  var bgmTimer = null;
  var bgmGain = null;

  // 必须在用户交互后初始化（浏览器策略）
  function ensureCtx() {
    if (!ctx) {
      try {
        ctx = new AC();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.5;
        masterGain.connect(ctx.destination);
      } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // ===== 基础：播放一个振荡器音 =====
  function tone(freq, dur, type, vol, when) {
    var c = ensureCtx(); if (!c || !enabled) return;
    when = when || c.currentTime;
    type = type || 'square';
    vol = vol == null ? 0.3 : vol;
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(g); g.connect(masterGain);
    osc.start(when);
    osc.stop(when + dur + 0.05);
    return osc;
  }

  // 频率滑变
  function slide(f1, f2, dur, type, vol) {
    var c = ensureCtx(); if (!c || !enabled) return;
    var when = c.currentTime;
    type = type || 'square'; vol = vol == null ? 0.3 : vol;
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f1, when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), when + dur);
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(g); g.connect(masterGain);
    osc.start(when); osc.stop(when + dur + 0.05);
  }

  // 噪声（用于爆炸/打击）
  function noise(dur, vol, filterFreq) {
    var c = ensureCtx(); if (!c || !enabled) return;
    var when = c.currentTime;
    var bufferSize = Math.floor(c.sampleRate * dur);
    var buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
    var src = c.createBufferSource(); src.buffer = buffer;
    var g = c.createGain();
    g.gain.setValueAtTime(vol || 0.3, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    var filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 2000;
    src.connect(filter); filter.connect(g); g.connect(masterGain);
    src.start(when); src.stop(when + dur);
  }

  var SFX = {
    // ===== 通用 =====
    click: function () { tone(660, 0.08, 'square', 0.2); },
    select: function () { tone(880, 0.1, 'square', 0.25); setTimeout(function(){tone(1320,0.08,'square',0.2);},60); },
    back: function () { tone(440, 0.08, 'square', 0.2); },
    // ===== 跳跃（玛丽）=====
    jump: function () { slide(300, 700, 0.15, 'square', 0.25); },
    // ===== 收集金币 =====
    coin: function () { tone(988, 0.08, 'square', 0.25); setTimeout(function(){tone(1319,0.12,'square',0.25);},70); },
    gem: function () { tone(1319,0.06,'triangle',0.3); setTimeout(function(){tone(1760,0.06,'triangle',0.3);},50); setTimeout(function(){tone(2349,0.12,'triangle',0.3);},100); },
    // ===== 打中/命中 =====
    hit: function () { noise(0.1, 0.3, 1500); tone(200,0.08,'square',0.2); },
    shoot: function () { slide(800, 300, 0.1, 'sawtooth', 0.2); },
    arrow: function () { slide(600, 1200, 0.08, 'triangle', 0.2); },
    // ===== 爆炸 =====
    explode: function () { noise(0.4, 0.4, 800); slide(150, 40, 0.4, 'sawtooth', 0.3); },
    boom: function () { noise(0.5, 0.5, 600); slide(120, 30, 0.5, 'sawtooth', 0.35); },
    // ===== 消除（俄罗斯/三消）=====
    clear: function () { tone(523,0.06,'square',0.25); setTimeout(function(){tone(659,0.06,'square',0.25);},50); setTimeout(function(){tone(784,0.1,'square',0.25);},100); },
    clearBig: function () { var n=[523,659,784,1047]; n.forEach(function(f,i){setTimeout(function(){tone(f,0.1,'square',0.25);},i*60);}); },
    // ===== 旋转/移动（俄罗斯）=====
    rotate: function () { tone(500, 0.05, 'square', 0.18); },
    move: function () { tone(330, 0.04, 'square', 0.15); },
    drop: function () { slide(400, 150, 0.1, 'square', 0.2); },
    // ===== 错误/受伤 =====
    error: function () { tone(200, 0.15, 'sawtooth', 0.25); setTimeout(function(){tone(150,0.15,'sawtooth',0.25);},80); },
    hurt: function () { slide(400, 100, 0.2, 'sawtooth', 0.3); noise(0.15,0.2,1000); },
    // ===== 挖掘 =====
    dig: function () { noise(0.06, 0.2, 2500); tone(150, 0.05, 'square', 0.12); },
    digStone: function () { noise(0.08, 0.25, 1800); tone(120, 0.06, 'square', 0.15); },
    // ===== 放置/标记 =====
    place: function () { tone(440, 0.05, 'square', 0.2); setTimeout(function(){tone(550,0.05,'square',0.2);},40); },
    flag: function () { tone(700, 0.06, 'triangle', 0.2); },
    // ===== 升级/胜利 =====
    levelUp: function () { var n=[523,659,784,1047,1319]; n.forEach(function(f,i){setTimeout(function(){tone(f,0.12,'square',0.25);},i*80);}); },
    win: function () { var n=[523,659,784,1047,1319,1568]; n.forEach(function(f,i){setTimeout(function(){tone(f,0.15,'square',0.28);},i*100);}); },
    // ===== 失败 =====
    lose: function () { slide(440, 110, 0.6, 'sawtooth', 0.3); setTimeout(function(){tone(110,0.3,'sawtooth',0.25);},600); },
    // ===== Boss 龙咆哮 =====
    roar: function () { slide(80, 200, 0.4, 'sawtooth', 0.35); noise(0.4, 0.2, 500); },
    // ===== 炼药冒泡 =====
    bubble: function () { tone(300+Math.random()*200, 0.08, 'sine', 0.15); },
    // ===== 倒计时滴答 =====
    tick: function () { tone(1200, 0.04, 'square', 0.15); },
    // ===== 连击提示 =====
    combo: function (n) { tone(660 + n * 40, 0.08, 'square', 0.2); },
    // ===== 解锁/成就 =====
    unlock: function () { tone(784,0.08,'triangle',0.25); setTimeout(function(){tone(1047,0.08,'triangle',0.25);},60); setTimeout(function(){tone(1568,0.15,'triangle',0.25);},120); }
  };

  // ===== 简易背景音乐（循环旋律）=====
  // 用音符序列循环播放，复古芯片音乐风格
  var MELODIES = {
    // 主页：轻快主题
    menu: {
      tempo: 220,
      notes: [
        [523,2],[659,2],[784,2],[659,2], [523,2],[659,2],[784,4],
        [880,2],[784,2],[659,2],[523,2], [659,4],[523,4],
        [587,2],[698,2],[880,2],[698,2], [587,2],[698,2],[880,4],
        [784,2],[698,2],[587,2],[523,2], [523,4],[0,2]
      ],
      bass: [
        [131,4],[196,4], [131,4],[196,4], [165,4],[220,4], [131,4],[196,4]
      ],
      type: 'square'
    },
    // 游戏中：紧张节奏
    game: {
      tempo: 200,
      notes: [
        [440,1],[440,1],[523,1],[440,1], [587,2],[523,2],
        [440,1],[440,1],[523,1],[587,1], [659,2],[523,2],
        [392,1],[392,1],[440,1],[392,1], [523,2],[440,2],
        [349,2],[392,2],[440,2],[523,2], [440,4],[0,2]
      ],
      bass: [
        [110,4],[165,4], [110,4],[165,4], [98,4],[147,4], [110,4],[165,4]
      ],
      type: 'square'
    }
  };

  function playNote(freq, dur, type, vol, when) {
    if (!freq) return;
    var c = ensureCtx(); if (!c) return;
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol || 0.12, when + 0.02);
    g.gain.setValueAtTime(vol || 0.12, when + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(g);
    if (bgmGain) g.connect(bgmGain); else g.connect(masterGain);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  function startBGM(name) {
    stopBGM();
    var m = MELODIES[name]; if (!m) return;
    var c = ensureCtx(); if (!c || !enabled) return;
    bgmGain = c.createGain();
    bgmGain.gain.value = 0.3;
    bgmGain.connect(masterGain);

    var beat = m.tempo / 1000; // 一拍秒数
    var pos = 0;
    var bassPos = 0;

    function scheduleLoop() {
      if (!bgmGain) return;
      var startT = c.currentTime + 0.1;
      var t = startT;
      // 主旋律
      m.notes.forEach(function (n) {
        var dur = n[1] * beat;
        playNote(n[0], dur * 0.9, m.type, 0.1, t);
        t += dur;
      });
      // 贝斯
      var tb = startT;
      m.bass.forEach(function (n) {
        var dur = n[1] * beat;
        playNote(n[0], dur * 0.9, 'triangle', 0.14, tb);
        tb += dur;
      });
      var totalT = t - startT;
      bgmTimer = setTimeout(scheduleLoop, totalT * 1000);
    }
    scheduleLoop();
  }

  function stopBGM() {
    if (bgmTimer) { clearTimeout(bgmTimer); bgmTimer = null; }
    if (bgmGain && ctx) {
      try { bgmGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3); } catch (e) {}
      var old = bgmGain; bgmGain = null;
      setTimeout(function () { try { old.disconnect(); } catch (e) {} }, 400);
    }
  }

  // ===== 开关 =====
  function setEnabled(v) {
    enabled = v;
    if (!v) stopBGM();
    try { localStorage.setItem('mc_sound', v ? '1' : '0'); } catch (e) {}
  }
  function isEnabled() { return enabled; }
  function initPref() {
    try { var v = localStorage.getItem('mc_sound'); if (v === '0') enabled = false; } catch (e) {}
  }
  initPref();

  // 暴露
  global.SFX = SFX;
  global.AOXSound = {
    sfx: SFX,
    startBGM: startBGM,
    stopBGM: stopBGM,
    setEnabled: setEnabled,
    isEnabled: isEnabled,
    ensure: ensureCtx,
    tone: tone,
    slide: slide,
    noise: noise
  };
})(window);
