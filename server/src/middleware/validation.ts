import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

// Validation middleware
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Common validation rules
export const validateEmail = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Please provide a valid email address');

export const validatePassword = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]).{8,}$/)
  .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');

export const validateFullName = body('fullName')
  .isLength({ min: 2, max: 50 })
  .withMessage('Full name must be between 2 and 50 characters')
  .matches(/^[a-zA-Z\s]+$/)
  .withMessage('Full name can only contain letters and spaces');

export const validateOTP = body('otp')
  .isLength({ min: 6, max: 6 })
  .withMessage('OTP must be exactly 6 digits')
  .isNumeric()
  .withMessage('OTP must contain only numbers');

// Sanitize input
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize string inputs
  const sanitizeString = (str: string) => {
    if (typeof str !== 'string') return str;
    return str.trim().replace(/<script.*?>.*?<\/script>/gi, '');
  };

  // Recursively sanitize object
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};
