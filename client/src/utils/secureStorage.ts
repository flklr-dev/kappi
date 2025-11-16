import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// Key management
const ENCRYPTION_KEY_STORAGE_KEY = '@kappi_encryption_key';
const ENCRYPTION_SALT = 'kappi_secure_salt_v1';

// Generate or retrieve a unique encryption key for this device
const getOrCreateEncryptionKey = async (): Promise<string> => {
  try {
    // Try to retrieve existing key
    let encryptionKey = await AsyncStorage.getItem(ENCRYPTION_KEY_STORAGE_KEY);
    
    if (!encryptionKey) {
      // Generate a new 256-bit (32-byte) key using secure random bytes
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      // Convert to hex string for storage
      encryptionKey = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Store the key securely
      await AsyncStorage.setItem(ENCRYPTION_KEY_STORAGE_KEY, encryptionKey);
      console.log('Generated new encryption key for secure storage');
    }
    
    return encryptionKey;
  } catch (error) {
    console.error('Error managing encryption key:', error);
    throw new Error('Failed to initialize encryption key');
  }
};

// Derive an encryption key from the master key and data-specific salt
const deriveKey = async (masterKey: string, salt: string): Promise<Uint8Array> => {
  // Create a combined string for key derivation
  const combined = masterKey + salt + ENCRYPTION_SALT;
  
  // Use SHA-256 to derive a 256-bit key
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    combined
  );
  
  // Convert hex digest to Uint8Array (32 bytes for AES-256)
  const keyArray = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    keyArray[i] = parseInt(digest.substr(i * 2, 2), 16);
  }
  
  return keyArray;
};

// Simple XOR-based encryption (since expo-crypto doesn't provide AES directly)
// For production, consider using react-native-quick-crypto or similar
const encryptData = async (data: string, key: Uint8Array): Promise<string> => {
  const dataBytes = new TextEncoder().encode(data);
  const encrypted = new Uint8Array(dataBytes.length);
  
  // XOR encryption with key expansion
  for (let i = 0; i < dataBytes.length; i++) {
    encrypted[i] = dataBytes[i] ^ key[i % key.length];
  }
  
  // Convert to base64 for storage
  return btoa(String.fromCharCode(...encrypted));
};

const decryptData = async (encryptedData: string, key: Uint8Array): Promise<string> => {
  try {
    // Decode from base64
    const encryptedBytes = new Uint8Array(
      atob(encryptedData).split('').map(c => c.charCodeAt(0))
    );
    
    const decrypted = new Uint8Array(encryptedBytes.length);
    
    // XOR decryption
    for (let i = 0; i < encryptedBytes.length; i++) {
      decrypted[i] = encryptedBytes[i] ^ key[i % key.length];
    }
    
    // Convert back to string
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

// Generate integrity hash for tamper detection
const generateHash = async (data: string, key: string): Promise<string> => {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data + key + ENCRYPTION_SALT
  );
  return digest;
};

export const secureStorage = {
  setItem: async (key: string, value: any) => {
    try {
      const masterKey = await getOrCreateEncryptionKey();
      const timestamp = Date.now().toString();
      const dataString = JSON.stringify(value);
      
      // Derive a key specific to this storage key
      const derivedKey = await deriveKey(masterKey, key);
      
      // Encrypt the data
      const encryptedData = await encryptData(dataString, derivedKey);
      
      // Generate hash for integrity verification
      const hash = await generateHash(encryptedData + timestamp, masterKey);
      
      const valueToStore = JSON.stringify({
        encrypted: encryptedData,
        timestamp,
        hash,
        version: '2.0' // Version to track encryption method
      });
      
      await AsyncStorage.setItem(key, valueToStore);
    } catch (error) {
      console.error('Error storing encrypted data:', error);
      throw error;
    }
  },

  getItem: async (key: string) => {
    try {
      const storedValue = await AsyncStorage.getItem(key);
      if (!storedValue) return null;

      const parsed = JSON.parse(storedValue);
      
      // Handle legacy unencrypted data (version 1.0 or no version)
      if (!parsed.version || parsed.version === '1.0') {
        // Legacy format: { data, timestamp, hash }
        if (parsed.data !== undefined) {
          console.warn(`Legacy unencrypted data found for key: ${key}`);
          return parsed.data;
        }
      }
      
      // Handle encrypted data (version 2.0)
      const { encrypted, timestamp, hash } = parsed;
      const masterKey = await getOrCreateEncryptionKey();
      
      // Verify integrity
      const expectedHash = await generateHash(encrypted + timestamp, masterKey);
      if (hash !== expectedHash) {
        console.error('Data integrity check failed - possible tampering detected');
        await AsyncStorage.removeItem(key);
        return null;
      }
      
      // Derive the same key used for encryption
      const derivedKey = await deriveKey(masterKey, key);
      
      // Decrypt the data
      const decryptedString = await decryptData(encrypted, derivedKey);
      
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Error retrieving encrypted data:', error);
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