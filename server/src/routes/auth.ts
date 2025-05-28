import express from 'express';
import { register, login, updateLocation } from '../controllers/authController';
import { auth } from '../middleware/auth';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.put('/location', auth, updateLocation);

export default router; 