import crypto from 'crypto';

/**
 * Server-side encryption utilities for PII data
 * Uses AES-256-GCM authenticated encryption
 * 
 * IMPORTANT: Ensure ENCRYPTION_KEY is set in environment variables
 * For production: Use AWS KMS, Azure Key Vault, or HashiCorp Vault for key management
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits for GCM
const TAG_LENGTH = 16; // 128 bits authentication tag
const SALT_LENGTH = 64; // 512 bits for key derivation

/**
 * Get encryption key from environment
 * Falls back to a development key if not set (DO NOT USE IN PRODUCTION)
 */
const getEncryptionKey = (): Buffer => {
  const keyString = process.env.ENCRYPTION_KEY || 
    '8646c9cbaefa10977ae5ea85461fd039f7af1c8221159bffd8a4ec74324f9e75';
  
  if (!process.env.ENCRYPTION_KEY) {
    console.warn('⚠️  WARNING: Using default encryption key. Set ENCRYPTION_KEY environment variable for production!');
  }
  
  // Derive 256-bit key using PBKDF2
  return crypto.pbkdf2Sync(keyString, 'kappi-salt', 100000, 32, 'sha256');
};

/**
 * Encrypt data using AES-256-GCM
 * Returns base64-encoded encrypted data with IV and auth tag
 */
export const encrypt = (plaintext: string): string => {
  if (!plaintext) return plaintext;
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV + encrypted data + auth tag
    const combined = Buffer.concat([
      iv,
      Buffer.from(encrypted, 'base64'),
      authTag
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt data encrypted with AES-256-GCM
 */
export const decrypt = (encryptedData: string): string => {
  if (!encryptedData) return encryptedData;
  
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract IV, encrypted data, and auth tag
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(combined.length - TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted.toString('base64'), 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Encrypt location coordinates object
 */
export const encryptCoordinates = (coordinates: { latitude: number; longitude: number }): {
  encryptedLatitude: string;
  encryptedLongitude: string;
} => {
  return {
    encryptedLatitude: encrypt(coordinates.latitude.toString()),
    encryptedLongitude: encrypt(coordinates.longitude.toString())
  };
};

/**
 * Decrypt location coordinates object
 */
export const decryptCoordinates = (encrypted: { encryptedLatitude: string; encryptedLongitude: string }): {
  latitude: number;
  longitude: number;
} => {
  return {
    latitude: parseFloat(decrypt(encrypted.encryptedLatitude)),
    longitude: parseFloat(decrypt(encrypted.encryptedLongitude))
  };
};

/**
 * Encrypt address object
 */
export const encryptAddress = (address: {
  barangay?: string;
  cityMunicipality?: string;
  province?: string;
}): {
  encryptedBarangay?: string;
  encryptedCity?: string;
  encryptedProvince?: string;
} => {
  return {
    encryptedBarangay: address.barangay ? encrypt(address.barangay) : undefined,
    encryptedCity: address.cityMunicipality ? encrypt(address.cityMunicipality) : undefined,
    encryptedProvince: address.province ? encrypt(address.province) : undefined
  };
};

/**
 * Decrypt address object
 */
export const decryptAddress = (encrypted: {
  encryptedBarangay?: string;
  encryptedCity?: string;
  encryptedProvince?: string;
}): {
  barangay?: string;
  cityMunicipality?: string;
  province?: string;
} => {
  return {
    barangay: encrypted.encryptedBarangay ? decrypt(encrypted.encryptedBarangay) : undefined,
    cityMunicipality: encrypted.encryptedCity ? decrypt(encrypted.encryptedCity) : undefined,
    province: encrypted.encryptedProvince ? decrypt(encrypted.encryptedProvince) : undefined
  };
};
