# FashionAI - AI Module Integration Guide

This guide explains how the AI module (VITON-HD) is integrated into the FashionAI application.

## Architecture Overview

```
FashionAI Application
├── Frontend (HTML/CSS/JS)
│   └── try-on.html + ai-tryon.js
├── Backend (Node.js/Express)
│   ├── backend/routes/ai.js (API endpoints)
│   └── backend/server.js (Express server)
└── AI Module (Python)
    ├── ai_module/api_server.py (Flask API)
    ├── ai_module/VITON-HD/ (Model files)
    └── ai_module/requirements.txt (Python deps)
```

## How It Works

### 1. Frontend (try-on.html)
- Users upload a full-body photo
- Select a garment product from the catalog
- Click "Process Try-On"
- ai-tryon.js sends request to backend with:
  - Base64 encoded person image
  - Garment product ID

### 2. Backend (backend/routes/ai.js)
- Receives try-on request from frontend
- Validates user authentication
- Fetches garment details from database
- Sends form data to Python AI API with:
  - Person image buffer
  - Garment image buffer
- Stores result in database
- Returns result image to frontend

### 3. AI Module (ai_module/api_server.py)
- Flask server running on port 5000
- Receives person and garment images
- Runs VITON-HD model inference:
  1. **SegGenerator**: Human parsing/segmentation
  2. **GMM**: Geometric matching module (warping)
  3. **ALIASGenerator**: Try-on synthesis (blending)
- Returns result image as base64
- Supports GPU acceleration (CUDA)

## Installation & Setup

### Prerequisites
- Node.js >= 16
- Python >= 3.8
- CUDA 11.8+ (for GPU) or CPU-only PyTorch

### Step 1: Backend Setup
```bash
cd fashionnAI
npm install
```

### Step 2: AI Module Setup
```bash
cd ai_module

# Create Python virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# For GPU support (CUDA 11.8):
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# For CPU-only:
pip install torch torchvision torchaudio
```

### Step 3: Download Model Checkpoints
The VITON-HD model requires pretrained weights:
```bash
cd ai_module/VITON-HD/checkpoints/

# Download from the official VITON-HD repository:
# https://github.com/yfcc/VITON-HD

# Required files:
# - seg_final.pth    (Human parsing model)
# - gmm_final.pth    (Geometric matching model)
# - alias_final.pth  (Try-on synthesis model)
```

### Step 4: Database Migration
The backend automatically creates the `try_ons` table on startup. To manually run migration:
```bash
node backend/migrations/001_add_try_ons_table.js
```

## Running the Application

### Option 1: Development Mode (All Services)
```bash
npm run dev:full
```
This starts:
- Python AI API server (port 5000)
- Node.js backend (port 3001)
- Static frontend server (port 3000)

### Option 2: Individual Services

**Terminal 1 - AI Server:**
```bash
npm run ai-server
# or
python ai_module/api_server.py --host localhost --port 5000
```

**Terminal 2 - Backend:**
```bash
npm run backend
# API available at http://localhost:3001
```

**Terminal 3 - Frontend:**
```bash
npm run frontend
# UI available at http://localhost:3000
```

## API Endpoints

### Health Check
```
GET /api/ai/health
```
Check if AI engine is running and models are loaded.

### Model Status
```
GET /api/ai/models
```
Get information about loaded AI models.

### Generate Try-On
```
POST /api/ai/tryon
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "person_image_base64": "data:image/png;base64,...",
  "garment_id": 123
}

Response:
{
  "success": true,
  "tryon_id": 456,
  "result_image": "/uploads/tryon/tryon_1_1234567890.png",
  "created_at": "2024-05-08T10:30:00Z"
}
```

### Get User's Try-Ons
```
GET /api/ai/try-ons?page=1&limit=12
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "try_ons": [
    {
      "id": 456,
      "garment": { "id": 123, "name": "...", "price": ... },
      "result_image": "/uploads/tryon/...",
      "created_at": "2024-05-08T10:30:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "pages": 1
}
```

