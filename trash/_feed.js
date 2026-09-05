const fs = require('fs');
const s = fs.readFileSync('public/app.js', 'utf8');
try { new Function(s); console.log('app.js 语法: OK'); } catch (e) { console.log('语法错误:', e.message); }
const i = s.indexOf('a.exp += 20');
console.log('喂食加经验已写入:', i !== -1);
if (i !== -1) console.log('上下文:', s.slice(i - 50, i + 70).replace(/\n/g, ' '));
