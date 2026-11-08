// ===== sorting.html 归类大师 运行时自动测试 =====
// stub Site API + rAF驱动: 数据完整性 → 连对升级 → 答错扣命 → 超时扣命 → 耗尽3命结束 → 重开
var fs=require('fs'),vm=require('vm');

var SPEED=20;
function fastTimeout(fn,ms){return setTimeout(fn,Math.max(1,(ms||0)/SPEED));}
function fastInterval(fn,ms){return setInterval(fn,Math.max(1,(ms||0)/SPEED));}
function mkEl(id){
 return {_id:id,innerHTML:'',textContent:'',value:'',style:{},dataset:{},children:[],disabled:false,width:0,height:0,
  classList:{add(){},remove(){},toggle(){},contains(){return false}},
  appendChild(c){return c;},removeChild(c){return c;},addEventListener(){},onclick:null,focus(){},blur(){},
  querySelectorAll(){return[]},querySelector(){return mkEl('q');}};
}
function loadGame(file){
 var html=fs.readFileSync(file,'utf8');
 var code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 if(!/\}\)\(\);\s*$/.test(code))throw new Error('不是IIFE结尾');
 var els={},rafQ=[];
 var document={getElementById(id){
  if(!els[id])els[id]=mkEl(id);
  return els[id];
 },querySelector(){return mkEl('q');},querySelectorAll(){return [];},addEventListener(){},removeEventListener(){},
  body:mkEl('body'),createElement(){return mkEl('c');}};
 var MATH=Object.create(Math);MATH.random=Math.random;
 var sb={document,Math:MATH,console,
  setTimeout:fastTimeout,clearTimeout:clearTimeout,setInterval:fastInterval,clearInterval:clearInterval,
  requestAnimationFrame:function(fn){rafQ.push(fn);return rafQ.length;},cancelAnimationFrame:function(){},
  addEventListener:function(){},removeEventListener:function(){},
  performance:{now:()=>Date.now()},
  localStorage:{_d:{},getItem(k){return this._d[k]||null;},setItem(k,v){this._d[k]=v;},removeItem(k){delete this._d[k];}},
  navigator:{userAgent:'t'},alert(){},location:{href:'',pathname:'/'+file},
  SFX:new Proxy({},{get:function(){return function(){};}}),
  AOXSound:new Proxy({},{get:function(){return function(){};}}),
  AOXMobile:new Proxy({},{get:function(){return function(){};}}),
  Site:new Proxy({},{get:function(){return function(){};}})};
 sb.window=sb;sb.self=sb;sb.globalThis=sb;sb.toast=function(){};
 vm.createContext(sb);
 vm.runInContext(code,sb,{filename:file});
 sb.__rafQ=rafQ;
 if(!sb.__T)throw new Error('__T钩子缺失');
 return sb;
}
var failures=0,total=0;
function T(name,cond,detail){
 total++;
 if(cond)console.log('  ✓ '+name);
 else{failures++;console.log('  ✗ '+name+(detail?' → '+detail:''));}
}
function pumpFrame(sb){var q=sb.__rafQ.splice(0);q.forEach(function(fn){fn();});}

