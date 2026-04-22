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

  // Auto-fetch profile on mount if token exists
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && !userData) {
      fetchProfile().catch(() => {});
    }
  }, []);

  // FETCH PROFILE
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

  // REGISTER
  const handleRegister = async (name, username, password, email) => {
    try {
      const res = await client.post("/register", { name, username, password, email });
      if (res.status === httpStatus.CREATED) return res.data.message;
      throw new Error(res.data?.message || "Register failed");
    } catch (err) {
      throw err;
    }
  };

  // LOGIN
  const handleLogin = async (username, password) => {
    try {
      const res = await client.post("/login", { username, password });
      if (res.status === httpStatus.OK) {
        localStorage.setItem("token", res.data.token);
        await fetchProfile();
        return res.data.message || "Login successful";
      }
      throw new Error(res.data?.message || "Login failed");
    } catch (err) {
      throw err;
    }
  };

  // GOOGLE LOGIN
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
        await fetchProfile();
        return res.data.message || "Google login successful";
      }
      throw new Error(res.data?.message || "Google login failed");
    } catch (err) {
      throw err;
    }
  };

  // LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("token");
    setUserData(null);
    navigate("/auth");
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
