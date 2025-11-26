import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { User, IUser } from '../models/User';
import { Scan } from '../models/Scan';

// Extend Request type to include user
interface AuthRequest extends Request<any, any, any, any, Record<string, any>> {
  user?: IUser;
}

function sanitizeInput(input: any) {
  if (typeof input !== 'string') return '';
  let sanitized = input.trim();
  sanitized = sanitized.replace(/<script.*?>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/["'`;\\]/g, ''); // Remove quotes, semicolons, backslashes
  sanitized = sanitized.replace(/[<>]/g, ''); // Remove angle brackets
  console.log('Sanitized input:', { original: input.length, sanitized: sanitized.length, removed: input.length - sanitized.length });
  return sanitized;
}

export const register = async (req: Request, res: Response) => {
  try {
    const { fullName, email, password } = req.body;

    // Check if user already exists (including soft-deleted users)
    const existingUser = await User.findOne({ email }).select('+originalEmail');
    
    if (existingUser) {
      // If user is soft-deleted, reactivate their account
      if (existingUser.isDeleted) {
        console.log('Reactivating soft-deleted user:', email);
        
        // Restore the account
        existingUser.isDeleted = false;
        existingUser.deletedAt = undefined;
        existingUser.fullName = fullName;
        existingUser.password = password;
        existingUser.nameLastUpdated = undefined;
        
        // Clear originalEmail since account is active again
        existingUser.originalEmail = undefined;
        
        await existingUser.save();
        
        // Generate token
        const token = jwt.sign(
          { _id: existingUser._id },
          process.env.JWT_SECRET as string,
          { expiresIn: '7d' }
        );

        return res.status(200).json({
          token,
          user: {
            id: existingUser._id,
            fullName: existingUser.fullName,
            email: existingUser.email,
          },
          message: 'Account reactivated successfully'
        });
      }
      
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      fullName,
      email,
      password,
      nameLastUpdated: null,
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { _id: user._id },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt for email:', email);
    console.log('Login password received:', password);
    console.log('Login password length:', password?.length);
    console.log('Login password characters:', password?.split('').map((c: string) => `${c}(${c.charCodeAt(0)})`).join(' '));

    // Find user, excluding soft-deleted users
    const user = await User.findOne({ 
      email,
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
    });
    
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    console.log('User found, checking password...');
    console.log('User has password?', !!user.password);

    // Check password
    const isMatch = await user.comparePassword(password);
    console.log('Password match result:', isMatch);
    
    if (!isMatch) {
      console.log('Password mismatch for user:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { _id: user._id },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    console.log('Login successful for user:', email);
    res.json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        providers: user.providers
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
};

export const socialLogin = async (req: Request, res: Response) => {
  try {
    const { email, fullName, provider, providerId, isRegistration } = req.body;

    if (!email || !provider || !providerId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user already exists (including soft-deleted users)
    let user = await User.findOne({ email }).select('+originalEmail');
    let isNewUser = false;

    if (user) {
      // If user is soft-deleted, reactivate their account
      if (user.isDeleted) {
        console.log('Reactivating soft-deleted user via social login:', email);
        
        // Restore the account
        user.isDeleted = false;
        user.deletedAt = undefined;
        user.fullName = fullName;
        user.nameLastUpdated = undefined;
        
        // Clear originalEmail since account is active again
        user.originalEmail = undefined;
        
        // Add the provider if not already linked
        const isProviderLinked = user.providers?.some(p => p.provider === provider && p.providerId === providerId);
        if (!isProviderLinked) {
          if (!user.providers) {
            user.providers = [];
          }
          user.providers.push({ provider, providerId });
        }
        
        await user.save();
        isNewUser = false;
        
        // Return a special flag to indicate reactivation
        const token = jwt.sign(
          { _id: user._id },
          process.env.JWT_SECRET as string,
          { expiresIn: '7d' }
        );

        return res.json({
          token,
          user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            providers: user.providers?.map(p => p.provider)
          },
          isNewUser: false,
          isReactivated: true,
          message: 'Account reactivated successfully'
        });
      } else {
        // User exists and is not deleted, check if this provider is already linked
        const isProviderLinked = user.providers?.some(p => p.provider === provider && p.providerId === providerId);
        
        if (!isProviderLinked) {
          // Check if this is a registration attempt (can be determined by client-side flag)
          if (isRegistration) {
            // For registration attempts, return an error if the email already exists
            return res.status(400).json({ 
              message: 'This email is already registered. Please use the login screen instead.' 
            });
          }
          
          // Add the provider to existing user
          if (!user.providers) {
            user.providers = [];
          }
          
          user.providers.push({ provider, providerId });
          await user.save();
        }
      }
    } else {
      // Create new user with social login (no password)
      user = new User({
        fullName,
        email,
        providers: [{ provider, providerId }],
        nameLastUpdated: null,
      });

      await user.save();
      isNewUser = true;
    }

    // Generate token
    const token = jwt.sign(
      { _id: user._id },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        providers: user.providers?.map(p => p.provider)
      },
      isNewUser
    });
  } catch (error) {
    console.error('Social login error:', error);
    res.status(500).json({ message: 'Error during social login' });
  }
};

export const linkSocialAccount = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { provider, providerId } = req.body;

    if (!provider || !providerId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if this provider is already linked
    const isProviderLinked = user.providers?.some(p => p.provider === provider && p.providerId === providerId);
    
    if (isProviderLinked) {
      return res.status(400).json({ message: 'This account is already linked' });
    }

    // Add the provider
    if (!user.providers) {
      user.providers = [];
    }
    
    user.providers.push({ provider, providerId });
    await user.save();

    res.json({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        providers: user.providers?.map(p => p.provider)
      },
    });
  } catch (error) {
    console.error('Link social account error:', error);
    res.status(500).json({ message: 'Error linking social account' });
  }
};

export const updateLocation = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userId = req.user._id;
    const { coordinates, address } = req.body;

    console.log('[UPDATE_LOCATION] Received request:', { userId, coordinates, address });

    // Find the user first (don't use findByIdAndUpdate with virtuals)
    const user = await User.findById(userId).select('-password');

    if (!user) {
      console.log('[UPDATE_LOCATION] User not found:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize location object if it doesn't exist
    if (!user.location) {
      user.location = { coordinates: {} as any, address: {} as any };
    }

    // Use virtual setters to encrypt and save location data
    if (coordinates) {
      if (coordinates.latitude !== undefined && coordinates.latitude !== null) {
        (user as any).set('location.coordinates.latitude', coordinates.latitude);
        console.log('[UPDATE_LOCATION] Set latitude:', coordinates.latitude);
      }
      if (coordinates.longitude !== undefined && coordinates.longitude !== null) {
        (user as any).set('location.coordinates.longitude', coordinates.longitude);
        console.log('[UPDATE_LOCATION] Set longitude:', coordinates.longitude);
      }
    }

    if (address) {
      if (address.barangay) {
        (user as any).set('location.address.barangay', address.barangay);
        console.log('[UPDATE_LOCATION] Set barangay:', address.barangay);
      }
      if (address.cityMunicipality) {
        (user as any).set('location.address.cityMunicipality', address.cityMunicipality);
        console.log('[UPDATE_LOCATION] Set city:', address.cityMunicipality);
      }
      if (address.province) {
        (user as any).set('location.address.province', address.province);
        console.log('[UPDATE_LOCATION] Set province:', address.province);
      }
    }

    // Save the user document
    await user.save();
    console.log('[UPDATE_LOCATION] Location saved successfully');

    // Return decrypted location data via virtuals
    const userObject = user.toObject({ virtuals: true });
    res.json({ 
      user: {
        ...userObject,
        location: {
          coordinates: {
            latitude: user.location?.coordinates?.latitude,
            longitude: user.location?.coordinates?.longitude
          },
          address: {
            barangay: user.location?.address?.barangay,
            cityMunicipality: user.location?.address?.cityMunicipality,
            province: user.location?.address?.province
          }
        }
      }
    });
    console.log('[UPDATE_LOCATION] Response sent with location data');
  } catch (error) {
    console.error('[UPDATE_LOCATION] Error updating location:', error);
    res.status(500).json({ message: 'Error updating location' });
  }
}; 

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userId = req.user._id;
    const { fullName } = req.body;

    // Validate input
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
      return res.status(400).json({ message: 'Full name is required' });
    }

    const trimmedName = fullName.trim();
    
    // Check if name has actually changed
    if (req.user.fullName === trimmedName) {
      return res.status(400).json({ message: 'Name is already set to this value' });
    }

    // Check if user has a nameLastUpdated field
    const nameLastUpdated = req.user.nameLastUpdated;
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    
    // If nameLastUpdated exists and is within the last 5 days, reject the request
    if (nameLastUpdated && nameLastUpdated > fiveDaysAgo) {
      const daysRemaining = Math.ceil((nameLastUpdated.getTime() - fiveDaysAgo.getTime()) / (1000 * 60 * 60 * 24));
      return res.status(400).json({ 
        message: `You can only change your name once every 5 days. Please wait ${daysRemaining} more day(s).` 
      });
    }

    // Update user's full name and nameLastUpdated field
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        fullName: trimmedName,
        nameLastUpdated: new Date()
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        providers: user.providers?.map(p => p.provider) || [],
        location: user.location
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Determine if user is setting first password
    const isSettingFirstPassword = !user.password;

    // Sanitize inputs (but NOT passwords - they need special characters)
    const oldPassword = req.body.oldPassword;
    const newPassword = req.body.newPassword;
    const confirmPassword = req.body.confirmPassword;
    
    console.log('Change password - lengths:', { old: oldPassword?.length, new: newPassword?.length, confirm: confirmPassword?.length });

    // Validate required fields based on scenario
    if (isSettingFirstPassword) {
      // For social users setting their first password, only require new password fields
      if (!newPassword || !confirmPassword) {
        return res.status(400).json({ message: 'New password and confirmation are required' });
      }
    } else {
      // For users with existing passwords, require all fields
      if (!oldPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: 'Current password, new password, and confirmation are all required' });
      }
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New passwords do not match' });
    }
    
    // Password complexity: min 8 chars, upper, lower, number, special
    const complexity = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!complexity.test(newPassword)) {
      return res.status(400).json({ message: 'Password does not meet complexity requirements' });
    }

    // Validate old password if user has existing password
    if (!isSettingFirstPassword) {
      const isMatch = await user.comparePassword(oldPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
    }

    // Set new password
    user.password = newPassword;
    
    // Add email provider if this is the first password
    if (isSettingFirstPassword) {
      if (!user.providers) {
        user.providers = [];
      }
      // Add email provider if not already present
      const hasEmailProvider = user.providers.some(p => p.provider === 'email');
      if (!hasEmailProvider) {
        user.providers.push({ provider: 'email', providerId: user.email });
      }
    }
    
    await user.save();

    // Generate new token after password change
    const token = jwt.sign(
      { _id: user._id },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    const responseMessage = isSettingFirstPassword 
      ? 'Password set successfully! You can now log in with email and password.'
      : 'Password changed successfully';

    return res.json({ 
      message: responseMessage,
      isFirstPassword: isSettingFirstPassword,
      token: token, // Include new token
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        providers: user.providers?.map(p => p.provider)
      }
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ message: 'Error changing password' });
  }
};

