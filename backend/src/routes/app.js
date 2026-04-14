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

// ================= SOCKET =================
connectToSocket(server);

// ================= CORS (FIXED) =================
app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://192.168.1.8:5174",
        "https://connectx-frontend.onrender.com" // 👈 IMPORTANT (tumhara frontend URL)
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

// ✅ IMPORTANT: preflight request fix
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }

    next();
});

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= ROUTES =================
app.use("/api/v1/users", userRoutes);

// ================= TEST =================
app.get("/", (req, res) => {
    res.send("🚀 Backend Running");
});

// ================= START =================
const PORT = process.env.PORT || 8002;

const start = async () => {
    try {
        console.log("🔌 Connecting to MongoDB...");
        const db = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`✅ MongoDB Connected: ${db.connection.host}`);

        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });

    } catch (err) {
        console.error("❌ Error:", err.message);
        process.exit(1);
    }
};

start();