### Get Specific Try-On
```
GET /api/ai/try-ons/:id
Authorization: Bearer <JWT_TOKEN>
```

### Delete Try-On
```
DELETE /api/ai/try-ons/:id
Authorization: Bearer <JWT_TOKEN>
```

## Database Schema

### try_ons Table
```sql
CREATE TABLE try_ons (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL (user reference),
  garment_id      INTEGER NOT NULL (product reference),
  person_image    TEXT NOT NULL (base64 encoded),
  result_image    TEXT NOT NULL (file path),
  processing_time INTEGER,
  created_at      TEXT NOT NULL
);
```

## File Locations

```
fashionnAI/
├── ai_module/
│   ├── api_server.py              ← Flask AI API server
│   ├── requirements.txt            ← Python dependencies
│   └── VITON-HD/
│       ├── networks.py             ← Neural network models
│       ├── datasets.py             ← Data loading
│       ├── utils.py                ← Utility functions
│       ├── test.py                 ← Test script
│       ├── checkpoints/            ← Model weights (download separately)
│       └── README.md               ← VITON-HD documentation
├── backend/
│   ├── routes/ai.js                ← Backend AI API routes
│   ├── database.js                 ← Database schema (includes try_ons)
│   └── server.js                   ← Express server (includes AI routes)
├── ai-tryon.js                     ← Frontend JS client
├── try-on.html                     ← Try-on UI
└── package.json                    ← Updated with dependencies
```

## Troubleshooting

### AI Engine Not Responding
```
✗ AI engine unavailable: Connection refused

Solution:
- Check Python server is running: npm run ai-server
- Verify port 5000 is not blocked
- Check Python installation and dependencies: pip install -r requirements.txt
```

### Model Checkpoints Not Found
```
⚠ Segmentation checkpoint not found
⚠ GMM checkpoint not found
⚠ ALIAS checkpoint not found

Solution:
- Download checkpoints from: https://github.com/yfcc/VITON-HD
- Place in: ai_module/VITON-HD/checkpoints/
- Verify filenames: seg_final.pth, gmm_final.pth, alias_final.pth
```

### Out of Memory Error
```
RuntimeError: CUDA out of memory

Solution:
- Reduce image size or batch size in api_server.py
- Use CPU instead: python api_server.py --device cpu
- Close other GPU-intensive applications
```

### CORS Errors
```
Access to XMLHttpRequest at 'http://localhost:5000/...' blocked by CORS policy

Solution:
- Verify flask-cors is installed: pip install flask-cors
- Check CORS configuration in api_server.py
- Restart AI server
```

## Performance Considerations

### Processing Time
- Single try-on: 30-120 seconds (depends on GPU)
- Batch processing: Not yet supported
- Supported image sizes: 768x1024

### Resource Requirements
- **GPU**: NVIDIA GPU with >= 6GB VRAM (recommended)
- **CPU**: Intel i7/Ryzen 5 or better for CPU-only mode
- **Memory**: 16GB RAM recommended
- **Storage**: ~2GB for model checkpoints

### Optimization Tips
1. Use GPU acceleration (CUDA)
2. Run AI server on dedicated machine if possible
3. Implement result caching
4. Add queue system for batch processing (future enhancement)

## Future Enhancements

- [ ] Real-time preview as user selects garments
- [ ] Batch processing queue for multiple try-ons
- [ ] Result caching to avoid duplicate processing
- [ ] Support for multiple pose/angle variations
- [ ] Try-on history and comparison
- [ ] Social sharing with watermark
- [ ] Mobile app integration
- [ ] WebRTC for live camera capture

## References

- **VITON-HD**: https://github.com/yfcc/VITON-HD
- **Paper**: https://arxiv.org/abs/2104.05872
- **Flask**: https://flask.palletsprojects.com/
- **PyTorch**: https://pytorch.org/

## Support & Issues

For issues with the integration, check:
1. Python server logs
2. Backend logs
3. Browser console (F12)
4. Database try_ons table for stored results

## License

This integration maintains compatibility with the VITON-HD license. See ai_module/VITON-HD/LICENSE for details.
