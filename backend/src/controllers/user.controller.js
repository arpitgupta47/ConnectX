import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Meeting } from "../models/meeting.model.js";

// LOGIN
const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Please Provide" });
    }

    try {
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User Not Found" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (isPasswordCorrect) {
            const token = crypto.randomBytes(20).toString("hex");

            user.token = token;
            await user.save();

            return res.status(httpStatus.OK).json({
                token,
                message: "Login successful"
            });
        } else {
            return res.status(httpStatus.UNAUTHORIZED).json({
                message: "Invalid Username or password"
            });
        }

    } catch (e) {
        return res.status(500).json({
            message: `Something went wrong ${e}`
        });
    }
};

// REGISTER
const register = async (req, res) => {
    const { name, username, password } = req.body;

    try {
        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.status(httpStatus.BAD_REQUEST).json({
                message: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            username,
            password: hashedPassword
        });

        await newUser.save();

        return res.status(httpStatus.CREATED).json({
            message: "User Registered"
        });

    } catch (e) {
        return res.status(500).json({
            message: `Something went wrong ${e}`
        });
    }
};

// GET HISTORY
const getUserHistory = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1] || req.query.token;

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        const user = await User.findOne({ token });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const meetings = await Meeting.find({ user_id: user.username });

        return res.status(200).json(meetings);

    } catch (e) {
        return res.status(500).json({
            message: `Something went wrong ${e}`
        });
    }
};

// ADD HISTORY
const addToHistory = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    const { meeting_code } = req.body;

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        const user = await User.findOne({ token });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: meeting_code
        });

        await newMeeting.save();

        return res.status(httpStatus.CREATED).json({
            message: "Added code to history"
        });

    } catch (e) {
        return res.status(500).json({
            message: `Something went wrong ${e}`
        });
    }
};

export { login, register, getUserHistory, addToHistory };
