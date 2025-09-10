import express from 'express';
import { register, login, updateLocation, socialLogin, linkSocialAccount, changePassword, getUserCapabilities, forgotPassword, verifyOTP, verifyOTPAndResetPassword, resendOTP } from '../controllers/authController';
import { auth } from '../middleware/auth';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/social-login', socialLogin);
router.post('/link-social', auth, linkSocialAccount);
router.put('/location', auth, updateLocation);
router.put('/change-password', auth, changePassword);
router.get('/capabilities', auth, getUserCapabilities);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/verify-otp-reset', verifyOTPAndResetPassword);
router.post('/resend-otp', resendOTP);

export default router; 