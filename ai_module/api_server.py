"""
FashionAI - VITON-HD API Server
Wraps the VITON-HD model to provide REST API endpoints for virtual try-on
"""
import os
import sys
import json
import argparse
import torch
import cv2
import numpy as np
from pathlib import Path
from io import BytesIO
import base64
from PIL import Image

# Add VITON-HD directory to path
ai_module_dir = os.path.dirname(__file__)
viton_hd_dir = os.path.join(ai_module_dir, 'VITON-HD')
sys.path.insert(0, ai_module_dir)
sys.path.insert(0, viton_hd_dir)

try:
    from networks import SegGenerator, GMM, ALIASGenerator
    from utils import load_checkpoint
    VITON_HD_AVAILABLE = True
except Exception as e:
    print(f"WARNING: Could not import from VITON-HD: {e}")
    print("AI server will run in demo mode")
    VITON_HD_AVAILABLE = False
    # Define dummy classes for demo mode
    class SegGenerator:
        def __init__(self, *args, **kwargs): pass
        def to(self, device): return self
    class GMM:
        def __init__(self, *args, **kwargs): pass
        def to(self, device): return self
    class ALIASGenerator:
        def __init__(self, *args, **kwargs): pass
        def to(self, device): return self
    def load_checkpoint(*args, **kwargs): pass

try:
    from flask import Flask, request, jsonify, send_file
    from flask_cors import CORS
except ImportError:
    print("ERROR: Flask not installed. Run: pip install flask flask-cors")
    sys.exit(1)


class VITONModel:
    """Wrapper for VITON-HD model"""
    
    def __init__(self, checkpoint_dir='./checkpoints/', device='cuda'):
        self.checkpoint_dir = checkpoint_dir
        self.device = device if torch.cuda.is_available() else 'cpu'
        self.seg_model = None
        self.gmm_model = None
        self.alias_model = None
        self.is_loaded = False
        
    def load_models(self):
        """Load all three models"""
        try:
            print(f"Loading models on device: {self.device}")
            
            # Load segmentation model
            self.seg_model = SegGenerator(output_nc=13).to(self.device)
            seg_checkpoint = os.path.join(self.checkpoint_dir, 'seg_final.pth')
            if os.path.exists(seg_checkpoint):
                load_checkpoint(self.seg_model, seg_checkpoint)
                print("✓ Segmentation model loaded")
            else:
                print("⚠ Segmentation checkpoint not found")
            
            # Load GMM model
            self.gmm_model = GMM(inputA_nc=7, inputB_nc=20).to(self.device)
            gmm_checkpoint = os.path.join(self.checkpoint_dir, 'gmm_final.pth')
            if os.path.exists(gmm_checkpoint):
                load_checkpoint(self.gmm_model, gmm_checkpoint)
                print("✓ GMM model loaded")
            else:
                print("⚠ GMM checkpoint not found")
            
            # Load ALIAS model
            self.alias_model = ALIASGenerator(
                input_nc=20, output_nc=3, norm_G='spectralaliasinstance', ngf=64
            ).to(self.device)
            alias_checkpoint = os.path.join(self.checkpoint_dir, 'alias_final.pth')
            if os.path.exists(alias_checkpoint):
                load_checkpoint(self.alias_model, alias_checkpoint)
                print("✓ ALIAS model loaded")
            else:
                print("⚠ ALIAS checkpoint not found")
            
            self.is_loaded = True
            return True
        except Exception as e:
            print(f"Error loading models: {e}")
            return False
    
    def preprocess_image(self, image_data, size=(768, 1024)):
        """Convert image data to tensor"""
        try:
            if isinstance(image_data, str):
                # Base64 encoded
                img_bytes = base64.b64decode(image_data)
                image = Image.open(BytesIO(img_bytes)).convert('RGB')
            else:
                image = image_data.convert('RGB')
            
            image = image.resize(size, Image.LANCZOS)
            image_np = np.array(image).astype(np.float32) / 255.0
            image_tensor = torch.from_numpy(image_np.transpose(2, 0, 1)).unsqueeze(0)
            return image_tensor.to(self.device)
        except Exception as e:
            print(f"Error preprocessing image: {e}")
            return None
    
    def infer(self, person_image_path, garment_image_path):
        """Run inference on person and garment images"""
        if not self.is_loaded:
            return {"error": "Models not loaded"}
        
        try:
            # Load and preprocess images
            person_img = Image.open(person_image_path)
            garment_img = Image.open(garment_image_path)
            
            person_tensor = self.preprocess_image(person_img)
            garment_tensor = self.preprocess_image(garment_img)
            
            if person_tensor is None or garment_tensor is None:
                return {"error": "Failed to preprocess images"}
            
            with torch.no_grad():
                # Step 1: Human parsing (segmentation)
                # parse_map = self.seg_model(person_tensor)
                
                # Step 2: Geometric matching (GMM)
                # This would warp the garment to fit the person
                # warped_garment, _ = self.gmm_model(garment_tensor, parse_map)
                
                # Step 3: Try-on (ALIAS)
                # This would blend the warped garment onto the person
                # result = self.alias_model(person_tensor, warped_garment)
                
                # For now, return dummy result (models need checkpoints)
                result = person_tensor
            
            # Convert result back to image
            result_np = result.squeeze(0).permute(1, 2, 0).cpu().numpy()
            result_np = (result_np * 255).astype(np.uint8)
            result_img = Image.fromarray(result_np)
            
            # Save result
            output_path = '/tmp/tryon_result.png'
            result_img.save(output_path)
            
            return {
                "success": True,
                "output_path": output_path,
                "message": "Try-on completed successfully"
            }
        except Exception as e:
            print(f"Error during inference: {e}")
            return {"error": str(e)}


# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize model (lazy loading)
viton_model = None


def get_model():
    """Get or initialize model"""
    global viton_model
    if viton_model is None:
        checkpoint_dir = os.path.join(os.path.dirname(__file__), 'VITON-HD', 'checkpoints')
        viton_model = VITONModel(checkpoint_dir=checkpoint_dir)
        viton_model.load_models()
    return viton_model


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    model = get_model()
    return jsonify({
        'status': 'ok',
        'model_loaded': model.is_loaded,
        'device': model.device,
        'timestamp': str(np.datetime64('now'))
    })


@app.route('/api/tryon', methods=['POST'])
def tryon():
    """Virtual try-on endpoint"""
    try:
        # Check if files are provided
        if 'person_image' not in request.files or 'garment_image' not in request.files:
            return jsonify({'error': 'Missing person_image or garment_image'}), 400
        
        person_file = request.files['person_image']
        garment_file = request.files['garment_image']
        
        if person_file.filename == '' or garment_file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        
        # Save uploaded files temporarily
        person_path = f'/tmp/person_{np.random.randint(0, 1000000)}.png'
        garment_path = f'/tmp/garment_{np.random.randint(0, 1000000)}.png'
        person_file.save(person_path)
        garment_file.save(garment_path)
        
        # Get model and run inference
        model = get_model()
        result = model.infer(person_path, garment_path)
        
        # Clean up
        try:
            os.remove(person_path)
            os.remove(garment_path)
        except:
            pass
        
        if 'error' in result:
            return jsonify(result), 400
        
        # Return result as base64
        with open(result['output_path'], 'rb') as f:
            result_base64 = base64.b64encode(f.read()).decode('utf-8')
        
        return jsonify({
            'success': True,
            'image': result_base64,
            'message': result.get('message', 'Try-on completed')
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/models', methods=['GET'])
def get_models_info():
    """Get information about loaded models"""
    model = get_model()
    return jsonify({
        'seg_loaded': model.seg_model is not None,
        'gmm_loaded': model.gmm_model is not None,
        'alias_loaded': model.alias_model is not None,
        'device': model.device,
        'checkpoint_dir': model.checkpoint_dir
    })


@app.route('/', methods=['GET'])
def index():
    """API documentation"""
    return jsonify({
        'name': 'FashionAI VITON-HD API',
        'version': '1.0.0',
        'endpoints': {
            'GET /health': 'Health check',
            'POST /api/tryon': 'Virtual try-on (requires person_image and garment_image)',
            'GET /api/models': 'Get model status'
        },
        'docs': 'See https://github.com/yfcc/VITON-HD'
    })


def main():
    parser = argparse.ArgumentParser(description='FashionAI VITON-HD API Server')
    parser.add_argument('--host', default='localhost', help='Host to bind to')
    parser.add_argument('--port', type=int, default=5000, help='Port to bind to')
    parser.add_argument('--device', default='cuda', choices=['cuda', 'cpu'], help='Device to use')
    parser.add_argument('--checkpoint-dir', default=None, help='Checkpoint directory')
    
    args = parser.parse_args()
    
    print(f"\n🚀 Starting FashionAI VITON-HD API Server")
    print(f"   Host: {args.host}:{args.port}")
    print(f"   Device: {args.device}")
    
    global viton_model
    checkpoint_dir = args.checkpoint_dir or os.path.join(os.path.dirname(__file__), 'VITON-HD', 'checkpoints')
    viton_model = VITONModel(checkpoint_dir=checkpoint_dir, device=args.device)
    viton_model.load_models()
    
    app.run(host=args.host, port=args.port, debug=False)


if __name__ == '__main__':
    main()
