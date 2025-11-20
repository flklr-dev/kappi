import mongoose, { Document, Schema } from 'mongoose';
import { encrypt, decrypt } from '../utils/encryption';

export interface IScan extends Document {
  user: mongoose.Types.ObjectId;
  disease: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'healthy' | 'Unknown';
  stage: 'Early' | 'Progressive' | 'Severe' | 'Healthy' | 'Infected' | 'Unknown';
  imageUri?: string;
  coordinates?: {
    // Encrypted fields stored in DB
    encryptedLatitude?: string;
    encryptedLongitude?: string;
    // Virtual getters/setters for decrypted values
    latitude?: number;
    longitude?: number;
  };
  address?: {
    // Encrypted fields stored in DB
    encryptedBarangay?: string;
    encryptedCity?: string;
    encryptedProvince?: string;
    // Virtual getters/setters for decrypted values
    barangay?: string;
    cityMunicipality?: string;
    province?: string;
  };
  createdAt: Date;
  isDeleted: boolean; // Add soft delete flag
  deletedAt?: Date; // Track when item was deleted
}

const scanSchema = new Schema<IScan>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  disease: { type: String, required: true },
  confidence: { type: Number, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'healthy', 'Unknown'], required: true },
  stage: { type: String, enum: ['Early', 'Progressive', 'Severe', 'Healthy', 'Infected', 'Unknown'], required: true },
  imageUri: { type: String },
  coordinates: {
    // Encrypted fields (stored in DB)
    encryptedLatitude: String,
    encryptedLongitude: String
  },
  address: {
    // Encrypted fields (stored in DB)
    encryptedBarangay: String,
    encryptedCity: String,
    encryptedProvince: String
  },
  createdAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false }, // Default to not deleted
  deletedAt: { type: Date, default: null } // Only set when item is deleted
});

// Indexes for performance optimization
// Compound index for getUserScans queries (most common query pattern)
// Covers queries filtering by user, sorting by createdAt (descending), and checking isDeleted
scanSchema.index({ user: 1, createdAt: -1, isDeleted: 1 }, { background: true });

// Compound index for filtering by user, disease, and isDeleted with case-insensitive regex search
scanSchema.index({ user: 1, disease: 1, isDeleted: 1 }, { background: true });

// Compound index for filtering by user, stage, and isDeleted
scanSchema.index({ user: 1, stage: 1, isDeleted: 1 }, { background: true });

// Index for statistics queries that filter by user and isDeleted
scanSchema.index({ user: 1, isDeleted: 1 }, { background: true });

// Index for finding specific scans by ID and user (for delete operations)
scanSchema.index({ _id: 1, user: 1 }, { background: true });

// Virtual getters/setters for decrypted location coordinates
scanSchema.virtual('coordinates.latitude')
  .get(function(this: IScan) {
    if (this.coordinates?.encryptedLatitude) {
      try {
        return parseFloat(decrypt(this.coordinates.encryptedLatitude));
      } catch (error) {
        console.error('Error decrypting scan latitude:', error);
        return undefined;
      }
    }
    return undefined;
  })
  .set(function(this: IScan, value: number) {
    if (!this.coordinates) {
      this.coordinates = {} as any;
    }
    if (value !== undefined && value !== null) {
      this.coordinates!.encryptedLatitude = encrypt(value.toString());
    }
  });

scanSchema.virtual('coordinates.longitude')
  .get(function(this: IScan) {
    if (this.coordinates?.encryptedLongitude) {
      try {
        return parseFloat(decrypt(this.coordinates.encryptedLongitude));
      } catch (error) {
        console.error('Error decrypting scan longitude:', error);
        return undefined;
      }
    }
    return undefined;
  })
  .set(function(this: IScan, value: number) {
    if (!this.coordinates) {
      this.coordinates = {} as any;
    }
    if (value !== undefined && value !== null) {
      this.coordinates!.encryptedLongitude = encrypt(value.toString());
    }
  });

// Virtual getters/setters for decrypted address fields
scanSchema.virtual('address.barangay')
  .get(function(this: IScan) {
    if (this.address?.encryptedBarangay) {
      try {
        return decrypt(this.address.encryptedBarangay);
      } catch (error) {
        console.error('Error decrypting scan barangay:', error);
        return undefined;
      }
    }
    return undefined;
  })
  .set(function(this: IScan, value: string) {
    if (!this.address) {
      this.address = {} as any;
    }
    if (value) {
      this.address!.encryptedBarangay = encrypt(value);
    }
  });

scanSchema.virtual('address.cityMunicipality')
  .get(function(this: IScan) {
    if (this.address?.encryptedCity) {
      try {
        return decrypt(this.address.encryptedCity);
      } catch (error) {
        console.error('Error decrypting scan city:', error);
        return undefined;
      }
    }
    return undefined;
  })
  .set(function(this: IScan, value: string) {
    if (!this.address) {
      this.address = {} as any;
    }
    if (value) {
      this.address!.encryptedCity = encrypt(value);
    }
  });

scanSchema.virtual('address.province')
  .get(function(this: IScan) {
    if (this.address?.encryptedProvince) {
      try {
        return decrypt(this.address.encryptedProvince);
      } catch (error) {
        console.error('Error decrypting scan province:', error);
        return undefined;
      }
    }
    return undefined;
  })
  .set(function(this: IScan, value: string) {
    if (!this.address) {
      this.address = {} as any;
    }
    if (value) {
      this.address!.encryptedProvince = encrypt(value);
    }
  });

export const Scan = mongoose.model<IScan>('Scan', scanSchema);
