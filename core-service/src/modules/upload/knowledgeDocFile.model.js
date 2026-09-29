import mongoose from 'mongoose';

const DOC_STATUS = ['UPLOADED', 'PROCESSING', 'ACTIVE', 'FAILED'];

const knowledgeDocFileSchema = new mongoose.Schema(
    {
        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
            index: true,
        },
        fileName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        mimeType: {
            type: String,
            required: true,
        },
        sizeBytes: {
            type: Number,
            required: true,
        },
        hash: {
            type: String,
            required: true,
        },
        fileRef: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: DOC_STATUS,
            default: 'UPLOADED',
        },
        errorMessage: {
            type: String,
            maxlength: 2000,
            default: null,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

knowledgeDocFileSchema.index(
    { hospitalId: 1, hash: 1 },
    { unique: true, partialFilterExpression: { isDeleted: false } }
);

knowledgeDocFileSchema.index({ hospitalId: 1, isDeleted: 1 });

export const KnowledgeDocFile = mongoose.model('KnowledgeDocFile', knowledgeDocFileSchema);
