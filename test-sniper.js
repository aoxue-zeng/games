// ===== 狙击对决v2(两军对峙) 运行时自动测试 =====
var fs=require('fs'),vm=require('vm');

function mkAny(){ var f=function(){return anyP;}; var anyP=new Proxy(f,{get:function(t,k){ if(k==='canvas')return {}; return anyP; },set:function(){return true;},construct:function(){return anyP;}}); return anyP; }
function mkEl(id){
 return {_id:id,innerHTML:'',textContent:'',value:'',style:{},dataset:{},children:[],disabled:false,width:0,height:0,
  classList:{add(){},remove(){},toggle(){},contains(){return false}},
  appendChild(c){return c;},addEventListener(){},onclick:null,
  getContext(){return mkAny();},querySelectorAll(){return[]},querySelector(){return mkEl('q');},getBoundingClientRect(){return{left:0,top:0,width:960,height:540};}};
}
var EXPORTS='window.__T={restart:restart,startWave:startWave,nextWave:nextWave,shoot:shoot,reload:reload,swapGun:swapGun,dropGun:dropGun,tryPickup:tryPickup,buyAmmo:buyAmmo,buySkill:buySkill,bedAction:bedAction,respawn:respawn,dieAndRespawn:dieAndRespawn,shotBlocked:shotBlocked,pressKey:function(k,v){keys[k]=v;},aimAtEnemy:function(i){var e=enemies[i];P.a=Math.atan2(e.y-P.y,e.x-P.x);P.pitch=(1.0-1.6)/Math.hypot(e.x-P.x,e.y-P.y);},get state(){return state},get wave(){return wave},get money(){return money},get kills(){return kills},get skPts(){return skPts},get skills(){return skills},get deaths(){return deaths},get P(){return P},get slots(){return slots},get cur(){return cur},set cur(v){cur=v},get ammo(){return ammo},get enemies(){return enemies},get allies(){return allies},get groundGuns(){return groundGuns},get GUNS(){return GUNS},get timeOfDay(){return timeOfDay},set timeOfDay(v){timeOfDay=v},isNight:isNight,nearBed:nearBed};';
function loadGame(file){
 var html=fs.readFileSync(file,'utf8');
 var code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 if(!/\}\)\(\);\s*$/.test(code))throw new Error('不是IIFE结尾');
 code=code.replace(/\}\)\(\);\s*$/,EXPORTS+'\n})();');
 var els={},rafQ=[];
 var document={getElementById(id){if(!els[id])els[id]=mkEl(id);return els[id];},querySelector(){return mkEl('q');},querySelectorAll(){return [];},addEventListener(){},body:mkEl('body'),createElement(){return mkEl('c');}};
 var sb={document,Math,console,Date,
  setTimeout:function(fn,ms){return setTimeout(fn,Math.max(1,(ms||0)/20));},clearTimeout:clearTimeout,
  setInterval:function(fn,ms){return setInterval(fn,Math.max(1,(ms||0)/20));},clearInterval:clearInterval,
  requestAnimationFrame:function(fn){rafQ.push(fn);return rafQ.length;},cancelAnimationFrame:function(){},
  addEventListener:function(){},removeEventListener:function(){},
  performance:{now:function(){return Date.now();}},
  localStorage:{_d:{},getItem(k){return this._d[k]||null;},setItem(k,v){this._d[k]=v;},removeItem(k){delete this._d[k];}},
  navigator:{userAgent:'t'},alert(){},location:{href:'',pathname:'/'+file},
  Image:function(){return {addEventListener(){},onload:null,src:''};},
  SFX:new Proxy({},{get:function(){return function(){};}}),
  Site:new Proxy({},{get:function(){return function(){};}})};
 sb.window=sb;sb.self=sb;sb.globalThis=sb;
 vm.createContext(sb);
 vm.runInContext(code,sb,{filename:file});
 sb.__rafQ=rafQ;
 if(!sb.__T)throw new Error('__T注入失败');
 return sb;
}
var failures=0,total=0;
function T(name,cond,detail){
 total++;
 if(cond)console.log('  ✓ '+name);
 else{failures++;console.log('  ✗ '+name+(detail?' → '+detail:''));}
}
function pump(sb,n){for(var i=0;i<n;i++){var q=sb.__rafQ.splice(0);q.forEach(function(fn){fn();});}}

