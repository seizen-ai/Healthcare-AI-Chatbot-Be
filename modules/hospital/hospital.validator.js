import { z } from 'zod';



const urlField = z
  .string()
  .trim()
  .url('Website URL must be a valid URL (include https://)');

const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{6,14}$/, 'Phone number is invalid');

const emailField = z
  .string()
  .trim()
  .email('Contact email is invalid')
  .toLowerCase();



export const createHospitalSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Hospital name must be at least 1 characters')
      .max(150, 'Hospital name must be at most 150 characters'),

    website: z.object({
      url: urlField,
    }),

    contact: z
      .object({
        email: emailField.optional(),
        phone: phoneField.optional(),
      })
      .optional(),

    address: z
      .object({
        street: z.string().trim().max(250).optional(),
        city: z.string().trim().max(100).optional(),
        state: z.string().trim().max(100).optional(),
        country: z.string().trim().max(100).optional(),
        postalCode: z.string().trim().max(20).optional(),
      })
      .optional(),

    timezone: z.string().trim().optional(),
  }),
});
