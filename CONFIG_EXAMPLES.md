# FashionAI Configuration Examples

## Backend Environment Variables (.env)

```bash
# Server
PORT=3001
NODE_ENV=development

# Database
DB_PATH=./backend/fashionai.db

# AI Module
AI_API_URL=http://localhost:5000
AI_API_TIMEOUT=300000  # 5 minutes in milliseconds

# JWT
JWT_SECRET=your_super_secret_key_here_change_in_production

# File uploads
MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_DIR=./uploads

# CORS
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## Python Environment Variables (.env in ai_module/)

```bash
# Flask
FLASK_ENV=development
FLASK_DEBUG=1

# Server
HOST=localhost
PORT=5000
WORKERS=1

# Model Configuration
DEVICE=cuda  # or 'cpu' for CPU-only mode
CHECKPOINT_DIR=./VITON-HD/checkpoints

# Input/Output
INPUT_SIZE_H=1024
INPUT_SIZE_W=768
BATCH_SIZE=1

# CUDA Configuration (if using GPU)
CUDA_VISIBLE_DEVICES=0  # GPU device ID
TORCH_HOME=./torch_cache

# Logging
LOG_LEVEL=INFO
```

## Frontend Configuration (in HTML)

```javascript
// In api.js or application initialization
const CONFIG = {
  API_BASE: 'http://localhost:3001/api',
  AI_API_BASE: 'http://localhost:5000',
  
  // Try-on settings
  TRYON: {
    MAX_FILE_SIZE: 10 * 1024 * 1024,  // 10MB
    SUPPORTED_FORMATS: ['image/jpeg', 'image/png'],
    TIMEOUT: 300000,  // 5 minutes
  },
  
  // UI settings
  UI: {
    SHOW_PROGRESS: true,
    AUTO_SAVE: true,
  }
};
```

## Docker Configuration (optional)

### Docker Compose (docker-compose.yml)

```yaml
version: '3.8'

services:
  # Frontend static server
  frontend:
    image: node:18
    ports:
      - "3000:3000"
    volumes:
      - .:/app
    working_dir: /app
    command: npm run frontend
    depends_on:
      - backend

  # Backend API
  backend:
    image: node:18
    ports:
      - "3001:3001"
    volumes:
      - .:/app
    working_dir: /app
    environment:
      - NODE_ENV=production
      - AI_API_URL=http://ai-server:5000
    command: npm run backend
    depends_on:
      - ai-server

  # AI Module
  ai-server:
    image: python:3.10
    ports:
      - "5000:5000"
    volumes:
      - ./ai_module:/app
    working_dir: /app
    environment:
      - DEVICE=cpu  # Change to 'cuda' for GPU support
    command: >
      bash -c "
        pip install -r requirements.txt &&
        python api_server.py --host 0.0.0.0 --port 5000
      "
    # For GPU support, add:
    # runtime: nvidia
    # environment:
    #   - NVIDIA_VISIBLE_DEVICES=all
```

### Dockerfile (for AI module)

```dockerfile
FROM pytorch/pytorch:2.0.1-runtime-cuda11.8-runtime

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libsm6 libxext6 libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY ai_module/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY ai_module/ .

# Expose port
EXPOSE 5000

# Run server
CMD ["python", "api_server.py", "--host", "0.0.0.0", "--port", "5000"]
```

## Database Backup & Restore

### Backup
```bash
# SQLite backup
cp backend/fashionai.db backups/fashionai_$(date +%Y%m%d_%H%M%S).db

# With compression
tar -czf backups/fashionai_$(date +%Y%m%d_%H%M%S).db.tar.gz backend/fashionai.db
```

### Restore
```bash
# Direct restore
cp backups/fashionai_backup.db backend/fashionai.db

# From compressed backup
tar -xzf backups/fashionai_backup.db.tar.gz -C .
```

## Model Checkpoint Management

### Download Checkpoints
```bash
cd ai_module/VITON-HD/checkpoints/

# Using Git LFS (if available)
git lfs install
git clone --depth 1 https://github.com/yfcc/VITON-HD.git

# Or download manually from releases
```

### Verify Checkpoints
```bash
# Check files exist
ls -lh VITON-HD/checkpoints/

# Expected files:
# - seg_final.pth (segmentation model)
# - gmm_final.pth (geometric matching model)
# - alias_final.pth (try-on synthesis model)
```

## Production Deployment

### Environment for Production

```bash
# .env.production
PORT=3001
NODE_ENV=production

# Security
JWT_SECRET=generate_secure_random_string
CORS_ORIGINS=https://fashionai.example.com

# Database
DB_PATH=/var/fashionai/fashionai.db

# AI Module
AI_API_URL=https://ai.fashionai.example.com
AI_API_TIMEOUT=300000

# Logging
LOG_LEVEL=WARN
LOG_FILE=/var/log/fashionai/app.log
```

### Production AI Module Config

```bash
# .env.production for ai_module
FLASK_ENV=production
DEVICE=cuda
PORT=5000
HOST=0.0.0.0
WORKERS=4
LOG_LEVEL=WARN
```

## Performance Tuning

### Backend (Node.js)
```javascript
// In backend/server.js
const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
  for (let i = 0; i < os.cpus().length; i++) {
    cluster.fork();
  }
}
```

### AI Module (Python)
```python
# In api_server.py
import torch
import os

# Enable cuDNN auto-tuning for faster inference
torch.backends.cudnn.benchmark = True

# Set optimal thread count
os.environ['OMP_NUM_THREADS'] = '4'
os.environ['MKL_NUM_THREADS'] = '4'
```

### Database
```sql
-- Optimize SQLite for faster queries
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA cache_size=-64000;
PRAGMA temp_store=MEMORY;
PRAGMA mmap_size=30000000000;
```

## Monitoring & Logging

### Setup Logging (Backend)

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

### Setup Logging (Python)

```python
import logging
from logging.handlers import RotatingFileHandler

logging.basicConfig(
    level=os.getenv('LOG_LEVEL', 'INFO'),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

handler = RotatingFileHandler(
    'logs/ai_server.log',
    maxBytes=10485760,  # 10MB
    backupCount=5
)
logger = logging.getLogger(__name__)
logger.addHandler(handler)
```

## Health Checks

### Backend Health Endpoint
```bash
curl http://localhost:3001/api/health
```

### AI Module Health Endpoint
```bash
curl http://localhost:5000/health
```

### Combined Health Check Script
```bash
#!/bin/bash
echo "Checking FashionAI services..."
echo ""

echo "Backend: $(curl -s http://localhost:3001/api/health | jq .status)"
echo "AI Engine: $(curl -s http://localhost:5000/health | jq .status)"
echo "Models: $(curl -s http://localhost:5000/api/models | jq '.seg_loaded,.gmm_loaded,.alias_loaded')"
```
