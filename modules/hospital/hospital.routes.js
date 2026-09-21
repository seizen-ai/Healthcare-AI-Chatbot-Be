import express from 'express';
import { verifyToken } from '../../middlewares/verifyToken.js';
import { inputValidation } from '../../middlewares/ValidationMiddleware.js';
import { getHospitalById, createHospital, getHospitals, deleteHospital, activateBot } from './hospital.controller.js';
import { createHospitalSchema } from './hospital.validator.js';
import { checkHospitalOwnerShip } from '../../middlewares/hospitalModule.js';
import { handleRace } from '../../middlewares/hospitalModule.js';

const router = express.Router();

router.post('/create-hospital', verifyToken, inputValidation(createHospitalSchema), handleRace, createHospital);
router.get('/get-hospital/:hospitalId', verifyToken, checkHospitalOwnerShip, getHospitalById);
router.get('/get-hospitals', verifyToken, getHospitals);
router.delete('/delete-hospital/:hospitalId', verifyToken, deleteHospital);

// Crawler / Bot activation
// POST /api/hospital/:hospitalId/activate
// Fires the Kafka event that kicks off: scrape → embed → store in Qdrant
router.post('/:hospitalId/activate', verifyToken, checkHospitalOwnerShip, activateBot);

export default router;

