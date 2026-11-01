# Eradel 게임 실행 PowerShell 스크립트
# Godot/build/Eradel.exe를 실행합니다.

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptDir "..\..")).Path
$buildDir = Join-Path $projectRoot "Godot\build"
$exePath = Join-Path $buildDir "Eradel.exe"

if (-not (Test-Path $exePath)) {
    Write-Error "[오류] Eradel.exe 파일을 찾을 수 없습니다: $exePath. 먼저 build 스크립트를 실행해주세요."
    pause
    exit 1
}

Start-Process -FilePath $exePath -WorkingDirectory $buildDir
Write-Host "Eradel 게임이 성공적으로 실행되었습니다." -ForegroundColor Green
