import express from 'express';
import { verifyToken } from '../../middlewares/verifyToken.js';
import { getHospitalById } from './hospital.controller.js';
const router = express.Router();


router.get('/create-hospital', );
router.get('/get/:hospitalId', verifyToken, getHospitalById);

export default router;