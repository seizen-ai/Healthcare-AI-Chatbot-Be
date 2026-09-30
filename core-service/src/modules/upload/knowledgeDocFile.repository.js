import { KnowledgeDocFile } from './knowledgeDocFile.model.js';

class KnowledgeDocFileRepository {
    findByChatbotAndHash(chatbotId, hash) {
        return KnowledgeDocFile.findOne({ chatbotId, hash, isDeleted: false });
    }

    async getChatbotDocStats(chatbotId) {
        const [result] = await KnowledgeDocFile.aggregate([
            { $match: { chatbotId, isDeleted: false } },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    totalSize: { $sum: '$sizeBytes' },
                },
            },
        ]);
        return { count: result?.count || 0, totalSize: result?.totalSize || 0 };
    }

    create(data) {
        return KnowledgeDocFile.create(data);
    }

    findByFileRefsAndChatbot(fileRefs, chatbotId) {
        return KnowledgeDocFile.find({
            fileRef: { $in: fileRefs },
            chatbotId,
            isDeleted: false,
        });
    }

    bulkSetStatus(docIds, status, errorMessage = null) {
        return KnowledgeDocFile.updateMany(
            { _id: { $in: docIds } },
            { $set: { status, errorMessage } }
        );
    }

    softDelete(id) {
        return KnowledgeDocFile.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    }
}

export default new KnowledgeDocFileRepository();
