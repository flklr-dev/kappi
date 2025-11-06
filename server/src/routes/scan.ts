import express from 'express';
import { saveScan, getUserScans, getScanStatistics, deleteScan } from '../controllers/scanController';
import { auth } from '../middleware/auth';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { Request } from 'express';

// We'll initialize Cloudinary storage when the module is first used
let uploadMiddleware: any = null;

// Function to initialize Cloudinary storage
const initializeCloudinaryStorage = () => {
  // Only initialize once
  if (uploadMiddleware) {
    return uploadMiddleware;
  }

  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  // Log Cloudinary configuration (without exposing secrets)
  console.log('Cloudinary configured with cloud name:', process.env.CLOUDINARY_CLOUD_NAME);

  // Configure Cloudinary storage for scan images
  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'kappi_scans',
      format: async (req: Request, file: Express.Multer.File) => 'jpg',
      public_id: (req: Request, file: Express.Multer.File) => `scan_${Date.now()}_${Math.floor(Math.random() * 1000000)}`,
    } as any,
  });

  uploadMiddleware = multer({ storage }).single('image');
  return uploadMiddleware;
};

// Custom middleware to log file upload details
const logUploadDetails = (req: any, res: any, next: any) => {
  console.log('Processing upload request...');
  if (req.file) {
    console.log('File successfully uploaded to Cloudinary:', {
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      cloudinaryUrl: req.file.path
    });
  } else {
    console.log('No file found in request');
  }
  next();
};

const router = express.Router();

// Accept multipart/form-data with optional image under field name 'image'
router.post('/', auth, (req, res, next) => {
  console.log('Initializing Cloudinary storage...');
  const upload = initializeCloudinaryStorage();
  
  console.log('Executing Cloudinary upload middleware...');
  upload(req, res, (err: Error | null) => {
    if (err) {
      console.error('Multer/Cloudinary upload error:', err);
      return res.status(500).json({ message: 'Upload error', error: err.message });
    }
    
    console.log('Cloudinary upload completed');
    next();
  });
}, logUploadDetails, saveScan);

router.get('/', auth, getUserScans);
router.get('/statistics', auth, getScanStatistics);
// Add delete route
router.delete('/:id', auth, deleteScan);

export default router;