export const getUserCapabilities = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Extract provider names
    const providers = user.providers?.map((p: { provider: any; }) => p.provider) || [];
    
    // Determine capabilities
    const hasPasswordAuth = !!user.password && providers.includes('email');
    const canSetPassword = !user.password && providers.length > 0 && !providers.includes('email');

    res.json({
      canSetPassword,
      hasPasswordAuth,
      providers,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        providers,
        location: user.location
      }
    });
  } catch (error) {
    console.error('Get user capabilities error:', error);
    res.status(500).json({ message: 'Error fetching user capabilities' });
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(req.user._id).select('+originalEmail');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Soft delete the user
    user.isDeleted = true;
    user.deletedAt = new Date();
    
    // Store original email for potential reactivation
    user.originalEmail = user.email;
    
    // Anonymize email to allow reuse
    user.email = `deleted_${user._id}_${user.email}`;
    
    await user.save();

    // Also soft delete all user's scans
    await Scan.updateMany(
      { user: user._id, isDeleted: { $ne: true } },
      { 
        $set: { 
          isDeleted: true, 
          deletedAt: new Date() 
        } 
      }
    );

    console.log('User account soft deleted:', user._id);

    res.json({ 
      message: 'Account deleted successfully. Your data will be permanently removed after 90 days.' 
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Error deleting account' });
  }
};

// Create nodemailer transporter
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD, // Gmail App Password
    },
    secure: true,
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Rate limiting store for password reset attempts
const resetAttempts = new Map<string, { count: number; lastAttempt: number; blockedUntil?: number }>();
const otpAttempts = new Map<string, { attempts: number; createdAt: number }>();
const resendAttempts = new Map<string, { count: number; firstAttempt: number }>();

