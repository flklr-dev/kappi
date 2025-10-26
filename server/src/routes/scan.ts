import express from 'express';
import { saveScan, getUserScans, getScanStatistics } from '../controllers/scanController';
import { auth } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer storage for scan images
// Ensure uploads directory exists
const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const basename = `scan_${Date.now()}`;
    cb(null, `${basename}${ext}`);
  }
});

const upload = multer({ storage });

const router = express.Router();

// Accept multipart/form-data with optional image under field name 'image'
router.post('/', auth, upload.single('image'), saveScan);
router.get('/', auth, getUserScans);
router.get('/statistics', auth, getScanStatistics);

export default router;