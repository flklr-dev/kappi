import mongoose, { Document, Schema } from 'mongoose';

export interface IScan extends Document {
  user: mongoose.Types.ObjectId;
  disease: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'healthy' | 'Unknown';
  stage: 'Early' | 'Progressive' | 'Severe' | 'Healthy' | 'Unknown';
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
}

const scanSchema = new Schema<IScan>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  disease: { type: String, required: true },
  confidence: { type: Number, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'healthy', 'Unknown'], required: true },
  stage: { type: String, enum: ['Early', 'Progressive', 'Severe', 'Healthy', 'Unknown'], required: true },
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
  createdAt: { type: Date, default: Date.now }
});

export const Scan = mongoose.model<IScan>('Scan', scanSchema); 