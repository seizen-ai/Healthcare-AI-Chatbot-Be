import express from "express";
import { signup, verifyEmail, login, logout } from "./auth.controller.js";
import { inputValidation } from "../../middlewares/ValidationMiddleware.js";
import { signupSchema, verifyEmailSchema, loginSchema } from "./auth.validator.js";
import { verifyToken } from "../../middlewares/verifyToken.js";

const router = express.Router();

router.post("/signup", inputValidation(signupSchema), signup);
router.get("/verify-email/:token", inputValidation(verifyEmailSchema), verifyEmail);
router.post("/login", inputValidation(loginSchema), login);
router.delete("/logout", logout);
router.get("/refresh", refresh);

export default router;
