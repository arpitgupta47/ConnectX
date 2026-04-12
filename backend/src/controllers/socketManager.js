import { Server } from "socket.io";

let connections = {};
let messages = {};
let users = {};

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {

        console.log("✅ USER CONNECTED:", socket.id);

        // JOIN CALL
        socket.on("join-call", ({ path, name }) => {

            socket.join(path);

            if (!connections[path]) {
                connections[path] = [];
            }

            if (!connections[path].includes(socket.id)) {
                connections[path].push(socket.id);
            }

            users[socket.id] = {
                name: name || "Guest",
                room: path
            };

            // Notify users
            connections[path].forEach((id) => {
                io.to(id).emit("user-joined", socket.id, connections[path]);
            });

            // Participants update
            const participants = connections[path].map(id => ({
                socketId: id,
                name: users[id]?.name || "Guest",
                status: "online"
            }));

            io.to(path).emit("participants-update", participants);

            // Old messages
            if (messages[path]) {
                messages[path].forEach((msg) => {
                    io.to(socket.id).emit(
                        "chat-message",
                        msg.data,
                        msg.sender,
                        msg["socket-id-sender"]
                    );
                });
            }
        });

        // WebRTC Signal
        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        });

        // Chat
        socket.on("chat-message", (data, sender) => {
            const user = users[socket.id];
            if (!user) return;

            const room = user.room;

            if (!messages[room]) messages[room] = [];

            messages[room].push({
                sender,
                data,
                "socket-id-sender": socket.id
            });

            connections[room]?.forEach((id) => {
                io.to(id).emit("chat-message", data, sender, socket.id);
            });
        });

        // Disconnect
        socket.on("disconnect", () => {

            const user = users[socket.id];
            if (!user) return;

            const room = user.room;

            if (connections[room]) {
                connections[room] = connections[room].filter(id => id !== socket.id);

                const participants = connections[room].map(id => ({
                    socketId: id,
                    name: users[id]?.name || "Guest",
                    status: "online"
                }));

                io.to(room).emit("participants-update", participants);

                if (connections[room].length === 0) {
                    delete connections[room];
                    delete messages[room];
                }
            }

            delete users[socket.id];
        });
    });

    return io;
};