// ===== 隐藏/搞笑游戏(hsr/genshin/sheep)运行时测试 + troll加载测试 =====
var fs=require('fs'),vm=require('vm');
var SPEED=20;
function fastTimeout(fn,ms){return setTimeout(fn,Math.max(1,(ms||0)/SPEED));}
function mkAny(){var f=function(){return p;};var p=new Proxy(f,{get:function(t,k){if(k==='canvas')return{};return p;},set:function(){return true;}});return p;}
function mkCtx(){return mkAny();}
function mkEl(id){return {_id:id,innerHTML:'',textContent:'',value:'',style:{},dataset:{},children:[],disabled:false,width:0,height:0,
 classList:{add(){},remove(){},toggle(){},contains(){return false}},
 appendChild(c){return c;},addEventListener(){},onclick:null,onmouseenter:null,ontouchstart:null,
 getContext(){return mkCtx();},querySelectorAll(){return[]},querySelector(){return mkEl('q');},remove(){}};}
var EXPORTS={
 'hsr.html':'window.__T={act:act,init:init,get team(){return team},get foes(){return foes},get over(){return over},get gems(){return gems},get phase(){return phase}};',
 'genshin.html':'window.__T={act:act,init:init,get team(){return team},get foes(){return foes},get over(){return over},get gems(){return gems},get phase(){return phase}};',
 'sheep.html':'window.__T={init:init,tap:tap,get slots(){return slots},get tiles(){return tiles},get over(){return over},get lvl(){return lvl}};'
};
function loadGame(file,fakeMaxPet){
 var html=fs.readFileSync(file,'utf8');
 var ms=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
 var code=ms[ms.length-1][1]; // 最后一块=游戏逻辑
 if(!/\}\)\(\);\s*$/.test(code))throw new Error('不是IIFE结尾');
 if(EXPORTS[file])code=code.replace(/\}\)\(\);\s*$/,EXPORTS[file]+'\n})();');
 var cw=0,ch=0,cm=html.match(/<canvas[^>]*width="(\d+)"[^>]*height="(\d+)"/);
 if(cm){cw=+cm[1];ch=+cm[2];}
 var els={},rafQ=[];
 var document={getElementById(id){
  if(!els[id]){els[id]=mkEl(id);if(id==='gameCanvas'){els[id].width=cw;els[id].height=ch;}}
  return els[id];
 },querySelector(){return mkEl('q');},querySelectorAll(){return [];},addEventListener(){},body:mkEl('body'),createElement(){return mkEl('c');}};
 var MATH=Object.create(Math);MATH.random=Math.random;
 var petStore={};
 var sb={document,Math:MATH,console,Date,
  setTimeout:fastTimeout,clearTimeout:clearTimeout,setInterval:function(f,ms){return setInterval(f,Math.max(1,(ms||0)/SPEED));},clearInterval:clearInterval,
  requestAnimationFrame:function(fn){rafQ.push(fn);return rafQ.length;},cancelAnimationFrame:function(){},
  addEventListener(){},removeEventListener(){},
  performance:{now:()=>Date.now()},
  localStorage:{getItem(k){return petStore[k]||null;},setItem(k,v){petStore[k]=v;},removeItem(k){delete petStore[k];}},
  navigator:{userAgent:'t'},alert(){},location:{href:'',pathname:'/'+file},
  SFX:new Proxy({},{get:function(){return function(){};}}),
  Site:new Proxy({},{get:function(t,k){
   if(k==='beginGame')return function(n,o,cb){cb({duo:false,enemy:Math.random()<.4?{name:'测试AI',skill:.9}:null,ally:Math.random()<.3?{name:'测试队友'}:null});};
   if(k==='pet')return function(){return fakeMaxPet?{type:'dog',level:10,fed:0}:null;};
   if(k==='petIsMax')return function(){return !!fakeMaxPet;};
   if(k==='PET_MAX')return 10;
   return function(){};
  }})};
 sb.window=sb;sb.self=sb;sb.globalThis=sb;
 vm.createContext(sb);
 vm.runInContext(code,sb,{filename:file});
 sb.__rafQ=rafQ;
 return sb;
}
var failures=0,total=0;
function T(n,c,d){total++;if(c)console.log('  ✓ '+n);else{failures++;console.log('  ✗ '+n+(d?' → '+d:''));}}
function pump(sb){var q=sb.__rafQ.splice(0);q.forEach(function(f){f();});}

