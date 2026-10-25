#!/bin/bash

# FashionAI - AI Module Setup Script for Linux/macOS

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          FashionAI - AI Module Integration Setup              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "✗ Node.js not found. Please install Node.js 16+ from https://nodejs.org"
    exit 1
fi
echo "✓ Node.js found:"
node --version

if ! command -v python3 &> /dev/null; then
    echo "✗ Python not found. Please install Python 3.8+ from https://python.org"
    exit 1
fi
echo "✓ Python found:"
python3 --version

echo ""
echo "Step 1: Install Backend Dependencies"
echo "========================================"
npm install
if [ $? -ne 0 ]; then
    echo "✗ npm install failed"
    exit 1
fi
echo "✓ Backend dependencies installed"

echo ""
echo "Step 2: Setup Python Environment"
echo "===================================="
cd ai_module

if [ ! -d venv ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "Installing Python dependencies..."
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "✗ Python package installation failed"
    exit 1
fi
echo "✓ Python dependencies installed"

# Install PyTorch with GPU support (optional)
echo ""
read -p "Do you have CUDA available for GPU support? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Installing PyTorch with CUDA support..."
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
fi

echo ""
echo "Step 3: Verify Setup"
echo "====================="
echo "✓ Node.js version:"
node --version
echo "✓ Python version:"
python3 --version
echo "✓ npm packages installed"
echo "✓ Python packages installed"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    SETUP COMPLETE!                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Next Steps:"
echo "1. Download VITON-HD model checkpoints from:"
echo "   https://github.com/yfcc/VITON-HD"
echo ""
echo "2. Place checkpoints in:"
echo "   ai_module/VITON-HD/checkpoints/"
echo ""
echo "3. Required files:"
echo "   - seg_final.pth"
echo "   - gmm_final.pth"
echo "   - alias_final.pth"
echo ""
echo "4. Start the application:"
echo "   npm run dev:full"
echo ""
echo "Or start services individually:"
echo "   Terminal 1: npm run ai-server"
echo "   Terminal 2: npm run backend"
echo "   Terminal 3: npm run frontend"
echo ""
echo "Then open: http://localhost:3000"
echo ""
echo "For more information, see: AI_INTEGRATION_GUIDE.md"
echo ""
