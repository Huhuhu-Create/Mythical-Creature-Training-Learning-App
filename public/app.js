// 神兽养成 · 前端逻辑（支持 学科/年级/学期 题库筛选）
const STAGES = [
  { name: '神兽蛋',     emoji: '🥚' },
  { name: '破壳幼兽',   emoji: '🐣' },
  { name: '灵兽少年',   emoji: '🐉' },
  { name: '成年神兽',   emoji: '🐲' },
  { name: '传说神兽',   emoji: '✨🐲' },
];
const STAGE_NEED = [0, 80, 200, 450, 800];

const EXP_PER_CORRECT = 12;
const EXP_PER_WRONG = 3;
const COIN_PER_CORRECT = 6;
const FEED_COST = 20;

let state = null;       // 神兽 + 进度
let allQuestions = [];  // 当前筛选后的题库
let banks = [];         // 题库信息列表
let current = null;     // 当前答题会话

const $ = id => document.getElementById(id);

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 1600);
}

// ---------- 加载/保存 ----------
async function load() {
  const res = await fetch('/api/load');
  const data = await res.json();
  state = data.state;
  allQuestions = data.questions || [];
  banks = data.banks || [];
  renderBanks();
  applyDecay();
  renderPet();
  renderStats();
  refreshSigninBtn();
}

async function save() {
  state.animal.lastActive = Date.now();
  await fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state })
  });
}

function applyDecay() {
  const min = (Date.now() - (state.animal.lastActive || Date.now())) / 60000;
  if (min > 1) {
    const drop = Math.floor(min * 0.02);
    state.animal.happiness = Math.max(0, state.animal.happiness - drop);
    state.animal.hunger = Math.max(0, state.animal.hunger - drop);
  }
}

// ---------- 渲染 ----------
function stageOf(exp) {
  let s = 0;
  for (let i = 0; i < STAGE_NEED.length; i++) if (exp >= STAGE_NEED[i]) s = i;
  return s;
}

function renderPet() {
  const a = state.animal;
  const st = stageOf(a.exp);
  a.stage = st;
  $('petEmoji').textContent = STAGES[st].emoji;
  $('petName').textContent = a.name;
  $('petStage').textContent = STAGES[st].name;

  const cur = STAGE_NEED[st];
  const next = STAGE_NEED[st + 1] !== undefined ? STAGE_NEED[st + 1] : STAGE_NEED[st] + 1;
  const pct = next > cur ? Math.min(100, Math.round((a.exp - cur) / (next - cur) * 100)) : 100;
  $('expFill').style.width = pct + '%';
  $('expText').textContent = a.exp + (STAGE_NEED[st + 1] !== undefined ? ` / ${next}` : ' (满级)');
  $('happyFill').style.width = a.happiness + '%';
  $('happyText').textContent = a.happiness;
  $('foodFill').style.width = a.hunger + '%';
  $('foodText').textContent = a.hunger;
  $('coinNum').textContent = a.coins;
}

function renderStats() {
  const p = state.progress;
  $('stTotal').textContent = p.totalAnswered;
  $('stCorrect').textContent = p.totalCorrect;
  const rate = p.totalAnswered ? Math.round(p.totalCorrect / p.totalAnswered * 100) : 0;
  $('stRate').textContent = rate + '%';
  $('stC').textContent = `${p.chinese.correct}/${p.chinese.answered}`;
  $('stM').textContent = `${p.math.correct}/${p.math.answered}`;
  $('stE').textContent = `${p.english.correct}/${p.english.answered}`;
}

