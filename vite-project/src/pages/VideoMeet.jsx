import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField } from '@mui/material';
import { Button } from '@mui/material';
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
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" },
        { "urls": "stun:stun1.l.google.com:19302" },
        {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject"
        },
        {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject"
        }
    ]
}

export default function VideoMeetComponent() {
    var socketRef = useRef();
    let socketIdRef = useRef();
    let localVideoref = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvailable, setAudioAvailable] = useState(true);
    let [video, setVideo] = useState(false);
    let [audio, setAudio] = useState(false);
    let [screen, setScreen] = useState(false);
    let [showModal, setModal] = useState(false);
    let [screenAvailable, setScreenAvailable] = useState(false);
    let [messages, setMessages] = useState([]);
    let [message, setMessage] = useState("");
    let [newMessages, setNewMessages] = useState(0);
    let [askForUsername, setAskForUsername] = useState(true);
    let [username, setUsername] = useState("");

    // Remote participants
    const videoRef = useRef([]);
    let [videos, setVideos] = useState([]);

    useEffect(() => {
        getPermissions();
    }, []);

    useEffect(() => {
        if (screen === true) getDislayMedia();
    }, [screen]);

    const getPermissions = async () => {
        try {
            const vPerm = await navigator.mediaDevices.getUserMedia({ video: true });
            setVideoAvailable(true);
            vPerm.getTracks().forEach(t => t.stop());
        } catch { setVideoAvailable(false); }

        try {
            const aPerm = await navigator.mediaDevices.getUserMedia({ audio: true });
            setAudioAvailable(true);
            aPerm.getTracks().forEach(t => t.stop());
        } catch { setAudioAvailable(false); }

        if (navigator.mediaDevices.getDisplayMedia) setScreenAvailable(true);

        // Get local stream and show preview
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            window.localStream = stream;
            if (localVideoref.current) localVideoref.current.srcObject = stream;
            setVideo(true);
            setAudio(true);
        } catch (e) { console.log("Media error:", e); }
    };

    let getMedia = () => { connectToSocketServer(); }

    let getUserMediaSuccess = (stream) => {
        try { window.localStream.getTracks().forEach(t => t.stop()); } catch (e) { }
        window.localStream = stream;
        if (localVideoref.current) localVideoref.current.srcObject = stream;

        for (let id in connections) {
            if (id === socketIdRef.current) continue;
            window.localStream.getTracks().forEach(track => {
                try { connections[id].addTrack(track, window.localStream); } catch (e) { }
            });
            connections[id].createOffer().then((desc) => {
                connections[id].setLocalDescription(desc).then(() => {
                    socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                }).catch(e => console.log(e))
            })
        }
    }

    let getDislayMedia = () => {
        if (navigator.mediaDevices.getDisplayMedia) {
            navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                .then(getDislayMediaSuccess)
                .catch((e) => { console.log(e); setScreen(false); })
        }
    }

    let getDislayMediaSuccess = (stream) => {
        try { window.localStream.getTracks().forEach(t => t.stop()); } catch (e) { }
        window.localStream = stream;
        if (localVideoref.current) localVideoref.current.srcObject = stream;

        for (let id in connections) {
            if (id === socketIdRef.current) continue;
            window.localStream.getTracks().forEach(track => {
                try { connections[id].addTrack(track, window.localStream); } catch (e) { }
            });
            connections[id].createOffer().then((desc) => {
                connections[id].setLocalDescription(desc).then(() => {
                    socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                }).catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false);
            navigator.mediaDevices.getUserMedia({ video: videoAvailable, audio: audioAvailable })
                .then(getUserMediaSuccess).catch(e => console.log(e));
        })
    }

    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message);
        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((desc) => {
                            connections[fromId].setLocalDescription(desc).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
                            }).catch(e => console.log(e))
                        }).catch(e => console.log(e))
                    }
                }).catch(e => console.log(e))
            }
            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
            }
        }
    }

    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, {
            secure: true,
            transports: ['websocket', 'polling']
        });

        socketRef.current.on('signal', gotMessageFromServer);

        socketRef.current.on('connect', () => {
            const roomId = window.location.pathname;
            socketRef.current.emit('join-call', { path: roomId, name: username });
            socketIdRef.current = socketRef.current.id;

            socketRef.current.on('chat-message', addMessage);

            socketRef.current.on('user-left', (id) => {
                setVideos((prev) => prev.filter((v) => v.socketId !== id));
            });

            socketRef.current.on('user-joined', (id, clients) => {
                clients.forEach((socketListId) => {
                    if (connections[socketListId]) return;

                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);

                    connections[socketListId].onicecandidate = (event) => {
                        if (event.candidate != null) {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }))
                        }
                    };

                    connections[socketListId].ontrack = (event) => {
                        const remoteStream = event.streams[0];
                        if (!remoteStream) return;

                        // Don't add self stream as remote
                        if (socketListId === socketIdRef.current) return;

                        let videoExists = videoRef.current.find(v => v.socketId === socketListId);
                        if (videoExists) {
                            setVideos(vids => {
                                const updated = vids.map(v =>
                                    v.socketId === socketListId ? { ...v, stream: remoteStream } : v
                                );
                                videoRef.current = updated;
                                return updated;
                            });
                        } else {
                            let newVideo = {
                                socketId: socketListId,
                                stream: remoteStream,
                            };
                            setVideos(vids => {
                                const updated = [...vids, newVideo];
                                videoRef.current = updated;
                                return updated;
                            });
                        }
                    };

                    if (window.localStream) {
                        window.localStream.getTracks().forEach(track => {
                            connections[socketListId].addTrack(track, window.localStream);
                        });
                    } else {
                        let bs = (...args) => new MediaStream([black(...args), silence()]);
                        window.localStream = bs();
                        window.localStream.getTracks().forEach(track => {
                            connections[socketListId].addTrack(track, window.localStream);
                        });
                    }
                });

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue;
                        try {
                            window.localStream?.getTracks().forEach(track => {
                                try { connections[id2].addTrack(track, window.localStream); } catch (e) { }
                            });
                        } catch (e) { }
                        connections[id2].createOffer().then((desc) => {
                            connections[id2].setLocalDescription(desc).then(() => {
                                socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }))
                            }).catch(e => console.log(e))
                        })
                    }
                }
            });
        });
    }

    let silence = () => {
        let ctx = new AudioContext();
        let oscillator = ctx.createOscillator();
        let dst = oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start(); ctx.resume();
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
    }

    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height });
        canvas.getContext('2d').fillRect(0, 0, width, height);
        let stream = canvas.captureStream();
        return Object.assign(stream.getVideoTracks()[0], { enabled: false });
    }

    let handleVideo = () => {
        if (!window.localStream) return;
        const videoTrack = window.localStream.getVideoTracks()[0];
        if (!videoTrack) return;
        videoTrack.enabled = !videoTrack.enabled;
        setVideo(videoTrack.enabled);
    };

    let handleAudio = () => {
        if (!window.localStream) return;
        const audioTrack = window.localStream.getAudioTracks()[0];
        if (!audioTrack) return;
        audioTrack.enabled = !audioTrack.enabled;
        setAudio(audioTrack.enabled);
    };

    let handleScreen = () => { setScreen(prev => !prev); }

    let handleEndCall = () => {
        try {
            localVideoref.current?.srcObject?.getTracks().forEach(t => t.stop());
            window.localStream?.getTracks().forEach(t => t.stop());
        } catch (e) { }
        for (let id in connections) { try { connections[id].close(); } catch (e) { } }
        connections = {};
        socketRef.current?.disconnect();
        window.location.href = "/";
    }

    const addMessage = (data, sender, socketIdSender) => {
        setMessages(prev => [...prev, { sender, data }]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages(prev => prev + 1);
        }
    };

    let sendMessage = () => {
        if (!message.trim()) return;
        socketRef.current.emit('chat-message', message, username);
        setMessage("");
    }

    let connect = () => {
        setAskForUsername(false);
        getMedia();
    }

    // Grid class based on total participants (self + others)
    const totalParticipants = 1 + videos.length; // self + remote
    const getGridClass = (count) => {
        if (count === 1) return styles.count1;
        if (count === 2) return styles.count2;
        if (count <= 4) return styles.count3;
        if (count <= 6) return styles.count5;
        return styles.countMany;
    }

    return (
        <div>
            {askForUsername === true ?
                <div style={{
                    minHeight: '100vh', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: '#0f0f1a', color: 'white', gap: '20px'
                }}>
                    <h2 style={{ fontSize: '1.5rem' }}>Enter into Lobby</h2>
                    <video ref={localVideoref} autoPlay muted
                        style={{ width: '320px', borderRadius: '12px', background: '#1a1a2e' }} />
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <TextField
                            id="outlined-basic" label="Username" value={username}
                            onChange={e => setUsername(e.target.value)} variant="outlined"
                            sx={{ input: { color: 'white' }, label: { color: '#aaa' },
                                '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#555' } } }}
                        />
                        <Button variant="contained" onClick={connect}
                            style={{ background: '#667eea', padding: '14px 24px' }}>
                            Join
                        </Button>
                    </div>
                </div>

                :

                <div className={styles.meetVideoContainer}>

                    {/* VIDEO GRID — self + all remote participants */}
                    <div className={`${styles.conferenceView} ${getGridClass(totalParticipants)}`}>

                        {/* ✅ APNI VIDEO — grid mein pehli tile */}
                        <div className={styles.videoTile}>
                            <video ref={localVideoref} autoPlay muted playsInline />
                            <span className={styles.nameTag}>{username || "You"}</span>
                            <span className={styles.selfBadge}>You</span>
                        </div>

                        {/* Remote participants */}
                        {videos.map((v) => (
                            <div key={v.socketId} className={styles.videoTile}>
                                <video
                                    ref={ref => { if (ref && v.stream) ref.srcObject = v.stream; }}
                                    autoPlay playsInline
                                />
                                <span className={styles.nameTag}>Participant</span>
                            </div>
                        ))}
                    </div>

                    {/* CHAT */}
                    {showModal && (
                        <div className={styles.chatRoom}>
                            <div className={styles.chatContainer}>
                                <h1>Chat</h1>
                                <div className={styles.chattingDisplay}>
                                    {messages.length !== 0 ? messages.map((item, index) => (
                                        <div style={{ marginBottom: "16px" }} key={index}>
                                            <p style={{ fontWeight: "bold", color: "#667eea", margin: 0 }}>{item.sender}</p>
                                            <p style={{ margin: "4px 0 0 0", color: "#ddd" }}>{item.data}</p>
                                        </div>
                                    )) : <p style={{ color: '#666' }}>No messages yet</p>}
                                </div>
                                <div className={styles.chattingArea}>
                                    <TextField
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                        label="Message" variant="outlined" size="small"
                                        sx={{ flex: 1, input: { color: 'white' }, label: { color: '#aaa' },
                                            '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#555' } } }}
                                    />
                                    <Button variant='contained' onClick={sendMessage}
                                        style={{ background: '#667eea', minWidth: 'unset', padding: '8px 14px' }}>
                                        Send
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CONTROL BAR */}
                    <div className={styles.buttonContainers}>
                        <IconButton onClick={handleVideo} style={{ color: video ? "white" : "#ff5555" }}>
                            {video ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        <IconButton onClick={handleEndCall}
                            style={{ color: "white", background: "#e53e3e", borderRadius: '50%', padding: '10px' }}>
                            <CallEndIcon />
                        </IconButton>
                        <IconButton onClick={handleAudio} style={{ color: audio ? "white" : "#ff5555" }}>
                            {audio ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>
                        {screenAvailable &&
                            <IconButton onClick={handleScreen} style={{ color: screen ? "#667eea" : "white" }}>
                                {screen ? <ScreenShareIcon /> : <StopScreenShareIcon />}
                            </IconButton>
                        }
                        <Badge badgeContent={newMessages} max={999} color='primary'>
                            <IconButton onClick={() => { setModal(!showModal); setNewMessages(0); }}
                                style={{ color: showModal ? "#667eea" : "white" }}>
                                <ChatIcon />
                            </IconButton>
                        </Badge>
                    </div>
                </div>
            }
        </div>
    )
}
