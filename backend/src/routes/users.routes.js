import { Router } from "express";
import {
    addToHistory, getUserHistory, login, register,
    sendOtp, resetPassword, googleAuth, getProfile
} from "../controllers/user.controller.js";
import { aiChat } from "../controllers/ai.controller.js";
import sessionGuard from "../middleware/sessionGuard.js";

const router = Router();

// ── Public routes (no session check needed) ──────────────────────
router.post("/login", login);
router.post("/register", register);
router.post("/google-auth", googleAuth);
router.post("/send-otp", sendOtp);
router.post("/reset-password", resetPassword);

// ── Protected routes (sessionGuard checks single-device login) ───
router.post("/add_to_activity",  sessionGuard, addToHistory);
router.get("/get_all_activity",  sessionGuard, getUserHistory);
router.get("/get_profile",       sessionGuard, getProfile);

// AI proxy route (protected)
router.post("/ai/chat", sessionGuard, aiChat);

export default router;
