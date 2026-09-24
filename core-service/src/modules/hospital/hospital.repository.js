import { Hospital } from './hospital.model.js';

class hospitalRepository {
    getHospital(query) {
        return Hospital.findOne(query);
    }

    getHospitals(query, sortingOrder, limit) {
        return Hospital.find(query).sort({ _id: sortingOrder }).limit(limit);
    }

    getPaginatedHospitals(query, sortingOrder, limit) {
        return Hospital.find(query).sort({ _id: sortingOrder }).limit(limit);
    }

    createHospital(data) {
        return Hospital.create(data);
    }

    slugExists(slug) {
        return Hospital.exists({ slug });
    }

    softDeleteHospital(query) {
        return Hospital.findByIdAndUpdate(query, { isDeleted: true, deletedAt: new Date() }, { new: true });
    }

    updateOnboardingStep(hospitalId, step, extra = {}) {
        return Hospital.findByIdAndUpdate(
            hospitalId,
            { $set: { 'onboarding.step': step, ...extra } },
            { new: true }
        );
    }

    setBotActivationInProgress(hospitalId, { eventId, type, requestedAt }) {
        return Hospital.findByIdAndUpdate(
            hospitalId,
            {
                $set: {
                    'onboarding.step': 'knowledge_processing',
                    'botActivation.eventId': eventId,
                    'botActivation.type': type,
                    'botActivation.requestedAt': requestedAt,
                    'botActivation.error': null,
                },
            },
            { new: true }
        );
    }

    setBotActivationSuccess(hospitalId, eventId) {
        return Hospital.findOneAndUpdate(
            { _id: hospitalId, 'botActivation.eventId': eventId },
            {
                $set: {
                    'onboarding.step': 'knowledge_ready',
                    'onboarding.completedAt': new Date(),
                    'botActivation.activatedAt': new Date(),
                    'botActivation.error': null,
                    status: 'active',
                },
            },
            { new: true }
        );
    }

    setBotActivationFailed(hospitalId, eventId, errorMessage) {
        return Hospital.findOneAndUpdate(
            { _id: hospitalId, 'botActivation.eventId': eventId },
            {
                $set: {
                    'onboarding.step': 'crawler_failed',
                    'botActivation.error': errorMessage,
                },
            },
            { new: true }
        );
    }

    findStaleActivations(cutoffDate) {
        return Hospital.find({
            'onboarding.step': 'knowledge_processing',
            'botActivation.requestedAt': { $lt: cutoffDate },
        });
    }
}

export default new hospitalRepository();
