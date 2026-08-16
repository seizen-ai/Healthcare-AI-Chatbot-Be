import { Hospital } from './hospital.model.js';

class hospitalRepository {
    getHospital (query) {
        return Hospital.findOne(query);
    }
}


export default new hospitalRepository();