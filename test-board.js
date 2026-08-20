// ===== 飞行棋/蛇梯棋 自动对打测试 =====
// 真实定时器驱动，玩家侧也自动掷骰，直到分出胜负；跑多局抓运行时错误
var fs=require('fs'),vm=require('vm');

function mkCtx(){ return new Proxy({},{get:function(t,k){ if(k==='canvas')return{}; return function(){}; },set:function(){return true;}}); }
function mkEl(id){
 return {_id:id,innerHTML:'',textContent:'',style:{},dataset:{},children:[],_h:{},
  classList:{add(){},remove(){},contains(){return false}},
  appendChild(c){return c;},addEventListener(){},onclick:null,
  getContext(){return mkCtx();},querySelectorAll(){return [];},querySelector(){return mkEl('q');}};
}
function seeded(seed){ var s=seed; return function(){ s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff; }; }
var SPEED=120; // 定时器加速倍数(25不够跑完整局, 120x可在一局时限内完成)
function fastTimeout(fn,ms){ return setTimeout(fn,Math.max(1,(ms||0)/SPEED)); }
function fastInterval(fn,ms){ return setInterval(fn,Math.max(1,(ms||0)/SPEED)); }

var failures=0,total=0;
function T(name,fn){ total++;try{fn();console.log('  ✓ '+name);}catch(e){failures++;console.log('  ✗ '+name+' → '+e.message);} }

function loadGame(file,seed){
 var html=fs.readFileSync(file,'utf8');
 var code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 // 注入导出钩子(IIFE收尾前)
 var EXP='window.__T={roll:roll'+(file.indexOf('ludo')>=0?',init:init,doMove:doMove,get movable(){return movable}':'')+',get phase(){return phase},set phase(v){phase=v},get cur(){return cur},set cur(v){cur=v},get dice(){return dice},get p(){return '+(file.indexOf('ludo')>=0?'planes[0]':'p')+'},get a(){return '+(file.indexOf('ludo')>=0?'null':'a')+'}};';
 if(!/\}\)\(\);\s*$/.test(code))throw new Error('不是IIFE结尾');
 code=code.replace(/\}\)\(\);\s*$/,EXP+'\n})();');
 var els={};
 var document={getElementById(id){if(!els[id])els[id]=mkEl(id);return els[id];},querySelector(){return mkEl('q');},querySelectorAll(){return [];},addEventListener(){},body:mkEl('body'),createElement(){return mkEl('c');}};
 var MATH=Object.create(Math);MATH.random=seeded(seed);
 var sb={document,Math:MATH,console,Date,
  setTimeout:fastTimeout,clearTimeout:clearTimeout,setInterval:fastInterval,clearInterval:clearInterval,
  requestAnimationFrame(){return 0;},cancelAnimationFrame(){},performance:{now:()=>0},
  localStorage:{_d:{},getItem(k){return this._d[k]||null;},setItem(k,v){this._d[k]=v;},removeItem(k){delete this._d[k];}},
  navigator:{userAgent:'t'},alert(){},location:{href:''},
  SFX:new Proxy({},{get:function(){return function(){};}})}; // sound.js全局SFX的stub
 sb.window=sb;sb.self=sb;sb.globalThis=sb;
 vm.createContext(sb);
 vm.runInContext(code,sb,{filename:file});
 if(!sb.__T)throw new Error('__T注入失败');
 return sb;
}

// 由于需要等待异步定时器，用Promise串行
function playOne(file,seed){
 return new Promise(function(res){
  var sb;
  try{ sb=loadGame(file,seed); }catch(e){ return res({err:e.message}); }
  var g=sb.__T,t0=Date.now();
  var iv=setInterval(function(){
   try{
    if(g.phase==='over'){clearInterval(iv);
     var winnerIsP=file.indexOf('ludo')>=0?(g.p.filter(function(x){return x.done;}).length===4):(g.p.pos===100);
     return res(winnerIsP?{pw:1}:{aw:1});}
    if(Date.now()-t0>45000){clearInterval(iv);return res({timeout:1});}
    if(g.phase==='idle'&&g.cur===0)g.roll();
    else if(g.phase==='rolled'&&g.cur===0&&g.movable&&g.movable.length){
     // 替玩家选子: 随机挑一个可动的
     var mv=g.movable;g.doMove(0,mv[Math.floor(Math.random()*mv.length)]);
    }
   }catch(e){clearInterval(iv);return res({err:e.message});}
  },60);
 });
}
async function run(){
 for(const file of ['ludo.html','snakes.html']){
  const N=file.indexOf('ludo')>=0?8:20; // 飞行棋单局长，少跑几局
  console.log('=== '+file+' 自动对打'+N+'局 ===');
  const r={pw:0,aw:0,err:0,timeout:0};
  for(let i=0;i<N;i++){
   const res=await playOne(file,1000+i*7919);
   if(res.err){r.err++;console.log('  ✗ 局'+i+': '+res.err);}
   if(res.timeout){r.timeout++;console.log('  ⏱ 局'+i+': 超时未分胜负');}
   if(res.pw)r.pw++;if(res.aw)r.aw++;
  }
  total++;
  if(r.err===0&&r.timeout===0){console.log('  ✓ 全部完成: 你赢'+r.pw+' AI赢'+r.aw);}
  else{failures++;console.log('  ✗ 有异常: err='+r.err+' timeout='+r.timeout);}
 }
 console.log('\n结果: '+total+'组, 失败'+failures);
 process.exit(failures?1:0);
}
if(require.main===module)run();
module.exports={loadGame,playOne};
