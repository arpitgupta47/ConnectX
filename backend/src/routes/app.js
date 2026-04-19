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

// ================= CORS =================
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://192.168.1.8:5174",
    "https://connectx-frontend.onrender.com"
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// FIX: Express v5 does not support wildcard "*" in app.options()
// Use app.use middleware for preflight instead
app.use((req, res, next) => {
    if (req.method === "OPTIONS") {
        const origin = req.headers.origin;
        if (!origin || allowedOrigins.includes(origin)) {
            res.setHeader("Access-Control-Allow-Origin", origin || "*");
            res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
            res.setHeader("Access-Control-Allow-Credentials", "true");
            return res.sendStatus(200);
        }
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
        const db = await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URL);
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
