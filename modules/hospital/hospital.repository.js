import { Hospital } from './hospital.model.js';

class hospitalRepository {
    getHospital(query) {
        return Hospital.findOne(query);
    }

    getHospitals(query) {
        return Hospital.find(query);
    }

    createHospital(data) {
        return Hospital.create(data);
    }

    slugExists(slug) {
        return Hospital.exists({ slug });
    }
}

export default new hospitalRepository();