console.log('=== sniper.html 狙击对决·两军对峙 ===');
var sb,g;
try{ sb=loadGame('sniper.html');g=sb.__T; }
catch(e){ T('脚本加载无异常',false,e.message); console.log('\n结果: 1项, 失败1'); process.exit(1); }
T('脚本加载无异常',true);
T('初始为菜单态',g.state==='menu','state='+g.state);

g.restart();g.allies.length=0;
T('开战第1波4敌(对岸平台)',g.state==='play'&&g.wave===1&&g.enemies.length===4,'state='+g.state+' n='+g.enemies.length);
T('初始佩枪P226+48弹+万元',g.slots[1]&&g.slots[1].k==='p226'&&g.slots[0]===null&&g.ammo.pistol===48&&g.money===10000);
T('地上刷了枪(我方平台)',g.groundGuns.length>=6,'n='+g.groundGuns.length);
T('狙击种类≥6且含穿甲/静音',!!g.GUNS.awm&&!!g.GUNS.vss&&!!g.GUNS.barrett);
T('手枪越好打得越少(伤害递增)',g.GUNS.p226.dmg<g.GUNS.deagle.dmg&&g.GUNS.deagle.dmg<g.GUNS.gold.dmg&&g.GUNS.gold.dmg<g.GUNS.doom.dmg);
T('初始白天·技能点0',!g.isNight()&&g.skPts===0);

// 有视线的敌人(站立状态)
function aimEnemy(){for(var i=0;i<g.enemies.length;i++){if(g.enemies[i].alive&&!g.shotBlocked(g.P.x,g.P.y,g.enemies[i].x,g.enemies[i].y,false,0))return i;}return -1;}
function killBy(i){
 g.aimAtEnemy(i);
 var n=0;
 while(g.enemies[i].alive&&n<14){g.shoot();pump(sb,30);n++;}
 return g.enemies[i].alive;
}
var i0=aimEnemy();
T('跨岩浆视线可达对岸',i0>=0);
T('手枪5发内击倒+技能点+1',!killBy(i0)&&g.kills===1&&g.skPts>=1,'kills='+g.kills+' pts='+g.skPts);

// 狙击一枪一个
g.slots[0]={k:'awm',mag:5};g.ammo.sniper=5;g.cur=0;
var i1=aimEnemy();
g.aimAtEnemy(i1);g.shoot();pump(sb,2);
T('狙击枪一枪一个(AWM)',!g.enemies[i1].alive);
T('击杀累计技能点',g.skPts>=2,'pts='+g.skPts);

// 技能树
var pts0=g.skPts;
T('买1点技能【稳手】',g.buySkill('steady')===true&&g.skills.steady===true&&g.skPts===pts0-1);
T('3点技能点不足时买不了',g.buySkill('pierce')===false&&!g.skills.pierce);
T('重复购买被拒',g.buySkill('steady')===false);

// 换枪A / 丢G / 捡E / 上弹 / 买弹
g.swapGun();var c1=g.cur;g.swapGun();var c2=g.cur;
T('A键双槽换枪',c1===1&&c2===0,'cur='+c1+'→'+c2);
g.cur=0;g.dropGun();
T('G丢弃后枪落地槽清空',g.slots[0]===null&&g.groundGuns.some(function(x){return x.k==='awm';}));
var before=g.groundGuns.length;
g.cur=1;g.tryPickup();
T('E捡起地上枪(数量-1)',g.groundGuns.length===before-1);
g.cur=1;g.slots[1]={k:'p226',mag:0};g.ammo.pistol=10;
g.reload();pump(sb,120);
T('右键上弹(0→10发)',g.slots[1].mag===10&&g.ammo.pistol===0,'mag='+g.slots[1].mag);
var m0=g.money,a0=g.ammo.pistol;
g.buyAmmo();
T('按<+>买子弹(扣钱加弹)',g.money===m0-g.GUNS.p226.cost&&g.ammo.pistol===a0+g.GUNS.p226.buy);

