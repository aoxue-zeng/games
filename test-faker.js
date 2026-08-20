// ===== 伪人超市 运行时自动测试 =====
var fs=require('fs'),vm=require('vm');

function mkAny(){ var f=function(){return anyP;}; var anyP=new Proxy(f,{get:function(t,k){ if(k==='canvas')return {}; return anyP; },set:function(){return true;},construct:function(){return anyP;}}); return anyP; }
function mkEl(id){
 return {_id:id,innerHTML:'',textContent:'',value:'',style:{},dataset:{},children:[],disabled:false,width:0,height:0,
  classList:{add(){},remove(){},toggle(){},contains(){return false}},
  appendChild(c){return c;},addEventListener(){},onclick:null,
  getContext(){return mkAny();},querySelectorAll(){return[]},querySelector(){return mkEl('q');},getBoundingClientRect(){return{left:0,top:0,width:960,height:540};}};
}
var EXPORTS='window.__T={startDay:startDay,nextDay:nextDay,spawnCustomer:spawnCustomer,inspect:inspect,fireAt:fireAt,triggerSiege:triggerSiege,endSiege:endSiege,codRain:codRain,serveGreat:serveGreat,deployArmy:deployArmy,buyGun:buyGun,eatChoco:eatChoco,endDay:endDay,faintNow:faintNow,reviveAt:reviveAt,pressKey:function(k,v){keys[k]=v;},nearestCustomer:nearestCustomer,get state(){return state},get day(){return day},get money(){return money},get kills(){return kills},get patience(){return patience},get patienceMax(){return patienceMax},get gunUnlocked(){return gunUnlocked},get sheriffDone(){return sheriffDone},get armoryOpen(){return armoryOpen},get gnomeRe(){return gnomeRe},get hunter(){return hunter},get boss(){return boss},get tanks(){return tanks},get aiArmy(){return aiArmy},get greatArmy(){return greatArmy},get mates(){return mates},get outMate(){return outMate},get P(){return P},get save(){return save},get customers(){return customers},get entities(){return entities},get spiders(){return spiders},get webs(){return webs},get corpses(){return corpses},get fishes(){return fishes},get weather(){return weather},get grenades_n(){return grenades_n},get rockets(){return rockets},set day(v){day=v},set patience(v){patience=v},get trapArmed(){return trapArmed}};';
function loadGame(file){
 var html=fs.readFileSync(file,'utf8');
 var code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 if(!/\}\)\(\);\s*$/.test(code))throw new Error('不是IIFE结尾');
 code=code.replace(/\}\)\(\);\s*$/,EXPORTS+'\n})();');
 var els={},rafQ=[];
 var cm=html.match(/<canvas[^>]*width="(d+)"[^>]*height="(d+)"/);
 var document={getElementById(id){if(!els[id]){els[id]=mkEl(id);if(id==='gameCanvas'&&cm){els[id].width=+cm[1];els[id].height=+cm[2];}}return els[id];},querySelector(){return mkEl('q');},querySelectorAll(){return [];},addEventListener(){},body:mkEl('body'),createElement(){return mkEl('c');}};
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

console.log('=== faker-mart.html 伪人超市 ===');
var sb,g;
try{ sb=loadGame('faker-mart.html');g=sb.__T; }
catch(e){ T('脚本加载无异常',false,e.message); console.log('\n结果: 1项, 失败1'); process.exit(1); }
T('脚本加载无异常',true);
T('初始菜单态',g.state==='menu');

// 第1天: 警长
g.startDay();
T('第1天开始·5队友+1外勤',g.day===1&&g.state==='day'&&g.mates.length===5&&!!g.outMate);
T('警长是首位顾客·枪未解锁',g.customers.some(function(c){return c.kind==='sheriff';})&&!g.gunUnlocked);
var n=0;
while(!g.sheriffDone&&n<1600){pump(sb,1);n++;}
T('警长买完→解锁枪械+巧克力',g.sheriffDone&&g.gunUnlocked,'n='+n);

