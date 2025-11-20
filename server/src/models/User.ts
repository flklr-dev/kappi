import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { encrypt, decrypt } from '../utils/encryption';

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
      // Encrypted fields stored in DB
      encryptedLatitude: string;
      encryptedLongitude: string;
      // Virtual getters/setters for decrypted values
      latitude?: number;
      longitude?: number;
    };
    address: {
      // Encrypted fields stored in DB
      encryptedBarangay?: string;
      encryptedCity?: string;
      encryptedProvince?: string;
      // Virtual getters/setters for decrypted values
      barangay?: string;
      cityMunicipality?: string;
      province?: string;
    };
  };
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  nameLastUpdated?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  originalEmail?: string;
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
        // Encrypted fields (stored in DB)
        encryptedLatitude: String,
        encryptedLongitude: String
      },
      address: {
        // Encrypted fields (stored in DB)
        encryptedBarangay: String,
        encryptedCity: String,
        encryptedProvince: String
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
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    },
    originalEmail: {
      type: String,
      select: false // Don't include in queries by default, used for reactivation
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

// Virtual getters/setters for decrypted location coordinates
userSchema.virtual('location.coordinates.latitude')
  .get(function(this: IUser) {
    if (this.location?.coordinates?.encryptedLatitude) {
      try {
        return parseFloat(decrypt(this.location.coordinates.encryptedLatitude));
      } catch (error) {
        console.error('Error decrypting latitude:', error);
        return undefined;
      }
    }
    return undefined;
  })
  .set(function(this: IUser, value: number) {
    if (!this.location) {
      this.location = { coordinates: {} as any, address: {} as any };
    }
    if (!this.location.coordinates) {
      this.location.coordinates = {} as any;
    }
    if (value !== undefined && value !== null) {
      this.location.coordinates.encryptedLatitude = encrypt(value.toString());
    }
  });

userSchema.virtual('location.coordinates.longitude')
  .get(function(this: IUser) {
    if (this.location?.coordinates?.encryptedLongitude) {
      try {
        return parseFloat(decrypt(this.location.coordinates.encryptedLongitude));
      } catch (error) {
        console.error('Error decrypting longitude:', error);
        return undefined;
      }
    }
    return undefined;
  })
  .set(function(this: IUser, value: number) {
    if (!this.location) {
      this.location = { coordinates: {} as any, address: {} as any };
    }
    if (!this.location.coordinates) {
      this.location.coordinates = {} as any;
    }
    if (value !== undefined && value !== null) {
      this.location.coordinates.encryptedLongitude = encrypt(value.toString());
    }
  });

// Virtual getters/setters for decrypted address fields
userSchema.virtual('location.address.barangay')
  .get(function(this: IUser) {
    if (this.location?.address?.encryptedBarangay) {
      try {
        return decrypt(this.location.address.encryptedBarangay);
      } catch (error) {
        console.error('Error decrypting barangay:', error);
        return undefined;
      }
    }
    return undefined;
  })
  .set(function(this: IUser, value: string) {
    if (!this.location) {
      this.location = { coordinates: {} as any, address: {} as any };
    }
    if (!this.location.address) {
      this.location.address = {} as any;
    }
    if (value) {
      this.location.address.encryptedBarangay = encrypt(value);
    }
  });

userSchema.virtual('location.address.cityMunicipality')
  .get(function(this: IUser) {
    if (this.location?.address?.encryptedCity) {
      try {
        return decrypt(this.location.address.encryptedCity);
      } catch (error) {
        console.error('Error decrypting city:', error);
        return undefined;
      }
    }
    return undefined;
  })
  .set(function(this: IUser, value: string) {
    if (!this.location) {
      this.location = { coordinates: {} as any, address: {} as any };
    }
    if (!this.location.address) {
      this.location.address = {} as any;
    }
    if (value) {
      this.location.address.encryptedCity = encrypt(value);
    }
  });

userSchema.virtual('location.address.province')
  .get(function(this: IUser) {
    if (this.location?.address?.encryptedProvince) {
      try {
        return decrypt(this.location.address.encryptedProvince);
      } catch (error) {
        console.error('Error decrypting province:', error);
        return undefined;
      }
    }
    return undefined;
  })
  .set(function(this: IUser, value: string) {
    if (!this.location) {
      this.location = { coordinates: {} as any, address: {} as any };
    }
    if (!this.location.address) {
      this.location.address = {} as any;
    }
    if (value) {
      this.location.address.encryptedProvince = encrypt(value);
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