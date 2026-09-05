# 任务：将神兽养成游戏后端由 Node.js 改为 PHP

## 目标
用户要求把游戏后端从 Node.js（server.js）改为 PHP，数据仍保存在 `D:\QClaw\1112\data`。

## 执行结果
- 已成功切换到 PHP 版本，前端（public/）完全复用，无需改动。
- 后端改为 `router.php`，使用 PHP 8.4.25 内置服务器（`php -S`）驱动，提供静态文件 + `/api/load`、`/api/save`，逻辑与原 Node 版一致。

## 环境处理（按 qclaw-env skill 流程）
- 检测：PHP 未安装；Windows 10.0.26200 x64；winget 可用；windows.php.net 可达。
- 下载官方 Windows 构建 `php-8.4.25-Win32-vs17-x64.zip`（35MB）→ 解压到 `D:\QClaw\1112\php\`，并复制出 `php.ini`（json 扩展可用）。
- 验证：`php -v` 正常，`json` 扩展 OK。

## 验证
- `GET /api/load` → 200，正确返回 state/questions（UTF-8「小白」正常）。
- `POST /api/save` → 200，写入文件经检验中文正确（「小龙马」持久化无误）。
- 静态 `/`、`/app.js` 均 200。
- 启动时序注意：首请求若早于服务器就绪会 500，加 1~2 秒等待即可；`start.bat` 已含 2 秒延迟。

## 待清理（被安全策略拦截，需用户确认）
旧 Node 版遗留文件，可删除（不可恢复）：
- `server.js`、`server.pid`、`reset.js`、`php.zip`
另：`php_error.log` 为调试日志，亦可删。
注：`.idea` 目录疑似 IDE 生成，未动。

## 启动方式
- 双击 `start.bat`；或命令行 `php\php.exe -S localhost:8080 -t . router.php`
- 访问 http://localhost:8080