// Clean up old reset attempts (run every hour)
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of resetAttempts.entries()) {
    if (now - data.lastAttempt > 3600000) { // 1 hour
      resetAttempts.delete(email);
    }
  }
  // Clean up old OTP attempts
  for (const [email, data] of otpAttempts.entries()) {
    if (now - data.createdAt > 600000) { // 10 minutes
      otpAttempts.delete(email);
    }
  }
  // Clean up old resend attempts
  for (const [email, data] of resendAttempts.entries()) {
    if (now - data.firstAttempt > 900000) { // 15 minutes
      resendAttempts.delete(email);
    }
  }
}, 3600000);

// Generate secure 6-digit OTP
const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    // Input validation
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    const sanitizedEmail = sanitizeInput(email.toLowerCase());
    
    // Rate limiting - max 3 attempts per hour per email
    const now = Date.now();
    const attemptData = resetAttempts.get(sanitizedEmail);
    
    if (attemptData) {
      // Check if currently blocked
      if (attemptData.blockedUntil && now < attemptData.blockedUntil) {
        const remainingMinutes = Math.ceil((attemptData.blockedUntil - now) / 60000);
        return res.status(429).json({ 
          message: `Too many reset attempts. Please try again in ${remainingMinutes} minutes.` 
        });
      }
      
      // Check if exceeded attempts in the last hour
      if (attemptData.count >= 3 && (now - attemptData.lastAttempt) < 3600000) {
        const blockedUntil = now + 1800000; // 30 minutes block
        resetAttempts.set(sanitizedEmail, {
          ...attemptData,
          blockedUntil
        });
        return res.status(429).json({ 
          message: 'Too many reset attempts. Please try again in 30 minutes.' 
        });
      }
      
      // Reset count if more than an hour has passed
      if ((now - attemptData.lastAttempt) >= 3600000) {
        resetAttempts.set(sanitizedEmail, { count: 1, lastAttempt: now });
      } else {
        resetAttempts.set(sanitizedEmail, {
          count: attemptData.count + 1,
          lastAttempt: now
        });
      }
    } else {
      resetAttempts.set(sanitizedEmail, { count: 1, lastAttempt: now });
    }
    
    // Check resend rate limiting
    const resendData = resendAttempts.get(sanitizedEmail);
    if (resendData) {
      // Check if user has exceeded max resends in 15 minutes
      if (resendData.count >= 3 && (now - resendData.firstAttempt) < 900000) {
        return res.status(429).json({ 
          message: 'Maximum resend attempts reached. Please try again in 15 minutes.' 
        });
      }
      
      // Reset if 15 minutes have passed
      if ((now - resendData.firstAttempt) >= 900000) {
        resendAttempts.set(sanitizedEmail, { count: 1, firstAttempt: now });
      } else {
        resendAttempts.set(sanitizedEmail, {
          count: resendData.count + 1,
          firstAttempt: resendData.firstAttempt
        });
      }
    } else {
      resendAttempts.set(sanitizedEmail, { count: 1, firstAttempt: now });
    }
    
    // Find user by email
    const user = await User.findOne({ email: sanitizedEmail });
    
    // Always return success to prevent email enumeration attacks
    // But only send email if user exists
    if (user) {
      // Check if user has password authentication
      const hasPasswordAuth = !!user.password;
      const providers = user.providers?.map(p => p.provider) || [];
      
      if (!hasPasswordAuth && !providers.includes('email')) {
        // User only has social logins, send different email
        await sendSocialOnlyResetEmail(sanitizedEmail, user.fullName);
      } else {
        // Generate secure OTP
        const otpCode = generateOTP();
        const otpHash = crypto.createHash('sha256').update(otpCode + process.env.JWT_SECRET).digest('hex');
        const otpExpiry = new Date(Date.now() + 600000); // 10 minutes
        
        // Save hashed OTP to user
        user.resetPasswordToken = otpHash;
        user.resetPasswordExpires = otpExpiry;
        await user.save();
        
        // Initialize OTP attempts tracking
        otpAttempts.set(sanitizedEmail, { attempts: 0, createdAt: now });
        
        // Send OTP email
        await sendOTPEmail(sanitizedEmail, user.fullName, otpCode);
      }
    }
    
    // Always return success message
    res.json({ 
      message: 'If an account with that email exists, a verification code has been sent.',
      canResend: true
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error processing password reset request' });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    
    // Input validation
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and verification code are required' });
    }
    
    const sanitizedEmail = sanitizeInput(email.toLowerCase());
    const sanitizedOTP = sanitizeInput(otp.trim());
    
    // Check OTP format (6 digits)
    if (!/^\d{6}$/.test(sanitizedOTP)) {
      return res.status(400).json({ message: 'Invalid verification code format' });
    }
    
    // Check OTP attempts
    const attemptData = otpAttempts.get(sanitizedEmail);
    if (!attemptData) {
      return res.status(400).json({ message: 'No verification code found. Please request a new one.' });
    }
    
    // Check if too many attempts
    if (attemptData.attempts >= 5) {
      otpAttempts.delete(sanitizedEmail);
      // Also clear the user's reset token
      await User.updateOne(
        { email: sanitizedEmail },
        { $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 } }
      );
      return res.status(400).json({ 
        message: 'Too many incorrect attempts. Please request a new verification code.' 
      });
    }
    
    // Check if OTP has expired (10 minutes)
    const now = Date.now();
    if (now - attemptData.createdAt > 600000) {
      otpAttempts.delete(sanitizedEmail);
      await User.updateOne(
        { email: sanitizedEmail },
        { $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 } }
      );
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }
    
    // Hash the provided OTP
    const hashedOTP = crypto.createHash('sha256').update(sanitizedOTP + process.env.JWT_SECRET).digest('hex');
    
    // Find user with valid OTP
    const user = await User.findOne({
      email: sanitizedEmail,
      resetPasswordToken: hashedOTP,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      // Increment attempt count
      otpAttempts.set(sanitizedEmail, {
        attempts: attemptData.attempts + 1,
        createdAt: attemptData.createdAt
      });
      
      const remainingAttempts = 5 - (attemptData.attempts + 1);
      if (remainingAttempts <= 0) {
        otpAttempts.delete(sanitizedEmail);
        await User.updateOne(
          { email: sanitizedEmail },
          { $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 } }
        );
        return res.status(400).json({ 
          message: 'Too many incorrect attempts. Please request a new verification code.' 
        });
      }
      
      return res.status(400).json({ 
        message: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
        remainingAttempts
      });
    }
    
    // OTP is valid - return success but don't clear the OTP yet (save it for password reset)
    res.json({ 
      message: 'Verification code is valid',
      isValid: true
    });
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Error verifying code' });
  }
};

