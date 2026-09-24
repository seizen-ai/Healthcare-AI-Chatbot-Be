import { catchAsync } from "../utils/CatchAsync.js";
import hospitalRepository from "../modules/hospital/hospital.repository.js";
import { AppError } from "../utils/AppError.js";
import { cacheService } from '../../../shared/redis/index.js';

export const checkHospitalOwnerShip = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const hospitalId = req.params.hospitalId;

    const itemCacheKey = `hospital:${hospitalId}`;
    const cached = await cacheService.get(itemCacheKey);

    if (cached && cached.ownerId === userId) {
        req.hospital = cached;
        return next();
    } else if (cached) {
        throw new AppError('Hospital Not Found or Unauthorized', 404);
    }

    const hospital = await hospitalRepository.getHospital({
        ownerId: userId,
        _id: hospitalId,
        isDeleted: false
    });

    if (!hospital) {
        throw new AppError('Hospital Not Found or Unauthorized', 404);
    }

    await cacheService.set(itemCacheKey, hospital);

    req.hospital = hospital;
    return next();
});

export const handleRace = catchAsync(async (req, res, next) => {
    const idempotencyKey = req.headers.idempotencykey || req.headers['x-idempotency-key'];
    const userId = req.user.id;

    if (!idempotencyKey) {
        throw new AppError('Idempotency key is required', 400);
    }

    req.idempotencyKey = idempotencyKey;

    const cached = await cacheService.setnx(`req-status:${userId}:${idempotencyKey}`, 'PROCESSING', 24 * 60 * 60);
    if (!cached) {
        const cacheStatus = await cacheService.get(`req-status:${userId}:${idempotencyKey}`);
        if (cacheStatus === 'COMPLETED') {
            const data = await cacheService.get(`req-response:${userId}:${idempotencyKey}`);
            return res.status(data.statusCode).json({
                success: true,
                data: data.payload
            });
        }
        throw new AppError('Request already processing', 409);
    }

    next();
});
