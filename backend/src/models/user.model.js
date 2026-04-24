import mongoose from "mongoose";
import { Schema } from "mongoose";

const userScheme = new Schema({
    name:            { type: String, required: true },
    username:        { type: String, required: true, unique: true },
    email:           { type: String, required: true, unique: true },
    password:        { type: String, required: true },
    token:           { type: String },
    activeSessionId: { type: String },   // ← tracks the ONE active login session
    otp:             { type: String },
    otpExpiry:       { type: Date },
    googleId:        { type: String },
    avatar:          { type: String },
});

const User = mongoose.model("User", userScheme);
export { User };
