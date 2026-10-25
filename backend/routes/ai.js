import { Router } from 'express';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../middleware/auth.js';
import db from '../database.js';

const router = Router();

const AI_API_URL = process.env.AI_API_URL || 'http://localhost:5000';
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'tryon');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/* GET /api/ai/health - Check AI engine status */
router.get('/health', async (req, res) => {
  try {
    const response = await fetch(`${AI_API_URL}/health`);
    if (!response.ok) throw new Error('AI engine not responding');
    
    const data = await response.json();
    res.json({ status: 'ok', ai_engine: data });
  } catch (error) {
    res.status(503).json({ error: 'AI engine unavailable', details: error.message });
  }
});

/* GET /api/ai/models - Get information about loaded AI models */
router.get('/models', async (req, res) => {
  try {
    const response = await fetch(`${AI_API_URL}/api/models`);
    if (!response.ok) throw new Error('Failed to fetch model info');
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(503).json({ error: 'Failed to get model info', details: error.message });
  }
});

/* POST /api/ai/tryon - Generate virtual try-on */
router.post('/tryon', authenticate, async (req, res) => {
  try {
    const { person_image_base64, garment_id } = req.body;

    if (!person_image_base64 || !garment_id) {
      return res.status(400).json({ error: 'person_image_base64 and garment_id required' });
    }

    // Validate that garment exists and is active
    const garment = db.prepare('SELECT * FROM products WHERE id=? AND is_active=1').get(garment_id);
    if (!garment) {
      return res.status(404).json({ error: 'Garment not found' });
    }

    // Parse garment images
    let garmentImages = [];
    try {
      garmentImages = JSON.parse(garment.images);
    } catch (e) {
      garmentImages = garment.images || [];
    }

    if (garmentImages.length === 0) {
      return res.status(400).json({ error: 'Garment has no images' });
    }

    // Prepare form data for AI API
    const form = new FormData();

    // Convert base64 person image to buffer
    const personBuffer = Buffer.from(person_image_base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    form.append('person_image', personBuffer, 'person.png');

    // Add garment image URL or fetch if local
    const garmentImageUrl = garmentImages[0];
    if (garmentImageUrl.startsWith('http')) {
      // Fetch remote image
      const garmentResponse = await fetch(garmentImageUrl);
      if (!garmentResponse.ok) throw new Error('Failed to fetch garment image');
      const garmentBuffer = await garmentResponse.buffer();
      form.append('garment_image', garmentBuffer, 'garment.png');
    } else {
      // Local file
      const garmentPath = path.join(process.cwd(), garmentImageUrl);
      if (fs.existsSync(garmentPath)) {
        form.append('garment_image', fs.createReadStream(garmentPath));
      } else {
        return res.status(400).json({ error: 'Garment image not found' });
      }
    }

    // Call AI API
    const aiResponse = await fetch(`${AI_API_URL}/api/tryon`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
      timeout: 300000, // 5 minute timeout for AI processing
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.json();
      return res.status(aiResponse.status).json({ error: error.error || 'AI processing failed' });
    }

    const aiResult = await aiResponse.json();

    // Save try-on result to database
    const timestamp = new Date().toISOString();
    const filename = `tryon_${req.user.id}_${Date.now()}.png`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Save base64 image
    const imageBuffer = Buffer.from(aiResult.image, 'base64');
    fs.writeFileSync(filepath, imageBuffer);

    // Store in database
    const result = db.prepare(`
      INSERT INTO try_ons (user_id, garment_id, person_image, result_image, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, garment_id, person_image_base64, `/uploads/tryon/${filename}`, timestamp);

    res.status(201).json({
      success: true,
      tryon_id: result.lastInsertRowid,
      result_image: `/uploads/tryon/${filename}`,
      garment: {
        id: garment.id,
        name: garment.name,
        price: garment.price,
        sale_price: garment.sale_price,
        image: garmentImages[0],
      },
      created_at: timestamp,
    });
  } catch (error) {
    console.error('Try-on error:', error);
    res.status(500).json({ error: 'Try-on processing failed', details: error.message });
  }
});

/* GET /api/ai/try-ons - Get user's try-ons */
router.get('/try-ons', authenticate, (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const total = db.prepare('SELECT COUNT(*) as c FROM try_ons WHERE user_id=?').get(req.user.id).c;
    const rows = db.prepare(`
      SELECT t.*, p.name as product_name, p.price, p.sale_price, p.images
      FROM try_ons t
      JOIN products p ON p.id = t.garment_id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.user.id, limitNum, offset);

    const tryOns = rows.map(t => ({
      id: t.id,
      garment: {
        id: t.garment_id,
        name: t.product_name,
        price: t.price,
        sale_price: t.sale_price,
        images: JSON.parse(t.images || '[]'),
      },
      result_image: t.result_image,
      created_at: t.created_at,
    }));

    res.json({ try_ons: tryOns, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch try-ons', details: error.message });
  }
});

/* GET /api/ai/try-ons/:id - Get specific try-on */
router.get('/try-ons/:id', authenticate, (req, res) => {
  try {
    const tryOn = db.prepare(`
      SELECT t.*, p.name as product_name, p.price, p.sale_price, p.images
      FROM try_ons t
      JOIN products p ON p.id = t.garment_id
      WHERE t.id = ? AND t.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!tryOn) return res.status(404).json({ error: 'Try-on not found' });

    res.json({
      id: tryOn.id,
      garment: {
        id: tryOn.garment_id,
        name: tryOn.product_name,
        price: tryOn.price,
        sale_price: tryOn.sale_price,
        images: JSON.parse(tryOn.images || '[]'),
      },
      result_image: tryOn.result_image,
      created_at: tryOn.created_at,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch try-on', details: error.message });
  }
});

/* DELETE /api/ai/try-ons/:id - Delete try-on */
router.delete('/try-ons/:id', authenticate, (req, res) => {
  try {
    const tryOn = db.prepare('SELECT * FROM try_ons WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
    if (!tryOn) return res.status(404).json({ error: 'Try-on not found' });

    // Delete image file
    const filePath = path.join(process.cwd(), tryOn.result_image);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    db.prepare('DELETE FROM try_ons WHERE id=?').run(req.params.id);
    res.json({ success: true, message: 'Try-on deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete try-on', details: error.message });
  }
});

export default router;
