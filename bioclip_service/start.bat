@echo off
REM Startup script for BioClip service (Windows)

echo 🌿 Starting BioClip Service...

REM Check if virtual environment exists
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install/update dependencies
echo 📥 Installing dependencies...
python -m pip install -q --upgrade pip
python -m pip install -q -r requirements.txt

REM Set default environment variables if not set
if "%BIOCLIP_PORT%"=="" set BIOCLIP_PORT=5000
if "%BIOCLIP_HOST%"=="" set BIOCLIP_HOST=127.0.0.1
if "%FLASK_DEBUG%"=="" set FLASK_DEBUG=false

echo ✅ Starting service on %BIOCLIP_HOST%:%BIOCLIP_PORT%
python app.py

