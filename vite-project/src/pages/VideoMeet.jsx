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
};

export default function VideoMeetComponent() {

    const socketRef = useRef();
    const socketIdRef = useRef();
    const localVideoref = useRef();

    const [video, setVideo] = useState(true);
    const [audio, setAudio] = useState(true);
    const [videos, setVideos] = useState([]);
    const videoRef = useRef([]);

    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [showModal, setModal] = useState(true);
    const [newMessages, setNewMessages] = useState(0);

    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState("");

    // ================= MEDIA =================

    useEffect(() => {
        getUserMedia();
    }, []);

    const getUserMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            window.localStream = stream;
            localVideoref.current.srcObject = stream;
        } catch (e) {
            console.log(e);
        }
    };

    // ================= SOCKET =================

    const connectToSocketServer = () => {
        socketRef.current = io.connect(server_url);

        socketRef.current.on('signal', gotMessageFromServer);

        socketRef.current.on('connect', () => {
            socketIdRef.current = socketRef.current.id;

            socketRef.current.emit('join-call', {
                path: window.location.href,
                name: username
            });

            socketRef.current.on('chat-message', addMessage);

            socketRef.current.on('user-left', (id) => {
                setVideos(videos => videos.filter(v => v.socketId !== id));
            });

            socketRef.current.on('user-joined', (id, clients) => {

                clients.forEach(socketListId => {

                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);

                    connections[socketListId].onicecandidate = (event) => {
                        if (event.candidate) {
                            socketRef.current.emit('signal', socketListId,
                                JSON.stringify({ ice: event.candidate })
                            );
                        }
                    };

                    // ✅ FIXED (ontrack)
                    connections[socketListId].ontrack = (event) => {
                        let stream = event.streams[0];

                        let videoExists = videoRef.current.find(v => v.socketId === socketListId);

                        if (videoExists) {
                            setVideos(videos => {
                                const updated = videos.map(v =>
                                    v.socketId === socketListId ? { ...v, stream } : v
                                );
                                videoRef.current = updated;
                                return updated;
                            });
                        } else {
                            let newVideo = {
                                socketId: socketListId,
                                stream
                            };

                            setVideos(videos => {
                                const updated = [...videos, newVideo];
                                videoRef.current = updated;
                                return updated;
                            });
                        }
                    };

                    // ✅ FIXED (addTrack)
                    if (window.localStream) {
                        window.localStream.getTracks().forEach(track => {
                            connections[socketListId].addTrack(track, window.localStream);
                        });
                    }
                });

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue;

                        connections[id2].createOffer().then(desc => {
                            connections[id2].setLocalDescription(desc).then(() => {
                                socketRef.current.emit('signal', id2,
                                    JSON.stringify({ sdp: connections[id2].localDescription })
                                );
                            });
                        });
                    }
                }
            });
        });
    };

    const gotMessageFromServer = (fromId, message) => {
        const signal = JSON.parse(message);

        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp))
                    .then(() => {
                        if (signal.sdp.type === 'offer') {
                            connections[fromId].createAnswer().then(desc => {
                                connections[fromId].setLocalDescription(desc).then(() => {
                                    socketRef.current.emit('signal', fromId,
                                        JSON.stringify({ sdp: connections[fromId].localDescription })
                                    );
                                });
                            });
                        }
                    });
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice));
            }
        }
    };

    // ================= CONTROLS =================

    const handleVideo = () => {
        const track = window.localStream.getVideoTracks()[0];
        track.enabled = !track.enabled;
        setVideo(track.enabled);
    };

    const handleAudio = () => {
        const track = window.localStream.getAudioTracks()[0];
        track.enabled = !track.enabled;
        setAudio(track.enabled);
    };

    const handleEndCall = () => {
        window.location.href = "/";
    };

    // ================= CHAT =================

    const sendMessage = () => {
        socketRef.current.emit('chat-message', message, username);
        setMessage("");
    };

    const addMessage = (data, sender, socketIdSender) => {
        setMessages(prev => [...prev, { sender, data }]);

        if (socketIdSender !== socketIdRef.current) {
            setNewMessages(prev => prev + 1);
        }
    };

    const connect = () => {
        if (!username) return alert("Enter username");
        setAskForUsername(false);
        connectToSocketServer();
    };

    // ================= UI =================

    return (
        <div>

            {askForUsername ?
                <div>
                    <h2>Enter into Lobby</h2>
                    <TextField value={username} onChange={e => setUsername(e.target.value)} />
                    <Button onClick={connect}>Connect</Button>
                    <video ref={localVideoref} autoPlay muted></video>
                </div>
                :

                <div className={styles.meetVideoContainer}>

                    {showModal && (
                        <div className={styles.chatRoom}>
                            <div className={styles.chatContainer}>
                                <h1>Chat</h1>

                                <div className={styles.chattingDisplay}>
                                    {messages.map((m, i) => (
                                        <div key={i}>
                                            <b>{m.sender}</b>
                                            <p>{m.data}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.chattingArea}>
                                    <TextField value={message} onChange={e => setMessage(e.target.value)} />
                                    <Button onClick={sendMessage}>Send</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={styles.buttonContainers}>
                        <IconButton onClick={handleVideo} style={{ color: "white" }}>
                            {video ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>

                        <IconButton onClick={handleEndCall} style={{ color: "red" }}>
                            <CallEndIcon />
                        </IconButton>

                        <IconButton onClick={handleAudio} style={{ color: "white" }}>
                            {audio ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>

                        <Badge badgeContent={newMessages} color="secondary">
                            <IconButton onClick={() => setModal(!showModal)} style={{ color: "white" }}>
                                <ChatIcon />
                            </IconButton>
                        </Badge>
                    </div>

                    <video className={styles.meetUserVideo} ref={localVideoref} autoPlay muted />

                    <div className={styles.conferenceView}>
                        {videos.map(v => (
                            <video
                                key={v.socketId}
                                ref={ref => {
                                    if (ref && v.stream) ref.srcObject = v.stream;
                                }}
                                autoPlay
                            />
                        ))}
                    </div>

                </div>
            }

        </div>
    );
}
