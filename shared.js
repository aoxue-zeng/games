// ===== 共享脚本：浮动方块背景 + 顶栏 + Toast + 音效开关 =====
(function () {
  // 浮动 Minecraft 方块
  function spawnFloatingBlocks() {
    var container = document.querySelector('.floating-blocks');
    if (!container) return;
    var skins = [
      'repeating-linear-gradient(90deg,#5fb53f 0,#5fb53f 8px,#3d8b2a 8px,#3d8b2a 16px)',
      'repeating-linear-gradient(90deg,#8b5a2b 0,#8b5a2b 8px,#6b4220 8px,#6b4220 16px)',
      'repeating-linear-gradient(90deg,#7f7f7f 0,#7f7f7f 8px,#555 8px,#555 16px)',
      'repeating-linear-gradient(90deg,#4dd0e1 0,#4dd0e1 8px,#00838f 8px,#00838f 16px)',
      'repeating-linear-gradient(90deg,#ffd700 0,#ffd700 8px,#b8860b 8px,#b8860b 16px)',
      'repeating-linear-gradient(90deg,#e53935 0,#e53935 8px,#b71c1c 8px,#b71c1c 16px)'
    ];
    for (var i = 0; i < 14; i++) {
      var b = document.createElement('div');
      b.className = 'float-block';
      b.style.background = skins[Math.floor(Math.random() * skins.length)];
      b.style.left = Math.random() * 100 + '%';
      b.style.width = b.style.height = (24 + Math.random() * 32) + 'px';
      var dur = 12 + Math.random() * 16;
      b.style.animationDuration = dur + 's';
      b.style.animationDelay = (-Math.random() * dur) + 's';
      container.appendChild(b);
    }
    // 云
    for (var c = 0; c < 4; c++) {
      var cloud = document.createElement('div');
      cloud.className = 'cloud';
      cloud.style.top = (5 + Math.random() * 40) + '%';
      cloud.style.animationDuration = (30 + Math.random() * 30) + 's';
      cloud.style.animationDelay = (-Math.random() * 40) + 's';
      container.appendChild(cloud);
    }
    // 气泡（hover 爆裂）
    spawnBubbles(container);
  }

  // ===== 点赞系统 =====
  function getLikes() { try { return JSON.parse(localStorage.getItem('game_likes') || '{}'); } catch(e) { return {}; } }
  function saveLikes(l) { localStorage.setItem('game_likes', JSON.stringify(l)); }
  function getTotalLikes() { return parseInt(localStorage.getItem('total_likes') || '0'); }
  function getGlobalLikes() { return parseInt(localStorage.getItem('global_likes') || '142'); }

  function initLikes() {
    var likes = getLikes();
    // 每个游戏卡片加点赞按钮
    document.querySelectorAll('.game-card').forEach(function(card) {
      if (card.querySelector('.like-btn')) return;
      var href = card.getAttribute('href') || '';
      var liked = likes[href] === true;
      var btn = document.createElement('div');
      btn.className = 'like-btn' + (liked ? ' liked' : '');
      btn.innerHTML = '<span class="heart">' + (liked ? '❤️' : '🤍') + '</span> 点赞';
      btn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        var l = getLikes();
        if (l[href]) {
          delete l[href]; btn.classList.remove('liked');
          btn.querySelector('.heart').textContent = '🤍';
        } else {
          l[href] = true; btn.classList.add('liked');
          btn.querySelector('.heart').textContent = '❤️';
          if (window.SFX) SFX.coin();
        }
        saveLikes(l);
        updateTotalLikeCount();
      });
      // 插入到卡片info区域内
      var info = card.querySelector('.info');
      if (info) info.appendChild(btn);
    });
    // 底部总点赞栏
    if (!document.querySelector('.total-like-bar')) {
      var bar = document.createElement('div');
      bar.className = 'total-like-bar';
      bar.innerHTML = '<button class="total-like-btn" id="totalLikeBtn">❤️ 给网站点赞</button><div class="total-like-count" id="totalLikeCount">'+getGlobalLikes()+' 人点赞</div>';
      // 找到 footer 插入前面
      var footer = document.querySelector('footer');
      if (footer) footer.parentNode.insertBefore(bar, footer);
      else document.body.appendChild(bar);
      var tlBtn = document.getElementById('totalLikeBtn');
      var tlLiked = localStorage.getItem('total_liked') === '1';
      if (tlLiked) { tlBtn.classList.add('liked'); tlBtn.innerHTML = '✅ 已点赞'; }
      tlBtn.addEventListener('click', function() {
        if (localStorage.getItem('total_liked') === '1') return;
        localStorage.setItem('total_liked', '1');
        var g = getGlobalLikes() + 1; localStorage.setItem('global_likes', g);
        tlBtn.classList.add('liked'); tlBtn.innerHTML = '✅ 已点赞';
        document.getElementById('totalLikeCount').textContent = g + ' 人点赞';
        if (window.SFX) SFX.win();
        toast('❤️ 感谢点赞！');
      });
    }
  }
  function updateTotalLikeCount() {
    var el = document.getElementById('totalLikeCount');
    if (el) { var l = getLikes(); var cnt = Object.keys(l).length; el.textContent = (getGlobalLikes() + cnt) + ' 人点赞'; }
  }

  // ===== 气泡系统 =====
  function spawnBubbles(container) {
    var bubbleColors = ['rgba(77,208,225,0.3)', 'rgba(255,215,0,0.25)', 'rgba(156,39,176,0.2)', 'rgba(76,175,80,0.2)', 'rgba(255,255,255,0.25)'];
    for (var i = 0; i < 12; i++) {
      spawnOneBubble(container, bubbleColors);
    }
    // 持续生成新气泡
    setInterval(function () {
      if (container.children.length < 60) {
        spawnOneBubble(container, bubbleColors);
      }
    }, 3000);
  }

  function spawnOneBubble(container, colors) {
    var b = document.createElement('div');
    b.className = 'float-bubble';
    var size = 20 + Math.random() * 50;
    b.style.width = b.style.height = size + 'px';
    b.style.left = Math.random() * 100 + '%';
    b.style.background = colors[Math.floor(Math.random() * colors.length)];
    var dur = 15 + Math.random() * 20;
    b.style.animationDuration = dur + 's';
    b.style.animationDelay = (-Math.random() * dur) + 's';
    // hover 爆裂
    b.addEventListener('mouseenter', function () {
      if (b.classList.contains('popped')) return;
      b.classList.add('popped');
      // 爆裂粒子
      for (var p = 0; p < 8; p++) {
        var particle = document.createElement('div');
        particle.className = 'bubble-particle';
        var ang = (p / 8) * Math.PI * 2;
        var dist = 20 + Math.random() * 30;
        particle.style.left = b.style.left;
        particle.style.bottom = '0px';
        particle.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
        particle.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
        var rect = b.getBoundingClientRect();
        particle.style.position = 'fixed';
        particle.style.left = rect.left + rect.width / 2 + 'px';
        particle.style.top = rect.top + rect.height / 2 + 'px';
        document.body.appendChild(particle);
        setTimeout(function () { particle.remove(); }, 500);
      }
      // 音效
      if (window.SFX) SFX.bubble ? SFX.bubble() : SFX.move();
      b.style.opacity = '0';
      setTimeout(function () { b.remove(); }, 300);
    });
    container.appendChild(b);
  }

  // 页面切换/隐藏时自动停 BGM，避免多页面音乐叠加
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && window.AOXSound) { AOXSound.stopBGM(); }
  });
  window.addEventListener('pagehide', function () {
    if (window.AOXSound) { AOXSound.stopBGM(); }
  });
  window.addEventListener('beforeunload', function () {
    if (window.AOXSound) { AOXSound.stopBGM(); }
  });

  // Toast
  window.toast = function (msg) {
    var t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2500);
  };

  if (document.readyState !== 'loading') { spawnFloatingBlocks(); initSoundToggle(); initTouchDetect(); initMobileMenu(); initLikes(); }
  else document.addEventListener('DOMContentLoaded', function(){ spawnFloatingBlocks(); initSoundToggle(); initTouchDetect(); initMobileMenu(); initLikes(); });

  // ===== 手机汉堡菜单 =====
  function initMobileMenu() {
    var nav = document.querySelector('.topbar nav');
    if (!nav) return;
    // 已注入过则跳过
    if (document.querySelector('.menu-toggle')) return;
    var btn = document.createElement('button');
    btn.className = 'menu-toggle';
    btn.innerHTML = '☰';
    btn.setAttribute('aria-label', '菜单');
    var topbar = document.querySelector('.topbar');
    topbar.insertBefore(btn, nav);
    btn.addEventListener('click', function () {
      nav.classList.toggle('open');
      btn.innerHTML = nav.classList.contains('open') ? '✕' : '☰';
    });
    // 点击导航链接后收起
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        btn.innerHTML = '☰';
      });
    });
    // 点击页面其他处收起
    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('open')) return;
      if (e.target === btn || nav.contains(e.target)) return;
      nav.classList.remove('open');
      btn.innerHTML = '☰';
    });
  }

  // ===== 触屏设备检测 =====
  function initTouchDetect() {
    if (window.AOXMobile && window.AOXMobile.isTouch) {
      document.body.classList.add('mc-touch-device');
    }
  }

  // ===== 音效开关按钮 =====
  function initSoundToggle() {
    if (document.querySelector('.sound-toggle')) return;
    var btn = document.createElement('div');
    btn.className = 'sound-toggle';
    btn.title = '开关音效';
    updateBtn(btn);
    btn.addEventListener('click', function () {
      var on = !AOXSound.isEnabled();
      AOXSound.setEnabled(on);
      if (on) { AOX.ensure(); SFX.click(); }
      updateBtn(btn);
      toast(on ? '🔊 音效已开启' : '🔇 音效已关闭');
    });
    document.body.appendChild(btn);
    function updateBtn(b) {
      b.textContent = AOXSound.isEnabled() ? '🔊' : '🔇';
      b.classList.toggle('muted', !AOXSound.isEnabled());
    }
  }

  // ===== 智能助手 =====
  // 全部游戏数据库（名字/文件/分类/关键词）
  var GAME_DB = [
    // 马里奥
    {n:'毒蘑菇躲避',f:'m-poison.html',c:'马里奥',k:'毒蘑菇 躲避 接蘑菇 蘑菇'},
    {n:'降落伞',f:'m-parachute.html',c:'马里奥',k:'降落伞 跳伞 飘落 云'},
    {n:'金币射击',f:'m-coins.html',c:'马里奥',k:'金币 射击 炮台 打金币'},
    {n:'城堡逃脱',f:'m-escape.html',c:'马里奥',k:'城堡 逃脱 岩浆 跳跃 跑酷'},
    {n:'火箭马里奥',f:'m-rocket.html',c:'马里奥',k:'火箭 飞天 升空 马里奥飞'},
    {n:'1-Up挑战',f:'m-1up.html',c:'马里奥',k:'1up 蘑菇 顶砖块 生命 加命'},
    {n:'马里奥马戏',f:'m-circus.html',c:'马里奥',k:'马戏 蹦床 弹跳 接人'},
    {n:'马里奥拼图',f:'m-puzzle.html',c:'马里奥',k:'拼图 滑动 还原 马里奥图'},
    {n:'超级蘑菇变大',f:'m-mega.html',c:'马里奥',k:'蘑菇 变大 顶砖块 跳跃'},
    {n:'马里奥节奏',f:'m-rhythm.html',c:'马里奥',k:'节奏 音乐 按键 落下'},
    {n:'马里奥挖洞',f:'m-dig.html',c:'马里奥',k:'挖洞 往下挖 挖土 金币'},
    {n:'马里奥大乱斗',f:'m-brawl.html',c:'马里奥',k:'乱斗 对战 打飞 格斗'},
    {n:'像素冒险',f:'mario.html',c:'马里奥',k:'冒险 平台 跳跃 金币 怪物 通关 旗帜 超级玛丽 马里奥'},
    // 我的世界
    {n:'伐木大亨',f:'lumberjack.html',c:'我的世界',k:'伐木 砍树 木材 斧头 升级'},
    {n:'合成台',f:'crafting.html',c:'我的世界',k:'合成 配方 记忆 材料台'},
    {n:'红石电路',f:'redstone.html',c:'我的世界',k:'红石 电路 灯 连接 通电'},
    {n:'下界探险',f:'nether.html',c:'我的世界',k:'下界 地狱 岩浆 跳跃 平台'},
    {n:'苦力怕防御',f:'defend.html',c:'我的世界',k:'苦力怕 防御 塔防 村庄 爆炸'},
    {n:'钓鱼大师',f:'fishing.html',c:'我的世界',k:'钓鱼 鱼 抛竿 收杆'},
    {n:'寻宝探险',f:'treasure.html',c:'我的世界',k:'寻宝 挖宝 罗盘 宝藏'},
    {n:'农场丰收',f:'farm.html',c:'我的世界',k:'农场 种田 麦子 浇水 收获'},
    {n:'建筑大师',f:'builder.html',c:'我的世界',k:'建筑 建造 像素 复刻'},
    {n:'挖矿大冒险',f:'mining.html',c:'我的世界',k:'挖矿 矿石 钻石 熔岩 深挖'},
    {n:'苦力怕扫雷',f:'sweeper.html',c:'我的世界',k:'扫雷 苦力怕 火把 雷区'},
    {n:'方块三消',f:'match3.html',c:'我的世界',k:'三消 连消 方块 消除'},
    {n:'末影龙Boss战',f:'dragon.html',c:'我的世界',k:'末影龙 boss 射箭 弹幕 龙'},
    {n:'合成台炼药',f:'potion.html',c:'我的世界',k:'炼药 药水 记忆 配方 材料'},
    {n:'TNT打靶',f:'tnt.html',c:'我的世界',k:'tnt 打靶 爆炸 引爆 连击'},
    // 动作射击
    {n:'飞机大战',f:'shooter.html',c:'动作射击',k:'飞机 射击 弹幕 战斗机'},
    {n:'坦克大战',f:'tank.html',c:'动作射击',k:'坦克 射击 闯关 装甲'},
    {n:'打砖块',f:'breakout.html',c:'动作射击',k:'打砖块 弹球 挡板 breakout'},
    {n:'太空侵略者',f:'invaders.html',c:'动作射击',k:'侵略者 外星人 射击 编队'},
    {n:'像素鸟',f:'flappy.html',c:'动作射击',k:'像素鸟 flappy 扇翅 管道 鸟'},
    {n:'企鹅滑行',f:'penguin.html',c:'动作射击',k:'企鹅 滑雪 滑行 鱼石头'},
    {n:'接贝壳',f:'catch.html',c:'动作射击',k:'接贝壳 接物品 船 炸弹'},
    {n:'接水管',f:'pipes.html',c:'动作射击',k:'接水管 管道 旋转 连通 水流'},
    {n:'城堡防御',f:'castle.html',c:'动作射击',k:'城堡 防御 射箭 塔防 敌人'},
    {n:'丛林冒险联机',f:'pf-jungle.html',c:'动作射击',k:'联机 对战 丛林 跳跃 闯关 在线 多人'},
    {n:'冰雪世界联机',f:'pf-ice.html',c:'动作射击',k:'联机 对战 冰雪 跳跃 闯关 在线 多人'},
    {n:'天空之城联机',f:'pf-sky.html',c:'动作射击',k:'联机 对战 天空 跳跃 闯关 在线 多人'},
    {n:'火山熔岩联机',f:'pf-volcano.html',c:'动作射击',k:'联机 对战 火山 熔岩 跳跃 闯关 在线 多人'},
    {n:'深海世界联机',f:'pf-ocean.html',c:'动作射击',k:'联机 对战 深海 海洋 跳跃 闯关 在线 多人'},
    {n:'沙漠秘境联机',f:'pf-desert.html',c:'动作射击',k:'联机 对战 沙漠 跳跃 闯关 在线 多人'},
    {n:'极限挑战AI队友',f:'pf-extreme.html',c:'动作射击',k:'极限 挑战 困难 AI队友 钥匙 尖刺 熔岩 怪物 移动平台'},
    {n:'勇者斗恶龙剧本',f:'story1.html',c:'动作射击',k:'剧本 剧情 角色 骑士 弓箭手 法师 恶龙 森林 火龙 两关 故事'},
    {n:'星际迷航剧本',f:'story2.html',c:'动作射击',k:'剧本 剧情 角色 太空 星际 外星人 母舰 陨石 两关 故事 科幻'},
    {n:'忍者秘境剧本',f:'story3.html',c:'动作射击',k:'剧本 剧情 角色 忍者 影魔 竹林 影界 两关 故事 日式'},
    {n:'海盗宝藏剧本',f:'story4.html',c:'动作射击',k:'剧本 剧情 角色 海盗 宝藏 幽灵船长 群岛 开放世界 故事'},
    {n:'机甲战争剧本',f:'story5.html',c:'动作射击',k:'剧本 剧情 角色 机甲 机器人 巨型机甲 废墟 开放世界 科幻 故事'},
    {n:'西部牛仔剧本',f:'story6.html',c:'动作射击',k:'剧本 剧情 角色 牛仔 警长 通缉犯 荒野 开放世界 故事 西部'},
    {n:'僵尸末日剧本',f:'story7.html',c:'动作射击',k:'剧本 剧情 角色 僵尸 末日 丧尸 尸王 废墟 开放世界 生存 故事'},
    {n:'童话王国剧本',f:'story8.html',c:'动作射击',k:'剧本 剧情 角色 童话 王子女巫 精灵 魔法 王国 开放世界 故事'},
    {n:'赛博朋克剧本',f:'story9.html',c:'动作射击',k:'剧本 剧情 角色 赛博朋克 骇客 AI 都市 霓虹 开放世界 科幻 故事'},
    {n:'古墓探险剧本',f:'story10.html',c:'动作射击',k:'剧本 剧情 角色 古墓 法老 探险 3任务榜 连环 超长地图 开放世界 故事'},
    {n:'深海危机剧本',f:'story11.html',c:'动作射击',k:'剧本 剧情 角色 深海 巨兽 海洋 3任务榜 连环 超长地图 开放世界 故事'},
    {n:'星际拓荒剧本',f:'story12.html',c:'动作射击',k:'剧本 剧情 角色 星际 虫族 母皇 拓荒 3任务榜 连环 超长地图 开放世界 故事'},
    {n:'史诗剧本万界征途',f:'epic.html',c:'动作射击',k:'史诗 剧本 万界 10任务榜 10英雄 3Boss 技能升级 传送 超长 8000米 大型'},
    {n:'3D我的世界',f:'mc3d.html',c:'我的世界',k:'3d 三d 我的世界 mc 沙盒 第一人称 挖矿 打怪 升级 钻石 僵尸 昼夜'},
    {n:'3D方块沙盒',f:'sandbox3d.html',c:'创造休闲',k:'3d 三d 方块 沙盒 建造 创造 放置 破坏 飞行 保存'},
    // 益智逻辑
    {n:'2048',f:'2048.html',c:'益智逻辑',k:'2048 数字 合并 滑动'},
    {n:'数独',f:'sudoku.html',c:'益智逻辑',k:'数独 逻辑 数字 填充'},
    {n:'推箱子',f:'sokoban.html',c:'益智逻辑',k:'推箱子 sokoban 箱子 目标'},
    {n:'数字华容道',f:'slide.html',c:'益智逻辑',k:'华容道 滑动 数字 排序'},
    {n:'算24点',f:'24points.html',c:'益智逻辑',k:'24点 算术 扑克 四数'},
    {n:'天平称重',f:'balance.html',c:'益智逻辑',k:'天平 称重 假币 推理'},
    {n:'算术挑战',f:'math.html',c:'益智逻辑',k:'算术 心算 加减乘除 数学'},
    {n:'猜数字',f:'guess.html',c:'益智逻辑',k:'猜数字 推理 数字'},
    {n:'温度计猜数',f:'thermometer.html',c:'益智逻辑',k:'温度计 猜数 冷热'},
    {n:'记忆翻牌',f:'memory.html',c:'益智逻辑',k:'记忆 翻牌 配对 卡牌'},
    {n:'拼图',f:'jigsaw.html',c:'益智逻辑',k:'拼图 滑动 还原 图案'},
    {n:'单词搜索',f:'wordsearch.html',c:'益智逻辑',k:'单词 搜索 字母 找词'},
    {n:'找不同',f:'spotdiff.html',c:'益智逻辑',k:'找不同 差异 两图 对比'},
    {n:'迷宫探险',f:'maze.html',c:'益智逻辑',k:'迷宫 寻路 出口 探险'},
    // 经典街机
    {n:'贪吃蛇',f:'snake.html',c:'经典街机',k:'贪吃蛇 蛇 吃苹果 经典'},
    {n:'霓虹贪吃蛇',f:'snake-neon.html',c:'经典街机',k:'霓虹 蛇 发光 赛博'},
    {n:'障碍贪吃蛇',f:'snake-maze.html',c:'经典街机',k:'障碍 蛇 迷宫 关卡'},
    {n:'双人贪吃蛇',f:'snake2.html',c:'经典街机',k:'双人 蛇 对战 竞技'},
    {n:'俄罗斯方块',f:'tetris.html',c:'经典街机',k:'俄罗斯 方块 消行 tetris'},
    {n:'乒乓',f:'pong.html',c:'经典街机',k:'乒乓 pong 球拍 对战'},
    {n:'节奏点击',f:'rhythm.html',c:'经典街机',k:'节奏 音乐 音符 落下'},
    {n:'打地鼠',f:'whack.html',c:'经典街机',k:'打地鼠 地鼠 锤子 反应'},
    {n:'飞镖',f:'darts.html',c:'经典街机',k:'飞镖 靶 投掷 射击'},
    {n:'打金矿',f:'goldmine.html',c:'经典街机',k:'金矿 钩子 抓金块 钻石'},
    {n:'爬梯子',f:'ladder.html',c:'经典街机',k:'爬梯子 方向键 快速 攀爬'},
    {n:'反应测试',f:'reaction.html',c:'经典街机',k:'反应 测试 速度 毫秒'},
    {n:'弹球台',f:'pinball.html',c:'经典街机',k:'弹球 弹珠台 挡板 缓冲器'},
    // 博弈竞猜
    {n:'骰子猜大小',f:'dice.html',c:'博弈竞猜',k:'骰子 猜大小 押注 赌博'},
    {n:'老虎机',f:'slots.html',c:'博弈竞猜',k:'老虎机 拉霸 转轮 赌'},
    {n:'赛马竞猜',f:'horserace.html',c:'博弈竞猜',k:'赛马 押注 马 竞速'},
    // 策略对战
    {n:'植物大战僵尸',f:'pvz.html',c:'策略对战',k:'植物 僵尸 塔防 阳光 豌豆'},
    {n:'五子棋',f:'gomoku.html',c:'策略对战',k:'五子棋 棋 连珠 人机 对弈'},
    // 创造休闲
    {n:'像素画板',f:'pixel.html',c:'创造休闲',k:'像素 画板 涂色 画画 创作'},
    {n:'汉堡大师',f:'burger.html',c:'创造休闲',k:'汉堡 叠层 记忆 食物'},
    {n:'音乐工作站',f:'music.html',c:'创造休闲',k:'音乐 作曲 编曲 歌 歌曲 播放 编辑 导入 导出'},
    // 文字
    {n:'打字练习',f:'practice.html',c:'文字',k:'打字 练习 键盘 指法 入门'},
    {n:'打字大作战',f:'typing.html',c:'文字',k:'打字 大作战 单词 速度'},
    {n:'连连看',f:'linkup.html',c:'文字',k:'连连看 配对 消除 连线'}
  ];

  function initAssistant() {
    if (document.querySelector('.ai-assistant')) return;
    // 浮动按钮
    var fab = document.createElement('div');
    fab.className = 'ai-fab';
    fab.innerHTML = '🤖';
    fab.title = '智能助手';
    document.body.appendChild(fab);

    // 聊天面板
    var panel = document.createElement('div');
    panel.className = 'ai-panel';
    panel.innerHTML =
      '<div class="ai-header"><b>🤖 AoXuan 助手</b><span class="ai-close">✕</span></div>' +
      '<div class="ai-messages" id="aiMessages"></div>' +
      '<div class="ai-input-row"><input type="text" id="aiInput" placeholder="想玩什么？问我..." autocomplete="off"><button id="aiSend">➤</button></div>';
    document.body.appendChild(panel);

    var msgs = panel.querySelector('#aiMessages');
    var input = panel.querySelector('#aiInput');
    var opened = false;

    function addMsg(text, isUser) {
      var d = document.createElement('div');
      d.className = 'ai-msg ' + (isUser ? 'user' : 'bot');
      d.innerHTML = text;
      msgs.appendChild(d);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function welcome() {
      addMsg('👋 你好！我是 AoXuan 网站助手。<br>这里有 <b>76 个游戏</b>，告诉我你想玩什么类型，我帮你找！<br><br>你可以问：<br>• "想玩射击游戏"<br>• "有马里奥吗"<br>• "手机能玩吗"<br>• "推荐个益智的"<br>• "贪吃蛇在哪"');
    }

    function toggle() {
      opened = !opened;
      panel.classList.toggle('open', opened);
      fab.style.display = opened ? 'none' : 'flex';
      if (opened && msgs.children.length === 0) welcome();
      if (opened) setTimeout(function(){ input.focus(); }, 100);
    }

    fab.addEventListener('click', toggle);
    panel.querySelector('.ai-close').addEventListener('click', toggle);

    // 搜索匹配
    function search(query) {
      query = query.toLowerCase().trim();
      if (!query) return [];
      var results = [];
      GAME_DB.forEach(function(g) {
        var hay = (g.n + ' ' + g.c + ' ' + g.k).toLowerCase();
        var score = 0;
        // 完整名字匹配最高分
        if (g.n.toLowerCase().indexOf(query) >= 0) score += 10;
        // 关键词匹配
        query.split(/\s+/).forEach(function(q) {
          if (q && hay.indexOf(q) >= 0) score += 3;
        });
        if (score > 0) results.push({ g: g, score: score });
      });
      results.sort(function(a, b) { return b.score - a.score; });
      return results.slice(0, 6).map(function(r) { return r.g; });
    }

    // 回答逻辑
    function answer(query) {
      var q = query.toLowerCase().trim();

      // 特殊问题
      if (q.indexOf('手机') >= 0 || q.indexOf('触屏') >= 0 || q.indexOf('移动') >= 0) {
        return '📱 所有游戏都支持手机触屏！动作类有虚拟方向键，点击类直接点屏幕。手机打开 <b>zengaoxuan.com</b> 即可玩。';
      }
      if (q.indexOf('你好') >= 0 || q.indexOf('hi') >= 0 || q.indexOf('hello') >= 0) {
        return '👋 你好！想玩什么游戏？告诉我类型或名字就行～';
      }
      if (q.indexOf('有多少') >= 0 || q.indexOf('几个') >= 0 || q.indexOf('多少') >= 0) {
        return '🎮 本站共有 <b>76 个游戏</b>，分 9 大类：马里奥15、我的世界15、动作射击9、益智逻辑14、经典街机12、博弈竞猜3、策略对战2、创造休闲3、文字3。';
      }
      if (q.indexOf('分类') >= 0 || q.indexOf('类别') >= 0 || q.indexOf('种类') >= 0) {
        return '📂 9 大分类：<br>🍄 马里奥 · ⛏ 我的世界 · 🎮 动作射击 · 🧠 益智逻辑 · 🕹️ 经典街机 · 🎲 博弈竞猜 · ♟️ 策略对战 · 🎨 创造休闲 · ⌨️ 文字<br><br>主页可点分类按钮筛选！';
      }
      if (q.indexOf('推荐') >= 0 || q.indexOf('好玩') >= 0 || q.indexOf('玩什么') >= 0) {
        var picks = [GAME_DB[12], GAME_DB[21], GAME_DB[27], GAME_DB[38], GAME_DB[49], GAME_DB[67]];
        return '🔥 热门推荐：<br>' + picks.map(function(g){return '• <a href="'+g.f+'">'+g.n+'</a> ('+g.c+')';}).join('<br>');
      }
      if (q.indexOf('音乐') >= 0 || q.indexOf('歌') >= 0 || q.indexOf('作曲') >= 0) {
        return '🎵 <a href="music.html">音乐工作站</a>！可以播放6首预设歌曲（马里奥/塞尔达等），自己编曲，导出导入JSON文件。作品存在<a href="music-vault.html">音乐仓库</a>，也能拖入mp3/wav音频播放。';
      }
      if (q.indexOf('联机') >= 0 || q.indexOf('在线') >= 0 || q.indexOf('多人') >= 0 || q.indexOf('一起玩') >= 0) {
        return '🌐 联机游戏！和网友一起像素跳跃闯关（共6个主题）：<br>• <a href="pf-jungle.html">🌴 丛林冒险</a><br>• <a href="pf-ice.html">❄️ 冰雪世界</a><br>• <a href="pf-sky.html">🏰 天空之城</a><br>• <a href="pf-volcano.html">🌋 火山熔岩</a><br>• <a href="pf-ocean.html">🌊 深海世界</a><br>• <a href="pf-desert.html">🏜️ 沙漠秘境</a><br>一方创建房间发房号，另一方输入加入，实时对战！';
      }
      if (q.indexOf('制作') >= 0 || q.indexOf('做游戏') >= 0 || q.indexOf('工坊') >= 0) {
        return '🏭 <a href="game-maker.html">游戏制作工坊</a>！选智能体→选类型→设参数→等待生成→试玩→存仓库。做的游戏存在<a href="game-vault.html">游戏仓库</a>里。';
      }
      if (q.indexOf('剧本') >= 0 || q.indexOf('剧情') >= 0 || q.indexOf('故事') >= 0) {
        return '📜 开放世界剧本冒险（共12个）！每个有选角色+大地图探索+任务榜+NPC+背包+技能+Boss：<br>• <a href="story1.html">⚔️ 勇者斗恶龙</a> · <a href="story2.html">🚀 星际迷航</a> · <a href="story3.html">🥷 忍者秘境</a><br>• <a href="story4.html">🏴‍☠️ 海盗宝藏</a> · <a href="story5.html">🤖 机甲战争</a> · <a href="story6.html">🤠 西部牛仔</a><br>• <a href="story7.html">🧟 僵尸末日</a> · <a href="story8.html">👑 童话王国</a> · <a href="story9.html">🌃 赛博朋克</a><br>• <a href="story10.html">🏺 古墓探险</a> · <a href="story11.html">🌊 深海危机</a> · <a href="story12.html">🛸 星际拓荒</a><br>后三个有<b>3个连环任务榜</b>解锁机制+超长地图！';
      }

      // 搜索游戏
      var results = search(q);
      if (results.length > 0) {
        if (results.length === 1) {
          return '🎯 找到了！<br><a class="ai-game-link" href="' + results[0].f + '"><b>' + results[0].n + '</b></a><br>分类：' + results[0].c + '<br>点击直接玩！';
        }
        return '🎯 找到 ' + results.length + ' 个相关游戏：<br>' +
          results.map(function(g){return '• <a href="'+g.f+'">'+g.n+'</a> ('+g.c+')';}).join('<br>');
      }

      // 兜底
      return '🤔 没找到完全匹配的。试试告诉我类型：<br>射击 / 马里奥 / 我的世界 / 益智 / 街机 / 塔防 / 贪吃蛇 / 节奏...<br>或输入"推荐"看看热门游戏！';
    }

    function send() {
      var v = input.value.trim();
      if (!v) return;
      addMsg(v, true);
      input.value = '';
      setTimeout(function() {
        addMsg(answer(v), false);
        if (window.SFX) SFX.click();
      }, 200);
    }

    input.addEventListener('keydown', function(e) { if (e.key === 'Enter') send(); });
    panel.querySelector('#aiSend').addEventListener('click', send);
  }

  if (document.readyState !== 'loading') { initAssistant(); }
  else document.addEventListener('DOMContentLoaded', initAssistant);
})();
