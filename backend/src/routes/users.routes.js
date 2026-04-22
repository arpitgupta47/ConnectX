import { Router } from "express";
import { addToHistory, getUserHistory, login, register, sendOtp, resetPassword, googleAuth } from "../controllers/user.controller.js";
import { aiChat } from "../controllers/ai.controller.js";

const router = Router();

router.post("/login", login);
router.post("/register", register);
router.post("/add_to_activity", addToHistory);
router.get("/get_all_activity", getUserHistory);

// Google Auth
router.post("/google-auth", googleAuth);

// OTP / Forgot Password
router.post("/send-otp", sendOtp);
router.post("/reset-password", resetPassword);

// AI proxy route
router.post("/ai/chat", aiChat);

export default router;
