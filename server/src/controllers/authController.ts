import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

// Extend Request type to include user
interface AuthRequest extends Request {
  user?: IUser;
}

export const register = async (req: Request, res: Response) => {
  try {
    const { fullName, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      fullName,
      email,
      password,
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { _id: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
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

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { _id: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '7d' }
    );

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
    res.status(500).json({ message: 'Error logging in' });
  }
};

export const socialLogin = async (req: Request, res: Response) => {
  try {
    const { email, fullName, provider, providerId } = req.body;

    if (!email || !provider || !providerId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    let isNewUser = false;

    if (user) {
      // User exists, check if this provider is already linked
      const isProviderLinked = user.providers?.some(p => p.provider === provider && p.providerId === providerId);
      
      if (!isProviderLinked) {
        // Check if this is a registration attempt (can be determined by client-side flag)
        const isRegistrationAttempt = req.body.isRegistration === true;
        
        if (isRegistrationAttempt) {
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
    } else {
      // Create new user with social login (no password)
      user = new User({
        fullName,
        email,
        providers: [{ provider, providerId }]
      });

      await user.save();
      isNewUser = true;
    }

    // Generate token
    const token = jwt.sign(
      { _id: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
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

    // Update user's location
    const user = await User.findByIdAndUpdate(
      userId,
      {
        location: {
          coordinates,
          address
        }
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating location' });
  }
}; 