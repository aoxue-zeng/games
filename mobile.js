// ===== AoXuan 像素世界 · 移动端触屏控件 =====
// 检测触屏设备，自动注入虚拟方向键和动作按钮
// 通过 window.AOXMobile 暴露状态，游戏读取它来响应
(function (global) {
  var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  // 也允许通过 URL ?mobile=1 强制开启（方便桌面测试）
  if (location.search.indexOf('mobile=1') >= 0) isTouch = true;

  var state = {
    isTouch: isTouch,
    // 方向键状态
    up: false, down: false, left: false, right: false,
    // 动作按钮（按类型）
    a: false, b: false,  // A=主动作(跳/射击/旋转) B=副动作(挖/硬降)
    // 摇杆（末影龙瞄准用）
    joyX: 0, joyY: 0, joyActive: false
  };

  function createEl(cls, style) {
    var d = document.createElement('div');
    d.className = 'mc-touch ' + cls;
    if (style) Object.assign(d.style, style);
    return d;
  }

  // 阻止默认行为（防止滚动/缩放）
  function stop(e) { e.preventDefault(); e.stopPropagation(); }

  // ===== 方向键 D-Pad =====
  function buildDPad(container) {
    var pad = createEl('mc-dpad');
    var dirs = [
      { k: 'up', label: '▲', style: { top: '0', left: '50%', transform: 'translateX(-50%)' } },
      { k: 'left', label: '◀', style: { top: '50%', left: '0', transform: 'translateY(-50%)' } },
      { k: 'right', label: '▶', style: { top: '50%', right: '0', transform: 'translateY(-50%)' } },
      { k: 'down', label: '▼', style: { bottom: '0', left: '50%', transform: 'translateX(-50%)' } }
    ];
    dirs.forEach(function (d) {
      var b = createEl('mc-dbtn');
      b.textContent = d.label;
      Object.assign(b.style, d.style);
      b.dataset.dir = d.k;
      var press = function (e) { stop(e); state[d.k] = true; b.classList.add('active'); };
      var release = function (e) { stop(e); state[d.k] = false; b.classList.remove('active'); };
      b.addEventListener('touchstart', press, { passive: false });
      b.addEventListener('touchend', release, { passive: false });
      b.addEventListener('touchcancel', release, { passive: false });
      // 鼠标也支持（测试用）
      b.addEventListener('mousedown', press);
      b.addEventListener('mouseup', release);
      b.addEventListener('mouseleave', release);
      pad.appendChild(b);
    });
    container.appendChild(pad);
  }

  // ===== 动作按钮 =====
  function buildActions(container, buttons) {
    // buttons: [{key:'a',label:'A',color,onPress}], key 对应 state[key]
    var wrap = createEl('mc-actions');
    buttons.forEach(function (btn) {
      // 确保状态字段存在
      if (state[btn.key] === undefined) state[btn.key] = false;
      var b = createEl('mc-abtn');
      b.textContent = btn.label;
      b.dataset.key = btn.key;
      if (btn.color) b.style.background = btn.color;
      var press = function (e) { stop(e); state[btn.key] = true; b.classList.add('active'); if (btn.onPress) btn.onPress(); };
      var release = function (e) { stop(e); state[btn.key] = false; b.classList.remove('active'); };
      b.addEventListener('touchstart', press, { passive: false });
      b.addEventListener('touchend', release, { passive: false });
      b.addEventListener('touchcancel', release, { passive: false });
      b.addEventListener('mousedown', press);
      b.addEventListener('mouseup', release);
      b.addEventListener('mouseleave', release);
      wrap.appendChild(b);
    });
    container.appendChild(wrap);
  }

  // ===== 摇杆（瞄准用）=====
  function buildJoystick(container, onMove) {
    var base = createEl('mc-joy-base');
    var knob = createEl('mc-joy-knob');
    base.appendChild(knob);
    container.appendChild(base);
    var rect, cx, cy;
    function start(e) {
      stop(e);
      rect = base.getBoundingClientRect();
      cx = rect.left + rect.width / 2;
      cy = rect.top + rect.height / 2;
      state.joyActive = true;
      move(e);
    }
    function move(e) {
      if (!state.joyActive) return;
      stop(e);
      var t = e.touches ? e.touches[0] : e;
      var dx = t.clientX - cx, dy = t.clientY - cy;
      var dist = Math.hypot(dx, dy);
      var max = rect.width / 2;
      var clamped = Math.min(dist, max);
      var ang = Math.atan2(dy, dx);
      var kx = Math.cos(ang) * clamped, ky = Math.sin(ang) * clamped;
      knob.style.transform = 'translate(' + kx + 'px,' + ky + 'px)';
      state.joyX = kx / max;
      state.joyY = ky / max;
      if (onMove) onMove(state.joyX, state.joyY);
    }
    function end(e) {
      stop(e);
      state.joyActive = false;
      state.joyX = 0; state.joyY = 0;
      knob.style.transform = 'translate(0,0)';
      if (onMove) onMove(0, 0);
    }
    base.addEventListener('touchstart', start, { passive: false });
    base.addEventListener('touchmove', move, { passive: false });
    base.addEventListener('touchend', end, { passive: false });
    base.addEventListener('touchcancel', end, { passive: false });
    base.addEventListener('mousedown', start);
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', end);
  }

  // ===== 公共 API =====
  var M = {
    state: state,
    isTouch: isTouch,

    // 初始化一组控件，返回容器（已插入 body）
    // opts: { dpad:true, actions:[{key,label,color,onPress}], joystick:fn }
    init: function (opts) {
      if (!isTouch) return null;
      opts = opts || {};
      // 移除旧的
      var old = document.querySelector('.mc-touch-layer');
      if (old) old.remove();
      var layer = createEl('mc-touch-layer');
      if (opts.dpad) buildDPad(layer);
      if (opts.actions && opts.actions.length) buildActions(layer, opts.actions);
      if (opts.joystick) buildJoystick(layer, opts.joystick);
      document.body.appendChild(layer);
      return layer;
    },

    // 触屏按下动作按钮时触发自定义事件（游戏可监听）
    onAction: function (key, fn) {
      document.addEventListener('aox:action:' + key, fn);
    },
    fireAction: function (key) {
      document.dispatchEvent(new Event('aox:action:' + key));
    },

    hide: function () { var l = document.querySelector('.mc-touch-layer'); if (l) l.style.display = 'none'; },
    show: function () { var l = document.querySelector('.mc-touch-layer'); if (l) l.style.display = ''; },

    // ===== 通用虚拟按键（通过派发 KeyboardEvent 让现有游戏直接响应）=====
    // opts: { dpad:true, keys:[{label,key,color}] }
    // key 对应 e.key 的值，按下派发 keydown，松开派发 keyup
    virtualKeys: function (opts) {
      if (!isTouch) return null;
      opts = opts || {};
      var old = document.querySelector('.mc-vkeys');
      if (old) old.remove();
      var layer = createEl('mc-vkeys');
      layer.style.cssText = 'position:fixed;inset:0;z-index:150;pointer-events:none';

      function press(key, down) {
        var ev = new KeyboardEvent(down ? 'keydown' : 'keyup', { key: key, bubbles: true, cancelable: true });
        document.dispatchEvent(ev);
      }
      function mkBtn(label, key, color, big) {
        var b = document.createElement('div');
        b.className = 'mc-vbtn' + (big ? ' big' : '');
        b.textContent = label;
        if (color) b.style.background = color;
        b.style.pointerEvents = 'auto';
        var active = false;
        function down(e) { e.preventDefault(); if (!active) { active = true; b.classList.add('active'); press(key, true); } }
        function up(e) { e.preventDefault(); if (active) { active = false; b.classList.remove('active'); press(key, false); } }
        b.addEventListener('touchstart', down, { passive: false });
        b.addEventListener('touchend', up, { passive: false });
        b.addEventListener('touchcancel', up, { passive: false });
        b.addEventListener('mousedown', down);
        b.addEventListener('mouseup', up);
        b.addEventListener('mouseleave', up);
        return b;
      }

      if (opts.dpad) {
        var pad = document.createElement('div');
        pad.className = 'mc-vpad';
        pad.style.cssText = 'position:fixed;bottom:14px;left:14px;width:144px;height:144px;';
        var dirs = [
          { k: 'ArrowUp', l: '▲', s: 'top:0;left:50%;transform:translateX(-50%)' },
          { k: 'ArrowLeft', l: '◀', s: 'top:50%;left:0;transform:translateY(-50%)' },
          { k: 'ArrowRight', l: '▶', s: 'top:50%;right:0;transform:translateY(-50%)' },
          { k: 'ArrowDown', l: '▼', s: 'bottom:0;left:50%;transform:translateX(-50%)' }
        ];
        dirs.forEach(function (d) {
          var b = document.createElement('div');
          b.className = 'mc-vbtn'; b.textContent = d.l;
          b.style.cssText = 'position:absolute;width:48px;height:48px;' + d.s;
          var active = false;
          function down(e) { e.preventDefault(); if (!active) { active = true; b.classList.add('active'); press(d.k, true); } }
          function up(e) { e.preventDefault(); if (active) { active = false; b.classList.remove('active'); press(d.k, false); } }
          b.addEventListener('touchstart', down, { passive: false });
          b.addEventListener('touchend', up, { passive: false });
          b.addEventListener('touchcancel', up, { passive: false });
          b.addEventListener('mousedown', down); b.addEventListener('mouseup', up); b.addEventListener('mouseleave', up);
          pad.appendChild(b);
        });
        layer.appendChild(pad);
      }

      if (opts.keys && opts.keys.length) {
        var wrap = document.createElement('div');
        wrap.style.cssText = 'position:fixed;bottom:18px;right:14px;display:flex;gap:12px;align-items:flex-end;';
        opts.keys.forEach(function (kb) {
          wrap.appendChild(mkBtn(kb.label, kb.key, kb.color, kb.big));
        });
        layer.appendChild(wrap);
      }
      document.body.appendChild(layer);
      return layer;
    }
  };

  global.AOXMobile = M;

  // 触屏设备：阻止双击缩放和页面滚动（游戏区域）
  if (isTouch) {
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    var lastTouch = 0;
    document.addEventListener('touchend', function (e) {
      var now = Date.now();
      if (now - lastTouch <= 300) e.preventDefault();
      lastTouch = now;
    }, { passive: false });
  }
})(window);
