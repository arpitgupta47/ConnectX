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

// Attach token + session ID to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const sessionId = localStorage.getItem("sessionId");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (sessionId) config.headers["x-session-id"] = sessionId;
  return config;
});

// Handle session conflict
client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.data?.code === "SESSION_CONFLICT") {
      localStorage.removeItem("token");
      localStorage.removeItem("sessionId");
      window.location.href = "/auth?reason=session_conflict";
    }
    return Promise.reject(error);
  }
);

// ── Plan feature map ──────────────────────────────────────────────
export const PLAN_FEATURES = {
  free: {
    maxParticipants: 10,
    aiAssistant: true,
    aiMeetingScore: false,
    livePolling: false,
    recordings: false,
    prioritySupport: false,
    unlimitedParticipants: false,
  },
  pro: {
    maxParticipants: 100,
    aiAssistant: true,
    aiMeetingScore: true,
    livePolling: true,
    recordings: true,
    prioritySupport: true,
    unlimitedParticipants: false,
  },
  enterprise: {
    maxParticipants: Infinity,
    aiAssistant: true,
    aiMeetingScore: true,
    livePolling: true,
    recordings: true,
    prioritySupport: true,
    unlimitedParticipants: true,
  },
};

export const AuthProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [userPlan, setUserPlan] = useState('free');
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
        setUserPlan(res.data.plan || 'free');
        return res.data;
      }
    } catch (err) {
      console.log("Profile fetch failed:", err);
    }
    return null;
  };

  // Check if user has access to a feature
  const hasFeature = (feature) => {
    const plan = userPlan || 'free';
    return PLAN_FEATURES[plan]?.[feature] ?? false;
  };

  const handleRegister = async (name, username, password, email) => {
    try {
      const res = await client.post("/register", { name, username, password, email });
      if (res.status === httpStatus.CREATED) return res.data.message;
      throw new Error(res.data?.message || "Register failed");
    } catch (err) { throw err; }
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
    } catch (err) { throw err; }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithGoogle();
      const user = result.user;
      const res = await client.post("/google-auth", {
        name: user.displayName, email: user.email, googleId: user.uid, avatar: user.photoURL,
      });
      if (res.status === httpStatus.OK || res.status === httpStatus.CREATED) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("sessionId", res.data.activeSessionId);
        await fetchProfile();
        return res.data.message || "Google login successful";
      }
      throw new Error(res.data?.message || "Google login failed");
    } catch (err) { throw err; }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("sessionId");
    setUserData(null);
    setUserPlan('free');
    navigate("/auth");
  };

  // Called after successful Razorpay payment
  const upgradePlan = async (razorpayPaymentId, razorpayOrderId, razorpaySignature, plan) => {
    try {
      const res = await client.post("/upgrade-plan", {
        razorpayPaymentId, razorpayOrderId, razorpaySignature, plan
      });
      if (res.status === 200) {
        setUserPlan(res.data.plan);
        setUserData(prev => prev ? { ...prev, plan: res.data.plan, planExpiresAt: res.data.planExpiresAt } : prev);
        return res.data;
      }
    } catch (err) {
      throw new Error(err.response?.data?.message || "Plan upgrade failed");
    }
  };

  const getHistoryOfUser = async () => {
    try {
      const res = await client.get("/get_all_activity");
      return res.data;
    } catch (err) { throw err; }
  };

  const addToUserHistory = async (meetingCode) => {
    try {
      const res = await client.post("/add_to_activity", { meeting_code: meetingCode });
      return res.data;
    } catch (err) { throw err; }
  };

  return (
    <AuthContext.Provider value={{
      userData, setUserData,
      userPlan,
      hasFeature,
      fetchProfile,
      handleRegister, handleLogin, handleGoogleLogin, handleLogout,
      getHistoryOfUser, addToUserHistory,
      upgradePlan,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