// ===== hsr 回合制全流程 =====
console.log('=== hsr.html 星穹Q萌版(满级解锁) ===');
try{
 var sb=loadGame('hsr.html',true);var g=sb.__T;
 var steps=0,usedUlt=false,usedSkill=false,usedDef=false;
 var iv=setInterval(function(){
  try{
   pump(sb);
   if(!g.over&&g.phase==='cmd'){
    var r=Math.random();
    if(r<.5)g.act('atk');
    else if(r<.7&&!usedSkill){g.act('sk');usedSkill=true;}
    else if(r<.8&&!usedUlt){g.act('ult');usedUlt=true;}
    else if(r<.85&&!usedDef){g.act('def');usedDef=true;}
    else g.act('atk');
   }
   steps++;
   if(g.over||steps>800){
    clearInterval(iv);
    T('战斗流程无异常',true);
    T('游戏能分出胜负',g.over,'steps='+steps);
    T('关卡/星琼有产出',g.gems>0,'gems='+g.gems);
    console.log('  (步数'+steps+' 星琼'+g.gems+')');
   }
  }catch(e){clearInterval(iv);T('战斗流程无异常',false,e.message);}
 },20);
}catch(e){T('加载',false,e.message);}

// ===== genshin 回合制 =====
setTimeout(function(){
console.log('=== genshin.html 提瓦特Q萌版 ===');
try{
 var sb=loadGame('genshin.html',true);var g=sb.__T;
 var steps=0;
 var iv=setInterval(function(){
  try{
   pump(sb);
   if(!g.over&&g.phase==='cmd'){
    var r=Math.random();
    if(r<.5)g.act('atk');else if(r<.8)g.act('e');else g.act('q');
    if(Math.random()<.15)g.act('switch');
   }
   steps++;
   if(g.over||steps>800){
    clearInterval(iv);
    T('元素战斗流程无异常',true);
    T('游戏能分出胜负',g.over,'steps='+steps);
    T('原石有产出',g.gems>0,'gems='+g.gems);
    console.log('  (步数'+steps+' 原石'+g.gems+')');
   }
  }catch(e){clearInterval(iv);T('元素战斗流程无异常',false,e.message);}
 },20);
}catch(e){T('加载',false,e.message);}
},12000);

// ===== sheep 三消 =====
setTimeout(function(){
console.log('=== sheep.html 羊了个羊 ===');
try{
 var sb=loadGame('sheep.html',true);var g=sb.__T;
 var steps=0,cleared=false;
 var iv=setInterval(function(){
  try{
   pump(sb);
   if(!g.over){
    // 随机点牌(找未覆盖的)
    var alive=g.tiles.filter(function(t){return !t.dead;});
    if(alive.length&&Math.random()<.8){
     g.tap(alive[Math.floor(Math.random()*alive.length)].x+10,alive[Math.floor(Math.random()*alive.length)].y+10);
    }
   }
   steps++;
   if(g.over||steps>600){
    clearInterval(iv);
    T('三消流程无异常',true);
    T('槽位逻辑运作',g.slots!==undefined);
    console.log('  (步数'+steps+' 关卡'+g.lvl+' over='+g.over+')');
   }
  }catch(e){clearInterval(iv);T('三消流程无异常',false,e.message);}
 },15);
}catch(e){T('加载',false,e.message);}
},24000);

// ===== troll 加载+关卡函数存在 =====
setTimeout(function(){
console.log('=== troll.html 永远差一点 ===');
try{
 var sb=loadGame('troll.html',false); // 未满级也可玩(公开)
 T('脚本加载无异常',!!sb);
}catch(e){T('加载',false,e.message);}
console.log('\n结果: '+total+'项, 失败'+failures);
process.exit(failures?1:0);
},36000);
