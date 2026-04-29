import { Server } from "socket.io";
 
let connections = {};
let messages = {};
let users = {};
let hosts = {};
let waitingRoom = {};
let roomPolls = {};
 
export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: { origin: "*", methods: ["GET", "POST"] }
    });
 
    io.on("connection", (socket) => {
        console.log("✅ USER CONNECTED:", socket.id);
 
        socket.on("join-call", ({ path, name }) => {
            users[socket.id] = { name: name || "Guest", room: path };
            if (!connections[path] || connections[path].length === 0) {
                connections[path] = [];
                hosts[path] = socket.id;
                _admitUser(io, socket, path, name);
            } else {
                if (!waitingRoom[path]) waitingRoom[path] = [];
                waitingRoom[path].push({ socketId: socket.id, name: name || "Guest" });
                socket.emit("waiting-for-host");
                io.to(hosts[path]).emit("admit-request", { socketId: socket.id, name: name || "Guest" });
            }
        });
 
        socket.on("admit-user", ({ socketId }) => {
            const user = users[socketId];
            if (!user) return;
            const path = user.room;
            if (waitingRoom[path]) waitingRoom[path] = waitingRoom[path].filter(u => u.socketId !== socketId);
            _admitUser(io, io.sockets.sockets.get(socketId), path, user.name);
        });
 
        socket.on("reject-user", ({ socketId }) => {
            const user = users[socketId];
            if (!user) return;
            const path = user.room;
            if (waitingRoom[path]) waitingRoom[path] = waitingRoom[path].filter(u => u.socketId !== socketId);
            io.to(socketId).emit("rejected-by-host");
            delete users[socketId];
        });
 
        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        });
 
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
 
        socket.on("reaction", ({ emoji, name }) => {
            const user = users[socket.id];
            if (!user) return;
            const room = user.room;
            connections[room]?.forEach((id) => {
                if (id !== socket.id) io.to(id).emit("reaction", { emoji, name });
            });
        });

        // ── MEDIA STATE BROADCAST ──────────────────────────────────
        // Jab koi apna camera/mic on/off kare, sabko batao
        socket.on("media-state-update", ({ camOn, micOn }) => {
            const user = users[socket.id];
            if (!user) return;
            const room = user.room;
            connections[room]?.forEach((id) => {
                if (id !== socket.id) {
                    io.to(id).emit("participant-media-state", {
                        socketId: socket.id,
                        camOn,
                        micOn
                    });
                }
            });
        });

        // ── HOST CONTROLS ──────────────────────────────────────────
        socket.on("host-mute-user", ({ socketId }) => {
            const user = users[socket.id];
            if (!user) return;
            const room = user.room;
            // Only host can do this
            if (hosts[room] !== socket.id) return;
            io.to(socketId).emit("force-mute");
        });

        socket.on("host-cam-off-user", ({ socketId }) => {
            const user = users[socket.id];
            if (!user) return;
            const room = user.room;
            if (hosts[room] !== socket.id) return;
            io.to(socketId).emit("force-cam-off");
        });

        socket.on("host-remove-user", ({ socketId }) => {
            const user = users[socket.id];
            if (!user) return;
            const room = user.room;
            if (hosts[room] !== socket.id) return;
            io.to(socketId).emit("force-remove");
        });

        // ── INTERVIEW MODE (HOST ONLY) ─────────────────────────────
        socket.on("interview-mode-toggle", ({ enabled }) => {
            const user = users[socket.id];
            if (!user) return;
            const room = user.room;
            if (hosts[room] !== socket.id) return; // only host can toggle
            connections[room]?.forEach(id => {
                io.to(id).emit("interview-mode-update", { enabled });
            });
        });

        // ── POLL EVENTS ────────────────────────────────────────────
        socket.on("poll-create", (poll) => {
            const user = users[socket.id];
            if (!user) return;
            const room = user.room;
            if (!roomPolls[room]) roomPolls[room] = {};
            roomPolls[room][poll.id] = poll;
            connections[room]?.forEach(id => io.to(id).emit("poll-created", poll));
        });
        socket.on("poll-vote", ({ pollId, optionIndex }) => {
            const user = users[socket.id];
            if (!user) return;
            const room = user.room;
            const poll = roomPolls[room]?.[pollId];
            if (!poll || poll.ended) return;
            if (poll.results[optionIndex] !== undefined) {
                poll.results[optionIndex]++;
                connections[room]?.forEach(id => io.to(id).emit("poll-vote-update", { pollId, results: poll.results }));
            }
        });
        socket.on("poll-end", ({ pollId }) => {
            const user = users[socket.id];
            if (!user) return;
            const room = user.room;
            if (roomPolls[room]?.[pollId]) {
                roomPolls[room][pollId].ended = true;
                connections[room]?.forEach(id => io.to(id).emit("poll-ended", { pollId }));
            }
        });
 
        socket.on("disconnect", () => {
            const user = users[socket.id];
            if (!user) return;
            const room = user.room;
            if (connections[room]) {
                connections[room] = connections[room].filter(id => id !== socket.id);
                io.to(room).emit("user-left", socket.id);
                const participants = connections[room].map(id => ({ socketId: id, name: users[id]?.name || "Guest" }));
                io.to(room).emit("participants-update", participants);
                if (hosts[room] === socket.id && connections[room].length > 0) {
                    hosts[room] = connections[room][0];
                    io.to(hosts[room]).emit("you-are-host");
                }
                if (connections[room].length === 0) {
                    delete connections[room]; delete messages[room]; delete hosts[room]; delete waitingRoom[room]; delete roomPolls[room];
                }
            }
            for (const room in waitingRoom) {
                waitingRoom[room] = waitingRoom[room].filter(u => u.socketId !== socket.id);
            }
            delete users[socket.id];
        });
    });
 
    return io;
};
 
function _admitUser(io, socket, path, name) {
    if (!socket) return;
    socket.join(path);
    if (!connections[path]) connections[path] = [];
    if (!connections[path].includes(socket.id)) connections[path].push(socket.id);
    connections[path].forEach((id) => { io.to(id).emit("user-joined", socket.id, connections[path]); });
    connections[path].forEach((id) => { if (id !== socket.id) io.to(id).emit("play-join-sound"); });
    const participants = connections[path].map(id => ({ socketId: id, name: users[id]?.name || "Guest" }));
    io.to(path).emit("participants-update", participants);
    if (messages[path]) { messages[path].forEach((msg) => { io.to(socket.id).emit("chat-message", msg.data, msg.sender, msg["socket-id-sender"]); }); }
}
