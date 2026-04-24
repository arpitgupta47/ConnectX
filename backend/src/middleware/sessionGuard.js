import { User } from "../models/user.model.js";

const sessionGuard = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    const sessionId = req.headers["x-session-id"];

    if (!token) {
        return res.status(401).json({ message: "No token provided. Please log in." });
    }

    try {
        const user = await User.findOne({ token });

        if (!user) {
            return res.status(401).json({ message: "Invalid session. Please log in again." });
        }

        if (user.activeSessionId) {
            if (!sessionId || sessionId !== user.activeSessionId) {
                return res.status(401).json({
                    message: "You have been logged in from another device. Please log in again.",
                    code: "SESSION_CONFLICT"
                });
            }
        }

        req.user = user;
        next();
    } catch (e) {
        return res.status(500).json({ message: `Session check failed: ${e}` });
    }
};

export default sessionGuard;
