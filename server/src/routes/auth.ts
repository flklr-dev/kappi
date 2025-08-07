import express from 'express';
import { register, login, updateLocation, socialLogin, linkSocialAccount, changePassword } from '../controllers/authController';
import { auth } from '../middleware/auth';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/social-login', socialLogin);
router.post('/link-social', auth, linkSocialAccount);
router.put('/location', auth, updateLocation);
router.put('/change-password', auth, changePassword);

export default router; 