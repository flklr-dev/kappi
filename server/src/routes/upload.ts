import express from 'express';
import { getUploadSignature, validateUploadUrl, cleanupOrphanedImage } from '../controllers/uploadController';
import { auth } from '../middleware/auth';

const router = express.Router();

// Get upload signature for direct Cloudinary uploads
router.post('/signature', auth, getUploadSignature);

// Validate Cloudinary URL
router.post('/validate', auth, validateUploadUrl);

// Cleanup orphaned images (images uploaded but not used in scan)
router.post('/cleanup', auth, cleanupOrphanedImage);

export default router;
