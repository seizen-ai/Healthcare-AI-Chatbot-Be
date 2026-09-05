import { randomBytes } from 'crypto';
import { AppError } from '../../utils/AppError.js';
import hospitalRepository from './hospital.repository.js';


const toSlug = (name) =>
    name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')   // strip non-word chars
        .replace(/[\s_]+/g, '-')    // spaces → hyphens
        .replace(/-+/g, '-')        // collapse consecutive hyphens
        .slice(0, 180);


const generateUniqueSlug = async (base, maxAttempts = 5) => {
    for (let i = 0; i < maxAttempts; i++) {
        const candidate = i === 0 ? base : `${base}-${randomBytes(3).toString('hex')}`;
        const taken = await hospitalRepository.slugExists(candidate);
        if (!taken) return candidate;
    }
    throw new AppError('Could not generate a unique hospital slug. Please try again.', 500);
};

const generatePublicKey = () => randomBytes(16).toString('hex');



class HospitalService {
    async createHospital(data, ownerId) {
        const slug = await generateUniqueSlug(toSlug(data.name));
        const publicKey = generatePublicKey();

        const hospital = await hospitalRepository.createHospital({
            ...data,
            ownerId,
            slug,
            publicKey,
        });

        return hospital;
    }

    async getHospitalById(hospitalId, userId) {
        const hospital = await hospitalRepository.getHospital({
            _id: hospitalId,
            ownerId: userId,
        });

        if (!hospital) throw new AppError('Hospital not found', 404);

        return hospital;
    }

    async getHospitals(userId) {
        const query = {
            ownerId: userId
        };
        const hosiptals = await hospitalRepository.getHospitals(query);
        if (!hosiptals) throw new AppError('Hospitals Not Found', 404);
        return hosiptals;
    }

}

export default new HospitalService();
