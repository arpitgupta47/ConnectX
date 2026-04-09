import dotenv from "dotenv";
import express from "express";
import { createServer as createHttpServer } from "node:http";
import mongoose from "mongoose";
import cors from "cors";
import userRoutes from "./users.routes.js";



// ✅ IMPORTANT IMPORT (correct path)
import { connectToSocket } from "../controllers/socketManager.js";

dotenv.config();

const app = express();
const server = createHttpServer(app);

// ✅ Socket connect
connectToSocket(server);

// Middlewares
app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true}));

app.use("/api/v1/users", userRoutes);

// Test route
app.get("/home", (req, res) => {
    res.json({ hello: "World" });
});

// Port
const PORT = parseInt(process.env.PORT) || 8000;

// Start server with automatic port conflict resolution
const start = async () => {
    try {
        console.log("Attempting to connect to MongoDB...");

        const connectionDb = await mongoose.connect(process.env.MONGODB_URI);

        console.log(`✅ MongoDB Connected: ${connectionDb.connection.host}`);

        // Function to find available port
        const findAvailablePort = (startPort) => {
            return new Promise((resolve, reject) => {
                const tempServer = createHttpServer();
                tempServer.listen(startPort, () => {
                    tempServer.close(() => resolve(startPort));
                });
                tempServer.on('error', () => {
                    // Port is in use, try next port
                    findAvailablePort(startPort + 1).then(resolve).catch(reject);
                });
            });
        };

        // Try to use configured port, or find next available
        const availablePort = await findAvailablePort(PORT);
        if (availablePort !== PORT) {
            console.log(`⚠️ Port ${PORT} in use, using port ${availablePort} instead`);
        }

        server.listen(availablePort, () => {
            console.log(`🚀 LISTENING ON PORT ${availablePort}`);
        });

    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
};

start();