import { z } from 'zod';

export const emailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email must be less than 255 characters')
  .trim()
  .toLowerCase();

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const phoneSchema = z.string()
  .regex(/^\+216\s?\d{2}\s?\d{3}\s?\d{3}$/, 'Invalid Tunisian phone number format')
  .optional()
  .or(z.literal(''));

export const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
  .trim();

export const citySchema = z.string()
  .min(2, 'City must be at least 2 characters')
  .max(50, 'City must be less than 50 characters')
  .trim();

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: nameSchema,
  phone: phoneSchema,
  city: citySchema
});
