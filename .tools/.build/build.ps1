# Eradel 패키지 빌드 스크립트 (EXE + PCK)
# 게임을 실행하지 않고 Godot/build/ 폴더에 실행 파일 및 리소스 팩만 생성합니다.

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptDir "..\..")).Path
$godotDir = Join-Path $projectRoot "Godot"
$eradelDir = Join-Path $godotDir "eradel"
$buildDir = Join-Path $godotDir "build"
$godotConsole = Join-Path $godotDir "Godot_v4.6.3-stable_win64_console.exe"
$godotExe = Join-Path $godotDir "Godot_v4.6.3-stable_win64.exe"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "[Eradel] PCK 및 EXE 빌드를 시작합니다. (실행 안 함)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

if (-not (Test-Path $buildDir)) {
    Write-Host "[*] build 폴더 생성 중: $buildDir"
    New-Item -ItemType Directory -Path $buildDir | Out-Null
}

Write-Host "`n[1/2] Eradel.exe 준비 중..." -ForegroundColor Yellow
if (Test-Path $godotExe) {
    Copy-Item -Path $godotExe -Destination (Join-Path $buildDir "Eradel.exe") -Force
    Write-Host " -> Eradel.exe 복사 및 갱신 완료" -ForegroundColor Green
} else {
    Write-Warning "엔진 파일($godotExe)을 찾을 수 없습니다."
}

Write-Host "`n[2/2] 최신 리소스 패키징 중 (Eradel.pck 생성)..." -ForegroundColor Yellow
$proc = Start-Process -FilePath $godotConsole -ArgumentList @("--headless", "--path", "`"$eradelDir`"", "--export-pack", "ERADEL", "`"$buildDir\Eradel.pck`"") -NoNewWindow -Wait -PassThru

if ($proc.ExitCode -ne 0) {
    Write-Error "[오류] PCK 빌드에 실패했습니다. (에러 코드: $($proc.ExitCode))"
    exit $proc.ExitCode
}

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "[성공] 빌드가 완료되었습니다! (즉시 실행하지 않습니다)" -ForegroundColor Green
Write-Host "`n생성된 빌드 산출물 ($buildDir):" -ForegroundColor Cyan
Get-ChildItem -Path $buildDir -Filter "Eradel.*" | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize
Write-Host "===================================================" -ForegroundColor Cyan
