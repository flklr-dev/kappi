import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const ENCRYPTION_KEY = 'kappi_secure_storage_key';

const generateHash = async (data: string): Promise<string> => {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data + ENCRYPTION_KEY
  );
  return digest;
};

export const secureStorage = {
  setItem: async (key: string, value: any) => {
    try {
      const timestamp = Date.now().toString();
      const valueToStore = JSON.stringify({
        data: value,
        timestamp,
        hash: await generateHash(JSON.stringify(value) + timestamp)
      });
      await AsyncStorage.setItem(key, valueToStore);
    } catch (error) {
      console.error('Error storing secure data:', error);
      throw error;
    }
  },

  getItem: async (key: string) => {
    try {
      const storedValue = await AsyncStorage.getItem(key);
      if (!storedValue) return null;

      const { data, timestamp, hash } = JSON.parse(storedValue);
      const expectedHash = await generateHash(JSON.stringify(data) + timestamp);

      if (hash !== expectedHash) {
        // Data has been tampered with
        await AsyncStorage.removeItem(key);
        return null;
      }

      return data;
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