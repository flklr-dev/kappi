import express from 'express';
import { saveScan, getUserScans } from '../controllers/scanController';
import { auth } from '../middleware/auth';

const router = express.Router();

router.post('/', auth, saveScan);
router.get('/', auth, getUserScans);

export default router; 