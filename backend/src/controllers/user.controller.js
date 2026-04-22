import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Meeting } from "../models/meeting.model.js";
import nodemailer from "nodemailer";

// ── Email transporter ─────────────────────────────────────────────
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ── LOGIN ─────────────────────────────────────────────────────────
const login = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ message: "Please provide username and password" });
    try {
        const user = await User.findOne({ username });
        if (!user)
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect)
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid username or password" });

        const token = crypto.randomBytes(20).toString("hex");
        user.token = token;
        await user.save();
        return res.status(httpStatus.OK).json({ token, message: "Login successful" });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e}` });
    }
};

// ── REGISTER ──────────────────────────────────────────────────────
const register = async (req, res) => {
    const { name, username, email, password } = req.body;
    if (!name || !username || !email || !password)
        return res.status(400).json({ message: "All fields are required" });
    try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            if (existingUser.username === username)
                return res.status(httpStatus.BAD_REQUEST).json({ message: "Username already taken" });
            return res.status(httpStatus.BAD_REQUEST).json({ message: "Email already registered" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, username, email, password: hashedPassword });
        await newUser.save();
        return res.status(httpStatus.CREATED).json({ message: "Account created! Please sign in." });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e}` });
    }
};

// ── GOOGLE AUTH ───────────────────────────────────────────────────
const googleAuth = async (req, res) => {
    const { name, email, googleId, avatar } = req.body;
    if (!email || !googleId)
        return res.status(400).json({ message: "Email and Google ID are required" });
    try {
        let user = await User.findOne({ email });
        if (user) {
            // Existing user — just log them in
            const token = crypto.randomBytes(20).toString("hex");
            user.token = token;
            await user.save();
            return res.status(httpStatus.OK).json({ token, message: "Google login successful" });
        }
        // New user — auto-register
        const username = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") + "_" + Math.floor(1000 + Math.random() * 9000);
        const token = crypto.randomBytes(20).toString("hex");
        const newUser = new User({
            name: name || username,
            username,
            email,
            googleId,
            avatar,
            token,
            password: await bcrypt.hash(googleId + (process.env.JWT_SECRET || "secret"), 10),
        });
        await newUser.save();
        return res.status(httpStatus.CREATED).json({ token, message: "Google account registered & logged in" });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e}` });
    }
};

// ── SEND OTP ──────────────────────────────────────────────────────
const sendOtp = async (req, res) => {
    const { email } = req.body;
    if (!email)
        return res.status(400).json({ message: "Email is required" });
    try {
        const user = await User.findOne({ email });
        if (!user)
            return res.status(404).json({ message: "No account found with this email" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();

        await transporter.sendMail({
            from: `"ConnectX" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Your ConnectX Password Reset OTP",
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a14; color: white; border-radius: 16px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #38bdf8, #818cf8); padding: 32px; text-align: center;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 800;">ConnectX</h1>
                    <p style="margin: 8px 0 0; opacity: 0.85; font-size: 14px;">Password Reset Request</p>
                </div>
                <div style="padding: 36px; background: #0f0f1e;">
                    <p style="color: #94a3b8; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
                        Hello <strong style="color: white;">${user.name}</strong>,<br/>
                        Use the OTP below to reset your ConnectX password. It expires in <strong style="color: #38bdf8;">10 minutes</strong>.
                    </p>
                    <div style="background: rgba(56,189,248,0.08); border: 2px solid rgba(56,189,248,0.3); border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
                        <div style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #38bdf8; font-family: monospace;">${otp}</div>
                    </div>
                    <p style="color: #475569; font-size: 13px; text-align: center; margin: 0;">
                        If you didn't request this, you can safely ignore this email.
                    </p>
                </div>
                <div style="padding: 16px; background: #080810; text-align: center;">
                    <p style="color: #334155; font-size: 12px; margin: 0;">© 2025 ConnectX — Built with ❤️ in India</p>
                </div>
            </div>
            `,
        });

        return res.status(200).json({ message: "OTP sent successfully" });
    } catch (e) {
        console.error("OTP email error:", e.message);
        return res.status(500).json({ message: "Failed to send OTP. Check EMAIL_USER and EMAIL_PASS in Render." });
    }
};

// ── VERIFY OTP + RESET PASSWORD ───────────────────────────────────
const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
        return res.status(400).json({ message: "Email, OTP and new password are required" });
    try {
        const user = await User.findOne({ email });
        if (!user)
            return res.status(404).json({ message: "No account found with this email" });

        if (!user.otp || user.otp !== otp)
            return res.status(400).json({ message: "Invalid OTP" });

        if (user.otpExpiry < new Date())
            return res.status(400).json({ message: "OTP has expired. Please request a new one." });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        return res.status(200).json({ message: "Password reset successfully! Please sign in." });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e}` });
    }
};

// ── GET HISTORY ───────────────────────────────────────────────────
const getUserHistory = async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token)
        return res.status(401).json({ message: "No token provided" });
    try {
        const user = await User.findOne({ token });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const meetings = await Meeting.find({ user_id: user.username });
        return res.status(200).json(meetings);
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e}` });
    }
};

// ── ADD HISTORY ───────────────────────────────────────────────────
const addToHistory = async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    const { meeting_code } = req.body;
    if (!token)
        return res.status(401).json({ message: "No token provided" });
    try {
        const user = await User.findOne({ token });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const newMeeting = new Meeting({ user_id: user.username, meetingCode: meeting_code });
        await newMeeting.save();
        return res.status(httpStatus.CREATED).json({ message: "Added code to history" });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e}` });
    }
};


// ── GET PROFILE ───────────────────────────────────────────────────
const getProfile = async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
        return res.status(401).json({ message: "No token provided" });
    try {
        const user = await User.findOne({ token });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        return res.status(200).json({
            name: user.name,
            username: user.username,
            email: user.email,
            avatar: user.avatar || null,
        });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e}` });
    }
};

export { login, register, getUserHistory, addToHistory, sendOtp, resetPassword, googleAuth, getProfile };
