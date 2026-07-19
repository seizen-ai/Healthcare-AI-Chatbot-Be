import express from "express";
import { signup, verifyEmail } from "./auth.controller.js";
import { inputValidation } from "../../utils/ValidationMiddleware.js";
import { signupSchema, verifyEmailSchema } from "./auth.validator.js";

const router = express.Router();

router.post("/signup", inputValidation(signupSchema), signup);
router.get("/verify-email/:token", inputValidation(verifyEmailSchema), verifyEmail);

export default router;