console.log('=== sorting.html 归类大师 ===');
try{
 var sb=loadGame('sorting.html');var g=sb.__T;
 var err=null;
 process.on('uncaughtException',function(e){err=e;});

 // -- 1. 类目数据完整性 --
 T('8大类目',g.CATS.length===8,'实际'+g.CATS.length);
 var itemsOk=g.CATS.every(function(c){return c.items.length===10&&c.items.every(function(it){return it[0]&&it[1];});});
 T('每类10个物品且名称齐全',itemsOk);
 var idsOk=g.CATS.every(function(c){return c.id&&c.n&&c.e;});
 T('类目id/名称/图标齐全',idsOk);
 var dupOk=(function(){var seen={};return g.CATS.every(function(c){if(seen[c.id])return false;seen[c.id]=1;return true;});})();
 T('类目id无重复',dupOk);

 // -- 2. 开局状态 --
 g.revealMs=1; // 答错停顿压到最快
 g.start();
 var s=g.state;
 T('开局进入playing',s.mode==='playing','mode='+s.mode);
 T('4个分类桶',!!g.bins&&g.bins.length===4);
 T('桶类目互不相同',(function(){var ids=g.bins.map(function(b){return b.cat.id;});return new Set(ids).size===4;})());
 T('首个物品已发(g.cur)',!!g.cur,'cur='+(g.cur&&g.cur.n));
 T('开局3条命',s.hearts===3,'hearts='+s.hearts);
 T('开局0分',s.score===0,'score='+s.score);

 // -- 3. 连对12次: 得分/连击/升级 --
 function answerRight(){for(var i=0;i<g.bins.length;i++){if(g.bins[i].cat===g.cur.cat)return i;}return -1;}
 function answerWrong(){for(var i=0;i<g.bins.length;i++){if(g.bins[i].cat!==g.cur.cat)return i;}return 0;}
 var guard=0;
 while(g.state.correct<12&&guard<200){
  pumpFrame(sb);
  if(g.state.mode==='playing')g.pickBin(answerRight());
  guard++;
 }
 T('连对12次无异常',!err,err&&err.message);
 T('得分在涨',g.state.score>0,'score='+g.state.score);
 T('连击x12',g.state.combo===12,'combo='+g.state.combo);
 T('答对10题升到Lv2',g.state.level>=2,'level='+g.state.level);
 T('最高分已入库sorting_best',+sb.localStorage.getItem('sorting_best')>0,'best='+sb.localStorage.getItem('sorting_best'));

 // -- 4. 答错: 扣命+清连击+亮答案后继续 --
 var before=g.state.score;
 g.pickBin(answerWrong());
 T('答错扣1命(3→2)',g.state.hearts===2,'hearts='+g.state.hearts);
 T('答错清连击',g.state.combo===0,'combo='+g.state.combo);
 T('答错不加分',g.state.score===before,'score='+g.state.score);
 T('答错进入reveal亮答案',g.state.mode==='reveal','mode='+g.state.mode);
 // fastTimeout下reveal约1ms后自动恢复, 轮询等它回playing
 var wait2=0;
 var iv1=setInterval(function(){
  wait2++;
  if(g.state.mode==='playing'||wait2>100){
   clearInterval(iv1);
   runTimeoutCase();
  }
 },4);
 // -- 5. 超时: 扣命 --
 function runTimeoutCase(){
  T('reveal后回到playing继续',g.state.mode==='playing','mode='+g.state.mode);
  g.timeLeft=0.01;
  var wait3=0;
  var iv2=setInterval(function(){
   pumpFrame(sb);wait3++;
   if(g.state.mode==='reveal'||g.state.hearts<2||wait3>100){
    clearInterval(iv2);
    T('超时扣1命(2→1)',g.state.hearts===1,'hearts='+g.state.hearts+' mode='+g.state.mode);
    drainHearts();
   }
  },4);
 }
 // -- 6. 连错耗尽3命 → 结束+结算 --
 function drainHearts(){
  var wait4=0;
  var iv3=setInterval(function(){
   try{
    pumpFrame(sb);
    if(g.state.mode==='playing')g.pickBin(answerWrong());
    wait4++;
    if(g.state.mode==='over'||wait4>400){
     clearInterval(iv3);
     T('耗尽3命游戏结束',g.state.mode==='over','mode='+g.state.mode);
     T('结算分数>0',g.state.score>0,'score='+g.state.score);
     T('错误次数≥3',g.state.wrong>=3,'wrong='+g.state.wrong);
     T('有答对记录(正确率分母>0)',g.state.correct>0,'correct='+g.state.correct);
     var best=+sb.localStorage.getItem('sorting_best');
     T('最佳分持久化',best===g.state.score,'best='+best+' score='+g.state.score);
     // -- 7. 重开一局状态重置 --
     g.start();
     T('重开后回0分',g.state.score===0,'score='+g.state.score);
     T('重开后满命',g.state.hearts===3,'hearts='+g.state.hearts);
     T('重开后playing',g.state.mode==='playing');
     console.log('\n结果: '+total+'项, 失败'+failures);
     process.exit(failures?1:0);
    }
   }catch(e){clearInterval(iv3);T('收尾流程无异常',false,e.message);process.exit(1);}
  },4);
 }
}catch(e){T('加载',false,e.message);process.exit(1);}
