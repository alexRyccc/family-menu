@echo off
chcp 65001 >nul
title 猫家点菜 - 启动器
echo ==========================================
echo   🐱 猫家点菜 一键启动 (局域网 + 公网)
echo ==========================================
echo.

cd /d %~dp0

REM 检查 node 服务是否已运行
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul
if not errorlevel 1 (
  echo [OK] 点菜服务已在运行 (localhost:3000)
) else (
  echo [启动] 点菜服务...
  start "猫家点菜-服务" /min node server.js
  timeout /t 2 /nobreak >nul
)

echo.
echo 局域网地址:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  echo   http://%%a:3000
)

echo.
echo 公网地址(内网穿透):
echo   请确认已完成: 注册cpolar账号 → cpolar authtoken 你的token
echo   未完成请运行 setup-tunnel.bat
echo.

if exist "%~dp0tunnel-url.txt" (
  echo   上次公网地址: 
  type "%~dp0tunnel-url.txt"
  echo.
)

set /p tunnel=是否启动公网穿透隧道?(y/n):
if /i "%tunnel%"=="y" (
  echo [启动] 公网隧道...
  start "猫家点菜-公网隧道" /min C:\opencode\cpolar\cpolar.exe http 3000
  timeout /t 5 /nobreak >nul
  echo.
  echo 隧道已启动!公网地址请在以下地址查看:
  echo   http://localhost:9200  (cpolar 管理面板)
  echo.
)

pause
