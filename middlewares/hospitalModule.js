import { catchAsync } from "../utils/CatchAsync.js";
import hospitalRepository from "../modules/hospital/hospital.repository.js";
import { AppError } from "../utils/AppError.js";
import { cacheService } from "../redis/index.js";

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



    if (!hospital) {//Always put attacker in confusion and never reveal internal details whether our hospital actually exists in the database or not with that hospitalId, If you do so then user more likely will do replay attacks with that hospitalId
        throw new AppError('Hospital Not Found or Unauthorized', 404);
    }

    // Cache the fetched hospital for future requests
    await cacheService.set(itemCacheKey, hospital);

    req.hospital = hospital;
    return next();
});

export const handleRace = catchAsync(async (req, res, next) => {
    const idempotencyKey = req.headers.idempotencykey || req.headers['x-idempotency-key'];
    const userId = req.user.id;
    //If idempotency key is not provided in the request headers, then reject the request right there
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