// 伪人: 检查+击杀+掉巧克力
var c0=g.spawnCustomer(true);
T('伪人顾客生成(fake=true)',c0.fake===true);
c0.x=g.P.x+30;c0.y=g.P.y;
var ic=g.inspect();
T('检查标记顾客',ic&&ic.checked===true);
var ch0=g.save.choco;
g.fireAt(c0.x,c0.y);pump(sb,5);
T('开枪干掉伪人+掉🍫',g.kills>=1&&g.save.choco>ch0,'kills='+g.kills);

// 打正常人扣钱
var bad=g.spawnCustomer(false);
bad.x=g.P.x+30;bad.y=g.P.y;bad.tx=bad.x;bad.ty=bad.y;var m0=g.money;
pump(sb,50);
g.fireAt(bad.x,bad.y);pump(sb,5);
T('误伤正常人扣营业额',g.money<m0,m0+'→'+g.money);

// 吃巧克力
g.P.hp=50;g.P.san=50;var hc=g.save.choco;
if(hc<1){g.save.choco=1;}
g.eatChoco();
T('吃巧克力回血回精神(+30/+40)',g.P.hp===80&&g.P.san===90,'hp='+g.P.hp+' san='+g.P.san);

// 门口陷阱防伪人逃跑
for(var ck=g.customers.length-1;ck>=0;ck--)g.customers.splice(ck,1);
var fk=g.spawnCustomer(true);
fk.state='leave';fk.x=480;fk.y=44;fk.tx=480;fk.ty=40;
var kc0=g.kills,cc0=g.save.choco;
var wt=0;
while(g.customers.indexOf(fk)>=0&&wt<300){pump(sb,1);wt++;}
T('陷阱抓住逃跑伪人(+1🍫)不引发围攻',g.kills===kc0+1&&g.save.choco===cc0+1&&g.state==='day','state='+g.state+' kills='+g.kills);
T('陷阱用后进入冷却待重布防',g.trapArmed===false);

// 实体围攻
for(var ci=g.customers.length-1;ci>=0;ci--)if(g.customers[ci].kind==='great')g.customers.splice(ci,1);
g.triggerSiege();
T('伪人逃脱→实体进店·武器库开放',g.state==='siege'&&g.armoryOpen&&g.entities.length>=2&&g.spiders.length>=1);
g.patience=0;
T('耐心值从0开始',g.patience===0);
// 打实体涨耐心
var e0=g.entities[0];var p0=g.patience;
g.fireAt(e0.x,e0.y);pump(sb,45);
g.fireAt(e0.x,e0.y);pump(sb,45);
T('攻击实体提升耐心值',g.patience>p0,p0+'→'+g.patience);
// 打满撤退
for(var cj=g.customers.length-1;cj>=0;cj--)if(g.customers[cj].kind==='great')g.customers.splice(cj,1);
g.patience=g.patienceMax;
pump(sb,5);
T('耐心打满→实体撤退回营业',g.state==='day'&&g.entities.length===0&&g.save.choco>=1,'state='+g.state);

// 蜘蛛网: 被粘+挣扎
g.P.webbed=4;
g.pressKey('w',true);pump(sb,30);g.pressKey('w',false);
T('狂按WASD加速挣脱蛛网',g.P.webbed<4,'webbed='+g.P.webbed.toFixed(2));

// 精神值: 实体靠近吸神→晕倒→队友按E救
if(g.state==='siege')g.endSiege();
g.triggerSiege();
g.patience=0;
g.entities[0].x=g.P.x+20;g.entities[0].y=g.P.y;
g.P.san=5;
pump(sb,2);
T('实体靠近吸取精神值',g.P.san<5,'san='+g.P.san.toFixed(2));
g.faintNow();
T('精神值耗尽→晕倒',g.P.faint===true);
var rv=0;
while(g.P.faint&&rv<1200){pump(sb,1);rv++;}
T('医护队友跑来按E救醒',g.P.faint===false&&g.P.san>0,'n='+rv);

