@echo off
REM ============================================================
REM  OnionSure - Live Quality Inspection Launcher
REM ============================================================

cd /d "C:\Users\darak\Desktop\onion zip\onioncheck"

echo ============================================================
echo   OnionSure - Live Quality Inspection
echo ============================================================
echo.
echo   Select mode:
echo   [1] LOCAL Quality (Seg+Cls) - 100%% local, healthy/unhealthy
echo   [2] Local YOLO (onion detection only, fastest)
echo   [3] Roboflow Cloud API (full defect categories)
echo   [4] Hybrid (local detect + roboflow classify)
echo   [5] Combined (press T to cycle modes at runtime)
echo.
set /p choice="Enter choice (1/2/3/4/5) [default: 1]: "

if "%choice%"=="1" (
    echo Starting LOCAL QUALITY mode (Seg + Cls)...
    .venv\Scripts\python live_onion_quality.py
) else if "%choice%"=="2" (
    echo Starting LOCAL DETECTION mode...
    .venv\Scripts\python live_onion_combined.py --mode local
) else if "%choice%"=="3" (
    echo Starting ROBOFLOW mode...
    .venv\Scripts\python live_onion_combined.py --mode roboflow
) else if "%choice%"=="4" (
    echo Starting HYBRID mode...
    .venv\Scripts\python live_onion_combined.py --mode hybrid
) else (
    echo Starting LOCAL QUALITY mode (Seg + Cls)...
    .venv\Scripts\python live_onion_quality.py
)

pause
