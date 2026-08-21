@echo off
echo Starting Bank Marketing API Server...
echo.

REM Always run from backend-api directory
cd /d "%~dp0"

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if virtual environment exists
if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo WARNING: Virtual environment not found. Using system Python.
    echo Consider creating a virtual environment: python -m venv venv
    echo.
)

REM Check if requirements are installed
python -c "import fastapi" >nul 2>&1
if errorlevel 1 (
    echo Installing requirements...
    pip install -r requirements.txt
    echo.
)

REM Start the API server
echo Starting FastAPI server on http://127.0.0.1:8000
echo API Documentation: http://127.0.0.1:8000/docs
echo.
python -m uvicorn api:app --reload --host 0.0.0.0 --port 8000

pause


