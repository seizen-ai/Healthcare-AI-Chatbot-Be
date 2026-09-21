import express from "express";
import { signup, verifyEmail, login, logout, refresh, forgetPassword, resetPassword } from "./auth.controller.js";
import { inputValidation } from "../../middlewares/ValidationMiddleware.js";
import { signupSchema, verifyEmailSchema, loginSchema, forgetPasswordSchema, resetPasswordSchema } from "./auth.validator.js";
import { verifyToken } from "../../middlewares/verifyToken.js";

const router = express.Router();

router.post("/signup", inputValidation(signupSchema), signup);
router.get("/verify-email/:token", inputValidation(verifyEmailSchema), verifyEmail);
router.post("/login", inputValidation(loginSchema), login);
router.post("/forget-password", inputValidation(forgetPasswordSchema), forgetPassword);
// router.post("/reset-password/:token", inputValidation(resetPasswordSchema), resetPassword);
router.post("/reset-password/:token", resetPassword);
router.delete("/logout", logout);
router.get("/refresh", refresh);

export default router;
