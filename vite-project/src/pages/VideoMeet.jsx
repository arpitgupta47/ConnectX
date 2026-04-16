import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField, Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import server from '../environment';

const server_url = server;
var connections = {};

const peerConfigConnections = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
}

export default function VideoMeetComponent() {

    const socketRef = useRef();
    const socketIdRef = useRef();
    const localVideoref = useRef();

    const videoRef = useRef([]);

    const [participants, setParticipants] = useState([]);
    const [videos, setVideos] = useState([]);

    const [videoAvailable, setVideoAvailable] = useState(true);
    const [audioAvailable, setAudioAvailable] = useState(true);

    const [video, setVideo] = useState(true);
    const [audio, setAudio] = useState(true);
    const [screen, setScreen] = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(false);

    const [showModal, setModal] = useState(true);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [newMessages, setNewMessages] = useState(0);

    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState("");

    // ================= PERMISSIONS =================
    useEffect(() => {
        getPermissions();
    }, []);

    const getPermissions = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            window.localStream = stream;

            if (localVideoref.current) {
                localVideoref.current.srcObject = stream;
            }

            setVideoAvailable(true);
            setAudioAvailable(true);
            setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
        } catch (err) {
            console.log(err);
        }
    };

    // ================= SOCKET =================
    const connectToSocketServer = () => {
        socketRef.current = io.connect(server_url);

        socketRef.current.on('connect', () => {

            socketRef.current.emit('join-call', {
                path: window.location.href,
                name: username
            });

            socketIdRef.current = socketRef.current.id;

            socketRef.current.on("participants-update", (data) => {
                setParticipants(data);
            });

            socketRef.current.on('chat-message', addMessage);

            socketRef.current.on('user-joined', (id, clients) => {

                clients.forEach(socketListId => {

                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);

                    connections[socketListId].onicecandidate = event => {
                        if (event.candidate) {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ ice: event.candidate }));
                        }
                    };

                    connections[socketListId].ontrack = (event) => {
                        let stream = event.streams[0];

                        setVideos(prev => {
                            const exists = prev.find(v => v.socketId === socketListId);
                            if (exists) {
                                return prev.map(v =>
                                    v.socketId === socketListId ? { ...v, stream } : v
                                );
                            }
                            return [...prev, { socketId: socketListId, stream }];
                        });
                    };

                    if (window.localStream) {
                        window.localStream.getTracks().forEach(track => {
                            connections[socketListId].addTrack(track, window.localStream);
                        });
                    }
                });
            });

            socketRef.current.on('signal', (fromId, message) => {
                const signal = JSON.parse(message);

                if (signal.sdp) {
                    connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp))
                        .then(() => {
                            if (signal.sdp.type === 'offer') {
                                connections[fromId].createAnswer().then(desc => {
                                    connections[fromId].setLocalDescription(desc);
                                    socketRef.current.emit('signal', fromId, JSON.stringify({ sdp: desc }));
                                });
                            }
                        });
                }

                if (signal.ice) {
                    connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice));
                }
            });
        });
    };

    // ================= MEDIA =================
    const handleVideo = () => {
        if (!window.localStream) return;
        const track = window.localStream.getVideoTracks()[0];
        track.enabled = !track.enabled;
        setVideo(track.enabled);
    };

    const handleAudio = () => {
        if (!window.localStream) return;
        const track = window.localStream.getAudioTracks()[0];
        track.enabled = !track.enabled;
        setAudio(track.enabled);
    };

    const handleScreen = async () => {
        if (!navigator.mediaDevices.getDisplayMedia) return;

        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = stream.getVideoTracks()[0];

        screenTrack.onended = () => {
            setScreen(false);
        };

        setScreen(true);

        Object.values(connections).forEach(pc => {
            const sender = pc.getSenders().find(s => s.track.kind === "video");
            sender.replaceTrack(screenTrack);
        });
    };

    // ================= CHAT =================
    const addMessage = (data, sender, socketIdSender) => {
        setMessages(prev => [...prev, { sender, data }]);

        if (socketIdSender !== socketIdRef.current) {
            setNewMessages(prev => prev + 1);
        }
    };

    const sendMessage = () => {
        socketRef.current.emit('chat-message', message, username);
        setMessage("");
    };

    // ================= CONNECT =================
    const connect = () => {
        if (!username) return alert("Enter username");
        setAskForUsername(false);
        connectToSocketServer();
    };

    // ================= UI =================
    return (
        <div>

            {askForUsername ? (
                <div>
                    <h2>Enter into Lobby</h2>
                    <TextField value={username} onChange={e => setUsername(e.target.value)} label="Username" />
                    <Button onClick={connect}>Connect</Button>
                    <video ref={localVideoref} autoPlay muted></video>
                </div>
            ) : (

                <div className={styles.meetVideoContainer}>

                    {/* PARTICIPANTS */}
                    <div style={{
                        position: "absolute",
                        right: 10,
                        top: 10,
                        background: "#1e1e1e",
                        padding: "10px",
                        borderRadius: "10px",
                        color: "white"
                    }}>
                        <h3>Participants ({participants.length})</h3>
                        {participants.map((user, i) => (
                            <div key={i}>
                                {user.name} ● {user.status}
                            </div>
                        ))}
                    </div>

                    {/* CHAT */}
                    {showModal ? (
                        <div className={styles.chatRoom}>
                            <h3>Chat</h3>

                            {messages.map((m, i) => (
                                <div key={i}>
                                    <b>{m.sender}</b>: {m.data}
                                </div>
                            ))}

                            <TextField value={message} onChange={e => setMessage(e.target.value)} />
                            <Button onClick={sendMessage}>Send</Button>
                        </div>
                    ) : null}

                    {/* CONTROLS */}
                    <div className={styles.buttonContainers}>
                        <IconButton onClick={handleVideo}>
                            {video ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>

                        <IconButton onClick={handleAudio}>
                            {audio ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>

                        <IconButton onClick={handleScreen}>
                            {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                        </IconButton>

                        <Badge badgeContent={newMessages}>
                            <IconButton onClick={() => setModal(!showModal)}>
                                <ChatIcon />
                            </IconButton>
                        </Badge>

                        <IconButton onClick={() => window.location.href = "/"}>
                            <CallEndIcon />
                        </IconButton>
                    </div>

                    {/* LOCAL VIDEO */}
                    <video className={styles.meetUserVideo} ref={localVideoref} autoPlay muted />

                    {/* REMOTE */}
                    <div className={styles.conferenceView}>
                        {videos.map(v => (
                            <video key={v.socketId} ref={ref => ref && (ref.srcObject = v.stream)} autoPlay />
                        ))}
                    </div>

                </div>
            )}
        </div>
    );
}
