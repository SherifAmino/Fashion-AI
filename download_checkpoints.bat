@echo off
REM Download VITON-HD Model Checkpoints
REM This script helps download the required model files

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║     VITON-HD Model Checkpoints Download Guide                  ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

echo The VITON-HD model requires 3 checkpoint files:
echo  1. seg_final.pth    (Segmentation model - ~210 MB)
echo  2. gmm_final.pth    (Geometric Matching - ~90 MB)
echo  3. alias_final.pth  (Try-on Synthesis - ~220 MB)
echo.
echo Total size: ~520 MB
echo.

echo METHOD 1: Direct Download (Recommended)
echo =====================================
echo Visit the official VITON-HD repository and download from the "Checkpoint" section:
echo https://github.com/yfcc/VITON-HD
echo.
echo Or download from the provided links in the README.
echo.

echo METHOD 2: Using Git LFS
echo =======================
echo If you have Git LFS installed:
echo   1. Install Git LFS: https://git-lfs.com/
echo   2. Run: git lfs install
echo   3. Clone the repo: git clone https://github.com/yfcc/VITON-HD.git
echo.

echo METHOD 3: Alternative Download Sources
echo =======================================
echo Google Drive link (usually in the repo):
echo https://drive.google.com/...
echo.

echo WHERE TO PLACE FILES
echo ====================
echo Create this directory if it doesn't exist:
echo    ai_module\VITON-HD\checkpoints\
echo.
echo Then place the three .pth files there:
echo    ai_module\VITON-HD\checkpoints\seg_final.pth
echo    ai_module\VITON-HD\checkpoints\gmm_final.pth
echo    ai_module\VITON-HD\checkpoints\alias_final.pth
echo.

echo VERIFICATION
echo =============
echo After downloading, verify the files exist:
echo.
cd /d "%~dp0ai_module\VITON-HD\checkpoints" 2>nul
if exist *.pth (
    echo ✓ Checkpoints found:
    dir *.pth /b
) else (
    echo ✗ No checkpoints found yet. Please download them.
    cd /d "%~dp0"
)

echo.
echo NEXT STEPS
echo ==========
echo 1. Download the 3 checkpoint files from VITON-HD repository
echo 2. Extract and place in: ai_module\VITON-HD\checkpoints\
echo 3. Return to this directory and run: npm run dev:full
echo.
pause
