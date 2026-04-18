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

// ================= CORS (FIXED - no double headers conflict) =================
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://192.168.1.8:5174",
    "https://connectx-frontend.onrender.com"
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (Postman, curl, mobile)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 200
}));

// Handle preflight for all routes
app.options("*", cors());

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
