import api from './api';
import * as FileSystem from 'expo-file-system';

export interface UploadSignature {
  signature: string;
  timestamp: number;
  publicId: string;
  cloudName: string;
  apiKey: string;
  uploadUrl: string;
}

export interface UploadResponse {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
}

/**
 * Get a signed upload signature from the server for direct Cloudinary uploads
 */
export const getUploadSignature = async (): Promise<UploadSignature> => {
  try {
    console.log('Requesting upload signature from server');
    const response = await api.post('/upload/signature', {});
    return (response.data as any).uploadSignature;
  } catch (error: any) {
    console.error('Error getting upload signature:', error);
    throw new Error('Failed to get upload signature');
  }
};

/**
 * Upload an image directly to Cloudinary using FormData and signed parameters
 */
export const uploadImageToCloudinary = async (
  imageUri: string,
  uploadSignature: UploadSignature
): Promise<UploadResponse> => {
  try {
    console.log('Starting direct Cloudinary upload for image:', imageUri);

    // Read the file
    const fileData = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Determine MIME type based on file extension
    const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpeg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    // Create FormData
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: mimeType,
      name: `${uploadSignature.publicId}.${ext}`,
    } as any);

    formData.append('public_id', uploadSignature.publicId);
    formData.append('signature', uploadSignature.signature);
    formData.append('timestamp', uploadSignature.timestamp.toString());
    formData.append('api_key', uploadSignature.apiKey);
    formData.append('folder', 'kappi_scans');
    formData.append('format', 'jpg');

    // Upload to Cloudinary
    console.log('Uploading to Cloudinary:', uploadSignature.uploadUrl);
    const response = await fetch(uploadSignature.uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudinary upload failed:', response.status, errorText);
      throw new Error(`Upload failed with status ${response.status}`);
    }

    const result: UploadResponse = await response.json();
    console.log('Image uploaded successfully to Cloudinary:', result.secure_url);

    return result;
  } catch (error: any) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

/**
 * Upload image to server (fallback for when direct upload fails)
 */
export const uploadImageToServer = async (
  imageUri: string,
  scanMetadata: any
): Promise<any> => {
  try {
    console.log('Uploading image to server as fallback');

    const formData = new FormData();

    // Add metadata
    formData.append('disease', scanMetadata.disease);
    formData.append('confidence', scanMetadata.confidence.toString());
    formData.append('severity', scanMetadata.severity);
    formData.append('stage', scanMetadata.stage);

    if (scanMetadata.coordinates) {
      formData.append('coordinates', JSON.stringify(scanMetadata.coordinates));
    }
    if (scanMetadata.address) {
      formData.append('address', JSON.stringify(scanMetadata.address));
    }

    // Add image
    const fileExtension = imageUri.split('.').pop()?.toLowerCase() || 'jpeg';
    const fileName = `scan-${Date.now()}.${fileExtension}`;
    const fileType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;

    formData.append('image', {
      uri: imageUri,
      type: fileType,
      name: fileName,
    } as any);

    const response = await api.post('/scans', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    console.log('Image uploaded to server successfully');
    return response.data;
  } catch (error: any) {
    console.error('Error uploading to server:', error);
    throw error;
  }
};

/**
 * Validate that a URL is a valid Cloudinary URL
 */
export const validateCloudinaryUrl = async (imageUrl: string): Promise<boolean> => {
  try {
    console.log('Validating Cloudinary URL:', imageUrl);
    const response = await api.post('/upload/validate', { imageUrl });
    return (response.data as any).isValid;
  } catch (error: any) {
    console.error('Error validating URL:', error);
    return false;
  }
};

/**
 * Cleanup an orphaned image from Cloudinary
 */
export const cleanupOrphanedImage = async (publicId: string): Promise<void> => {
  try {
    console.log('Cleaning up orphaned image:', publicId);
    await api.post('/upload/cleanup', { publicId });
    console.log('Image cleanup completed');
  } catch (error: any) {
    console.error('Error cleaning up image:', error);
    // Don't throw here as cleanup failures shouldn't break the app
  }
};
