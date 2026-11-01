@echo off
chcp 65001 > nul
title Eradel 패키지 빌드 (EXE + PCK)

set "TOOLS_BUILD_DIR=%~dp0"
for %%I in ("%TOOLS_BUILD_DIR%..\..") do set "PROJECT_ROOT=%%~fI"
set "GODOT_DIR=%PROJECT_ROOT%\Godot"
set "ERADEL_DIR=%GODOT_DIR%\eradel"
set "BUILD_DIR=%GODOT_DIR%\build"
set "GODOT_CONSOLE=%GODOT_DIR%\Godot_v4.6.3-stable_win64_console.exe"
set "GODOT_EXE=%GODOT_DIR%\Godot_v4.6.3-stable_win64.exe"

echo ===================================================
echo [Eradel] PCK 및 EXE 빌드를 시작합니다. (실행 안 함)
echo ===================================================

if not exist "%BUILD_DIR%" (
    echo [*] build 폴더 생성 중...
    mkdir "%BUILD_DIR%"
)

echo.
echo [1/2] Eradel.exe 준비 중...
if exist "%GODOT_EXE%" (
    copy /y "%GODOT_EXE%" "%BUILD_DIR%\Eradel.exe" > nul
    echo  -> Eradel.exe 복사 및 갱신 완료
) else (
    echo [경고] %GODOT_EXE% 파일을 찾을 수 없습니다.
)

echo.
echo [2/2] 최신 리소스 패키징 중 (Eradel.pck 생성)...
"%GODOT_CONSOLE%" --headless --path "%ERADEL_DIR%" --export-pack "ERADEL" "%BUILD_DIR%\Eradel.pck"

if %ERRORLEVEL% neq 0 (
    echo.
    echo [오류] PCK 빌드에 실패했습니다. (에러 코드: %ERRORLEVEL%)
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo [성공] 빌드가 완료되었습니다! (즉시 실행하지 않습니다)
echo.
echo 생성된 빌드 산출물 (%BUILD_DIR%):
dir "%BUILD_DIR%\Eradel.*" /b
echo ===================================================
echo.
pause
