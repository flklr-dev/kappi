import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// Provider interface for social logins
interface Provider {
  provider: string;
  providerId: string;
}

export interface IUser extends Document {
  fullName: string;
  email: string;
  password?: string;
  providers?: Provider[];
  location?: {
    coordinates: {
      latitude: number;
      longitude: number;
    };
    address: {
      barangay: string;
      cityMunicipality: string;
      province: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const providerSchema = new Schema({
  provider: {
    type: String,
    required: true,
    enum: ['google', 'facebook']
  },
  providerId: {
    type: String,
    required: true
  }
});

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: function() {
        return !this.providers || this.providers.length === 0;
      },
      minlength: 6,
    },
    providers: [providerSchema],
    location: {
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      address: {
        barangay: String,
        cityMunicipality: String,
        province: String
      }
    }
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema); 