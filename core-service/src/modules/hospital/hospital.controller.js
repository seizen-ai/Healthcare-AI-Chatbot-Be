import hospitalService from './hospital.service.js';
import { catchAsync } from '../../utils/CatchAsync.js';

export const getHospitalById = catchAsync(async (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Hospital Fetched Successfully",
        data: req.hospital
    });
});

export const createHospital = catchAsync(async (req, res) => {
    const result = await hospitalService.createHospital(req.body, req.user.id, req.headers.idempotencyKey);
    return res.status(201).json(result);
});

export const getHospitals = catchAsync(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const result = await hospitalService.getHospitals(req.user.id, req.query.cursor, limit);
    return res.status(200).json(result);
});

export const deleteHospital = catchAsync(async (req, res) => {
    const result = await hospitalService.deleteHospital(req.params.hospitalId, req.user.id);
    return res.status(200).json(result);
});

export const activateBot = catchAsync(async (req, res) => {
    const result = await hospitalService.activateBot(
        req.params.hospitalId,
        req.hospital,
        req.body
    );
    return res.status(202).json(result);
});
