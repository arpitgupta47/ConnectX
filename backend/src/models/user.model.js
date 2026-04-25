import mongoose from "mongoose";
import { Schema } from "mongoose";

const userScheme = new Schema({
    name:               { type: String, required: true },
    username:           { type: String, required: true, unique: true },
    email:              { type: String, required: true, unique: true },
    password:           { type: String, required: true },
    token:              { type: String },
    activeSessionId:    { type: String },
    otp:                { type: String },
    otpExpiry:          { type: Date },
    googleId:           { type: String },
    avatar:             { type: String },
    // Subscription plan
    plan:               { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    planExpiresAt:      { type: Date, default: null },
    razorpayPaymentId:  { type: String, default: null },
});

const User = mongoose.model("User", userScheme);
export { User };
