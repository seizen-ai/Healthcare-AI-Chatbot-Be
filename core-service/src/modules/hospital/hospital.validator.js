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

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'text/markdown',
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_BATCH = 10;
const MAX_TOTAL_SIZE_BYTES = 50 * 1024 * 1024;

const documentSchema = z.object({
  fileRef: z.string().min(1, 'fileRef is required'),
  fileName: z.string().min(1, 'fileName is required'),
  mimeType: z.enum(ALLOWED_MIME_TYPES, {
    errorMap: () => ({ message: 'Unsupported file type. Allowed: pdf, docx, txt, csv, md' }),
  }),
  sizeBytes: z
    .number()
    .int()
    .positive('sizeBytes must be a positive integer')
    .max(MAX_FILE_SIZE_BYTES, `Each file must be at most ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`),
});

const websiteCrawlBody = z.object({
  type: z.literal('website_crawl'),
  websiteUrl: z
    .string()
    .trim()
    .url('websiteUrl must be a valid URL')
    .refine(
      (url) => /^https?:\/\//i.test(url),
      'websiteUrl must use http or https protocol'
    ),
});

const documentCrawlBody = z.object({
  type: z.literal('document_crawl'),
  documents: z
    .array(documentSchema)
    .min(1, 'At least one document is required')
    .max(MAX_FILES_PER_BATCH, `At most ${MAX_FILES_PER_BATCH} documents per request`)
    .refine(
      (docs) => {
        const totalSize = docs.reduce((sum, d) => sum + d.sizeBytes, 0);
        return totalSize <= MAX_TOTAL_SIZE_BYTES;
      },
      `Total upload size must not exceed ${MAX_TOTAL_SIZE_BYTES / (1024 * 1024)} MB`
    ),
});

export const activateBotSchema = z.object({
  body: z.discriminatedUnion('type', [websiteCrawlBody, documentCrawlBody]),
  params: z.object({
    hospitalId: z.string().min(1, 'hospitalId is required'),
  }),
});