function renderBanks() {
  const box = $('bankList');
  if (!banks.length) { box.innerHTML = '<p class="hint">尚未放入题库，请把题库 JSON 放进 banks/ 文件夹。</p>'; return; }
  const grade = $('gradeSelect').value;
  const term = $('termSelect').value;
  const subject = window._pickedSubject || '';
  const list = banks.filter(b =>
    (!subject || b.subject === subject) &&
    (!grade || b.grade === grade) &&
    (!term || b.term === term)   // 严格按学期：上册只上册，下册只下册
  );
  if (!list.length) { box.innerHTML = '<p class="hint">当前筛选条件下没有题库，试试放宽年级/学期。</p>'; return; }
  box.innerHTML = list.map(b =>
    `<div class="bank-item">
       <div class="bank-name">📚 ${escapeHtml(b.name)}</div>
       <div class="bank-meta">${b.subject||''} · ${b.grade||''}${b.term?('·'+b.term):''} · ${b.教材||''} · 共${b.总数}题</div>
     </div>`
  ).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

// ---------- 交互 ----------
$('renameBtn').onclick = () => {
  const name = prompt('给神兽取个名字：', state.animal.name);
  if (name && name.trim()) {
    state.animal.name = name.trim().slice(0, 8);
    renderPet(); save();
  }
};

$('feedBtn').onclick = () => {
  const a = state.animal;
  if (a.coins < FEED_COST) { toast('金币不够，去学习赚金币吧！'); return; }
  a.coins -= FEED_COST;
  a.happiness = Math.min(100, a.happiness + 15);
  a.hunger = Math.min(100, a.hunger + 20);
  a.exp += 20;
  renderPet(); toast('喂食成功，神兽更开心啦！成长经验 +20 🌟'); save();
};

$('resetBtn').onclick = async () => {
  if (!confirm('确定重新开始吗？神兽等级和全部学习记录都会清空。')) return;
  await fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: seedReset() })
  });
  await load();
  toast('已重新开始，加油！');
};

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// 每日签到：每天首次 +20 金币
$('signinBtn').onclick = () => {
  const a = state.animal;
  const t = todayStr();
  if (a.lastSignIn === t) { toast('今天已经签到啦，明天再来 ✨'); return; }
  a.lastSignIn = t;
  a.coins += 20;
  renderPet();
  refreshSigninBtn();
  toast('📅 签到成功，+20 金币！');
  burstConfetti();
  save();
};

function refreshSigninBtn() {
  const btn = $('signinBtn');
  if (state.animal.lastSignIn === todayStr()) {
    btn.classList.add('done');
    btn.textContent = '✅ 今日已签到';
  } else {
    btn.classList.remove('done');
    btn.textContent = '📅 每日签到（+20 金币）';
  }
}

function seedReset() {
  return {
    animal: { name: '小白', stage: 0, exp: 0, coins: 0, happiness: 100, hunger: 100, lastActive: Date.now(), lastSignIn: '' },
    progress: {
      chinese: { answered: 0, correct: 0 }, math: { answered: 0, correct: 0 }, english: { answered: 0, correct: 0 },
      totalAnswered: 0, totalCorrect: 0, lastDay: ''
    }
  };
}

