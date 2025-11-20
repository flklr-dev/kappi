import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// NOTE: This is an interim XOR-based encryption implementation
// Production deployment MUST upgrade to AES-256-GCM using native crypto libraries
// See: https://docs.expo.dev/versions/latest/sdk/crypto/ for production upgrade path

const DEVICE_KEY_STORAGE = 'kappi_device_encryption_key_v2';
const KEY_LENGTH = 32; // 256 bits for future AES-256 compatibility

/**
 * Get or create a unique device encryption key
 * Stored in SecureStore (iOS Keychain/Android Keystore)
 */
const getDeviceEncryptionKey = async (): Promise<string> => {
  try {
    // Try to get existing key from secure storage
    let key = await SecureStore.getItemAsync(DEVICE_KEY_STORAGE);
    
    if (!key) {
      // Generate new random key using cryptographically secure random
      const randomBytes = await Crypto.getRandomBytesAsync(KEY_LENGTH);
      // Convert to base64 to ensure only valid characters
      key = btoa(String.fromCharCode(...randomBytes));
      
      // Store in secure enclave
      await SecureStore.setItemAsync(DEVICE_KEY_STORAGE, key);
      console.log('Generated new device encryption key');
    }
    
    return key;
  } catch (error) {
    console.error('Error getting device encryption key:', error);
    // Fallback to deterministic key (less secure, but prevents data loss)
    return '8646c9cbaefa10977ae5ea85461fd039f7af1c8221159bffd8a4ec74324f9e75';
  }
};

/**
 * XOR-based encryption (interim solution)
 * NOTE: This provides basic confidentiality. Upgrade to AES-256-GCM for production.
 */
const xorEncrypt = (data: string, key: string): string => {
  const dataBytes = new TextEncoder().encode(data);
  const keyBytes = new TextEncoder().encode(key);
  const encrypted = new Uint8Array(dataBytes.length);
  
  for (let i = 0; i < dataBytes.length; i++) {
    encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  
  // Convert to base64 for safe storage
  return btoa(String.fromCharCode(...encrypted));
};

/**
 * XOR-based decryption (interim solution)
 */
const xorDecrypt = (encryptedData: string, key: string): string => {
  try {
    // Decode from base64
    const encrypted = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const keyBytes = new TextEncoder().encode(key);
    const decrypted = new Uint8Array(encrypted.length);
    
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Generate HMAC for authenticated encryption
 */
const generateHMAC = async (data: string, key: string): Promise<string> => {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data + key
  );
  return digest;
};

export const secureStorage = {
  /**
   * Store data with encryption and authentication
   * Uses XOR encryption (interim) + HMAC for authenticated encryption
   * TODO: Upgrade to AES-256-GCM in production
   */
  setItem: async (key: string, value: any) => {
    try {
      const deviceKey = await getDeviceEncryptionKey();
      const timestamp = Date.now().toString();
      const dataString = JSON.stringify(value);
      
      // Encrypt the actual data
      const encryptedData = xorEncrypt(dataString, deviceKey);
      
      // Generate HMAC for authentication (ensures data integrity and authenticity)
      const hmac = await generateHMAC(encryptedData + timestamp, deviceKey);
      
      const valueToStore = JSON.stringify({
        encrypted: encryptedData,
        timestamp,
        hmac,
        version: 'xor_v1' // Version identifier for future migration to AES-256-GCM
      });
      
      await AsyncStorage.setItem(key, valueToStore);
    } catch (error) {
      console.error('Error storing secure data:', error);
      throw error;
    }
  },

  /**
   * Retrieve and decrypt data with authentication verification
   */
  getItem: async (key: string) => {
    try {
      const storedValue = await AsyncStorage.getItem(key);
      if (!storedValue) return null;

      const parsed = JSON.parse(storedValue);
      
      // Handle legacy unencrypted data (for migration)
      if (!parsed.encrypted && parsed.data) {
        console.warn('Legacy unencrypted data detected, returning as-is. Consider re-saving to encrypt.');
        return parsed.data;
      }
      
      const { encrypted, timestamp, hmac, version } = parsed;
      const deviceKey = await getDeviceEncryptionKey();
      
      // Verify HMAC (authenticated encryption)
      const expectedHmac = await generateHMAC(encrypted + timestamp, deviceKey);
      if (hmac !== expectedHmac) {
        console.error('HMAC verification failed - data may be tampered');
        await AsyncStorage.removeItem(key);
        return null;
      }
      
      // Decrypt data
      const decryptedString = xorDecrypt(encrypted, deviceKey);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Error retrieving secure data:', error);
      return null;
    }
  },

  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing secure data:', error);
      throw error;
    }
  }
};

export const sanitizeInput = (input: string): string => {
  // Remove script tags, trim, and escape dangerous characters
  let sanitized = input.trim();
  sanitized = sanitized.replace(/<script.*?>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/["'`;\\]/g, ''); // Remove quotes, semicolons, backslashes
  sanitized = sanitized.replace(/[<>]/g, ''); // Remove angle brackets
  return sanitized;
}; 