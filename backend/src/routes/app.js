import dotenv from "dotenv";
import express from "express";
import { createServer as createHttpServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";
import userRoutes from "./users.routes.js";
import { connectToSocket } from "../controllers/socketManager.js";

dotenv.config();

const app = express();
const server = createHttpServer(app);

// =======================
// SOCKET.IO
// =======================
connectToSocket(server);

// =======================
// CORS (FINAL FIX)
// =======================
app.use(cors({
  origin: (origin, callback) => {
    // allow all (important for mobile + render)
    return callback(null, true);
  },
  credentials: true,
}));

// =======================
// MIDDLEWARES
// =======================
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ extended: true, limit: "40kb" }));

// =======================
// ROUTES
// =======================
app.use("/api/v1/users", userRoutes);

// =======================
// TEST ROUTE
// =======================
app.get("/", (req, res) => {
  res.send("🚀 Backend Running Successfully");
});

// =======================
// PORT
// =======================
const PORT = process.env.PORT || 8000;

// =======================
// START SERVER
// =======================
const start = async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");

    const db = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${db.connection.host}`);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ Server Error:", err.message);
    process.exit(1);
  }
};

start();