export const verifyOTPAndResetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;
    
    // Input validation
    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    
    // Password complexity validation
    const complexity = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!complexity.test(newPassword)) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' 
      });
    }
    
    const sanitizedEmail = sanitizeInput(email.toLowerCase());
    const sanitizedOTP = sanitizeInput(otp.trim());
    // DON'T sanitize passwords - they need special characters!
    console.log('Password reset - original password length:', newPassword.length);
    
    // Check OTP format (6 digits)
    if (!/^\d{6}$/.test(sanitizedOTP)) {
      return res.status(400).json({ message: 'Invalid verification code format' });
    }
    
    // Check OTP attempts
    const attemptData = otpAttempts.get(sanitizedEmail);
    if (!attemptData) {
      return res.status(400).json({ message: 'No verification code found. Please request a new one.' });
    }
    
    // Check if too many attempts
    if (attemptData.attempts >= 5) {
      otpAttempts.delete(sanitizedEmail);
      // Also clear the user's reset token
      await User.updateOne(
        { email: sanitizedEmail },
        { $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 } }
      );
      return res.status(400).json({ 
        message: 'Too many incorrect attempts. Please request a new verification code.' 
      });
    }
    
    // Check if OTP has expired (10 minutes)
    const now = Date.now();
    if (now - attemptData.createdAt > 600000) {
      otpAttempts.delete(sanitizedEmail);
      await User.updateOne(
        { email: sanitizedEmail },
        { $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 } }
      );
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }
    
    // Hash the provided OTP
    const hashedOTP = crypto.createHash('sha256').update(sanitizedOTP + process.env.JWT_SECRET).digest('hex');
    
    // Find user with valid OTP
    const user = await User.findOne({
      email: sanitizedEmail,
      resetPasswordToken: hashedOTP,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      // Increment attempt count
      otpAttempts.set(sanitizedEmail, {
        attempts: attemptData.attempts + 1,
        createdAt: attemptData.createdAt
      });
      
      const remainingAttempts = 5 - (attemptData.attempts + 1);
      if (remainingAttempts <= 0) {
        otpAttempts.delete(sanitizedEmail);
        await User.updateOne(
          { email: sanitizedEmail },
          { $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 } }
        );
        return res.status(400).json({ 
          message: 'Too many incorrect attempts. Please request a new verification code.' 
        });
      }
      
      return res.status(400).json({ 
        message: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
        remainingAttempts
      });
    }
    
    // Update password and clear OTP
    console.log('Setting new password for user:', sanitizedEmail);
    console.log('Original password:', newPassword);
    console.log('Password length:', newPassword.length);
    console.log('Password characters:', newPassword.split('').map((c: string) => `${c}(${c.charCodeAt(0)})`).join(' '));
    
    user.password = newPassword;
    user.markModified('password'); // Ensure the password field is marked as modified
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    console.log('Password field modified?', user.isModified('password'));
    
    // Add email provider if not already present
    if (!user.providers) {
      user.providers = [];
    }
    const hasEmailProvider = user.providers.some(p => p.provider === 'email');
    if (!hasEmailProvider) {
      user.providers.push({ provider: 'email', providerId: user.email });
    }
    
    await user.save();
    console.log('Password reset completed for user:', sanitizedEmail);
    
    // Clean up attempts
    otpAttempts.delete(sanitizedEmail);
    resetAttempts.delete(sanitizedEmail);
    resendAttempts.delete(sanitizedEmail);
    
    // Send confirmation email
    await sendPasswordChangeConfirmationEmail(user.email, user.fullName);
    
    res.json({ message: 'Password has been reset successfully' });
    
  } catch (error) {
    console.error('Verify OTP and reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
};

export const resendOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    const sanitizedEmail = sanitizeInput(email.toLowerCase());
    const now = Date.now();
    
    // Check resend rate limiting (30-60 seconds between resends)
    const resendData = resendAttempts.get(sanitizedEmail);
    if (resendData) {
      const timeSinceLastResend = now - resendData.firstAttempt;
      const lastResendTime = resendData.count > 1 ? timeSinceLastResend / resendData.count : timeSinceLastResend;
      
      // Enforce 30 second minimum between resends
      if (lastResendTime < 30000) {
        const waitTime = Math.ceil((30000 - lastResendTime) / 1000);
        return res.status(429).json({ 
          message: `Please wait ${waitTime} seconds before requesting another code.`,
          waitTime
        });
      }
      
      // Check max resends (3 per 15 minutes)
      if (resendData.count >= 3 && timeSinceLastResend < 900000) {
        const remainingTime = Math.ceil((900000 - timeSinceLastResend) / 60000);
        return res.status(429).json({ 
          message: `Maximum resend attempts reached. Please try again in ${remainingTime} minutes.` 
        });
      }
    }
    
    // Find user
    const user = await User.findOne({ email: sanitizedEmail });
    
    if (!user) {
      // Don't reveal if email exists
      return res.json({ 
        message: 'If an account with that email exists, a new verification code has been sent.' 
      });
    }
    
    // Generate new OTP
    const otpCode = generateOTP();
    const otpHash = crypto.createHash('sha256').update(otpCode + process.env.JWT_SECRET).digest('hex');
    const otpExpiry = new Date(Date.now() + 600000); // 10 minutes
    
    // Update user with new OTP
    user.resetPasswordToken = otpHash;
    user.resetPasswordExpires = otpExpiry;
    await user.save();
    
    // Reset OTP attempts
    otpAttempts.set(sanitizedEmail, { attempts: 0, createdAt: now });
    
    // Update resend tracking
    if (resendData) {
      resendAttempts.set(sanitizedEmail, {
        count: resendData.count + 1,
        firstAttempt: resendData.firstAttempt
      });
    } else {
      resendAttempts.set(sanitizedEmail, { count: 1, firstAttempt: now });
    }
    
    // Send new OTP email
    await sendOTPEmail(sanitizedEmail, user.fullName, otpCode);
    
    res.json({ 
      message: 'A new verification code has been sent to your email.',
      canResend: true
    });
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Error sending verification code' });
  }
};

