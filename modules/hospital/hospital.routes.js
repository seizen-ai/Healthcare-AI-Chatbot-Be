import express from 'express';
import { verifyToken } from '../../middlewares/verifyToken.js';
import { inputValidation } from '../../middlewares/ValidationMiddleware.js';
import { getHospitalById, createHospital, getHospitals } from './hospital.controller.js';
import { createHospitalSchema } from './hospital.validator.js';

const router = express.Router();

router.post('/create-hospital', verifyToken, inputValidation(createHospitalSchema), createHospital);
router.get('/get-hospital/:hospitalId', verifyToken, getHospitalById);
router.get('/get-hospitals', verifyToken, getHospitals);

export default router;