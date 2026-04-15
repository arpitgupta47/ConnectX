import axios from "axios";
import httpStatus from "http-status";
import { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";

export const AuthContext = createContext({});

const client = axios.create({
  baseURL: `${server}/api/v1/users`,
  timeout: 10000,
  withCredentials: true   // ✅ ADD THIS LINE
});

// Request Interceptor
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor
client.interceptors.response.use(
  (res) => res,
  (error) => {
    console.log("❌ API ERROR:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  // REGISTER
  const handleRegister = async (name, username, password) => {
    try {
      const res = await client.post("/register", {
        name,
        username,
        password,
      });

      if (res.status === httpStatus.CREATED) {
        return res.data.message;
      }

      throw new Error(res.data?.message || "Register failed");
    } catch (err) {
      throw err;
    }
  };

  // LOGIN
  const handleLogin = async (username, password) => {
    try {
      const res = await client.post("/login", {
        username,
        password,
      });

      if (res.status === httpStatus.OK) {
        localStorage.setItem("token", res.data.token);
        return res.data.message || "Login successful";
      }

      throw new Error(res.data?.message || "Login failed");
    } catch (err) {
      throw err;
    }
  };

  // HISTORY
  const getHistoryOfUser = async () => {
    try {
      const res = await client.get("/get_all_activity");
      return res.data;
    } catch (err) {
      throw err;
    }
  };

  // ADD HISTORY
  const addToUserHistory = async (meetingCode) => {
    try {
      const res = await client.post("/add_to_activity", {
        meeting_code: meetingCode,
      });
      return res.data;
    } catch (err) {
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        userData,
        setUserData,
        handleRegister,
        handleLogin,
        getHistoryOfUser,
        addToUserHistory,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
