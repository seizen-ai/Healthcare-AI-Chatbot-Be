import { KnowledgeDocFile } from './knowledgeDocFile.model.js';

class KnowledgeDocFileRepository {
    findByHospitalAndHash(hospitalId, hash) {
        return KnowledgeDocFile.findOne({ hospitalId, hash, isDeleted: false });
    }

    async getHospitalDocStats(hospitalId) {
        const [result] = await KnowledgeDocFile.aggregate([
            { $match: { hospitalId, isDeleted: false } },
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

    findByFileRefsAndHospital(fileRefs, hospitalId) {
        return KnowledgeDocFile.find({
            fileRef: { $in: fileRefs },
            hospitalId,
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
