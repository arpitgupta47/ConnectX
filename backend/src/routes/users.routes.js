import { Router } from "express";
import { addToHistory, getUserHistory, login, register } from "../controllers/user.controller.js";
import { aiChat } from "../controllers/ai.controller.js";
 
const router = Router();
 
router.post("/login", login);
router.post("/register", register);
router.post("/add_to_activity", addToHistory);
router.get("/get_all_activity", getUserHistory);
 
// AI proxy route
router.post("/ai/chat", aiChat);
 
export default router;
