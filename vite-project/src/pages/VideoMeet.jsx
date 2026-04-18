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
    let [showModal, setModal] = useState(true);
    let [screenAvailable, setScreenAvailable] = useState(false);
    let [messages, setMessages] = useState([]);
    let [message, setMessage] = useState("");
    let [newMessages, setNewMessages] = useState(0);
    let [askForUsername, setAskForUsername] = useState(true);
    let [username, setUsername] = useState("");
    const videoRef = useRef([]);
    let [videos, setVideos] = useState([]);

    useEffect(() => {
        getPermissions();
    }, []);

    // FIX: screen state change pe getDislayMedia call
    useEffect(() => {
        if (screen === true) {
            getDislayMedia();
        }
    }, [screen]);

    // NOTE: video/audio useEffect INTENTIONALLY REMOVED
    // Pehle yeh tha jo camera wapas on kar deta tha har toggle pe

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
            connections[id].addStream(window.localStream);
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
            connections[id].addStream(window.localStream);
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
            // FIX: Sirf pathname use karo room ID ke liye, poora URL nahi
            const roomId = window.location.pathname;
            socketRef.current.emit('join-call', { path: roomId, name: username });
            socketIdRef.current = socketRef.current.id;

            socketRef.current.on('chat-message', addMessage);

            socketRef.current.on('user-left', (id) => {
                setVideos((videos) => videos.filter((v) => v.socketId !== id));
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

                    // FIX: ontrack use karo (onaddstream deprecated tha - video nahi aati thi)
                    connections[socketListId].ontrack = (event) => {
                        const remoteStream = event.streams[0];
                        if (!remoteStream) return;

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
                            let newVideo = { socketId: socketListId, stream: remoteStream, autoplay: true, playsinline: true };
                            setVideos(vids => {
                                const updated = [...vids, newVideo];
                                videoRef.current = updated;
                                return updated;
                            });
                        }
                    };

                    // FIX: addTrack use karo (addStream deprecated)
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

    // FIX: Camera toggle - sirf track.enabled, no getUserMedia call
    let handleVideo = () => {
        if (!window.localStream) return;
        const videoTrack = window.localStream.getVideoTracks()[0];
        if (!videoTrack) return;
        videoTrack.enabled = !videoTrack.enabled;
        setVideo(videoTrack.enabled);
    };

    // FIX: Audio toggle - sirf track.enabled
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

    return (
        <div>
            {askForUsername === true ?
                <div>
                    <h2>Enter into Lobby</h2>
                    <TextField id="outlined-basic" label="Username" value={username} onChange={e => setUsername(e.target.value)} variant="outlined" />
                    <Button variant="contained" onClick={connect}>Connect</Button>
                    <div>
                        <video ref={localVideoref} autoPlay muted></video>
                    </div>
                </div> :

                <div className={styles.meetVideoContainer}>
                    {showModal ? <div className={styles.chatRoom}>
                        <div className={styles.chatContainer}>
                            <h1>Chat</h1>
                            <div className={styles.chattingDisplay}>
                                {messages.length !== 0 ? messages.map((item, index) => (
                                    <div style={{ marginBottom: "20px" }} key={index}>
                                        <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                                        <p>{item.data}</p>
                                    </div>
                                )) : <p>No Messages Yet</p>}
                            </div>
                            <div className={styles.chattingArea}>
                                <TextField
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                    id="outlined-basic" label="Enter Your chat" variant="outlined"
                                />
                                <Button variant='contained' onClick={sendMessage}>Send</Button>
                            </div>
                        </div>
                    </div> : <></>}

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
                        {screenAvailable &&
                            <IconButton onClick={handleScreen} style={{ color: "white" }}>
                                {screen ? <ScreenShareIcon /> : <StopScreenShareIcon />}
                            </IconButton>
                        }
                        <Badge badgeContent={newMessages} max={999} color='orange'>
                            <IconButton onClick={() => setModal(!showModal)} style={{ color: "white" }}>
                                <ChatIcon />
                            </IconButton>
                        </Badge>
                    </div>

                    <video className={styles.meetUserVideo} ref={localVideoref} autoPlay muted></video>

                    <div className={styles.conferenceView}>
                        {videos.map((video) => (
                            <div key={video.socketId}>
                                <video
                                    data-socket={video.socketId}
                                    ref={ref => { if (ref && video.stream) ref.srcObject = video.stream; }}
                                    autoPlay playsInline
                                />
                            </div>
                        ))}
                    </div>
                </div>
            }
        </div>
    )
}
