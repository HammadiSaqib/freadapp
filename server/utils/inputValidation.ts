import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

// Common validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  SSN_LAST_FOUR: /^\d{4}$/,
  ZIP_CODE: /^\d{5}(-\d{4})?$/,
  DATE_ISO: /^\d{4}-\d{2}-\d{2}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  ALPHANUMERIC_SPACES: /^[a-zA-Z0-9\s]+$/,
  NAME: /^[a-zA-Z\s'-]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  SAFE_STRING: /^[a-zA-Z0-9\s.,!?'-]+$/,
  SQL_INJECTION: /(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|vbscript|onload|onerror|onclick)/i,
  XSS_PATTERNS: /(<script|javascript:|vbscript:|onload=|onerror=|onclick=|onmouseover=|<iframe|<object|<embed)/i
};

// Sanitization options
export interface SanitizationOptions {
  allowHtml?: boolean;
  maxLength?: number;
  trimWhitespace?: boolean;
  removeSpecialChars?: boolean;
  allowedChars?: RegExp;
  convertToLowerCase?: boolean;
}

// Input validation result
export interface ValidationResult {
  isValid: boolean;
  sanitizedValue?: any;
  errors: string[];
  warnings: string[];
}

// Advanced input sanitizer class
export class InputSanitizer {
  // Sanitize string input
  static sanitizeString(
    input: string, 
    options: SanitizationOptions = {}
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitized = input;

    // Check for null/undefined
    if (input == null) {
      return {
        isValid: false,
        errors: ['Input cannot be null or undefined'],
        warnings
      };
    }

    // Convert to string if not already
    if (typeof input !== 'string') {
      sanitized = String(input);
      warnings.push('Input was converted to string');
    }

    // Trim whitespace
    if (options.trimWhitespace !== false) {
      sanitized = sanitized.trim();
    }

    // Check for SQL injection patterns
    if (VALIDATION_PATTERNS.SQL_INJECTION.test(sanitized)) {
      errors.push('Input contains potential SQL injection patterns');
      return { isValid: false, errors, warnings };
    }

    // Check for XSS patterns
    if (VALIDATION_PATTERNS.XSS_PATTERNS.test(sanitized)) {
      errors.push('Input contains potential XSS patterns');
      return { isValid: false, errors, warnings };
    }

    // HTML sanitization
    if (!options.allowHtml) {
      const originalLength = sanitized.length;
      sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [] });
      if (sanitized.length !== originalLength) {
        warnings.push('HTML content was removed');
      }
    } else {
      sanitized = DOMPurify.sanitize(sanitized);
    }

    // Length validation
    if (options.maxLength && sanitized.length > options.maxLength) {
      errors.push(`Input exceeds maximum length of ${options.maxLength}`);
      return { isValid: false, errors, warnings };
    }

    // Character validation
    if (options.allowedChars && !options.allowedChars.test(sanitized)) {
      errors.push('Input contains invalid characters');
      return { isValid: false, errors, warnings };
    }

    // Remove special characters if requested
    if (options.removeSpecialChars) {
      const originalLength = sanitized.length;
      sanitized = sanitized.replace(/[^a-zA-Z0-9\s]/g, '');
      if (sanitized.length !== originalLength) {
        warnings.push('Special characters were removed');
      }
    }

    // Convert to lowercase
    if (options.convertToLowerCase) {
      sanitized = sanitized.toLowerCase();
    }

    return {
      isValid: true,
      sanitizedValue: sanitized,
      errors,
      warnings
    };
  }

  // Sanitize email
  static sanitizeEmail(email: string): ValidationResult {
    const result = this.sanitizeString(email, {
      maxLength: 254,
      convertToLowerCase: true,
      allowedChars: VALIDATION_PATTERNS.EMAIL
    });

    if (result.isValid && result.sanitizedValue) {
      if (!validator.isEmail(result.sanitizedValue)) {
        return {
          isValid: false,
          errors: ['Invalid email format'],
          warnings: result.warnings
        };
      }
    }

    return result;
  }

  // Sanitize phone number
  static sanitizePhone(phone: string): ValidationResult {
    let sanitized = phone.replace(/[^\d+]/g, ''); // Remove all non-digits except +
    
    const result = this.sanitizeString(sanitized, {
      maxLength: 16,
      allowedChars: VALIDATION_PATTERNS.PHONE
    });

    if (result.isValid && result.sanitizedValue) {
      if (!validator.isMobilePhone(result.sanitizedValue)) {
        return {
          isValid: false,
          errors: ['Invalid phone number format'],
          warnings: result.warnings
        };
      }
    }

    return result;
  }

  // Sanitize name (first name, last name)
  static sanitizeName(name: string): ValidationResult {
    return this.sanitizeString(name, {
      maxLength: 50,
      allowedChars: VALIDATION_PATTERNS.NAME
    });
  }

  // Sanitize SSN last four digits
  static sanitizeSSNLastFour(ssn: string): ValidationResult {
    const sanitized = ssn.replace(/\D/g, ''); // Remove non-digits
    
    if (sanitized.length !== 4) {
      return {
        isValid: false,
        errors: ['SSN last four must be exactly 4 digits'],
        warnings: []
      };
    }

    return {
      isValid: true,
      sanitizedValue: sanitized,
      errors: [],
      warnings: []
    };
  }

  // Sanitize date
  static sanitizeDate(date: string): ValidationResult {
    const result = this.sanitizeString(date, {
      maxLength: 10,
      allowedChars: VALIDATION_PATTERNS.DATE_ISO
    });

    if (result.isValid && result.sanitizedValue) {
      if (!validator.isISO8601(result.sanitizedValue)) {
        return {
          isValid: false,
          errors: ['Invalid date format. Use YYYY-MM-DD'],
          warnings: result.warnings
        };
      }

      // Check if date is reasonable (not too far in past/future)
      const inputDate = new Date(result.sanitizedValue);
      const now = new Date();
      const hundredYearsAgo = new Date(now.getFullYear() - 100, now.getMonth(), now.getDate());
      const tenYearsFromNow = new Date(now.getFullYear() + 10, now.getMonth(), now.getDate());

      if (inputDate < hundredYearsAgo || inputDate > tenYearsFromNow) {
        return {
          isValid: false,
          errors: ['Date must be within reasonable range'],
          warnings: result.warnings
        };
      }
    }

    return result;
  }

  // Sanitize numeric input
  static sanitizeNumber(
    input: string | number, 
    options: { min?: number; max?: number; integer?: boolean } = {}
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    let num: number;
    
    if (typeof input === 'string') {
      // Remove any non-numeric characters except decimal point and minus
      const cleaned = input.replace(/[^\d.-]/g, '');
      num = parseFloat(cleaned);
    } else {
      num = input;
    }

    if (isNaN(num)) {
      return {
        isValid: false,
        errors: ['Invalid number format'],
        warnings
      };
    }

    // Integer validation
    if (options.integer && !Number.isInteger(num)) {
      return {
        isValid: false,
        errors: ['Number must be an integer'],
        warnings
      };
    }

    // Range validation
    if (options.min !== undefined && num < options.min) {
      errors.push(`Number must be at least ${options.min}`);
    }

    if (options.max !== undefined && num > options.max) {
      errors.push(`Number must not exceed ${options.max}`);
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: num,
      errors,
      warnings
    };
  }

  // Sanitize object recursively
  static sanitizeObject(
    obj: Record<string, any>, 
    options: SanitizationOptions = {}
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key itself
      const keyResult = this.sanitizeString(key, {
        maxLength: 100,
        allowedChars: /^[a-zA-Z0-9_]+$/
      });

      if (!keyResult.isValid) {
        errors.push(`Invalid key '${key}': ${keyResult.errors.join(', ')}`);
        continue;
      }

      const sanitizedKey = keyResult.sanitizedValue || key;

      // Sanitize the value based on its type
      if (typeof value === 'string') {
        const valueResult = this.sanitizeString(value, options);
        if (valueResult.isValid) {
          sanitized[sanitizedKey] = valueResult.sanitizedValue;
          warnings.push(...valueResult.warnings);
        } else {
          errors.push(`Invalid value for '${key}': ${valueResult.errors.join(', ')}`);
        }
      } else if (typeof value === 'number') {
        const valueResult = this.sanitizeNumber(value);
        if (valueResult.isValid) {
          sanitized[sanitizedKey] = valueResult.sanitizedValue;
        } else {
          errors.push(`Invalid number for '${key}': ${valueResult.errors.join(', ')}`);
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const valueResult = this.sanitizeObject(value, options);
        if (valueResult.isValid) {
          sanitized[sanitizedKey] = valueResult.sanitizedValue;
          warnings.push(...valueResult.warnings);
        } else {
          errors.push(`Invalid object for '${key}': ${valueResult.errors.join(', ')}`);
        }
      } else if (Array.isArray(value)) {
        // Handle arrays (limit size and sanitize elements)
        if (value.length > 100) {
          errors.push(`Array '${key}' exceeds maximum length of 100`);
          continue;
        }
        
        const sanitizedArray: any[] = [];
        for (let i = 0; i < value.length; i++) {
          if (typeof value[i] === 'string') {
            const itemResult = this.sanitizeString(value[i], options);
            if (itemResult.isValid) {
              sanitizedArray.push(itemResult.sanitizedValue);
            }
          } else {
            sanitizedArray.push(value[i]);
          }
        }
        sanitized[sanitizedKey] = sanitizedArray;
      } else {
        // For other types (boolean, null, etc.), keep as is
        sanitized[sanitizedKey] = value;
      }
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      errors,
      warnings
    };
  }
}

