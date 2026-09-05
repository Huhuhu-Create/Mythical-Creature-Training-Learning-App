// 神兽养成 · 学习小游戏  —  零依赖 Node 服务器
// 所有数据保存在本目录下的 data/ 文件夹中（state.json、questions.json）
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const PUBLIC_DIR = path.join(ROOT, 'public');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const QUESTIONS_FILE = path.join(DATA_DIR, 'questions.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- 种子数据 ----------
function seedState() {
  return {
    animal: {
      name: '小白',
      stage: 0,        // 当前阶段下标
      exp: 0,          // 经验值
      coins: 0,        // 金币
      happiness: 100,  // 心情 0-100
      hunger: 100,     // 饱食 0-100
      lastActive: Date.now()
    },
    progress: {
      chinese: { answered: 0, correct: 0 },
      math:    { answered: 0, correct: 0 },
      english: { answered: 0, correct: 0 },
      totalAnswered: 0,
      totalCorrect: 0,
      lastDay: ''
    }
  };
}

function seedQuestions() {
  return {
    chinese: [
      { q: "“月亮”的正确拼音是？", options: ["yuè liàng", "yè liàng", "yuè lián", "yuè làng"], answer: 0, grade: 1, explain: "“月”读 yuè，“亮”读 liàng。" },
      { q: "“明”字是由哪两个部分组成的？", options: ["日 + 月", "日 + 目", "木 + 月", "口 + 月"], answer: 0, grade: 1, explain: "日月明，日和月组成“明”。" },
      { q: "下列词语中没有错别字的是？", options: ["在见", "再见", "在见你", "在见啦"], answer: 1, grade: 1, explain: "正确写法是“再见”。" },
      { q: "“春眠不觉晓”的下一句是？", options: ["处处闻啼鸟", "夜来风雨声", "花落知多少", "床前明月光"], answer: 0, grade: 2, explain: "出自《春晓》：春眠不觉晓，处处闻啼鸟。" },
      { q: "“高兴”的近义词是？", options: ["生气", "开心", "难过", "伤心"], answer: 1, grade: 1, explain: "“开心”和“高兴”意思相近。" },
      { q: "“一”字加一笔可以变成下列哪个字？", options: ["二", "三", "大", "人"], answer: 0, grade: 1, explain: "“一”加一横变成“二”（也可变“十”“七”等）。" },
      { q: "“书”的拼音是？", options: ["shū", "sū", "shōu", "shuō"], answer: 0, grade: 1, explain: "“书”读 shū。" },
      { q: "下列哪一句是比喻句？", options: ["他跑得像兔子一样快", "他跑了", "他笑了", "他来了"], answer: 0, grade: 3, explain: "把“他”比作“兔子”，是比喻。" },
      { q: "“红”的反义词（常见对子）是？", options: ["白", "绿", "蓝", "黄"], answer: 0, grade: 1, explain: "红对联常配白（或黑），这里取“白”。" }
    ],
    math: [
      { q: "3 + 5 = ?", options: ["7", "8", "9", "10"], answer: 1, grade: 1, explain: "3 + 5 = 8。" },
      { q: "12 - 7 = ?", options: ["4", "5", "6", "7"], answer: 1, grade: 1, explain: "12 - 7 = 5。" },
      { q: "4 × 3 = ?", options: ["7", "12", "9", "10"], answer: 1, grade: 2, explain: "4 × 3 = 12。" },
      { q: "15 ÷ 3 = ?", options: ["3", "4", "5", "6"], answer: 2, grade: 2, explain: "15 ÷ 3 = 5。" },
      { q: "小明有 6 颗糖，吃了 2 颗，还剩几颗？", options: ["3", "4", "5", "8"], answer: 1, grade: 1, explain: "6 - 2 = 4（颗）。" },
      { q: "9 + 8 = ?", options: ["15", "16", "17", "18"], answer: 2, grade: 2, explain: "9 + 8 = 17。" },
      { q: "20 - 13 = ?", options: ["6", "7", "8", "9"], answer: 1, grade: 2, explain: "20 - 13 = 7。" },
      { q: "5 × 4 = ?", options: ["9", "20", "15", "25"], answer: 1, grade: 2, explain: "5 × 4 = 20。" },
      { q: "一个苹果 2 元，买 3 个要几元？", options: ["5", "6", "8", "10"], answer: 1, grade: 2, explain: "2 × 3 = 6（元）。" }
    ],
    english: [
      { q: "“苹果”的英语是？", options: ["apple", "banana", "orange", "pear"], answer: 0, grade: 1, explain: "apple = 苹果。" },
      { q: "“猫”的英语是？", options: ["cat", "dog", "pig", "cow"], answer: 0, grade: 1, explain: "cat = 猫。" },
      { q: "“Hello” 的意思是？", options: ["你好", "再见", "谢谢", "对不起"], answer: 0, grade: 1, explain: "Hello = 你好。" },
      { q: "“红色”的英语是？", options: ["red", "blue", "green", "yellow"], answer: 0, grade: 1, explain: "red = 红色。" },
      { q: "选词填空：I ___ a student.（我是一名学生）", options: ["am", "is", "are", "be"], answer: 0, grade: 2, explain: "I 搭配 am。" },
      { q: "“书”的英语是？", options: ["book", "pen", "bag", "desk"], answer: 0, grade: 1, explain: "book = 书。" },
      { q: "“狗”的英语是？", options: ["dog", "cat", "pig", "duck"], answer: 0, grade: 1, explain: "dog = 狗。" },
      { q: "“Thank you” 的意思是？", options: ["谢谢", "对不起", "请", "不客气"], answer: 0, grade: 1, explain: "Thank you = 谢谢。" },
      { q: "“太阳”的英语是？", options: ["sun", "moon", "star", "sky"], answer: 0, grade: 1, explain: "sun = 太阳。" }
    ]
  };
}

if (!fs.existsSync(QUESTIONS_FILE)) {
  fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(seedQuestions(), null, 2), 'utf8');
}
if (!fs.existsSync(STATE_FILE)) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(seedState(), null, 2), 'utf8');
}

// ---------- HTTP ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 5e6) req.destroy(); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  // 读取全部数据
  if (p === '/api/load' && req.method === 'GET') {
    try {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      const questions = JSON.parse(fs.readFileSync(QUESTIONS_FILE, 'utf8'));
      sendJSON(res, 200, { state, questions });
    } catch (e) { sendJSON(res, 500, { error: e.message }); }
    return;
  }

  // 保存数据（state / questions 二选一或都传）
  if (p === '/api/save' && req.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(req) || '{}');
      if (body.state) fs.writeFileSync(STATE_FILE, JSON.stringify(body.state, null, 2), 'utf8');
      if (body.questions) fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(body.questions, null, 2), 'utf8');
      sendJSON(res, 200, { ok: true });
    } catch (e) { sendJSON(res, 500, { error: e.message }); }
    return;
  }

  // 静态文件
  let filePath = path.join(PUBLIC_DIR, p === '/' ? 'index.html' : p);
  filePath = path.normalize(filePath);
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end('forbidden'); return; }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404); res.end('not found');
  }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`神兽养成学习游戏已启动: http://localhost:${PORT}`);
  console.log(`数据目录: ${DATA_DIR}`);
});
