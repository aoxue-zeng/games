// 军团系列全组合回归测试: 英雄×地图×模式×画布点击
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
  tag:tag||'div',style:{},dataset:{},children:[],_html:'',_ev:{},_qsl:null,
  set innerHTML(v){el._html=v;},get innerHTML(){return el._html||'';},
  textContent:'',className:'',
  classList:{add(){},remove(){},toggle(){},contains(){return false;}},
  appendChild(ch){el.children.push(ch);return ch;},
  addEventListener(n,f){el._ev[n]=f;},removeEventListener(){},
  dispatch(n,e){if(el._ev[n])el._ev[n](e);},
  getBoundingClientRect(){return{left:0,top:0,width:960,height:600};},
  querySelector(){return null;},
  // 从 innerHTML 解析 [data-x] 选择器, 供商店按钮点击测试
  querySelectorAll(sel){
   const k=(sel.match(/\[data-(\w+)\]/)||[])[1];if(!k)return[];
   const out=[];const re=new RegExp('data-'+k+'="([^"]*)"','g');let m;
   while((m=re.exec(el._html||''))){const e2=makeEl();e2.dataset[k]=m[1];out.push(e2);}
   el._qsl=out;return out;
  },
  focus(){},click(){},remove(){},
  getContext(){return makeCtx();},
  width:960,height:600,
 };
 return el;
}
function loadWithOpts(f){
 const html=fs.readFileSync(f,'utf8');
 const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
 const ids={};const optPool={};
 const document={
  getElementById(id){return ids[id]||(ids[id]=makeEl());},
  createElement(tag){return makeEl(tag);},
  querySelectorAll(sel){
   const key=sel.match(/\[data-(\w+)\]/);if(!key)return[];
   const k=key[1];const cnt={h:8,m:7,b:3,r:3,d:3,mode:2}[k]||0;
   optPool[k]=optPool[k]||Array.from({length:cnt},(_,i)=>{const e=makeEl();e.dataset[k]='mode'===k?['siege','defense'][i]:String(i);return e;});
   return optPool[k];
  },
  querySelector(){return null;},addEventListener(){},
 };
 const raf=[];const window={addEventListener:()=>{}};
 new Function('window','document','localStorage','requestAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','navigator',scripts.join('\n'))
  (window,document,{getItem:()=>null,setItem(){}},cb=>raf.push(cb),setTimeout,clearTimeout,setInterval,clearInterval,{userAgent:'t'});
 function pump(n){for(let i=0;i<n;i++){const q=raf.splice(0);if(!q.length)break;q.forEach(cb=>cb(i));}}
 return {ids,optPool,pump};
}
function matrix(f){
 const heroes=(f==='legion.html'||f==='legion2.html')?[0]:[0,1,2,3,4,5,6,7];
 const MAPCNT={'legion.html':1,'legion2.html':4,'legion3.html':6,'legion4.html':7};const maps=Array.from({length:MAPCNT[f]||7},(_,i)=>i);
 const modes=['siege','defense'];
 let fails=0,runs=0;
 for(const mode of modes)for(const mp of maps)for(const h of heroes){
  runs++;
  const {ids,optPool,pump}=loadWithOpts(f);
  try{
   pump(2);
   const click=(k,v)=>{const el=(optPool[k]||[]).find(e=>e.dataset[k]===String(v));if(el&&el.onclick)el.onclick();};
   if(optPool.mode)click('mode',mode);
   if(optPool.m&&optPool.m[mp])click('m',mp);
   if(optPool.h&&optPool.h[h])click('h',h);
   if(optPool.b)click('b',2);
   if(optPool.r)click('r',2);
   if(optPool.d)click('d','normal');
   const go=ids['goBtn'];go.onclick();
   pump(300);
   const cv=ids['game'];
   for(let i=0;i<4;i++){
    cv.dispatch('mousedown',{clientX:120+i*180,clientY:250+(i*80)%250,preventDefault(){}});
    pump(40);
   }
   pump(500);
  }catch(e){
   fails++;
   console.log('  ✗ '+f+' mode='+mode+' map='+mp+' hero='+h+' → '+e.message);
  }
 }
 console.log((fails?'⚠':'✓')+' '+f+': '+runs+'组合, 失败'+fails);
}
['legion.html','legion2.html','legion3.html','legion4.html'].forEach(matrix);
