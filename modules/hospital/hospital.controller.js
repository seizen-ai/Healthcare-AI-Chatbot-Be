import hospitalService from './hospital.service.js';
import { catchAsync } from '../../utils/CatchAsync.js';



export const getHospitalById = catchAsync(async (req, res) => {
    //Fetch the hospital with id equals hospitalId only if it belongs to the current authenticated user
    const result = await hospitalService.getHospitalById(req.params.hospitalId, req.user.id);


    return res.status(200).json(result);
});

export const createHospital = catchAsync(async (req, res) => {
    //Create the hospital in the database
    const result = await hospitalService.createHospital(req.body, req.user.id);


    return res.status(201).json(result);
});

export const getHospitals = catchAsync(async (req, res) => {
    const result = await hospitalService.getHospitals(req.user.id);
    return res.status(200).json(result);
});