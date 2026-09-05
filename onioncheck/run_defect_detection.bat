@echo off
REM Quick Start Script for Defect Detection System
REM ===============================================

echo.
echo ========================================
echo Onion Defect Detection System
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/Update dependencies
echo.
echo Installing dependencies...
pip install -r requirements.txt
echo.

REM Check for .env file
if not exist ".env" (
    echo.
    echo WARNING: .env file not found!
    echo Please create .env file with your Roboflow API key:
    echo ROBOFLOW_API_KEY=your_api_key_here
    echo.
    pause
    exit /b 1
)

REM Display menu
:menu
echo.
echo ========================================
echo Select Application to Run:
echo ========================================
echo.
echo 1. Defect Detection Dashboard (Streamlit)
echo 2. REST API Server (Flask)
echo 3. Run Single Detection Test
echo 4. Exit
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto dashboard
if "%choice%"=="2" goto api
if "%choice%"=="3" goto test
if "%choice%"=="4" goto end

echo Invalid choice. Please try again.
goto menu

:dashboard
echo.
echo Starting Defect Detection Dashboard...
echo Access at: http://localhost:8502
echo.
streamlit run defect_detection_app.py --server.port 8502
goto end

:api
echo.
echo Starting REST API Server...
echo Access at: http://localhost:5000
echo API Documentation: http://localhost:5000/
echo.
python defect_api.py
goto end

:test
echo.
echo Running detection test...
python defect_detection.py
echo.
pause
goto menu

:end
echo.
echo Goodbye!
deactivate
