import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 180,
    },
    publicKey: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      index: true,
    },
    website: {
      url: {
        type: String,
        required: true,
        trim: true,
      },
      verified: {
        type: Boolean,
        default: false,
      },
      verifiedAt: {
        type: Date,
        default: null,
      },
    },
    contact: {
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        trim: true,
      },
    },
    address: {
      street: { type: String, trim: true, maxlength: 250 },
      city: { type: String, trim: true, maxlength: 100 },
      state: { type: String, trim: true, maxlength: 100 },
      country: { type: String, trim: true, maxlength: 100, default: "India" },
      postalCode: { type: String, trim: true, maxlength: 20 },
    },
    status: {
      type: String,
      enum: ["onboarding", "active", "suspended", "archived"],
      default: "onboarding",
      index: true,
    },
    onboarding: {
      step: {
        type: String,
        enum: [
          "hospital_created",
          "website_added",
          "website_verified",
          "bot_configured",
          "knowledge_processing",
          "knowledge_ready",
          "crawler_failed",
          "completed",
        ],
        default: "hospital_created",
      },
      completedAt: {
        type: Date,
        default: null,
      },
    },
    botActivation: {
      eventId: { type: String, default: null },
      type: {
        type: String,
        enum: ['website_crawl', 'document_crawl'],
        default: null,
      },
      error: { type: String, maxlength: 2000, default: null },
      activatedAt: { type: Date, default: null },
      requestedAt: { type: Date, default: null },
    },
    timezone: { type: String, default: "Asia/Kolkata" },
    archivedAt: { type: Date, default: null },
    suspendedAt: { type: Date, default: null },
    suspensionReason: { type: String, maxlength: 500, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

hospitalSchema.index({ ownerId: 1, status: 1, createdAt: -1 });
hospitalSchema.index({ slug: 1 }, { unique: true });

export const Hospital = mongoose.model("Hospital", hospitalSchema);
