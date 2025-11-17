import { Request, Response } from 'express';
import { generateUploadSignature, validateCloudinaryUrl, deleteImageFromCloudinary } from '../services/cloudinaryService';
import { IUser } from '../models/User';

interface AuthRequest extends Request {
  user?: IUser;
}

export const getUploadSignature = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    console.log('Generating upload signature for user:', req.user._id);

    const signatureData = generateUploadSignature();

    res.status(200).json({
      success: true,
      uploadSignature: signatureData,
    });
  } catch (error: any) {
    console.error('Error in getUploadSignature:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate upload signature',
      error: error.message,
    });
  }
};

export const validateUploadUrl = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ message: 'Image URL is required' });
    }

    console.log('Validating upload URL:', imageUrl);

    const isValid = await validateCloudinaryUrl(imageUrl);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Cloudinary URL',
      });
    }

    res.status(200).json({
      success: true,
      message: 'URL is valid',
      isValid: true,
    });
  } catch (error: any) {
    console.error('Error in validateUploadUrl:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate URL',
      error: error.message,
    });
  }
};

export const cleanupOrphanedImage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ message: 'Public ID is required' });
    }

    console.log('Cleaning up orphaned image:', publicId);

    await deleteImageFromCloudinary(publicId);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error: any) {
    console.error('Error in cleanupOrphanedImage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error.message,
    });
  }
};
