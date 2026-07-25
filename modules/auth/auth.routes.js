import express from "express";
import { signup, verifyEmail, login } from "./auth.controller.js";
import { inputValidation } from "../../utils/ValidationMiddleware.js";
import { signupSchema, verifyEmailSchema, loginSchema } from "./auth.validator.js";

const router = express.Router();

router.post("/signup", inputValidation(signupSchema), signup);
router.get("/verify-email/:token", inputValidation(verifyEmailSchema), verifyEmail);
router.post("/login", inputValidation(loginSchema), login);
export default router;