// Email templates and sending functions
const sendOTPEmail = async (email: string, fullName: string, otpCode: string) => {
  const transporter = createEmailTransporter();
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Code - KAPPI</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #6F8F3F; margin-bottom: 10px; }
            .otp-container { background: linear-gradient(135deg, #6F8F3F, #5a7332); padding: 30px; border-radius: 15px; text-align: center; margin: 30px 0; }
            .otp-code { font-size: 36px; font-weight: bold; color: white; letter-spacing: 8px; font-family: 'Courier New', monospace; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); margin: 10px 0; }
            .otp-label { color: rgba(255,255,255,0.9); font-size: 14px; margin-bottom: 10px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; text-align: center; }
            .security-note { background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0; }
            .expiry { color: #e74c3c; font-weight: bold; }
            .warning { background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px; padding: 15px; margin: 20px 0; color: #721c24; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🌱 KAPPI</div>
                <h2>Password Reset Verification</h2>
            </div>
            
            <p>Hello ${fullName},</p>
            
            <p>We received a request to reset your password for your KAPPI account. Use the verification code below to proceed:</p>
            
            <div class="otp-container">
                <div class="otp-label">Your Verification Code</div>
                <div class="otp-code">${otpCode}</div>
                <div style="color: rgba(255,255,255,0.8); font-size: 12px; margin-top: 10px;">Valid for 10 minutes</div>
            </div>
            
            <div class="security-note">
                <strong>🔒 Security Information:</strong>
                <ul>
                    <li class="expiry">This code expires in 10 minutes</li>
                    <li>You have 5 attempts to enter the correct code</li>
                    <li>If you didn't request this reset, please ignore this email</li>
                    <li>Never share this code with anyone</li>
                </ul>
            </div>
            
            <div class="warning">
                <strong>⚠️ Important:</strong> This code can only be used once. If you need a new code, you can request another one from the app.
            </div>
            
            <div class="footer">
                <p>This email was sent from KAPPI - Plant Disease Detection App</p>
                <p>If you're having trouble, contact our support team</p>
                <p style="font-size: 12px; color: #999;">This is an automated message, please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
  `;
  
  const mailOptions = {
    from: `"KAPPI Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔐 Your KAPPI Password Reset Code',
    html: htmlContent,
    text: `Hello ${fullName},

We received a request to reset your password for your KAPPI account.

Your verification code is: ${otpCode}

This code expires in 10 minutes and can only be used once.

If you didn't request this reset, please ignore this email.

Best regards,
KAPPI Team`
  };
  
  await transporter.sendMail(mailOptions);
};
  const transporter = createEmailTransporter();
  
const sendSocialOnlyResetEmail = async (email: string, fullName: string) => {
  const transporter = createEmailTransporter();
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Information - KAPPI</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #4CAF50; margin-bottom: 10px; }
            .info-box { background-color: #e3f2fd; border: 1px solid #2196f3; border-radius: 5px; padding: 15px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🌱 KAPPI</div>
                <h2>Password Reset Information</h2>
            </div>
            
            <p>Hello ${fullName},</p>
            
            <p>We received a password reset request for your KAPPI account. However, your account is currently set up to use social login (Google/Facebook) and doesn't have a traditional password.</p>
            
            <div class="info-box">
                <strong>💡 What you can do:</strong>
                <ul>
                    <li>Continue logging in with your Google or Facebook account</li>
                    <li>If you want to set up password login, go to your Profile → Set Password in the KAPPI app</li>
                    <li>Contact support if you need help accessing your account</li>
                </ul>
            </div>
            
            <p>If you didn't make this request, you can safely ignore this email.</p>
            
            <div class="footer">
                <p>This email was sent from KAPPI - Plant Disease Detection App</p>
                <p>If you're having trouble, contact our support team</p>
                <p style="font-size: 12px; color: #999;">This is an automated message, please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
  `;
  
  const mailOptions = {
    from: `"KAPPI Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '📱 KAPPI Account Information - Social Login',
    html: htmlContent,
    text: `Hello ${fullName},

We received a password reset request for your KAPPI account. However, your account uses social login (Google/Facebook) and doesn't have a traditional password.

You can continue logging in with your social accounts, or set up a password in the app under Profile → Set Password.

Best regards,
KAPPI Team`
  };
  
  await transporter.sendMail(mailOptions);
};

const sendPasswordChangeConfirmationEmail = async (email: string, fullName: string) => {
  const transporter = createEmailTransporter();
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Changed Successfully - KAPPI</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #4CAF50; margin-bottom: 10px; }
            .success-box { background-color: #d4edda; border: 1px solid #4CAF50; border-radius: 5px; padding: 15px; margin: 20px 0; text-align: center; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🌱 KAPPI</div>
                <h2>Password Changed Successfully</h2>
            </div>
            
            <p>Hello ${fullName},</p>
            
            <div class="success-box">
                <h3 style="color: #4CAF50; margin: 0;">✅ Password Updated</h3>
                <p style="margin: 10px 0 0 0;">Your KAPPI account password has been successfully changed.</p>
            </div>
            
            <p>If you did not make this change, please contact our support team immediately.</p>
            
            <p><strong>Security Tip:</strong> Keep your password secure and don't share it with anyone.</p>
            
            <div class="footer">
                <p>This email was sent from KAPPI - Plant Disease Detection App</p>
                <p>If you're having trouble, contact our support team</p>
                <p style="font-size: 12px; color: #999;">This is an automated message, please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
  `;
  
  const mailOptions = {
    from: `"KAPPI Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '✅ KAPPI Password Changed Successfully',
    html: htmlContent,
    text: `Hello ${fullName},

Your KAPPI account password has been successfully changed.

If you did not make this change, please contact our support team immediately.

Best regards,
KAPPI Team`
  };
  
  await transporter.sendMail(mailOptions);
};
