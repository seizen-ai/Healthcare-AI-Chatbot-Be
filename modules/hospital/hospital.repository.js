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
}

export default new hospitalRepository();
