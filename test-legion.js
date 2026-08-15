// 无头测试军团系列：模拟 startScreen → 点击开始 → 跑循环，抓异常
const fs=require('fs');
function makeCtx(){
 const grad={addColorStop(){}};
 return new Proxy({},{get(t,p){
  if(p==='measureText')return()=>({width:10});
  if(p==='createLinearGradient'||p==='createRadialGradient'||p==='createPattern')return()=>grad;
  if(typeof p==='string')return t[p]!==undefined?t[p]:function(){};
  return function(){};
 },set(t,p,v){t[p]=v;return true;}});
}
function makeEl(tag){
 const el={
  tag:tag||'div',style:{},dataset:{},children:[],_handlers:{},
  _parent:null,
  set innerHTML(v){el._html=v;},get innerHTML(){return el._html||'';},
  textContent:'',
  className:'',
  classList:{add(){},remove(){},toggle(){},contains(){return false;}},
  appendChild(ch){el.children.push(ch);ch._parent=el;return ch;},
  addEventListener(){},removeEventListener(){},
  getBoundingClientRect(){return{left:0,top:0,width:960,height:600};},
  querySelector(){return null;},querySelectorAll(){return[];},
  focus(){},click(){},remove(){},
  getContext(){return makeCtx();},
  width:960,height:600,
 };
 return el;
}
function testFile(f){
 const html=fs.readFileSync(f,'utf8');
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 const ids={};
 const document={
  getElementById(id){if(!ids[id])ids[id]=makeEl();return ids[id];},
  createElement(tag){return makeEl(tag);},
  querySelectorAll(){return[];},
  querySelector(){return null;},
  addEventListener(){},
  documentElement:makeEl('html'),
 };
 const rafQ=[];
 const window={};
 const localStorage={_s:{},getItem(k){return this._s[k]||null;},setItem(k,v){this._s[k]=String(v);},removeItem(k){delete this._s[k];}};
 const globals={
  document,window,localStorage,
  requestAnimationFrame(cb){rafQ.push(cb);},
  setTimeout,clearTimeout,setInterval,clearInterval,
  navigator:{userAgent:'test'},
  innerWidth:960,innerHeight:600,
  console,Math,Date,JSON,
 };
 let frames=0;
 function pump(n){
  for(let i=0;i<n;i++){
   const q=rafQ.splice(0,rafQ.length);
   if(!q.length)break;
   frames+=q.length;
   q.forEach(cb=>cb(i));
  }
 }
 try{
  scripts.forEach((s,i)=>{
   new Function('window','document','localStorage','requestAnimationFrame','navigator','innerWidth','innerHeight','setTimeout','clearTimeout','setInterval','clearInterval',s)(window,document,localStorage,globals.requestAnimationFrame,globals.navigator,960,600,setTimeout,clearTimeout,setInterval,clearInterval);
  });
  pump(5); // 菜单帧
  const go=ids['goBtn'];
  if(!go||!go.onclick){console.log(f+': ✗ 找不到开始按钮');return;}
  go.onclick();
  pump(3600); // 开战后跑300帧
  console.log(f+': ✓ 无异常, 帧数='+frames);
 }catch(e){
  console.log(f+': ✗✗✗ 异常! '+e.stack.split('\n').slice(0,4).join(' | '));
 }
}
['legion.html','legion2.html','legion3.html','legion4.html'].forEach(testFile);
