import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';

// Initialize Cloudinary lazily to ensure environment variables are loaded
let isCloudinaryConfigured = false;

const ensureCloudinaryConfigured = () => {
  if (!isCloudinaryConfigured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    isCloudinaryConfigured = true;
  }
};

// Generate SHA-1 signature for Cloudinary upload
const generateSignature = (params: Record<string, any>, apiSecret: string): string => {
  // Convert params to array of key=value pairs and sort
  const pairs = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  // Create SHA-1 hash with api_secret
  return crypto.createHash('sha1').update(pairs + apiSecret).digest('hex');
};

export const generateUploadSignature = () => {
  try {
    ensureCloudinaryConfigured();

    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `kappi_scan_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

    const params = {
      timestamp,
      public_id: publicId,
      folder: 'kappi_scans',
      format: 'jpg',
    };

    const signature = generateSignature(params, process.env.CLOUDINARY_API_SECRET || '');

    return {
      signature,
      timestamp,
      publicId,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    };
  } catch (error) {
    console.error('Error generating upload signature:', error);
    throw new Error('Failed to generate upload signature');
  }
};

export const deleteImageFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    ensureCloudinaryConfigured();
    await cloudinary.uploader.destroy(publicId);
    console.log(`Successfully deleted image from Cloudinary: ${publicId}`);
  } catch (error) {
    console.error(`Error deleting image from Cloudinary (${publicId}):`, error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};

export const validateCloudinaryUrl = async (url: string): Promise<boolean> => {
  try {
    // Check if URL matches Cloudinary pattern
    const cloudinaryPattern = new RegExp(`^https://res\\.cloudinary\\.com/${process.env.CLOUDINARY_CLOUD_NAME}/`);
    return cloudinaryPattern.test(url);
  } catch (error) {
    console.error('Error validating Cloudinary URL:', error);
    return false;
  }
};
