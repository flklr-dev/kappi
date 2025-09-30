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
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  nameLastUpdated?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const providerSchema = new Schema({
  provider: {
    type: String,
    required: true,
    enum: ['google', 'facebook', 'email']
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
      required: function(this: IUser) {
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
    },
    resetPasswordToken: {
      type: String,
      select: false // Don't include in queries by default
    },
    resetPasswordExpires: {
      type: Date,
      select: false // Don't include in queries by default
    },
    nameLastUpdated: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (this: IUser, next) {
  console.log('Pre-save hook triggered');
  console.log('Password modified?', this.isModified('password'));
  console.log('Has password?', !!this.password);
  
  if (!this.isModified('password') || !this.password) {
    console.log('Skipping password hashing');
    return next();
  }

  try {
    console.log('Hashing password for user:', this.email);
    console.log('Original password length:', this.password.length);
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(this.password, salt);
    
    console.log('Password hashed successfully, hash length:', hashedPassword.length);
    console.log('Hash starts with:', hashedPassword.substring(0, 10));
    
    this.password = hashedPassword;
    next();
  } catch (error: any) {
    console.error('Password hashing error:', error);
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  console.log('Comparing passwords...');
  console.log('Candidate password length:', candidatePassword.length);
  console.log('Stored password hash length:', this.password?.length || 0);
  console.log('Stored hash starts with:', this.password?.substring(0, 10) || 'N/A');
  
  if (!this.password) {
    console.log('No stored password found');
    return false;
  }
  
  const result = await bcrypt.compare(candidatePassword, this.password);
  console.log('Password comparison result:', result);
  return result;
};

export const User = mongoose.model<IUser>('User', userSchema); 