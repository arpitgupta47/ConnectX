import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Meeting } from "../models/meeting.model.js";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ── Helper: is plan still active? ────────────────────────────────
const isPlanActive = (user) => {
    if (user.plan === 'free') return true;
    if (user.plan === 'enterprise') return true;
    if (!user.planExpiresAt) return false;
    return new Date() < new Date(user.planExpiresAt);
};

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
        const activeSessionId = crypto.randomBytes(20).toString("hex");
        user.token = token;
        user.activeSessionId = activeSessionId;
        await user.save();
        return res.status(httpStatus.OK).json({ token, activeSessionId, message: "Login successful" });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e}` });
    }
};

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
        const newUser = new User({ name, username, email, password: hashedPassword, plan: 'free' });
        await newUser.save();
        return res.status(httpStatus.CREATED).json({ message: "Account created! Please sign in." });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e}` });
    }
};

const googleAuth = async (req, res) => {
    const { name, email, googleId, avatar } = req.body;
    if (!email || !googleId)
        return res.status(400).json({ message: "Email and Google ID are required" });
    try {
        let user = await User.findOne({ email });
        if (user) {
            const token = crypto.randomBytes(20).toString("hex");
            const activeSessionId = crypto.randomBytes(20).toString("hex");
            user.token = token;
            user.activeSessionId = activeSessionId;
            await user.save();
            return res.status(httpStatus.OK).json({ token, activeSessionId, message: "Google login successful" });
        }
        const username = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") + "_" + Math.floor(1000 + Math.random() * 9000);
        const token = crypto.randomBytes(20).toString("hex");
        const activeSessionId = crypto.randomBytes(20).toString("hex");
        const newUser = new User({
            name: name || username, username, email, googleId, avatar, token, activeSessionId, plan: 'free',
            password: await bcrypt.hash(googleId + (process.env.JWT_SECRET || "secret"), 10),
        });
        await newUser.save();
        return res.status(httpStatus.CREATED).json({ token, activeSessionId, message: "Google account registered & logged in" });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e}` });
    }
};

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
            html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0a0a14;color:white;border-radius:16px;overflow:hidden;"><div style="background:linear-gradient(135deg,#38bdf8,#818cf8);padding:32px;text-align:center;"><h1 style="margin:0;font-size:28px;font-weight:800;">ConnectX</h1><p style="margin:8px 0 0;opacity:.85;font-size:14px;">Password Reset Request</p></div><div style="padding:36px;background:#0f0f1e;"><p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 24px;">Hello <strong style="color:white;">${user.name}</strong>,<br/>Use the OTP below to reset your ConnectX password. It expires in <strong style="color:#38bdf8;">10 minutes</strong>.</p><div style="background:rgba(56,189,248,0.08);border:2px solid rgba(56,189,248,0.3);border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;"><div style="font-size:42px;font-weight:900;letter-spacing:12px;color:#38bdf8;font-family:monospace;">${otp}</div></div><p style="color:#475569;font-size:13px;text-align:center;margin:0;">If you didn't request this, you can safely ignore this email.</p></div><div style="padding:16px;background:#080810;text-align:center;"><p style="color:#334155;font-size:12px;margin:0;">© 2026 ConnectX — Built with ❤️ in India</p></div></div>`,
        });
        return res.status(200).json({ message: "OTP sent successfully" });
    } catch (e) {
        console.error("OTP email error:", e.message);
        return res.status(500).json({ message: "Failed to send OTP. Check EMAIL_USER and EMAIL_PASS in Render." });
    }
};

const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword)
        return res.status(400).json({ message: "Email, OTP and new password are required" });
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "No account found with this email" });
        if (!user.otp || user.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
        if (user.otpExpiry < new Date()) return res.status(400).json({ message: "OTP has expired. Please request a new one." });
        user.password = await bcrypt.hash(newPassword, 10);
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();
        return res.status(200).json({ message: "Password reset successfully! Please sign in." });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e}` });
    }
};

const getUserHistory = async (req, res) => {
    try {
        const meetings = await Meeting.find({ user_id: req.user.username });
        return res.status(200).json(meetings);
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e}` });
    }
};

const addToHistory = async (req, res) => {
    const { meeting_code } = req.body;
    try {
        const newMeeting = new Meeting({ user_id: req.user.username, meetingCode: meeting_code });
        await newMeeting.save();
        return res.status(httpStatus.CREATED).json({ message: "Added code to history" });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e}` });
    }
};

const getProfile = async (req, res) => {
    try {
        const user = req.user;
        // Auto-downgrade expired pro plan
        let currentPlan = user.plan;
        if (currentPlan === 'pro' && user.planExpiresAt && new Date() > new Date(user.planExpiresAt)) {
            currentPlan = 'free';
            user.plan = 'free';
            user.planExpiresAt = null;
            await user.save();
        }
        return res.status(200).json({
            name: user.name,
            username: user.username,
            email: user.email,
            avatar: user.avatar || null,
            plan: currentPlan,
            planExpiresAt: user.planExpiresAt || null,
        });
    } catch (e) {
        return res.status(500).json({ message: `Something went wrong: ${e}` });
    }
};

// ── Upgrade plan after successful Razorpay payment ───────────────
const upgradePlan = async (req, res) => {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, plan } = req.body;

    if (!razorpayPaymentId || !plan) {
        return res.status(400).json({ message: "Payment ID and plan are required" });
    }

    // Optional: verify Razorpay signature on backend for production security
    // const crypto = await import('crypto');
    // const body = razorpayOrderId + "|" + razorpayPaymentId;
    // const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
    // if (expectedSignature !== razorpaySignature) {
    //     return res.status(400).json({ message: "Payment verification failed" });
    // }

    try {
        const user = req.user;
        const now = new Date();

        if (plan === 'pro') {
            // 30-day subscription
            const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            user.plan = 'pro';
            user.planExpiresAt = expiresAt;
            user.razorpayPaymentId = razorpayPaymentId;
        } else if (plan === 'enterprise') {
            user.plan = 'enterprise';
            user.planExpiresAt = null;
            user.razorpayPaymentId = razorpayPaymentId;
        }

        await user.save();

        return res.status(200).json({
            message: `Plan upgraded to ${plan} successfully!`,
            plan: user.plan,
            planExpiresAt: user.planExpiresAt,
        });
    } catch (e) {
        return res.status(500).json({ message: `Upgrade failed: ${e}` });
    }
};

export { login, register, getUserHistory, addToHistory, sendOtp, resetPassword, googleAuth, getProfile, upgradePlan };
