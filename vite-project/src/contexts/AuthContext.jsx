import axios from "axios";
import httpStatus from "http-status";
import { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import server from "../environment";
import { signInWithGoogle } from "../firebase";

export const AuthContext = createContext({});

const client = axios.create({
  baseURL: `${server}/api/v1/users`,
  timeout: 30000,
  withCredentials: true
});

// Request Interceptor — attach token + session ID to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const sessionId = localStorage.getItem("sessionId");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (sessionId) {
    config.headers["x-session-id"] = sessionId;
  }
  return config;
});

// Response Interceptor — handle session conflict (logged in elsewhere)
client.interceptors.response.use(
  (res) => res,
  (error) => {
    console.log("❌ API ERROR:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
    // If kicked out due to another device login, clear local session
    if (error.response?.data?.code === "SESSION_CONFLICT") {
      localStorage.removeItem("token");
      localStorage.removeItem("sessionId");
      window.location.href = "/auth?reason=session_conflict";
    }
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && !userData) {
      fetchProfile().catch(() => {});
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await client.get("/get_profile");
      if (res.status === 200) {
        setUserData(res.data);
        return res.data;
      }
    } catch (err) {
      console.log("Profile fetch failed:", err);
    }
    return null;
  };

  const handleRegister = async (name, username, password, email) => {
    try {
      const res = await client.post("/register", { name, username, password, email });
      if (res.status === httpStatus.CREATED) return res.data.message;
      throw new Error(res.data?.message || "Register failed");
    } catch (err) {
      throw err;
    }
  };

  const handleLogin = async (username, password) => {
    try {
      const res = await client.post("/login", { username, password });
      if (res.status === httpStatus.OK) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("sessionId", res.data.activeSessionId);
        await fetchProfile();
        return res.data.message || "Login successful";
      }
      throw new Error(res.data?.message || "Login failed");
    } catch (err) {
      throw err;
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithGoogle();
      const user = result.user;
      const res = await client.post("/google-auth", {
        name: user.displayName,
        email: user.email,
        googleId: user.uid,
        avatar: user.photoURL,
      });
      if (res.status === httpStatus.OK || res.status === httpStatus.CREATED) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("sessionId", res.data.activeSessionId);
        await fetchProfile();
        return res.data.message || "Google login successful";
      }
      throw new Error(res.data?.message || "Google login failed");
    } catch (err) {
      throw err;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("sessionId");
    setUserData(null);
    navigate("/auth");
  };

  const getHistoryOfUser = async () => {
    try {
      const res = await client.get("/get_all_activity");
      return res.data;
    } catch (err) {
      throw err;
    }
  };

  const addToUserHistory = async (meetingCode) => {
    try {
      const res = await client.post("/add_to_activity", { meeting_code: meetingCode });
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
        fetchProfile,
        handleRegister,
        handleLogin,
        handleGoogleLogin,
        handleLogout,
        getHistoryOfUser,
        addToUserHistory,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
