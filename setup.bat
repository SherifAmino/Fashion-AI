@echo off
REM FashionAI - AI Module Setup Script for Windows

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║          FashionAI - AI Module Integration Setup              ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Check prerequisites
echo Checking prerequisites...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ✗ Node.js not found. Please install Node.js 16+ from https://nodejs.org
    exit /b 1
)
echo ✓ Node.js found: 
node --version

where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ✗ Python not found. Please install Python 3.8+ from https://python.org
    exit /b 1
)
echo ✓ Python found:
python --version

echo.
echo Step 1: Install Backend Dependencies
echo ========================================
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ✗ npm install failed
    exit /b 1
)
echo ✓ Backend dependencies installed

echo.
echo Step 2: Setup Python Environment
echo =====================================
cd ai_module
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat

echo Installing Python dependencies...
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo ✗ Python package installation failed
    exit /b 1
)
echo ✓ Python dependencies installed

echo.
echo Step 3: Verify Setup
echo =====================
echo ✓ Node.js version:
node --version
echo ✓ Python version:
python --version
echo ✓ npm packages installed
echo ✓ Python packages installed

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                    SETUP COMPLETE!                             ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo Next Steps:
echo 1. Download VITON-HD model checkpoints from:
echo    https://github.com/yfcc/VITON-HD
echo.
echo 2. Place checkpoints in:
echo    ai_module\VITON-HD\checkpoints\
echo.
echo 3. Required files:
echo    - seg_final.pth
echo    - gmm_final.pth
echo    - alias_final.pth
echo.
echo 4. Start the application:
echo    npm run dev:full
echo.
echo Or start services individually:
echo    Terminal 1: npm run ai-server
echo    Terminal 2: npm run backend
echo    Terminal 3: npm run frontend
echo.
echo Then open: http://localhost:3000
echo.
echo For more information, see: AI_INTEGRATION_GUIDE.md
echo.
pause
