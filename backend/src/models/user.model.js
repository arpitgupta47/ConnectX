import mongoose from "mongoose";
import { Schema } from "mongoose";

const userScheme = new Schema({
    name:     { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true },
    token:    { type: String },
    otp:      { type: String },
    otpExpiry:{ type: Date },
});

const User = mongoose.model("User", userScheme);
export { User };
