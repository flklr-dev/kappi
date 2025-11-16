import express from 'express';
import { register, login, updateLocation, updateProfile, socialLogin, linkSocialAccount, changePassword, getUserCapabilities, forgotPassword, verifyOTP, verifyOTPAndResetPassword, resendOTP, deleteAccount } from '../controllers/authController';
import { auth } from '../middleware/auth';
import { 
  validateRequest, 
  validateEmail, 
  validatePassword, 
  validateFullName, 
  validateOTP,
  sanitizeInput 
} from '../middleware/validation';

const router = express.Router();

// Apply sanitization to all routes
router.use(sanitizeInput);

router.post('/register', 
  [validateFullName, validateEmail, validatePassword, validateRequest], 
  register
);

router.post('/login', 
  [validateEmail, validateRequest], 
  login
);

router.post('/social-login', socialLogin);
router.post('/link-social', auth, linkSocialAccount);

router.put('/location', auth, updateLocation);

router.put('/profile', 
  [auth, validateFullName, validateRequest], 
  updateProfile
);

router.put('/change-password', auth, changePassword);

router.get('/capabilities', auth, getUserCapabilities);

router.post('/forgot-password', 
  [validateEmail, validateRequest], 
  forgotPassword
);

router.post('/verify-otp', 
  [validateEmail, validateOTP, validateRequest], 
  verifyOTP
);

router.post('/verify-otp-reset', 
  [validateEmail, validateOTP, validatePassword, validateRequest], 
  verifyOTPAndResetPassword
);

router.post('/resend-otp', 
  [validateEmail, validateRequest], 
  resendOTP
);

router.delete('/account', auth, deleteAccount);

export default router; 