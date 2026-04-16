import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField, Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import styles from "../styles/videoComponent.module.css";
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

    const [video, setVideo] = useState(false);
    const [audio, setAudio] = useState(false);
    const [screen, setScreen] = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(false);

    const [videos, setVideos] = useState([]);
    const videoRef = useRef([]);

    const [username, setUsername] = useState("");
    const [askForUsername, setAskForUsername] = useState(true);

    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [newMessages, setNewMessages] = useState(0);
    const [showModal, setModal] = useState(false);

    const [participants, setParticipants] = useState([]);

    // ================= PERMISSIONS =================
    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                window.localStream = stream;
                localVideoref.current.srcObject = stream;
                setVideo(true);
                setAudio(true);
            }).catch(err => console.log(err));

        if (navigator.mediaDevices.getDisplayMedia) {
            setScreenAvailable(true);
        }
    }, []);

    // ================= SOCKET =================
    const connectToSocketServer = () => {
        socketRef.current = io.connect(server_url);

        socketRef.current.on('connect', () => {

            socketRef.current.emit('join-call', {
                path: window.location.href,
                name: username
            });

            socketIdRef.current = socketRef.current.id;

            socketRef.current.on("participants-update", setParticipants);

            socketRef.current.on("chat-message", addMessage);

            socketRef.current.on("user-left", id => {
                setVideos(v => v.filter(video => video.socketId !== id))
            });

            socketRef.current.on("user-joined", (id, clients) => {

                clients.forEach(socketListId => {

                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);

                    connections[socketListId].onicecandidate = e => {
                        if (e.candidate) {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ ice: e.candidate }));
                        }
                    };

                    connections[socketListId].ontrack = (event) => {
                        const stream = event.streams[0];

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

                    window.localStream.getTracks().forEach(track => {
                        connections[socketListId].addTrack(track, window.localStream);
                    });
                });

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        connections[id2].createOffer().then(desc => {
                            connections[id2].setLocalDescription(desc).then(() => {
                                socketRef.current.emit('signal', id2, JSON.stringify({ sdp: desc }));
                            });
                        });
                    }
                }
            });

            socketRef.current.on('signal', (fromId, message) => {
                const signal = JSON.parse(message);

                if (signal.sdp) {
                    connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp))
                        .then(() => {
                            if (signal.sdp.type === 'offer') {
                                connections[fromId].createAnswer().then(desc => {
                                    connections[fromId].setLocalDescription(desc).then(() => {
                                        socketRef.current.emit('signal', fromId, JSON.stringify({ sdp: desc }));
                                    });
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

    // ================= MEDIA CONTROLS =================

    // 🎥 CAMERA FIX (FINAL)
    const handleVideo = async () => {
        if (!window.localStream) return;

        if (!video) {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            const videoTrack = stream.getVideoTracks()[0];

            Object.values(connections).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === "video");
                if (sender) sender.replaceTrack(videoTrack);
            });

            window.localStream.addTrack(videoTrack);
            localVideoref.current.srcObject = window.localStream;

            setVideo(true);
        } else {
            const track = window.localStream.getVideoTracks()[0];
            if (track) track.enabled = false;
            setVideo(false);
        }
    };

    // 🎤 MIC
    const handleAudio = () => {
        const track = window.localStream.getAudioTracks()[0];
        if (track) {
            track.enabled = !track.enabled;
            setAudio(track.enabled);
        }
    };

    // 🖥 SCREEN SHARE
    const handleScreen = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });

            const screenTrack = stream.getVideoTracks()[0];

            Object.values(connections).forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === "video");
                if (sender) sender.replaceTrack(screenTrack);
            });

            screenTrack.onended = () => {
                handleVideo();
            };

            setScreen(true);
        } catch (err) {
            console.log(err);
        }
    };

    // ================= CHAT =================
    const addMessage = (data, sender) => {
        setMessages(prev => [...prev, { sender, data }]);
        setNewMessages(n => n + 1);
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
                <div style={{ textAlign: "center", marginTop: "100px" }}>
                    <h2>Enter Username</h2>
                    <TextField value={username} onChange={e => setUsername(e.target.value)} />
                    <br /><br />
                    <Button variant="contained" onClick={connect}>Join</Button>

                    <video ref={localVideoref} autoPlay muted style={{ width: "300px", marginTop: "20px" }} />
                </div>
            ) : (

                <div className={styles.meetVideoContainer}>

                    {/* PARTICIPANTS */}
                    <div style={{ position: "absolute", right: 10, top: 10, color: "white" }}>
                        <h3>Users ({participants.length})</h3>
                        {participants.map((u, i) => <p key={i}>{u.name}</p>)}
                    </div>

                    {/* CONTROLS */}
                    <div className={styles.buttonContainers}>
                        <IconButton onClick={handleVideo}>
                            {video ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>

                        <IconButton onClick={handleAudio}>
                            {audio ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>

                        {screenAvailable && window.innerWidth > 768 && (
                            <IconButton onClick={handleScreen}>
                                {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                            </IconButton>
                        )}

                        <IconButton onClick={() => window.location.href = "/"}>
                            <CallEndIcon style={{ color: "red" }} />
                        </IconButton>

                        <Badge badgeContent={newMessages}>
                            <IconButton onClick={() => setModal(!showModal)}>
                                <ChatIcon />
                            </IconButton>
                        </Badge>
                    </div>

                    {/* LOCAL VIDEO */}
                    <video ref={localVideoref} autoPlay muted className={styles.meetUserVideo} />

                    {/* REMOTE USERS */}
                    <div className={styles.conferenceView}>
                        {videos.map(v => (
                            <video key={v.socketId}
                                ref={ref => ref && (ref.srcObject = v.stream)}
                                autoPlay
                            />
                        ))}
                    </div>

                </div>
            )}

        </div>
    );
}
