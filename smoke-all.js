// ===== 全站冒烟: 每个游戏加载+驱动120帧, 抓初始化运行时错误(黑屏排查) =====
var fs=require('fs'),vm=require('vm'),path=require('path');
function mkAny(){ var f=function(){return anyP;}; var anyP=new Proxy(f,{get:function(t,k){ if(k==='canvas')return {}; if(k===Symbol.toPrimitive||k==='valueOf')return function(){return 0;}; return anyP; },set:function(){return true;}}); return anyP; }
function mkEl(id){
 return {_id:id,innerHTML:'',textContent:'',value:'',style:{},dataset:{},children:[],disabled:false,width:0,height:0,
  classList:{add(){},remove(){},toggle(){},contains(){return false}},
  appendChild(c){return c;},removeChild(c){return c;},addEventListener(){},onclick:null,focus(){},blur(){},
  getContext(){return mkAny();},querySelectorAll(){return[]},querySelector(){return mkEl('q');}};
}
var ROOT=__dirname;
var files=fs.readdirSync(ROOT).filter(function(f){return/\.html$/i.test(f);}).sort();
var badList=[],okN=0;
files.forEach(function(f){
 var html;
 try{html=fs.readFileSync(path.join(ROOT,f),'utf8');}catch(e){badList.push(f+': 读取失败');return;}
 var m=html.match(/<script>((?:(?!<\/script>)[\s\S])*)<\/script>/);
 if(!m){okN++;return;} // 无内联脚本(纯静态页)
 var code=m[1];
 var cm=html.match(/<canvas[^>]*width="(\d+)"[^>]*height="(\d+)"/);
 var els={},rafQ=[];
 var document={getElementById(id){if(!els[id]){els[id]=mkEl(id);if(id==='gameCanvas'&&cm){els[id].width=+cm[1];els[id].height=+cm[2];}}return els[id];},
  querySelector(){return mkEl('q');},querySelectorAll(){return [];},addEventListener(){},removeEventListener(){},
  body:mkEl('body'),createElement(){return mkEl('c');},documentElement:mkEl('html'),head:mkEl('head')};
 var MATH=Object.create(Math);MATH.random=Math.random;
 var sb={document,Math:MATH,console:{log(){},warn(){},error(){}},Date,
  setTimeout:function(fn,ms){return setTimeout(fn,Math.max(1,(ms||0)/50));},clearTimeout:clearTimeout,
  setInterval:function(fn,ms){return setInterval(fn,Math.max(1,(ms||0)/50));},clearInterval:clearInterval,
  requestAnimationFrame:function(fn){rafQ.push(fn);return rafQ.length;},cancelAnimationFrame:function(){},
  addEventListener:function(){},removeEventListener:function(){},
  performance:{now:function(){return Date.now();}},
  localStorage:{_d:{},getItem(k){return this._d[k]||null;},setItem(k,v){this._d[k]=v;},removeItem(k){delete this._d[k];}},
  navigator:{userAgent:'t',language:'zh-CN',maxTouchPoints:0},
  alert(){},confirm(){return true;},prompt(){return null;},
  location:{href:'',pathname:'/'+f,search:'',hash:''},
  innerWidth:960,innerHeight:540,devicePixelRatio:1,
  Image:function(){return {addEventListener(){},onload:null,src:''};},
  Audio:function(){return {play(){return {catch(){}};},pause(){},load(){},volume:1,addEventListener(){}};},
  sessionStorage:{getItem:function(){return null;},setItem(){},removeItem(){}},
  AOXMobile:new Proxy({},{get:function(){return function(){};}}),AOXSound:new Proxy({},{get:function(){return function(){};}}),
  THREE:mkAny(),CSS:{escape:function(s){return String(s).replace(/[^\w-]/g,'');}},
  GAME_DB:[{f:'snake.html',n:'贪吃蛇',c:'经典街机'},{f:'tetris.html',n:'俄罗斯方块',c:'经典街机'}],
  SFX:new Proxy({},{get:function(){return function(){};}}),
  Site:new Proxy({},{get:function(t,k){
   if(k==='beginGame')return function(n,o,cb){try{cb&&cb({duo:false,enemy:null,ally:null});}catch(e){}};
   if(k==='played')return function(){return 99;};
   if(k==='wallList')return function(){return [];};
   if(k==='visitStats')return function(){return {v:{first:Date.now(),count:0,days:{},logs:[]},today:0,top:[],totalPlays:0};};
   return function(){};
  }})};
 sb.window=sb;sb.self=sb;sb.globalThis=sb;sb.toast=function(){};
 var err=null;
 function h(e){err=e;}
 process.on('uncaughtException',h);
 try{
  vm.createContext(sb);
  vm.runInContext(code,sb,{filename:f});
  for(var fr=0;fr<120;fr++){
   var q=rafQ.splice(0);
   if(!q.length)break;
   q.forEach(function(fn){fn();});
   if(err)break;
  }
 }catch(e){err=e;}
 process.removeListener('uncaughtException',h);
 if(err)badList.push(f+': '+err.message);
 else okN++;
});
console.log('冒烟完成: '+okN+'/'+files.length+' 正常');
if(badList.length){console.log('异常清单:');badList.forEach(function(b){console.log('  ✗ '+b);});}
process.exit(0); // 某些页面残留setInterval会挂住进程
