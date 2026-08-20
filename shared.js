(function () {
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
    for (var c = 0; c < 4; c++) {
      var cloud = document.createElement('div');
      cloud.className = 'cloud';
      cloud.style.top = (5 + Math.random() * 40) + '%';
      cloud.style.animationDuration = (30 + Math.random() * 30) + 's';
      cloud.style.animationDelay = (-Math.random() * 40) + 's';
      container.appendChild(cloud);
    }
    spawnBubbles(container);
  }

  function getLikes() { try { return JSON.parse(localStorage.getItem('game_likes') || '{}'); } catch(e) { return {}; } }
  function saveLikes(l) { localStorage.setItem('game_likes', JSON.stringify(l)); }
  function getTotalLikes() { return parseInt(localStorage.getItem('total_likes') || '0'); }
  function getGlobalLikes() { return parseInt(localStorage.getItem('global_likes') || '142'); }

  function initLikes() {
    var likes = getLikes();
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
        if (l[href]) return; // 已点赞，不能取消不能重复点
        l[href] = true; btn.classList.add('liked');
        btn.querySelector('.heart').textContent = '❤️';
        if (window.SFX) SFX.coin();
        saveLikes(l);
        updateTotalLikeCount();
      });
      var info = card.querySelector('.info');
      if (info) info.appendChild(btn);
    });
    if (!document.querySelector('.total-like-bar')) {
      var bar = document.createElement('div');
      bar.className = 'total-like-bar';
      bar.innerHTML = '<button class="total-like-btn" id="totalLikeBtn">❤️ 给网站点赞</button><div class="total-like-count" id="totalLikeCount">'+getGlobalLikes()+' 人点赞</div>';
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

  function spawnBubbles(container) {
    var bubbleColors = ['rgba(77,208,225,0.3)', 'rgba(255,215,0,0.25)', 'rgba(156,39,176,0.2)', 'rgba(76,175,80,0.2)', 'rgba(255,255,255,0.25)'];
    for (var i = 0; i < 12; i++) {
      spawnOneBubble(container, bubbleColors);
    }
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
    b.addEventListener('mouseenter', function () {
      if (b.classList.contains('popped')) return;
      b.classList.add('popped');
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
      if (window.SFX) SFX.bubble ? SFX.bubble() : SFX.move();
      b.style.opacity = '0';
      setTimeout(function () { b.remove(); }, 300);
    });
    container.appendChild(b);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && window.AOXSound) { AOXSound.stopBGM(); }
  });
  window.addEventListener('pagehide', function () {
    if (window.AOXSound) { AOXSound.stopBGM(); }
  });
  window.addEventListener('beforeunload', function () {
    if (window.AOXSound) { AOXSound.stopBGM(); }
  });

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

  function initMobileMenu() {
    var nav = document.querySelector('.topbar nav');
    if (!nav) return;
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
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        btn.innerHTML = '☰';
      });
    });
    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('open')) return;
      if (e.target === btn || nav.contains(e.target)) return;
      nav.classList.remove('open');
      btn.innerHTML = '☰';
    });
  }

  function initTouchDetect() {
    if (window.AOXMobile && window.AOXMobile.isTouch) {
      document.body.classList.add('mc-touch-device');
    }
  }

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

  var GAME_DB = [
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
    {n:'骰子猜大小',f:'dice.html',c:'博弈竞猜',k:'骰子 猜大小 押注 赌博'},
    {n:'老虎机',f:'slots.html',c:'博弈竞猜',k:'老虎机 拉霸 转轮 赌'},
    {n:'赛马竞猜',f:'horserace.html',c:'博弈竞猜',k:'赛马 押注 马 竞速'},
    {n:'植物大战僵尸',f:'pvz.html',c:'策略对战',k:'植物 僵尸 塔防 阳光 豌豆'},
    {n:'五子棋',f:'gomoku.html',c:'策略对战',k:'五子棋 棋 连珠 人机 对弈'},
    {n:'像素画板',f:'pixel.html',c:'创造休闲',k:'像素 画板 涂色 画画 创作'},
    {n:'汉堡大师',f:'burger.html',c:'创造休闲',k:'汉堡 叠层 记忆 食物'},
    {n:'音乐工作站',f:'music.html',c:'创造休闲',k:'音乐 作曲 编曲 歌 歌曲 播放 编辑 导入 导出'},
    {n:'打字练习',f:'practice.html',c:'文字',k:'打字 练习 键盘 指法 入门'},
    {n:'打字大作战',f:'typing.html',c:'文字',k:'打字 大作战 单词 速度'},
    {n:'连连看',f:'linkup.html',c:'文字',k:'连连看 配对 消除 连线'},
    {n:'投篮挑战',f:'basketball.html',c:'体育运动',k:'篮球 投篮 篮筐 射篮 弹弓 物理'},
    {n:'点球大战',f:'soccer.html',c:'体育运动',k:'足球 点球 射门 门将 扑救 世界杯'},
    {n:'射箭',f:'archery.html',c:'体育运动',k:'射箭 弓箭 靶心 瞄准 拉弓 箭术'},
    {n:'赛车躲避',f:'racer.html',c:'赛车竞速',k:'赛车 跑车 躲避 金币 三车道 公路'},
    {n:'像素跑酷',f:'parkour.html',c:'赛车竞速',k:'跑酷 跳跃 滑行 障碍 自动跑 横版'},
    {n:'漂移过弯',f:'drift.html',c:'赛车竞速',k:'漂移 赛车 过弯 赛道 圈速 俯视 椭圆'},
    {n:'踩乌龟',f:'m-stomp.html',c:'马里奥',k:'踩乌龟 跳跃 反弹 龟壳 连击'},
    {n:'库巴Boss战',f:'m-bowser.html',c:'马里奥',k:'库巴 boss 决战 火球 砸桥 三阶段'},
    {n:'牧羊回家',f:'mc-sheep.html',c:'我的世界',k:'牧羊 羊 羊圈 狼 赶羊 mc'},
    {n:'射箭场',f:'mc-archery.html',c:'我的世界',k:'射箭 弓箭 靶心 mc 瞄准 拉弓'},
    {n:'太空陨石',f:'asteroids.html',c:'动作射击',k:'太空 陨石 小行星 飞船 360度 分裂'},
    {n:'直升机洞穴',f:'copter.html',c:'动作射击',k:'直升机 洞穴 障碍 上升 下落'},
    {n:'炸弹人',f:'bomber.html',c:'动作射击',k:'炸弹人 放炸弹 炸墙 炸敌 道具'},
    {n:'涂色大作战',f:'paintwar.html',c:'动作射击',k:'涂色 抢地盘 滚动 涂色 对战 ai'},
    {n:'暗夜城堡AI队友',f:'pf-castle.html',c:'动作射击',k:'联机 ai队友 城堡 钥匙 闯关 跳跃'},
    {n:'机械工厂AI队友',f:'pf-factory.html',c:'动作射击',k:'联机 ai队友 工厂 齿轮 激光 闯关'},
    {n:'弹幕躲避',f:'dodge.html',c:'动作射击',k:'弹幕 躲避 光球 螺旋 追踪 扇形 存活'},
    {n:'贪吃蛇大乱斗',f:'snake-arena.html',c:'动作射击',k:'蛇 乱斗 ai 抢地盘 击杀 淘汰'},
    {n:'坚果保龄球',f:'wallnut-bowl.html',c:'动作射击',k:'pvz 坚果 保龄球 瞄准 蓄力 僵尸'},
    {n:'小鬼飞人',f:'imp-fling.html',c:'动作射击',k:'pvz 小鬼 弹弓 飞人 物理 风力'},
    {n:'僵尸围城',f:'zombie-siege.html',c:'动作射击',k:'pvz 圆形战场 围攻 豌豆 360度 升级'},
    {n:'植物融合版',f:'pvz-fusion.html',c:'动作射击',k:'pvz 植物 融合 每日 合体 配方 阳光'},
    {n:'火箭升空',f:'rocket.html',c:'动作射击',k:'火箭 升空 躲障碍 燃料 收集 飞高'},
    {n:'流星雨',f:'meteor.html',c:'动作射击',k:'流星 接流星 篮子 金星 钻石 炸弹'},
    {n:'极限跳跃',f:'jump.html',c:'动作射击',k:'跳跃 doodle 攀爬 平台 弹簧 向上'},
    {n:'刀盾狗进化战',f:'daodun-dog.html',c:'动作射击',k:'刀盾狗 进化 熔岩 形态 搞笑'},
    {n:'汉诺塔',f:'hanoi.html',c:'益智逻辑',k:'汉诺塔 递归 圆盘 谜题 移动'},
    {n:'点灯关灯',f:'lights.html',c:'益智逻辑',k:'点灯 lights out 翻转 熄灯 益智'},
    {n:'地牢探险',f:'dungeon1.html',c:'益智逻辑',k:'地牢 迷宫 钥匙 开门 宝藏 怪物'},
    {n:'颜色反应',f:'color.html',c:'益智逻辑',k:'stroop 颜色 反应 干扰 限时'},
    {n:'记忆配对',f:'flip.html',c:'益智逻辑',k:'翻牌 记忆 配对 翻转 配对'},
    {n:'记忆大师',f:'say.html',c:'益智逻辑',k:'simon 记忆 亮灯 复现 颜色 节奏'},
    {n:'方块堆叠',f:'stack.html',c:'益智逻辑',k:'堆叠 高塔 对齐 时机 错位'},
    {n:'青蛙过马路',f:'frog.html',c:'经典街机',k:'青蛙 frogger 过马路 河流 荷叶 车辆'},
    {n:'颠球挑战',f:'paddle.html',c:'经典街机',k:'颠球 球拍 不落地 连击 越来越快'},
    {n:'接金币跑酷',f:'runner.html',c:'经典街机',k:'跑酷 接金币 跳跃 二段跳 障碍'},
    {n:'MC跑酷',f:'mcparkour.html',c:'经典街机',k:'mc minecraft 跑酷 跳跃 方块 岩浆'},
    {n:'猜拳对决',f:'rps.html',c:'博弈竞猜',k:'猜拳 石头剪刀布 ai 学习 对战'},
    {n:'幸运转盘',f:'wheel.html',c:'博弈竞猜',k:'转盘 幸运 轮盘 赔率 押注 金币'},
    {n:'植物21点',f:'pvz-21.html',c:'博弈竞猜',k:'pvz 21点 黑杰 僵尸 阳光 押注'},
    {n:'黑白棋',f:'reversi.html',c:'策略对战',k:'黑白棋 奥赛罗 reversi 翻面 夹击 人机'},
    {n:'国际跳棋',f:'checkers.html',c:'策略对战',k:'跳棋 checkers 跳吃 王棋 强制吃子'},
    {n:'塔防守护',f:'towerdef.html',c:'策略对战',k:'塔防 守护 建塔 升级 多波次 敌人'},
    {n:'植物决斗',f:'pvz-duel.html',c:'策略对战',k:'pvz 决斗 回合 英雄 僵尸王 蓄能 必杀'},
    {n:'像素钢琴',f:'piano.html',c:'创造休闲',k:'钢琴 弹琴 键盘 和弦 录制 回放 曲目'},
    {n:'像素换装',f:'dressup.html',c:'创造休闲',k:'换装 像素 发型 衣服 配饰 搭配'},
    {n:'游戏制作工坊',f:'game-maker.html',c:'创造休闲',k:'工坊 制作 生成 ai 智能体 试玩'},
    {n:'游戏仓库',f:'game-vault.html',c:'创造休闲',k:'仓库 存游戏 加载 导出 工坊'},
    {n:'3D方块沙盒',f:'sandbox3d.html',c:'创造休闲',k:'3d 沙盒 建造 创造 放置 破坏 飞行'},
    {n:'音乐仓库',f:'music-vault.html',c:'创造休闲',k:'音乐 仓库 歌曲 导入 导出 存储 mp3'},
    {n:'猜单词',f:'hangman.html',c:'文字',k:'猜单词 hangman 吊死鬼 英文 提示'},
    {n:'字母重组',f:'anagram.html',c:'文字',k:'字母 重组 anagram 打乱 拼词 限时'},
    {n:'暗黑纪元史诗',f:'epic2.html',c:'动作射击',k:'史诗 暗黑 boss 任务榜 英雄 传送'},
    {n:'神域之战史诗',f:'epic3.html',c:'动作射击',k:'史诗 神域 boss 任务榜 英雄 传送'},
    {n:'末日觉醒史诗',f:'epic4.html',c:'动作射击',k:'史诗 末日 boss 任务榜 英雄 传送'},
    {n:'龙族传说史诗',f:'epic5.html',c:'动作射击',k:'史诗 龙族 boss 任务榜 英雄 传送'},
    {n:'魔界入侵史诗',f:'epic6.html',c:'动作射击',k:'史诗 魔界 boss 任务榜 英雄 传送'},
    {n:'时间裂隙史诗',f:'epic7.html',c:'动作射击',k:'史诗 时间 boss 任务榜 英雄 传送'},
    {n:'元素战争史诗',f:'epic8.html',c:'动作射击',k:'史诗 元素 boss 任务榜 英雄 传送'},
    {n:'幽灵舰队史诗',f:'epic9.html',c:'动作射击',k:'史诗 幽灵 boss 任务榜 英雄 传送'},
    {n:'地下帝国史诗',f:'epic10.html',c:'动作射击',k:'史诗 地下 boss 任务榜 英雄 传送'},
    {n:'星辰大海史诗',f:'epic11.html',c:'动作射击',k:'史诗 星辰 boss 任务榜 英雄 传送'},
    {n:'记忆节奏',f:'simonsays.html',c:'益智逻辑',k:'记忆 simon 节奏 四色 复现 顺序'},
    {n:'打地鼠',f:'whackmole.html',c:'经典街机',k:'打地鼠 锤子 金鼠 炸弹 连击 60秒'},
    {n:'平衡球迷宫',f:'balanceball.html',c:'益智逻辑',k:'平衡球 迷宫 倾斜 重力 球 洞 金币'},
    {n:'堡垒大战',f:'fortress.html',c:'动作射击',k:'堡垒 5v5 团队 射击 奖杯 重生 冲锋枪 狙击 双堡垒 对战'},
    {n:'军团攻城战',f:'legion.html',c:'策略对战',k:'军团 攻城 炮塔 招兵 小兵 基地 大招 升级'},
    {n:'猫狗喂食记',f:'petgame.html',c:'创造休闲',k:'猫 狗 喂食 宠物 接住 美食 鱼 骨头 炸弹 开心'},
    {n:'军团攻城战2',f:'legion2.html',c:'策略对战',k:'军团 攻城 多地图 地图 草原 峡谷 冰湖 熔岩 1v1 2v2 3v3 人数 炮塔'},
    {n:'军团攻城战3',f:'legion3.html',c:'策略对战',k:'军团 英雄 技能 隐身 升级 奖金 拆塔 主城 无尽防守 8英雄'},
    {n:'军团联机战',f:'legion-online.html',c:'策略对战',k:'联机 多人 对战 peerjs 房间 搜索 好友 军团 英雄 实时'},
    {n:'军团攻城战4',f:'legion4.html',c:'策略对战',k:'军团 王者 佣兵 双升级 龙骑士 霜法师 绿洲 圣泉 回血 奖金'},
    {n:'贪吃蛇进化版',f:'snake-evo.html',c:'经典街机',k:'进化 贪吃蛇 食物 冲刺 连击 障碍 穿身 双倍'},
    {n:'打砖块进化版',f:'breakout-evo.html',c:'动作射击',k:'进化 打砖块 道具 激光 穿透 boss 爆炸 治疗'},
    {n:'记忆翻牌进化版',f:'memory-evo.html',c:'益智逻辑',k:'进化 记忆 翻牌 万能牌 炸弹 时钟 偷看 洗牌 星级'}
  ];

  function initAssistant() {
    if (document.querySelector('.ai-assistant')) return;
    var path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (path !== '' && path !== 'index.html') return;
    var fab = document.createElement('div');
    fab.className = 'ai-fab';
    fab.innerHTML = '🤖';
    fab.title = '智能助手';
    document.body.appendChild(fab);

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
        addMsg('👋 你好！我是 AoXuan 网站助手。<br>这里有 <b>165 个游戏</b>，告诉我你想玩什么类型，我帮你找！<br><br>你可以问：<br>• "想玩射击游戏"<br>• "有马里奥吗"<br>• "手机能玩吗"<br>• "推荐个益智的"<br>• "贪吃蛇在哪"<br>• "赛车/体育游戏"');
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

    function search(query) {
      query = query.toLowerCase().trim();
      if (!query) return [];
      var results = [];
      GAME_DB.forEach(function(g) {
        var hay = (g.n + ' ' + g.c + ' ' + g.k).toLowerCase();
        var score = 0;
        if (g.n.toLowerCase().indexOf(query) >= 0) score += 10;
        query.split(/\s+/).forEach(function(q) {
          if (q && hay.indexOf(q) >= 0) score += 3;
        });
        if (score > 0) results.push({ g: g, score: score });
      });
      results.sort(function(a, b) { return b.score - a.score; });
      return results.slice(0, 6).map(function(r) { return r.g; });
    }

    function answer(query) {
      var q = query.toLowerCase().trim();

      if (q.indexOf('手机') >= 0 || q.indexOf('触屏') >= 0 || q.indexOf('移动') >= 0) {
        return '📱 所有游戏都支持手机触屏！动作类有虚拟方向键，点击类直接点屏幕。手机打开 <b>zengaoxuan.com</b> 即可玩。';
      }
      if (q.indexOf('你好') >= 0 || q.indexOf('hi') >= 0 || q.indexOf('hello') >= 0) {
        return '👋 你好！想玩什么游戏？告诉我类型或名字就行～';
      }
      if (q.indexOf('有多少') >= 0 || q.indexOf('几个') >= 0 || q.indexOf('多少') >= 0) {
        return '🎮 本站共有 <b>165 个游戏</b>，分 11 大类：马里奥18、我的世界19、动作射击54、益智逻辑23、经典街机21、博弈竞猜7、策略对战9、创造休闲11、文字6、体育运动4、赛车竞速4。';
      }
      if (q.indexOf('分类') >= 0 || q.indexOf('类别') >= 0 || q.indexOf('种类') >= 0) {
        return '📂 11 大分类：<br>🍄 马里奥 · ⛏ 我的世界 · 🎮 动作射击 · 🧠 益智逻辑 · 🕹️ 经典街机 · 🎲 博弈竞猜 · ♟️ 策略对战 · 🎨 创造休闲 · ⌨️ 文字 · ⚽ 体育运动 · 🏁 赛车竞速<br><br>主页可点分类按钮筛选！';
      }
      if (q.indexOf('推荐') >= 0 || q.indexOf('好玩') >= 0 || q.indexOf('玩什么') >= 0) {
        var picks = [GAME_DB[12], GAME_DB[21], GAME_DB[27], GAME_DB[38], GAME_DB[49], GAME_DB[67]];
        return '🔥 热门推荐：<br>' + picks.map(function(g){return '• <a href="'+g.f+'">'+g.n+'</a> ('+g.c+')';}).join('<br>');
      }
      if (q.indexOf('今日') >= 0 || q.indexOf('今天') >= 0 || q.indexOf('推荐') >= 0 || q.indexOf('每日') >= 0) {
        var d=new Date(); var seed=d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
        var pick=GAME_DB[seed%GAME_DB.length];
        return '🎁 <b>今日推荐</b>：<br>'+pick.icon+' <a href="'+pick.f+'"><b>'+pick.n+'</b></a> ('+pick.c+')<br><br>每天都会换一个哦！想换换口味可以说"随机一个"。';
      }
      if (q.indexOf('随机') >= 0 || q.indexOf('运气') >= 0 || q.indexOf('随便') >= 0) {
        var rp=GAME_DB[Math.floor(Math.random()*GAME_DB.length)];
        return '🎲 <b>命运之选</b>：<br>'+rp.icon+' <a href="'+rp.f+'"><b>'+rp.n+'</b></a> ('+rp.c+')<br><br>不喜欢？再跟我说"随机一个"！';
      }
      if (q.indexOf('更新') >= 0 || q.indexOf('新加') >= 0 || q.indexOf('新内容') >= 0 || q.indexOf('新版') >= 0) {
        return '📢 <b>最近更新</b>：<br>• 08-11 新增体育/赛车类6个游戏<br>• 08-10 pvz融合版每日植物系统(25种轮换)<br>• 08-10 首页封面美化<br>• 08-09 补全158个游戏全部收录<br><br>我会持续加新内容！';
      }
      if (q.indexOf('玩过') >= 0 || q.indexOf('历史') >= 0 || q.indexOf('记录') >= 0) {
        return '🕒 最近玩过的游戏记录在首页"最近玩过"板块（localStorage 本地保存，最多8个）。每玩一个新游戏会自动记到最前面。<br>清记录可在浏览器清除 localStorage。';
      }
      if (q.indexOf('体育') >= 0 || q.indexOf('运动') >= 0 || q.indexOf('篮球') >= 0 || q.indexOf('足球') >= 0 || q.indexOf('射箭') >= 0) {
        return '⚽ 体育运动类（共3个）：<br>• <a href="basketball.html">🏀 投篮挑战</a> 拖球投篮，60秒挑战<br>• <a href="soccer.html">⚽ 点球大战</a> 选方向力度射门<br>• <a href="archery.html">🏹 射箭</a> 拉弓射移动靶心';
      }
      if (q.indexOf('堡垒') >= 0 || q.indexOf('5v5') >= 0 || q.indexOf('5打5') >= 0 || (q.indexOf('团队') >= 0 && q.indexOf('射击') >= 0) || q.indexOf('奖杯') >= 0) {
        return '🏰 <b>堡垒大战</b>（5v5团队射击）：<br>• 选橙队🟠或紫队🟣（你在的队共5人）<br>• 选冲锋枪🔫（快射）或狙击枪🎯（高伤穿透）<br>• 目标：抢敌方奖杯带回自己基地！<br>• 无限子弹，阵亡3秒在基地重生<br>• 手机双摇杆+开火键，电脑WASD+鼠标<br>• 程序化战斗BGM<br><br><a href="fortress.html">▶ 开始堡垒大战</a>';
      }
      if (q.indexOf('赛车') >= 0 || q.indexOf('竞速') >= 0 || q.indexOf('跑车') >= 0 || q.indexOf('跑酷') >= 0 || q.indexOf('漂移') >= 0) {
        return '🏁 赛车竞速类（共3个）：<br>• <a href="racer.html">🏎️ 赛车躲避</a> 三车道躲车收金币<br>• <a href="parkour.html">🏃 像素跑酷</a> 跳跃滑行越跑越快<br>• <a href="drift.html">🏎️ 漂移过弯</a> 椭圆赛道漂移跑3圈';
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

      var results = search(q);
      if (results.length > 0) {
        if (results.length === 1) {
          return '🎯 找到了！<br><a class="ai-game-link" href="' + results[0].f + '"><b>' + results[0].n + '</b></a><br>分类：' + results[0].c + '<br>点击直接玩！';
        }
        return '🎯 找到 ' + results.length + ' 个相关游戏：<br>' +
          results.map(function(g){return '• <a href="'+g.f+'">'+g.n+'</a> ('+g.c+')';}).join('<br>');
      }

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

  var PET_TYPES = {
    dog:     { n: '狗狗',   i: '🐶', d: '忠诚干饭，永远热情！' },
    cat:     { n: '猫猫',   i: '🐱', d: '高冷傲娇，偶尔翻肚皮。' },
    hamster: { n: '仓鼠',   i: '🐹', d: '腮帮子能塞下全世界！' },
    bird:    { n: '鹦鹉',   i: '🦜', d: '会说"菜就多练"的嘴替。' }
  };
  var AI_NAMES = ['菜就多练','苟到最后','隔壁老王','奶龙冲鸭','欧皇本皇','非酋酋长','满血拉扯','白给之王','挂机选手','手残党魁','闪避拉满','一刀9999','干饭第一名','熬夜冠军','潜水群主','摸鱼大师','补刀小王子','卖队友的','野王带飞','抽象派大师'];

  function sget(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function sset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var Site = {
    PET_MAX: 10, // 宠物满级
    pet: function () { return sget('pet_v2', null); },
    petIsMax: function () { var p = Site.pet(); return !!p && p.level >= Site.PET_MAX; },
    petSave: function (p) { sset('pet_v2', p); Site.hud(); },
    petNeed: function (p) { p = p || Site.pet(); return p ? p.level * 10 : 10; },
    petFeed: function (n) {
      var p = Site.pet(); if (!p) return { ok: false, msg: '还没有宠物' };
      var e = Site.energy(); if (e < n) return { ok: false, msg: '🍫不够！先去赢几局赚巧克力' };
      Site.energySet(e - n);
      p.fed += n; var ups = 0;
      while (p.fed >= p.level * 10) { p.fed = 0; p.level++; ups++; } // 升级后饼干数归零
      Site.petSave(p);
      if (ups > 0) { toast(PET_TYPES[p.type].i + ' 升到 Lv.' + p.level + '！解锁更多漂浮 goodies✨'); if (window.SFX) SFX.levelUp(); }
      else { toast(PET_TYPES[p.type].i + ' 吃得好开心！(+' + n + '/' + (p.level * 10 - p.fed) + ' 到升级)'); if (window.SFX) SFX.coin(); }
      return { ok: true, ups: ups };
    },
    petLikeUp: function () { // 点赞奖励：宠物直接升一级
      var p = Site.pet(); if (!p) return;
      p.level++; p.fed = 0; Site.petSave(p);
      toast('❤️ 点赞之力！' + PET_TYPES[p.type].i + ' 直接升到 Lv.' + p.level + '！');
      if (window.SFX) SFX.levelUp();
    },
    petBubbles: function () { // 按等级解锁的漂浮物
      var p = Site.pet(); if (!p) return [];
      var b = []; if (p.level >= 2) b.push('🍭'); if (p.level >= 3) b.push('🧁');
      if (p.level >= 4) b.push('🎂'); if (p.level >= 5) b.push('🌈');
      if (p.level >= 7) b.push('🪄'); if (p.level >= 10) b.push('👑');
      return b;
    },
    adopt: function (type) {
      var p = { type: type, level: 1, fed: 0, born: Date.now() };
      Site.petSave(p);
      var e = Site.energy(); Site.energySet(e + 5);
      toast(PET_TYPES[type].i + ' 加入队伍！送 5 块巧克力当见面礼🍫');
      if (window.SFX) SFX.win();
      var m = document.getElementById('sitePetModal'); if (m) m.remove();
      Site.hud();
    },
    petChooseModal: function () {
      if (document.getElementById('sitePetModal')) return;
      var m = document.createElement('div'); m.id = 'sitePetModal';
      m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:inherit';
      var cards = Object.keys(PET_TYPES).map(function (k) {
        var t = PET_TYPES[k];
        return '<button data-pet="' + k + '" style="cursor:pointer;background:#1c2f4a;border:3px solid #000;box-shadow:inset -3px -3px 0 #0006,inset 3px 3px 0 #fff2;padding:18px 14px;width:150px;color:#fff">' +
          '<div style="font-size:52px">' + t.i + '</div><div style="font-weight:bold;font-size:16px;margin:6px 0">' + t.n + '</div>' +
          '<div style="font-size:11px;color:#9ab;line-height:1.5">' + t.d + '</div></button>';
      }).join('');
      m.innerHTML = '<div style="background:#0d1b2a;border:3px solid #ffd700;padding:26px 30px;max-width:660px;text-align:center;color:#fff;box-shadow:0 0 40px #000">' +
        '<h2 style="color:#ffd700;margin:0 0 6px">🐣 领养你的宠物！</h2>' +
        '<p style="color:#9ab;font-size:13px;margin:0 0 18px">赢游戏赚🍫巧克力喂它 · 每 ' + '' + '10×等级 块升一级 · 升级解锁漂浮 goodies</p>' +
        '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">' + cards + '</div></div>';
      document.body.appendChild(m);
      m.querySelectorAll('[data-pet]').forEach(function (b) {
        b.onmouseenter = function () { if (window.SFX) SFX.select(); };
        b.onclick = function () { Site.adopt(b.dataset.pet); };
      });
    },

    energy: function () { return sget('choco_energy', 10); },
    energySet: function (v) { sset('choco_energy', Math.max(0, v)); Site.hud(); },
    spend: function (n) {
      var e = Site.energy();
      if (e < n) { Site.noEnergyModal(); return false; }
      Site.energySet(e - n);
      if (window.SFX) SFX.coin();
      return true;
    },
    gain: function (n, why) {
      Site.energySet(Site.energy() + n);
      if (window.SFX) SFX.win();
      toast('🍫 +' + n + ' 巧克力能量！' + (why || ''));
    },
    noEnergyModal: function () {
      if (document.getElementById('siteNoEnergy')) return;
      var m = document.createElement('div'); m.id = 'siteNoEnergy';
      m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.78);z-index:9999;display:flex;align-items:center;justify-content:center';
      m.innerHTML = '<div style="background:#0d1b2a;border:3px solid #e53935;padding:24px 30px;max-width:420px;text-align:center;color:#fff">' +
        '<div style="font-size:46px">🍫😵</div><h2 style="color:#ff8fa3;margin:8px 0">巧克力不够了！</h2>' +
        '<p style="font-size:13px;color:#9ab">每局游戏要 1 🍫。通关 +3、失败 +1。<br>也可以...看看宠物卖萌？</p>' +
        '<div style="display:flex;gap:10px;justify-content:center;margin-top:14px">' +
        '<button id="neCute" style="cursor:pointer;background:#7c4dff;color:#fff;border:2px solid #000;padding:9px 16px;font-weight:bold">🐣 宠物卖萌 +2</button>' +
        '<button id="neClose" style="cursor:pointer;background:#37474f;color:#fff;border:2px solid #000;padding:9px 16px">等下再说</button></div></div>';
      document.body.appendChild(m);
      document.getElementById('neClose').onclick = function () { m.remove(); };
      document.getElementById('neCute').onclick = function () {
        var last = sget('pet_cute_ts', 0);
        if (Date.now() - last < 60000) { toast('宠物累啦，休息一下再来 (1分钟冷却)'); return; }
        sset('pet_cute_ts', Date.now());
        var p = Site.pet();
        Site.energySet(Site.energy() + 2); m.remove();
        toast((p ? PET_TYPES[p.type].i : '🐣') + ' 卖了个萌，+2 🍫！');
        if (window.SFX) SFX.heal();
      };
    },

    played: function (f) {
      var all = sget('played_counts', {});
      if (!all[f]) { var h = 0; for (var i = 0; i < f.length; i++) h = (h * 31 + f.charCodeAt(i)) & 0xffff; all[f] = 50 + h % 300; } // 假基数
      return all[f];
    },
    playIncr: function (f) {
      var all = sget('played_counts', {}); all[f] = (all[f] || Site.played(f)) + 1; sset('played_counts', all);
      Site.hud();
    },

    aiRoll: function () {
      var r = Math.random(), enemy = null, ally = null;
      if (r < 0.30) enemy = { name: AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)], skill: 0.55 + Math.random() * 0.75 };
      if (Math.random() < 0.25) ally = { name: AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)] };
      if (enemy && ally && enemy.name === ally.name) ally.name = AI_NAMES[(AI_NAMES.indexOf(ally.name) + 7) % AI_NAMES.length];
      return { enemy: enemy, ally: ally };
    },
    beginGame: function (gameName, opts, cb) {
      opts = opts || {};
      if (!Site.spend(1)) return; // 能量不足会弹补给窗
      var f = location.pathname.split('/').pop() || 'index.html';
      Site.playIncr(f);
      var ai = Site.aiRoll();
      var m = document.createElement('div'); m.id = 'siteReport';
      m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:9998;display:flex;align-items:center;justify-content:center';
      var eRow = ai.enemy
        ? '<div style="color:#ff8fa3;font-size:15px;margin:7px 0">⚠️ <b>发现敌方AI玩家</b>：<span style="color:#fff">[' + ai.enemy.name + ']</span> 实力 ' + (ai.enemy.skill >= 1.05 ? '💪强悍' : ai.enemy.skill >= 0.8 ? '⚖️势均力敌' : '🐟菜但自信') + '</div>'
        : '<div style="color:#80cbc4;font-size:15px;margin:7px 0">✅ 无敌方AI玩家出没</div>';
      var aRow = ai.ally
        ? '<div style="color:#a5d6a7;font-size:15px;margin:7px 0">🤝 <b>AI队友加入你</b>：<span style="color:#fff">[' + ai.ally.name + ']</span></div>'
        : '<div style="color:#78909c;font-size:15px;margin:7px 0">👤 单人行动中</div>';
      var duoBtn = opts.duo ? '<button id="rpDuo" style="cursor:pointer;background:#7c4dff;color:#fff;border:2px solid #000;padding:11px 18px;font-weight:bold">🎮 邀请双人(同屏)</button>' : '';
      m.innerHTML = '<div style="background:#0d1b2a;border:3px solid #ffd700;padding:24px 32px;min-width:330px;max-width:480px;color:#fff;text-align:center;box-shadow:0 0 50px #000">' +
        '<div style="font-size:13px;color:#ffd700;letter-spacing:3px">— 作战简报 —</div>' +
        '<h2 style="margin:8px 0 4px;font-size:22px">🎮 ' + gameName + '</h2>' +
        '<div style="border-top:1px dashed #37474f;margin:10px 0;padding-top:10px;text-align:left">' + eRow + aRow +
        '<div style="color:#9ab;font-size:12px;margin-top:8px">本局消耗 1 🍫 · 通关 +3 / 失败 +1</div></div>' +
        '<div style="display:flex;gap:10px;justify-content:center;margin-top:12px">' + duoBtn +
        '<button id="rpGo" style="cursor:pointer;background:#43a047;color:#fff;border:2px solid #000;padding:11px 22px;font-weight:bold">⚔ 开始！</button></div></div>';
      document.body.appendChild(m);
      var duo = false;
      var go = function () { m.remove(); if (window.SFX) SFX.unlock(); cb({ duo: duo, enemy: ai.enemy, ally: ai.ally }); };
      var gb = document.getElementById('rpGo'); if (gb) gb.onclick = go;
      var db = document.getElementById('rpDuo');
      if (db) db.onclick = function () { duo = true; db.textContent = '✅ 双人已就位'; db.disabled = true; db.style.opacity = .7; if (window.SFX) SFX.select(); };
    },
    winGame: function (scoreTxt) { Site.gain(3, scoreTxt ? '(' + scoreTxt + ')' : '通关奖励'); },
    loseGame: function () { Site.gain(1, '安慰奖，再来！'); },
    aiScore: function (myScore, fmt) { // 与敌AI比分数，返回 true=赢过AI
      var last = window.__siteLastAI; if (!last || !last.enemy) return null;
      var aiS = Math.round(myScore * (2 - last.enemy.skill)); // skill高→AI分低门槛高
      var win = myScore > aiS * 0.6 && myScore >= aiS - Math.max(2, aiS * 0.1);
      toast(win ? '🏆 你赢了AI玩家[' + last.enemy.name + ']！(你 ' + myScore + ' vs ' + aiS + ')' : '💪 AI[' + last.enemy.name + '] 这次更快 (' + myScore + ' vs ' + aiS + ')');
      return win;
    },

    hud: function () {
      var h = document.getElementById('siteHud');
      if (!h) {
        h = document.createElement('div'); h.id = 'siteHud';
        h.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:9997;display:flex;gap:8px;align-items:center;font-family:inherit';
        document.body.appendChild(h);
      }
      var p = Site.pet(), e = Site.energy();
      var petHtml;
      if (p) {
        var need = p.level * 10, pct = Math.round(p.fed / need * 100);
        petHtml = '<div style="background:#0d1b2acc;border:2px solid #000;box-shadow:0 3px 0 #000;padding:6px 10px;color:#fff;font-size:12px;text-align:center;cursor:pointer" id="hudPet">' +
          '<div style="font-size:20px;line-height:1">' + PET_TYPES[p.type].i + '</div>' +
          '<div style="color:#ffd700;font-weight:bold">Lv.' + p.level + '</div>' +
          '<div style="width:52px;height:5px;background:#000;margin:3px auto;border:1px solid #000"><div style="height:100%;width:' + pct + '%;background:#4caf50"></div></div></div>';
      } else {
        petHtml = '<div style="background:#0d1b2acc;border:2px solid #ffd700;box-shadow:0 3px 0 #000;padding:8px 12px;color:#fff;font-size:12px;cursor:pointer" id="hudPet">🐣 点我<br>领养宠物</div>';
      }
      h.innerHTML = petHtml +
        '<div style="background:#0d1b2acc;border:2px solid #000;box-shadow:0 3px 0 #000;padding:6px 12px;color:#fff;font-size:13px">🍫 <b style="color:#ffd700">' + e + '</b></div>';
      var hp = document.getElementById('hudPet');
      if (hp) hp.onclick = function () {
        var p2 = Site.pet();
        if (!p2) { Site.petChooseModal(); return; }
        var e2 = Site.energy(), need2 = p2.level * 10;
        var m = document.createElement('div'); m.id = 'siteFeed';
        m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center';
        m.innerHTML = '<div style="background:#0d1b2a;border:3px solid #ffd700;padding:22px 28px;color:#fff;text-align:center;min-width:300px">' +
          '<div style="font-size:56px">' + PET_TYPES[p2.type].i + '</div>' +
          '<h3 style="margin:4px 0;color:#ffd700">' + PET_TYPES[p2.type].n + ' · Lv.' + p2.level + '</h3>' +
          '<div style="font-size:12px;color:#9ab;margin-bottom:10px">吃饱度：' + p2.fed + ' / ' + need2 + ' 块</div>' +
          '<div style="width:100%;height:10px;background:#000;border:2px solid #000;margin-bottom:14px"><div style="height:100%;width:' + Math.min(100, Math.round(p2.fed / need2 * 100)) + '%;background:linear-gradient(90deg,#4caf50,#ffd700)"></div></div>' +
          '<div style="color:#9ab;font-size:12px;margin-bottom:12px">库存 🍫×' + e2 + ' · 喂食=花巧克力 · 升级解锁新漂浮物</div>' +
          '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">' +
          '<button data-n="1" style="cursor:pointer;background:#43a047;color:#fff;border:2px solid #000;padding:9px 14px;font-weight:bold">喂1块</button>' +
          '<button data-n="5" style="cursor:pointer;background:#2e7d32;color:#fff;border:2px solid #000;padding:9px 14px;font-weight:bold">喂5块</button>' +
          '<button data-x style="cursor:pointer;background:#37474f;color:#fff;border:2px solid #000;padding:9px 14px">关闭</button></div></div>';
        document.body.appendChild(m);
        m.querySelector('[data-x]').onclick = function () { m.remove(); };
        m.querySelectorAll('[data-n]').forEach(function (b) {
          b.onclick = function () { Site.petFeed(+b.dataset.n); m.remove(); };
        });
      };
    }
  };
  window.Site = Site;
  window.__siteLastAI = null;

  Site.WALL_SEED = [
    { n: '矿工老李', t: '这网站的钻石真难挖，但我挖了一整晚...', d: '2023-11-08' },
    { n: '跳棋被虐', t: '输给了AI[苟到最后]，它是不是开挂了？', d: '2024-02-14' },
    { n: '像素鸟烈士', t: '第37次撞柱子，我严重怀疑我的鸟近视。', d: '2024-05-21' },
    { n: '巧克力依赖者', t: '巧克力经济学：通关+3失败+1，玩得多就稳赚！', d: '2024-08-02' },
    { n: '仓鼠腮帮子', t: '仓鼠Lv6了，气泡里飘的蛋糕也太可爱了8', d: '2024-12-19' },
    { n: '夜跑者', t: '断网恐龙跑出1123米，给Chrome上香。', d: '2025-03-30' },
    { n: '合成西瓜失败者', t: '合成了99个橘子，就是没有西瓜，我错了吗', d: '2025-06-11' },
    { n: '军团指挥官', t: '军团4商店全部进化后，Boss像纸糊的一样蒸发', d: '2025-09-27' },
    { n: '留言墙钉子户', t: '在此留个爪印✋，十年后回来看看还在不在', d: '2026-01-15' },
    { n: '星穹开拓者', t: '听说把宠物喂到满级的指挥官，能在某个尽头看见银河……', d: '2026-05-06' }
  ];
  Site.wallList = function () {
    var mine = sget('wall_posts', []);
    return mine.concat(Site.WALL_SEED);
  };
  Site.wallPost = function (n, t) {
    if (!t || !t.trim()) return false;
    var mine = sget('wall_posts', []);
    mine.unshift({ n: (n || '匿名玩家').slice(0, 12), t: t.trim().slice(0, 120), d: new Date().toLocaleDateString('zh-CN') });
    if (mine.length > 60) mine.length = 60;
    sset('wall_posts', mine);
    return true;
  };

  Site.visitLog = function () {
    var v = sget('visit_stats', { first: Date.now(), count: 0, days: {}, logs: [] });
    v.count++;
    var day = new Date().toLocaleDateString('zh-CN');
    v.days[day] = (v.days[day] || 0) + 1;
    v.logs.unshift({ t: Date.now(), path: location.pathname.split('/').pop() || 'index.html' });
    if (v.logs.length > 80) v.logs.length = 80;
    sset('visit_stats', v);
    return v;
  };
  Site.visitStats = function () {
    var v = sget('visit_stats', { first: Date.now(), count: 0, days: {}, logs: [] });
    var day = new Date().toLocaleDateString('zh-CN');
    var played = sget('played_counts', {});
    var top = Object.keys(played).map(function (k) { return { g: k, n: played[k] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 5);
    return { v: v, today: v.days[day] || 0, top: top, totalPlays: Object.keys(played).reduce(function (s, k) { return s + played[k]; }, 0) };
  };
  var _bg = Site.beginGame;
  Site.beginGame = function (g, o, c) { _bg(g, o, function (info) { window.__siteLastAI = info; c(info); }); };

  function initPetLikes() {
    document.querySelectorAll('.game-card').forEach(function (card) {
      var info = card.querySelector('.info');
      if (!info || card.querySelector('.play-cnt')) return;
      var href = card.getAttribute('href') || '';
      var cnt = document.createElement('div');
      cnt.className = 'play-cnt';
      cnt.style.cssText = 'margin-top:4px;font-size:11px;color:#78909c';
      cnt.textContent = '👥 ' + Site.played(href) + ' 人玩过';
      info.appendChild(cnt);
    });
  }
  document.addEventListener('click', function (ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest('.like-btn') : null;
    if (btn && !btn.classList.contains('liked')) {
      setTimeout(function () { if (btn.classList.contains('liked')) Site.petLikeUp(); }, 50);
    }
    var tot = ev.target && ev.target.closest ? ev.target.closest('#totalLikeBtn') : null;
    if (tot && !tot.classList.contains('liked')) {
      setTimeout(function () { if (tot.classList.contains('liked')) { var p = Site.pet(); if (p) { p.fed += 5; Site.petSave(p); toast('网站点赞！宠物获得 5 块小饼干🍪'); } } }, 50);
    }
  }, true);

  var _sob = spawnOneBubble;
  spawnOneBubble = function (container, colors) {
    var goodies = Site.petBubbles();
    if (goodies.length && Math.random() < 0.35) {
      var s = document.createElement('span');
      s.textContent = goodies[Math.floor(Math.random() * goodies.length)];
      s.style.cssText = 'position:absolute;font-size:' + (18 + Math.random() * 18) + 'px;left:' + (Math.random() * 96) + '%;bottom:-40px;pointer-events:none;opacity:.85;animation:floatUp ' + (14 + Math.random() * 14) + 's linear infinite;z-index:0;text-shadow:0 2px 4px #0008';
      container.appendChild(s);
      setTimeout(function () { s.remove(); }, 30000);
      return;
    }
    _sob(container, colors);
  };

  Site.HIDDEN_GAMES = [
    { f: 'hsr.html', n: '星穹开拓·Q萌版', i: '🌌' },
    { f: 'genshin.html', n: '提瓦特Q萌远征', i: '🌪️' },
    { f: 'sheep.html', n: '羊了个羊·萌版', i: '🐑' }
  ];
  function initHiddenZone() {
    if (!Site.petIsMax()) return; // 未满级: 完全不渲染, 一点提示都没有
    document.querySelectorAll('.game-card[data-hidden]').forEach(function (c) { c.style.display = ''; });
    var z = document.createElement('div');
    z.id = 'siteHiddenZone';
    z.style.cssText = 'position:relative;left:0;right:0;bottom:0;text-align:center;padding:26px 0 30px;opacity:.5;z-index:1';
    z.innerHTML = Site.HIDDEN_GAMES.map(function (g) {
      return '<a href="' + g.f + '" title="·" style="text-decoration:none;font-size:20px;margin:0 14px;opacity:.8">' + g.i + '</a>';
    }).join('');
    document.body.appendChild(z);
  }

  function initSiteSystem() {
    Site.hud();
    initPetLikes();
    initHiddenZone();
    try { Site.visitLog(); } catch (e) {}
    if (!Site.pet() && /index\.html?$|\/$|^$/.test(location.pathname.split('/').pop() || 'index.html')) {
      setTimeout(function () { Site.petChooseModal(); }, 800);
    }
  }
  if (document.readyState !== 'loading') { initSiteSystem(); }
  else document.addEventListener('DOMContentLoaded', initSiteSystem);
})();
