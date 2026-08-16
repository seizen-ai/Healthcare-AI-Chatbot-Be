import { AppError } from '../../utils/AppError.js';
import hospitalRepository from './hospital.repository.js';
class hospitalService {
    async createHospital () { 
        
    }

    async getHospitalById (hospitalId, userId) {
        const hospital = await hospitalRepository.getHospital({
            _id : hospitalId,
            ownerId : userId
        });

        if(!hospital) throw new AppError('Hospital not found', 404);

        return hospital;
    }
};



export default new hospitalService();