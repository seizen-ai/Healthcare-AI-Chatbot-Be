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

export const createChatbotSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Chatbot name must be at least 1 characters')
      .max(150, 'Chatbot name must be at most 150 characters'),

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

const documentRefSchema = z.object({
  fileRef: z.string().min(1, 'fileRef is required'),
  fileName: z.string().optional(),
  mimeType: z.enum(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'], { message: 'Unsupported MIME type' }),
  sizeBytes: z.number().max(10 * 1024 * 1024, 'File size exceeds 10 MB limit').optional(),
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
    .array(documentRefSchema)
    .min(1, 'At least one document is required')
    .max(20, 'At most 20 documents per request')
    .refine(docs => docs.reduce((sum, d) => sum + (d.sizeBytes || 0), 0) <= 50 * 1024 * 1024, { message: 'Total batch size exceeds 50 MB limit' }),
});

export const activateBotSchema = z.object({
  body: z.discriminatedUnion('type', [websiteCrawlBody, documentCrawlBody]),
  params: z.object({
    chatbotId: z.string().min(1, 'chatbotId is required'),
  }),
});