// Zod schema helpers with enhanced validation
export const createSecureStringSchema = (
  minLength: number = 1,
  maxLength: number = 255,
  pattern?: RegExp
) => {
  let schema = z.string()
    .min(minLength, `Must be at least ${minLength} characters`)
    .max(maxLength, `Must not exceed ${maxLength} characters`)
    .transform((val) => {
      const result = InputSanitizer.sanitizeString(val, { maxLength });
      if (!result.isValid) {
        throw new Error(result.errors.join(', '));
      }
      return result.sanitizedValue || val;
    });

  if (pattern) {
    schema = schema.regex(pattern, 'Invalid format');
  }

  return schema;
};

export const createSecureEmailSchema = () => {
  return z.string()
    .email('Invalid email format')
    .max(254, 'Email too long')
    .transform((val) => {
      const result = InputSanitizer.sanitizeEmail(val);
      if (!result.isValid) {
        throw new Error(result.errors.join(', '));
      }
      return result.sanitizedValue || val;
    });
};

export const createSecureNumberSchema = (
  min?: number,
  max?: number,
  integer: boolean = false
) => {
  let schema = z.number();
  
  if (min !== undefined) {
    schema = schema.min(min, `Must be at least ${min}`);
  }
  
  if (max !== undefined) {
    schema = schema.max(max, `Must not exceed ${max}`);
  }
  
  if (integer) {
    schema = schema.int('Must be an integer');
  }
  
  return schema;
};

// Export convenience functions
export const sanitizeString = (input: string, options?: SanitizationOptions) => 
  InputSanitizer.sanitizeString(input, options);

export const sanitizeEmail = (email: string) => 
  InputSanitizer.sanitizeEmail(email);

export const sanitizeName = (name: string) => 
  InputSanitizer.sanitizeName(name);

export const sanitizePhone = (phone: string) => 
  InputSanitizer.sanitizePhone(phone);

export const sanitizeObject = (obj: Record<string, any>, options?: SanitizationOptions) => 
  InputSanitizer.sanitizeObject(obj, options);

export default InputSanitizer;