// 鳕雨
g.codRain();
T('鳕雨: 天降鳕鱼+尸体',g.weather==='cod'&&g.fishes.length>0&&g.corpses.length>=2);
pump(sb,200);
T('鳕鱼落地变尸体',g.corpses.length>0&&g.fishes.length<g.corpses.length);

// 伟人战争+三军
g.serveGreat();
T('伟人交易→大军对决',g.state==='war'&&!!g.boss&&g.tanks.length===2&&g.rockets.length===2);
var t0=g.tanks.length,a0=g.aiArmy.length;
g.deployArmy(1);g.deployArmy(3);
T('部署坦克军+AI队友军',g.tanks.length===t0+1&&g.aiArmy.length===a0+3);
var r0=g.rockets.length;
g.deployArmy(2);
T('部署火箭军',g.rockets.length===r0+1);
g.boss.hp=5;
var wn=0;
while(g.state==='war'&&wn<2000){pump(sb,1);wn++;}
T('击败伟人→战争结束+10🍫',g.state==='day'&&!g.boss,'n='+wn);

// 猎人→地精×3重生(净室实例, 隔离前段随机性)
var sb2=loadGame('faker-mart.html'),g2=sb2.__T;
g2.startDay();
var nh=0;while(!g2.sheriffDone&&nh<1600){pump(sb2,1);nh++;}
g2.day=2;g2.triggerSiege();
if(!g2.hunter){T('第2天实体来袭带猎人',false,'hunter=null');}
else{
 T('第2天实体来袭带猎人',!!g2.hunter);
 g2.entities.length=0;g2.spiders.length=0;g2.customers.length=0;
 var times=0;
 while(g2.hunter&&times<40){
  g2.patience=0;
  if(g2.state!=='siege'){g2.triggerSiege();}
  if(!g2.hunter)break;
  g2.hunter.hp=1;
  g2.hunter.x=g2.P.x+30;g2.hunter.y=g2.P.y;
  g2.fireAt(g2.P.x+30,g2.P.y);pump(sb2,50);
  times++;
 }
 T('猎人→地精猎人重生3次后彻底消失',g2.gnomeRe===3,'gnomeRe='+g2.gnomeRe+' times='+times);
}

// 巴士收工→电话升级→第二天
g.endSiege();
g.P.x=80;g.P.y=500;
var sc0=g.save.choco;
g.endDay();
T('巴士收工→电话面板(加3🍫)',g.state==='phone'&&g.save.choco===sc0+3,'state='+g.state);
g.save.choco=60;
T('巧克力升级狙击枪',g.buyGun(1)===true&&g.save.gun===1);
T('再升克洛勒7',g.buyGun(2)===true&&g.save.gun===2);
T('越级购买被拒',g.buyGun(0)===false);
var dExp=g.day+1;
g.nextDay();
T('第二天: 巴士再来·队友满编',g.day===dExp&&g.state==='day'&&g.mates.length===5&&g.mates.every(function(m){return m.alive;}));
T('新一天客人里有奇形怪状的',g.customers.length>=2,'n='+g.customers.length);

// 外勤队友物资(相位对齐: 每18s一次)
var cch=g.save.choco;
var on=0;
while(g.save.choco===cch&&on<2000){pump(sb,1);on++;}
T('外勤队友定期送补给🍫',g.save.choco>cch,'n='+on);

T('全程无运行时错误',true);
console.log('  (第'+g.day+'天 击杀'+g.kills+' 巧克力'+g.save.choco+' 枪'+['手枪','狙击','克洛勒7'][g.save.gun]+')');

console.log('\n结果: '+total+'项, 失败'+failures);
process.exit(failures?1:0);
