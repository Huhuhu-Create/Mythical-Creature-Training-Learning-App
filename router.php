<?php
// 神兽养成 · PHP 版路由器（零依赖，使用 PHP 内置服务器）
// 题库来源：D:\QClaw\1112\banks\ 下所有 JSON 文件（每份含 题库信息 + 题目数组）
// 运行：php\php.exe -S localhost:8080 -t . router.php

define('ROOT', __DIR__);
define('DATA_DIR', ROOT . '/data');
define('PUBLIC_DIR', ROOT . '/public');
define('BANKS_DIR', ROOT . '/banks');
define('STATE_FILE', DATA_DIR . '/state.json');

if (!is_dir(DATA_DIR)) { mkdir(DATA_DIR, 0777, true); }
if (!is_dir(BANKS_DIR)) { mkdir(BANKS_DIR, 0777, true); }

// ---------- 种子数据 ----------
function seedState() {
    return [
        'animal' => [
            'name' => '小白', 'stage' => 0, 'exp' => 0, 'coins' => 0,
            'happiness' => 100, 'hunger' => 100, 'lastActive' => time() * 1000,
            'lastSignIn' => ''
        ],
        'progress' => [
            'chinese' => ['answered' => 0, 'correct' => 0],
            'math'    => ['answered' => 0, 'correct' => 0],
            'english' => ['answered' => 0, 'correct' => 0],
            'totalAnswered' => 0, 'totalCorrect' => 0, 'lastDay' => ''
        ]
    ];
}

if (!file_exists(STATE_FILE)) {
    file_put_contents(STATE_FILE, json_encode(seedState(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// ---------- 题库：扫描 banks/ 并规范化 ----------
function normalizeBank($info, $rawQuestions) {
    $subject = isset($info['学科']) ? $info['学科'] : '';
    $grade   = isset($info['年级']) ? $info['年级'] : '';
    $term    = isset($info['学期']) ? $info['学期'] : '';
    $out = [];
    foreach ($rawQuestions as $q) {
        // 选项：支持 {A,B,C,D} 对象或数组
        $opts = [];
        if (isset($q['选项']) && is_array($q['选项'])) {
            if (array_keys($q['选项']) !== range(0, count($q['选项']) - 1)) {
                foreach (array_keys($q['选项']) as $k) {
                    $opts[] = ['key' => (string)$k, 'text' => $q['选项'][$k]];
                }
            } else {
                foreach ($q['选项'] as $i => $v) { $opts[] = ['key' => chr(65 + (int)$i), 'text' => $v]; }
            }
        }
        $answer = isset($q['答案']) ? (string)$q['答案'] : '';
        // 兼容答案填下标数字的情况
        if (is_numeric($answer) && isset($opts[(int)$answer])) { $answer = $opts[(int)$answer]['key']; }
        $out[] = [
            'q'        => isset($q['题干']) ? $q['题干'] : (isset($q['q']) ? $q['q'] : ''),
            'options'  => $opts,
            'answer'   => $answer,
            'category' => isset($q['类别']) ? $q['类别'] : '',
            'level'    => isset($q['难度']) ? $q['难度'] : '',
            'explain'  => isset($q['解析']) ? $q['解析'] : (isset($q['explain']) ? $q['explain'] : ''),
            'points'   => isset($q['知识点']) && is_array($q['知识点']) ? $q['知识点'] : [],
            'subject'  => $subject,
            'grade'    => $grade,
            'term'     => $term,
            'id'       => isset($q['id']) ? $q['id'] : null
        ];
    }
    return $out;
}

function loadBanks() {
    $files = glob(BANKS_DIR . '/*.json');
    $banks = [];
    $all = [];
    foreach ($files as $f) {
        $data = json_decode(file_get_contents($f), true);
        if (!is_array($data)) { continue; }
        // 兼容：文件可能是 {题库信息, 题目} 或直接是题目数组
        $info = isset($data['题库信息']) ? $data['题库信息'] : [];
        $qs   = isset($data['题目']) ? $data['题目'] : (isset($data['questions']) ? $data['questions'] : (isset($data[0]) ? $data : []));
        $norm = normalizeBank($info, $qs);
        $meta = [
            'name'    => isset($info['名称']) ? $info['名称'] : basename($f),
            'version' => isset($info['版本']) ? $info['版本'] : '',
            'subject' => isset($info['学科']) ? $info['学科'] : '',
            'grade'   => isset($info['年级']) ? $info['年级'] : '',
            'term'    => isset($info['学期']) ? $info['学期'] : '',
            '教材'     => isset($info['适用教材']) ? $info['适用教材'] : '',
            '总数'     => isset($info['题目总数']) ? $info['题目总数'] : count($norm),
            '创建日期' => isset($info['创建日期']) ? $info['创建日期'] : '',
            '说明'     => isset($info['说明']) ? $info['说明'] : '',
            'file'    => basename($f)
        ];
        $banks[] = array_merge($meta, ['count' => count($norm)]);
        $all = array_merge($all, $norm);
    }
    return ['banks' => $banks, 'questions' => $all];
}

// 按 学科+年级+学期 过滤
function filterQuestions($questions, $subject, $grade, $term) {
    return array_filter($questions, function ($q) use ($subject, $grade, $term) {
        if ($subject && $q['subject'] !== $subject) return false;
        if ($grade && $q['grade'] !== $grade) return false;
        if ($term && $q['term'] !== $term) return false; // 严格按学期匹配：上册只看上册，下册只看下册
        return true;
    });
}

$MIME = [
    '.html' => 'text/html; charset=utf-8',
    '.css'  => 'text/css; charset=utf-8',
    '.js'   => 'application/javascript; charset=utf-8',
    '.json' => 'application/json; charset=utf-8',
    '.svg'  => 'image/svg+xml',
    '.png'  => 'image/png',
    '.ico'  => 'image/x-icon'
];

function sendJSON($code, $obj) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($obj, JSON_UNESCAPED_UNICODE);
    exit;
}

// ---------- 路由 ----------
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// 读取：返回 题库列表 + 当前筛选的题目 + 神兽状态
if ($uri === '/api/load' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    $data = loadBanks();
    $state = json_decode(file_get_contents(STATE_FILE), true);
    $q = $_GET;
    $subject = isset($q['subject']) ? $q['subject'] : '';
    $grade   = isset($q['grade']) ? $q['grade'] : '';
    $term    = isset($q['term']) ? $q['term'] : '';
    $list = $subject || $grade || $term
        ? array_values(filterQuestions($data['questions'], $subject, $grade, $term))
        : $data['questions'];
    sendJSON(200, [
        'state'   => $state,
        'banks'   => $data['banks'],
        'questions' => $list
    ]);
}

// 保存神兽状态
if ($uri === '/api/save' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if ($body === null) { sendJSON(400, ['error' => 'invalid json']); }
    $ok = true;
    if (isset($body['state'])) {
        $ok = file_put_contents(STATE_FILE, json_encode($body['state'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) !== false;
    }
    sendJSON($ok ? 200 : 500, ['ok' => $ok]);
}

// 静态文件
$path = $uri === '/' ? '/index.html' : $uri;
$filePath = realpath(PUBLIC_DIR . $path);
if ($filePath !== false && strpos($filePath, realpath(PUBLIC_DIR)) === 0 && is_file($filePath)) {
    $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
    $ct = isset($MIME['.' . $ext]) ? $MIME['.' . $ext] : 'application/octet-stream';
    header('Content-Type: ' . $ct);
    readfile($filePath);
    exit;
}

http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
echo 'not found';
