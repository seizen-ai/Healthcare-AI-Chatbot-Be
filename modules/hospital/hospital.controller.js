import hospitalService from './hospital.service.js';
import { catchAsync } from '../../utils/CatchAsync.js';



export const getHospitalById = catchAsync(async (req,res) => {
    //Fetch the hospital with id equals hospitalId only if it belongs to the current authenticated user
    const result = await hospitalService.getHospitalById(req.params.hospitalId, req.user.id);


    return res.status(200).json(result);
});