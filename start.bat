@echo off
chcp 65001 >nul
cd /d "%~dp0"

rem 关闭占用 8080 端口的旧服务器（node / php），避免重复实例
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /i "LISTENING" ^| findstr ":8080"') do (
  if not "%%a"=="" taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 >nul

echo 正在启动 神兽养成 学习游戏 (PHP) ...
start "神兽养成PHP服务器" "%~dp0php\php.exe" -S localhost:8080 -t "%~dp0." "%~dp0router.php"
timeout /t 2 >nul
echo.
echo 服务器已启动，请打开浏览器访问：
echo   http://localhost:8080
echo.
echo （关闭上面弹出的服务器窗口即可停止游戏）
pause
