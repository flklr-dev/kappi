import express from 'express';
import { register, login, updateLocation, socialLogin, linkSocialAccount } from '../controllers/authController';
import { auth } from '../middleware/auth';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/social-login', socialLogin);
router.post('/link-social', auth, linkSocialAccount);
router.put('/location', auth, updateLocation);

export default router; 