// 学科按钮
document.querySelectorAll('.subject-btn').forEach(btn => {
  btn.onclick = () => {
    const subj = btn.dataset.subject;
    window._pickedSubject = subj;
    document.querySelectorAll('.subject-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderBanks();
    startQuiz(subj);
  };
});

$('gradeSelect').onchange = () => { renderBanks(); };
$('termSelect').onchange = () => { renderBanks(); };

$('backBtn').onclick = () => showView('home');
$('againBtn').onclick = () => startQuiz(current.subject);
$('homeBtn').onclick = () => showView('home');

function showView(v) {
  $('homeView').classList.toggle('hidden', v !== 'home');
  $('quizView').classList.toggle('hidden', v !== 'quiz');
  $('resultView').classList.toggle('hidden', v !== 'result');
}

// ---------- 答题 ----------
function startQuiz(subject) {
  const grade = $('gradeSelect').value;
  const term = $('termSelect').value;
  let pool = allQuestions.filter(q =>
    q.subject === subject &&
    (!grade || q.grade === grade) &&
    (!term || q.term === term)   // 严格按学期匹配
  );
  if (!pool.length) {
    pool = allQuestions.filter(q => q.subject === subject);
  }
  if (!pool.length) { toast('该学科暂无比题库，请先放入题库。'); showView('home'); return; }
  shuffle(pool);
  const list = pool.slice(0, Math.min(5, pool.length));
  current = { subject, list, idx: 0, correct: 0, exp: 0, coin: 0, combo: 0, maxCombo: 0 };
  showView('quiz');
  renderQuestion();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function renderQuestion() {
  const q = current.list[current.idx];
  $('quizProgress').textContent = `第 ${current.idx + 1} / ${current.list.length} 题`;
  $('comboBox').innerHTML = current.combo >= 2
    ? `<span class="combo-badge">🔥 连对 ${current.combo}</span>` : '';
  $('quizQ').textContent = q.q;

  const tags = [];
  if (q.category) tags.push(['类别', q.category]);
  if (q.level) tags.push(['难度', q.level]);
  if (q.points && q.points.length) tags.push(['知识点', q.points.join('、')]);
  $('quizTags').innerHTML = tags.map(([k, v]) =>
    `<span class="tag"><b>${k}：</b>${escapeHtml(v)}</span>`
  ).join('');

  $('quizFeedback').classList.add('hidden');
  $('nextBtn').classList.add('hidden');

  const box = $('quizOptions');
  box.innerHTML = '';
  q.options.forEach(opt => {
    const b = document.createElement('button');
    b.className = 'option';
    b.innerHTML = `<span class="opt-key">${opt.key}</span> ${escapeHtml(opt.text)}`;
    b.onclick = () => answer(q, opt.key, b, box);
    box.appendChild(b);
  });
}

function answer(q, key, btn, box) {
  const buttons = box.querySelectorAll('.option');
  buttons.forEach(b => b.disabled = true);
  const right = key === q.answer;
  if (right) btn.classList.add('correct'); else { btn.classList.add('wrong'); buttons.forEach(b => { if (b.querySelector('.opt-key').textContent === q.answer) b.classList.add('correct'); }); }

  const subjKey = { '语文': 'chinese', '数学': 'math', '英语': 'english' }[current.subject] || 'chinese';
  state.progress[subjKey].answered++;
  state.progress.totalAnswered++;
  if (right) {
    current.correct++; current.exp += EXP_PER_CORRECT; current.coin += COIN_PER_CORRECT;
    state.progress[subjKey].correct++; state.progress.totalCorrect++;
    state.animal.exp += EXP_PER_CORRECT;
    state.animal.coins += COIN_PER_CORRECT;
    current.combo++;
    if (current.combo > current.maxCombo) current.maxCombo = current.combo;
    if (current.combo >= 2) burstConfetti();
  } else {
    current.exp += EXP_PER_WRONG;
    state.animal.exp += EXP_PER_WRONG;
    current.combo = 0;
  }

  const fb = $('quizFeedback');
  fb.innerHTML = (right ? '✅ 答对了！' : '❌ 答错了。') + ' ' + escapeHtml(q.explain || '');
  fb.classList.remove('hidden');

  const last = current.idx >= current.list.length - 1;
  const nb = $('nextBtn');
  nb.textContent = last ? '查看结果 🎉' : '下一题 →';
  nb.classList.remove('hidden');
  nb.onclick = () => {
    if (last) finishQuiz();
    else { current.idx++; renderQuestion(); }
  };
}

function finishQuiz() {
  state.animal.happiness = Math.min(100, state.animal.happiness + 5);
  renderPet(); renderStats();
  const beforeStage = stageOf(state.animal.exp - current.exp);
  const afterStage = stageOf(state.animal.exp);
  $('rCorrect').textContent = current.correct + '/' + current.list.length;
  $('rExp').textContent = '+' + current.exp;
  $('rCoin').textContent = '+' + current.coin;
  const ev = $('evolveMsg');
  if (afterStage > beforeStage) {
    ev.textContent = `🎉 神兽进化了！现在是【${STAGES[afterStage].name}】 ${STAGES[afterStage].emoji}`;
    ev.classList.remove('hidden');
  } else ev.classList.add('hidden');
  showView('result');
  save();
}

function burstConfetti() {
  const colors = ['#8b5cf6', '#4dabf7', '#51cf66', '#ff9b72', '#ffc86f', '#ff7aa2'];
  for (let i = 0; i < 16; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDelay = (Math.random() * 0.2) + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 1400);
  }
}

// 启动
load();
