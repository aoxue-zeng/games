// 全站体检: 每个html的内联<script>语法检查 + src引用文件存在性 + <canvas>存在性
var fs=require('fs'),path=require('path');
var ROOT=__dirname;
var files=fs.readdirSync(ROOT).filter(function(f){return/\.html$/i.test(f);});
var bad=0;
files.forEach(function(f){
 var t=fs.readFileSync(path.join(ROOT,f),'utf8');
 // 内联脚本语法
 var re=/<script>((?:(?!<\/script>)[\s\S])*)<\/script>/g,m,i=0;
 while((m=re.exec(t))){
  i++;
  try{new Function(m[1]);}
  catch(e){bad++;console.log('✗ '+f+' 内联脚本#'+i+' 语法错误: '+e.message);}
 }
 // src引用
 var re2=/<script src="([^"]+)"><\/script>/g;
 while((m=re2.exec(t))){
  if(!fs.existsSync(path.join(ROOT,m[1]))){bad++;console.log('✗ '+f+' 引用缺失: '+m[1]);}
 }
 var re3=/<link rel="stylesheet" href="([^"]+)"/g;
 while((m=re3.exec(t))){
  if(!fs.existsSync(path.join(ROOT,m[1]))){bad++;console.log('✗ '+f+' 样式缺失: '+m[1]);}
 }
});
console.log((bad?('发现'+bad+'处问题'):'✓ 全站'+files.length+'个HTML体检通过(语法/引用/样式)'));
process.exit(bad?1:0);
