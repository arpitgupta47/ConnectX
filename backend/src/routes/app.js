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
// SOCKET
// =======================
connectToSocket(server);

// =======================
// CORS (FIXED)
// =======================
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5180",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5180",
    "https://syncora-95py.onrender.com"
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
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
    res.send("API is running 🚀");
});

// =======================
// PORT
// =======================
const DEFAULT_PORT = Number(process.env.PORT) || 8000;

const tryListen = (port) =>
    new Promise((resolve, reject) => {
        const onError = (err) => {
            cleanup();
            reject(err);
        };

        const onListening = () => {
            cleanup();
            resolve();
        };

        const cleanup = () => {
            server.off("error", onError);
            server.off("listening", onListening);
        };

        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(port);
    });

// =======================
// DATABASE + SERVER START
// =======================
const start = async () => {
    try {
        console.log("Connecting to MongoDB...");

        const db = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`✅ MongoDB Connected: ${db.connection.host}`);

        let port = DEFAULT_PORT;
        try {
            await tryListen(port);
        } catch (err) {
            if (err.code === "EADDRINUSE") {
                console.warn(`⚠️ Port ${port} is already in use. Trying port ${port + 1}...`);
                port += 1;
                await tryListen(port);
            } else {
                throw err;
            }
        }

        console.log(`🚀 Server running on port ${port}`);
    } catch (error) {
        console.error("❌ Server Error:", error.message);
        process.exit(1);
    }
};

start();