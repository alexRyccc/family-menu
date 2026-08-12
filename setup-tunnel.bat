@echo off
chcp 65001 >nul
title 猫家点菜 - 公网穿透设置
echo ==========================================
echo   🐱 猫家点菜 公网访问设置
echo ==========================================
echo.
echo 首次使用需注册 cpolar 账号(免费):
echo   1. 打开浏览器访问 https://dashboard.cpolar.com/signup
echo      用邮箱注册(免费版就够用)
echo   2. 登录后在左侧菜单点"验证",复制你的 authtoken
echo      格式类似:  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
echo.
echo 现在把 authtoken 粘贴到这里:
set /p token=authtoken: 
if "%token%"=="" (
  echo 未输入 token,退出
  pause
  exit /b
)

echo [1/3] 绑定账号...
"C:\opencode\cpolar\cpolar.exe" authtoken %token%
if errorlevel 1 (
  echo 绑定失败,请检查 token
  pause
  exit /b
)

echo [2/3] 启动公网隧道 (映射 localhost:3000)...
start "猫家点菜-公网隧道" /min C:\opencode\cpolar\cpolar.exe http 3000

echo [3/3] 等待隧道建立...
timeout /t 6 /nobreak >nul

echo.
echo ==========================================
echo   🎉 设置完成!
echo.
echo   查看你的公网地址:
echo     打开 http://localhost:9200
echo     在"在线隧道列表"里找到形如 xxx.cpolar.cn 的地址
echo.
echo   把这个地址发给家人,在任何网络都能访问!
echo ==========================================
pause
