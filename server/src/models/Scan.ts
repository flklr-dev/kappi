import mongoose, { Document, Schema } from 'mongoose';

export interface IScan extends Document {
  user: mongoose.Types.ObjectId;
  disease: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'healthy' | 'Unknown';
  stage: 'Early' | 'Progressive' | 'Severe' | 'Healthy' | 'Infected' | 'Unknown';
  imageUri?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  address?: {
    barangay: string;
    cityMunicipality: string;
    province: string;
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
    latitude: Number,
    longitude: Number
  },
  address: {
    barangay: String,
    cityMunicipality: String,
    province: String
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

export const Scan = mongoose.model<IScan>('Scan', scanSchema);
