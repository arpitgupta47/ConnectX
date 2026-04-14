const server = import.meta.env.PROD
  ? "https://connectx-5jkx.onrender.com"   // ✅ NEW BACKEND
  : "http://localhost:8002";

export default server;
