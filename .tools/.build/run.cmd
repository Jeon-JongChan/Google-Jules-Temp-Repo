@echo off
chcp 65001 > nul
title Eradel 게임 실행

set "TOOLS_BUILD_DIR=%~dp0"
for %%I in ("%TOOLS_BUILD_DIR%..\..") do set "PROJECT_ROOT=%%~fI"
set "BUILD_DIR=%PROJECT_ROOT%\Godot\build"

cd /d "%BUILD_DIR%"

if not exist "Eradel.exe" (
    echo [오류] Eradel.exe 파일을 찾을 수 없습니다. 먼저 build 스크립트를 실행해주세요.
    pause
    exit /b 1
)

start "" "Eradel.exe"
