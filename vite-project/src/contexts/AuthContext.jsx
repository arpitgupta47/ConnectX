import axios from "axios";
import httpStatus from "http-status";
import { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment"; // ✅ only one source of truth

// Create Context
export const AuthContext = createContext({});

// Axios instance
const client = axios.create({
    baseURL: `${server}/api/v1/users`
});

// 🔥 Optional but PRO: Auto attach token
client.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const AuthProvider = ({ children }) => {

    const [userData, setUserData] = useState(null);
    const navigate = useNavigate();

    // ✅ Register
    const handleRegister = async (name, username, password) => {
        try {
            const response = await client.post("/register", {
                name,
                username,
                password,
            });

            if (response.status === httpStatus.CREATED) {
                return response.data.message;
            }
        } catch (err) {
            console.error("Register Error:", err.response?.data || err.message);
            throw err;
        }
    };

    // ✅ Login
    const handleLogin = async (username, password) => {
        try {
            const response = await client.post("/login", {
                username,
                password,
            });

            if (response.status === httpStatus.OK) {
                localStorage.setItem("token", response.data.token);
                // navigate("/home");
            }
        } catch (err) {
            console.error("Login Error:", err.response?.data || err.message);
            throw err;
        }
    };

    // ✅ Get User History
    const getHistoryOfUser = async () => {
        try {
            const response = await client.get("/get_all_activity");
            return response.data;
        } catch (err) {
            console.error("Get History Error:", err.response?.data || err.message);
            throw err;
        }
    };

    // ✅ Add to History
    const addToUserHistory = async (meetingCode) => {
        try {
            const response = await client.post("/add_to_activity", {
                meeting_code: meetingCode,
            });
            return response.data;
        } catch (err) {
            console.error("Add History Error:", err.response?.data || err.message);
            throw err;
        }
    };

    // Context Data
    const value = {
        userData,
        setUserData,
        handleRegister,
        handleLogin,
        getHistoryOfUser,
        addToUserHistory,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};