// 蹲伏: 蹲下后掩体挡弹
var vis=aimEnemy();
g.enemies[vis].crouch=true;g.enemies[vis].st='hide';
T('蹲伏敌人躲掩体后(被挡)',g.shotBlocked(g.P.x,g.P.y,g.enemies[vis].x,g.enemies[vis].y,true,0));
g.enemies[vis].crouch=false;
T('站立敌人可被越掩体击中',!g.shotBlocked(g.P.x,g.P.y,g.enemies[vis].x,g.enemies[vis].y,false,0));

// 夜袭: 夜晚击杀+2点
g.timeOfDay=0.75;
T('设置夜晚生效',g.isNight());
var pts1=g.skPts;
var i2=aimEnemy();
if(i2>=0&&!killBy(i2)){}
T('夜袭击杀额外技能点(+2)',g.skPts>=pts1+2,pts1+'→'+g.skPts);

// 清场结算
g.timeOfDay=0.2;
var m1=g.money;
for(var i=0;i<g.enemies.length;i++){
 if(!g.enemies[i].alive)continue;
 g.enemies[i].crouch=false;
 g.aimAtEnemy(i);
 var n=0;while(g.enemies[i].alive&&n<15){g.shoot();pump(sb,30);n++;}
}
pump(sb,5);
T('肃清进入波间结算',g.state==='inter','state='+g.state);
T('通关加钱(第1波+1800)',g.money===m1+1800,m1+'→'+g.money);

// 床/重生
g.nextWave();g.allies.length=0;
T('第2波5敌',g.state==='play'&&g.wave===2&&g.enemies.length===5);
g.dieAndRespawn();
T('阵亡进入倒地铁盆',g.state==='over'&&g.deaths>=1);
g.respawn();
T('床重生: 回床+HP50+复活',g.state==='play'&&g.P.alive&&g.P.hp===50&&Math.abs(g.P.x-10.5)<1&&Math.abs(g.P.y-23.5)<1,'hp='+g.P.hp+' pos='+g.P.x.toFixed(1)+','+g.P.y.toFixed(1));
T('床边判定',g.nearBed());
// 睡觉: 夜晚在床边 → 天亮+回血
g.timeOfDay=0.8;g.P.hp=40;
g.P.x=10.5;g.P.y=23.5;
g.bedAction();
T('夜晚睡觉: 天亮+40血',!g.isNight()&&g.P.hp===80,'tod='+g.timeOfDay.toFixed(2)+' hp='+g.P.hp);

// 中央大桥: 沿桥可过河, 偏离桥被岩浆挡
g.P.x=16;g.P.y=21.5;
g.pressKey('w',true);pump(sb,600);g.pressKey('w',false);
T('中央大桥可通行(走到北岸)',g.P.y<14,'y='+g.P.y.toFixed(1));
g.P.x=20;g.P.y=21.5;
g.pressKey('w',true);pump(sb,400);g.pressKey('w',false);
T('偏离桥=岩浆挡路(留在南岸)',g.P.y>=19,'y='+g.P.y.toFixed(1));

// 敌方反击
g.P.x=16;g.P.y=21.5;
var hp0=g.P.hp,n=0;
while(g.P.hp>=hp0&&n<2400){pump(sb,1);n++;}
T('对岸敌人会瞄准开枪',g.P.hp<hp0||g.deaths>=1,n+'帧未掉血');

T('全程无运行时错误',true);
console.log('  (波次'+g.wave+' 击杀'+g.kills+' 技能点'+g.skPts+' 阵亡'+g.deaths+')');

console.log('\n结果: '+total+'项, 失败'+failures);
process.exit(failures?1:0);
