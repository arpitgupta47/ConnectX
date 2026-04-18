import { Server } from "socket.io";

let connections = {};   // room -> [socketId, ...]
let messages = {};      // room -> [{sender, data, socket-id-sender}]
let users = {};         // socketId -> { name, room }
let hosts = {};         // room -> hostSocketId (first person to join)
let waitingRoom = {};   // room -> [{ socketId, name }]

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: { origin: "*", methods: ["GET", "POST"] }
    });

    io.on("connection", (socket) => {
        console.log("✅ USER CONNECTED:", socket.id);

        // ── JOIN CALL ──────────────────────────────────────────────
        socket.on("join-call", ({ path, name }) => {
            users[socket.id] = { name: name || "Guest", room: path };

            // First person in room = host, joins directly
            if (!connections[path] || connections[path].length === 0) {
                connections[path] = [];
                hosts[path] = socket.id;
                _admitUser(io, socket, path, name);
            } else {
                // Put in waiting room and ask host
                if (!waitingRoom[path]) waitingRoom[path] = [];
                waitingRoom[path].push({ socketId: socket.id, name: name || "Guest" });

                // Tell the joiner they're waiting
                socket.emit("waiting-for-host");

                // Tell the host someone is knocking
                io.to(hosts[path]).emit("admit-request", {
                    socketId: socket.id,
                    name: name || "Guest"
                });
            }
        });

        // ── HOST ADMITS USER ───────────────────────────────────────
        socket.on("admit-user", ({ socketId }) => {
            const user = users[socketId];
            if (!user) return;
            const path = user.room;

            // Remove from waiting room
            if (waitingRoom[path]) {
                waitingRoom[path] = waitingRoom[path].filter(u => u.socketId !== socketId);
            }

            // Admit into call
            _admitUser(io, io.sockets.sockets.get(socketId), path, user.name);
        });

        // ── HOST REJECTS USER ──────────────────────────────────────
        socket.on("reject-user", ({ socketId }) => {
            const user = users[socketId];
            if (!user) return;
            const path = user.room;

            if (waitingRoom[path]) {
                waitingRoom[path] = waitingRoom[path].filter(u => u.socketId !== socketId);
            }

            io.to(socketId).emit("rejected-by-host");
            delete users[socketId];
        });

        // ── WebRTC SIGNAL ──────────────────────────────────────────
        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        });

        // ── CHAT ───────────────────────────────────────────────────
        socket.on("chat-message", (data, sender) => {
            const user = users[socket.id];
            if (!user) return;
            const room = user.room;
            if (!messages[room]) messages[room] = [];
            messages[room].push({ sender, data, "socket-id-sender": socket.id });
            connections[room]?.forEach((id) => {
                io.to(id).emit("chat-message", data, sender, socket.id);
            });
        });

        // ── REACTION ──────────────────────────────────────────────
        socket.on("reaction", ({ emoji, name }) => {
            const user = users[socket.id];
            if (!user) return;
            const room = user.room;
            connections[room]?.forEach((id) => {
                if (id !== socket.id) io.to(id).emit("reaction", { emoji, name });
            });
        });

        // ── DISCONNECT ─────────────────────────────────────────────
        socket.on("disconnect", () => {
            const user = users[socket.id];
            if (!user) return;
            const room = user.room;

            if (connections[room]) {
                connections[room] = connections[room].filter(id => id !== socket.id);
                io.to(room).emit("user-left", socket.id);

                const participants = connections[room].map(id => ({
                    socketId: id,
                    name: users[id]?.name || "Guest",
                }));
                io.to(room).emit("participants-update", participants);

                // If host left, assign new host
                if (hosts[room] === socket.id && connections[room].length > 0) {
                    hosts[room] = connections[room][0];
                    io.to(hosts[room]).emit("you-are-host");
                }

                if (connections[room].length === 0) {
                    delete connections[room];
                    delete messages[room];
                    delete hosts[room];
                    delete waitingRoom[room];
                }
            }

            // Also remove from waiting room if disconnected while waiting
            for (const room in waitingRoom) {
                waitingRoom[room] = waitingRoom[room].filter(u => u.socketId !== socket.id);
            }

            delete users[socket.id];
        });
    });

    return io;
};

// Helper: admit a user into the actual call
function _admitUser(io, socket, path, name) {
    if (!socket) return;

    socket.join(path);

    if (!connections[path]) connections[path] = [];
    if (!connections[path].includes(socket.id)) {
        connections[path].push(socket.id);
    }

    // Tell everyone (including new user) about the join
    connections[path].forEach((id) => {
        io.to(id).emit("user-joined", socket.id, connections[path]);
    });

    // Send join sound trigger to all others
    connections[path].forEach((id) => {
        if (id !== socket.id) io.to(id).emit("play-join-sound");
    });

    // Send participants list
    const participants = connections[path].map(id => ({
        socketId: id,
        name: users[id]?.name || "Guest",
    }));
    io.to(path).emit("participants-update", participants);

    // Send old messages to new user
    if (messages[path]) {
        messages[path].forEach((msg) => {
            io.to(socket.id).emit("chat-message", msg.data, msg.sender, msg["socket-id-sender"]);
        });
    }
}
