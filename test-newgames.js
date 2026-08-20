// ===== 新游戏(西瓜/恐龙/大鱼) 运行时自动测试 =====
// stub Site API + rAF驱动, 真跑完整局抓运行时错误
var fs=require('fs'),vm=require('vm');

var SPEED=20;
function fastTimeout(fn,ms){return setTimeout(fn,Math.max(1,(ms||0)/SPEED));}
function fastInterval(fn,ms){return setInterval(fn,Math.max(1,(ms||0)/SPEED));}
function mkAny(){ var f=function(){return anyP;}; var anyP=new Proxy(f,{get:function(t,k){ if(k==='canvas')return {}; return anyP; },set:function(){return true;}}); return anyP; }
function mkCtx(){return mkAny();}
function mkEl(id){
 return {_id:id,innerHTML:'',textContent:'',style:{},dataset:{},children:[],disabled:false,width:0,height:0,
  classList:{add(){},remove(){},toggle(){},contains(){return false}},
  appendChild(c){return c;},addEventListener(){},onclick:null,
  getContext(){return mkCtx();},querySelectorAll(){return[]},querySelector(){return mkEl('q');}};
}
var EXPORTS={
 'suika.html':'window.__T={release:release,spawnDrop:spawnDrop,init:init,get over(){return over},set over(v){over=v},get score(){return score},get fruits(){return fruits},get drop(){return drop},set overT(v){overT=v}};',
 'dino.html':'window.__T={init:init,get players(){return players},get ended(){return ended},get obstacles(){return obstacles}};',
 'fisheat.html':'window.__T={init:init,get players(){return players},get fishes(){return fishes},get over(){return over},set mx(v){mx=v},set my(v){my=v}};'
};
function loadGame(file){
 var html=fs.readFileSync(file,'utf8');
 var code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 if(!/\}\)\(\);\s*$/.test(code))throw new Error('不是IIFE结尾');
 code=code.replace(/\}\)\(\);\s*$/,EXPORTS[file]+'\n})();');
 // 从HTML解析canvas真实尺寸
 var cw=0,ch=0,cm=html.match(/<canvas[^>]*width="(\d+)"[^>]*height="(\d+)"/);
 if(cm){cw=+cm[1];ch=+cm[2];}
 var els={},rafQ=[];
 var document={getElementById(id){
  if(!els[id]){
   els[id]=mkEl(id);
   if(id==='gameCanvas'){els[id].width=cw;els[id].height=ch;}
  }
  return els[id];
 },querySelector(){return mkEl('q');},querySelectorAll(){return [];},addEventListener(){},body:mkEl('body'),createElement(){return mkEl('c');}};
 var MATH=Object.create(Math);MATH.random=Math.random;
 var sb={document,Math:MATH,console,Date,
  setTimeout:fastTimeout,clearTimeout:clearTimeout,setInterval:fastInterval,clearInterval:clearInterval,
  requestAnimationFrame:function(fn){rafQ.push(fn);return rafQ.length;},cancelAnimationFrame:function(){},
  addEventListener:function(){},removeEventListener:function(){},
  performance:{now:()=>Date.now()},
  localStorage:{_d:{},getItem(k){return this._d[k]||null;},setItem(k,v){this._d[k]=v;},removeItem(k){delete this._d[k];}},
  navigator:{userAgent:'t'},alert(){},location:{href:'',pathname:'/'+file},
  SFX:new Proxy({},{get:function(){return function(){};}}),
  Site:new Proxy({},{get:function(t,k){
   if(k==='beginGame')return function(n,o,cb){cb({duo:!!(o&&o.duo&&Math.random()<.5),enemy:Math.random()<.5?{name:'测试AI',skill:.9}:null,ally:Math.random()<.3?{name:'测试队友'}:null});};
   return function(){};
  }})};
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
function pumpFrame(sb){var q=sb.__rafQ.splice(0);q.forEach(function(fn){fn();});}

// ===== suika =====
console.log('=== suika.html 合成大西瓜 ===');
try{
 var sb=loadGame('suika.html');var g=sb.__T;
 var frames=0,err=null;
 process.on('uncaughtException',function(e){err=e;});
 var iv=setInterval(function(){
  try{
   pumpFrame(sb);
   if(!g.over&&g.drop===null&&frames%3===0)g.spawnDrop();
   if(!g.over&&g.drop&&frames%12===0){g.drop.x=40+Math.random()*360;g.release();} // 随机位置投放
   frames++;
   // 后期构造过线局面: preheat overT + 高位静止果, 验证gameOver链路
   if(frames===8500&&!g.over){
    g.overT=97;
    g.fruits.push({t:2,x:30,y:100,vx:0,vy:-0.6,cool:0});
   }
   if(g.over||frames>9000){clearInterval(iv);
    T('完整局无异常',!err,err&&err.message);
    T('游戏能结束(堆过线)',g.over,'跑了'+frames+'帧未结束');
    T('有合成得分',g.score>0,'score='+g.score);
    console.log('  (帧数'+frames+' 得分'+g.score+' 场上'+g.fruits.length+'果)');
   }
  }catch(e){clearInterval(iv);T('完整局无异常',false,e.message);}
 },6);
}catch(e){T('加载',false,e.message);}

// ===== dino =====
setTimeout(function(){
console.log('=== dino.html 断网恐龙 ===');
try{
 var sb=loadGame('dino.html');var g=sb.__T;
 var frames=0;
 var iv=setInterval(function(){
  try{
   pumpFrame(sb);frames++;
   if(g.ended||frames>1200){clearInterval(iv);
    T('完整局无异常',true);
    T('会结束(撞死)',g.ended,'跑了'+frames+'帧');
    T('有里程分数',g.players[0].score>0);
    var names=g.players.map(function(p){return p.name;}).join(',');
    T('玩家阵容正确(你+AI/队友)',names.indexOf('P1')>=0,'names='+names);
    console.log('  (帧数'+frames+' 阵容['+names+'] P1里程'+Math.floor(g.players[0].score)+')');
   }
  }catch(e){clearInterval(iv);T('完整局无异常',false,e.message);}
 },6);
}catch(e){T('加载',false,e.message);}
},3000);

// ===== fisheat =====
setTimeout(function(){
console.log('=== fisheat.html 大鱼吃小鱼 ===');
try{
 var sb=loadGame('fisheat.html');var g=sb.__T;
 var frames=0,grew=false,ended=false;
 var iv=setInterval(function(){
  try{
   pumpFrame(sb);
   // 模拟玩家到处游(吃小鱼)
   g.mx=200+Math.sin(frames*.05)*180;g.my=200+Math.cos(frames*.04)*150;
   frames++;
   if(g.players[0].lv>1)grew=true;
   if(g.over||frames>9000){clearInterval(iv);
    T('完整局无异常',true);
    T('有成长或分出胜负',grew||g.over,'lv='+g.players[0].lv);
    T('NPC生态正常(有鱼)',g.fishes.length>0,'fish='+g.fishes.length);
    console.log('  (帧数'+frames+' 你Lv'+g.players[0].lv+' 场上'+g.fishes.length+'条)');
   }
  }catch(e){clearInterval(iv);T('完整局无异常',false,e.message);}
 },6);
}catch(e){T('加载',false,e.message);}
},6000);

setTimeout(function(){
 console.log('\n结果: '+total+'项, 失败'+failures);
 process.exit(failures?1:0);
},80000);
