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
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" }
    ]
}

// ── Web Audio Sounds ──────────────────────────────────────────────
const playJoinSound = () => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Two-note chime: C5 then E5
        [[523.25, 0], [659.25, 0.18]].forEach(([freq, delay]) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0, ctx.currentTime + delay);
            gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + delay + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.5);
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.5);
        });
    } catch (e) { }
};

const playLeaveSound = () => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Descending: E5 then C5
        [[659.25, 0], [523.25, 0.18]].forEach(([freq, delay]) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0, ctx.currentTime + delay);
            gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + delay + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.45);
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.45);
        });
    } catch (e) { }
};

const playKnockSound = () => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [0, 0.2, 0.4].forEach(delay => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 300;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.12);
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.12);
        });
    } catch (e) { }
};
// ─────────────────────────────────────────────────────────────────

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

    // Waiting room states
    let [isWaiting, setIsWaiting] = useState(false);          // I am waiting
    let [isHost, setIsHost] = useState(false);                 // I am the host
    let [admitRequests, setAdmitRequests] = useState([]);      // Pending admit requests (for host)
    let [rejected, setRejected] = useState(false);             // I was rejected

    const videoRef = useRef([]);
    let [videos, setVideos] = useState([]);

    // Participant names map: socketId -> name
    const participantNames = useRef({});

    useEffect(() => { getPermissions(); }, []);
    useEffect(() => { if (screen === true) getDislayMedia(); }, [screen]);

    const getPermissions = async () => {
        try { const v = await navigator.mediaDevices.getUserMedia({ video: true }); setVideoAvailable(true); v.getTracks().forEach(t => t.stop()); } catch { setVideoAvailable(false); }
        try { const a = await navigator.mediaDevices.getUserMedia({ audio: true }); setAudioAvailable(true); a.getTracks().forEach(t => t.stop()); } catch { setAudioAvailable(false); }
        if (navigator.mediaDevices.getDisplayMedia) setScreenAvailable(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            window.localStream = stream;
            if (localVideoref.current) localVideoref.current.srcObject = stream;
            setVideo(true); setAudio(true);
        } catch (e) { console.log("Media error:", e); }
    };

    let getUserMediaSuccess = (stream) => {
        try { window.localStream.getTracks().forEach(t => t.stop()); } catch (e) { }
        window.localStream = stream;
        if (localVideoref.current) localVideoref.current.srcObject = stream;
        for (let id in connections) {
            if (id === socketIdRef.current) continue;
            window.localStream.getTracks().forEach(track => { try { connections[id].addTrack(track, window.localStream); } catch (e) { } });
            connections[id].createOffer().then(desc => connections[id].setLocalDescription(desc).then(() => socketRef.current.emit('signal', id, JSON.stringify({ sdp: connections[id].localDescription }))));
        }
    }

    let getDislayMedia = () => {
        navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
            .then(getDislayMediaSuccess).catch(e => { console.log(e); setScreen(false); });
    }

    let getDislayMediaSuccess = (stream) => {
        try { window.localStream.getTracks().forEach(t => t.stop()); } catch (e) { }
        window.localStream = stream;
        if (localVideoref.current) localVideoref.current.srcObject = stream;
        for (let id in connections) {
            if (id === socketIdRef.current) continue;
            window.localStream.getTracks().forEach(track => { try { connections[id].addTrack(track, window.localStream); } catch (e) { } });
            connections[id].createOffer().then(desc => connections[id].setLocalDescription(desc).then(() => socketRef.current.emit('signal', id, JSON.stringify({ sdp: connections[id].localDescription }))));
        }
        stream.getTracks().forEach(track => track.onended = () => { setScreen(false); navigator.mediaDevices.getUserMedia({ video: videoAvailable, audio: audioAvailable }).then(getUserMediaSuccess).catch(e => console.log(e)); });
    }

    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message);
        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then(desc => connections[fromId].setLocalDescription(desc).then(() => socketRef.current.emit('signal', fromId, JSON.stringify({ sdp: connections[fromId].localDescription }))));
                    }
                }).catch(e => console.log(e));
            }
            if (signal.ice) connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
        }
    }

    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: true, transports: ['websocket', 'polling'] });
        socketRef.current.on('signal', gotMessageFromServer);

        // ── Waiting room events ──────────────────────────────────
        socketRef.current.on('waiting-for-host', () => {
            setIsWaiting(true);
            playKnockSound();
        });

        socketRef.current.on('admit-request', ({ socketId, name }) => {
            playKnockSound();
            setAdmitRequests(prev => {
                if (prev.find(r => r.socketId === socketId)) return prev;
                return [...prev, { socketId, name }];
            });
        });

        socketRef.current.on('rejected-by-host', () => {
            setRejected(true);
            setIsWaiting(false);
        });

        socketRef.current.on('you-are-host', () => {
            setIsHost(true);
        });

        socketRef.current.on('play-join-sound', () => {
            playJoinSound();
        });

        // ── Call events ──────────────────────────────────────────
        socketRef.current.on('connect', () => {
            const roomId = window.location.pathname;
            socketRef.current.emit('join-call', { path: roomId, name: username });
            socketIdRef.current = socketRef.current.id;

            socketRef.current.on('chat-message', addMessage);

            socketRef.current.on('user-left', (id) => {
                setVideos(prev => prev.filter(v => v.socketId !== id));
                playLeaveSound();
            });

            socketRef.current.on('participants-update', (participants) => {
                participants.forEach(p => { participantNames.current[p.socketId] = p.name; });
            });

            socketRef.current.on('user-joined', (id, clients) => {
                // Once admitted, clear waiting state
                if (id === socketIdRef.current) {
                    setIsWaiting(false);
                    setIsHost(clients.length === 1); // host = first in room
                    playJoinSound();
                }

                // Remove from admit requests if host
                setAdmitRequests(prev => prev.filter(r => r.socketId !== id));

                clients.forEach(socketListId => {
                    if (connections[socketListId]) return;
                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);

                    connections[socketListId].onicecandidate = (event) => {
                        if (event.candidate) socketRef.current.emit('signal', socketListId, JSON.stringify({ ice: event.candidate }));
                    };

                    connections[socketListId].ontrack = (event) => {
                        const remoteStream = event.streams[0];
                        if (!remoteStream || socketListId === socketIdRef.current) return;
                        let exists = videoRef.current.find(v => v.socketId === socketListId);
                        if (exists) {
                            setVideos(vids => { const u = vids.map(v => v.socketId === socketListId ? { ...v, stream: remoteStream } : v); videoRef.current = u; return u; });
                        } else {
                            const nv = { socketId: socketListId, stream: remoteStream };
                            setVideos(vids => { const u = [...vids, nv]; videoRef.current = u; return u; });
                        }
                    };

                    if (window.localStream) {
                        window.localStream.getTracks().forEach(track => { connections[socketListId].addTrack(track, window.localStream); });
                    } else {
                        const bs = () => new MediaStream([black(), silence()]);
                        window.localStream = bs();
                        window.localStream.getTracks().forEach(track => { connections[socketListId].addTrack(track, window.localStream); });
                    }
                });

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue;
                        window.localStream?.getTracks().forEach(track => { try { connections[id2].addTrack(track, window.localStream); } catch (e) { } });
                        connections[id2].createOffer().then(desc => connections[id2].setLocalDescription(desc).then(() => socketRef.current.emit('signal', id2, JSON.stringify({ sdp: connections[id2].localDescription }))));
                    }
                }
            });
        });
    }

    let silence = () => {
        let ctx = new AudioContext(), osc = ctx.createOscillator(), dst = osc.connect(ctx.createMediaStreamDestination());
        osc.start(); ctx.resume();
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
    }
    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height });
        canvas.getContext('2d').fillRect(0, 0, width, height);
        return Object.assign(canvas.captureStream().getVideoTracks()[0], { enabled: false });
    }

    let handleVideo = () => {
        const track = window.localStream?.getVideoTracks()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        setVideo(track.enabled);
    };
    let handleAudio = () => {
        const track = window.localStream?.getAudioTracks()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        setAudio(track.enabled);
    };
    let handleScreen = () => { setScreen(prev => !prev); }
    let handleEndCall = () => {
        try { localVideoref.current?.srcObject?.getTracks().forEach(t => t.stop()); window.localStream?.getTracks().forEach(t => t.stop()); } catch (e) { }
        for (let id in connections) { try { connections[id].close(); } catch (e) { } }
        connections = {};
        socketRef.current?.disconnect();
        window.location.href = "/";
    }
    const addMessage = (data, sender, socketIdSender) => {
        setMessages(prev => [...prev, { sender, data }]);
        if (socketIdSender !== socketIdRef.current) setNewMessages(p => p + 1);
    };
    let sendMessage = () => {
        if (!message.trim()) return;
        socketRef.current.emit('chat-message', message, username);
        setMessage("");
    }
    let connect = () => { setAskForUsername(false); connectToSocketServer(); }

    const handleAdmit = (socketId) => {
        socketRef.current.emit('admit-user', { socketId });
        setAdmitRequests(prev => prev.filter(r => r.socketId !== socketId));
    };
    const handleReject = (socketId) => {
        socketRef.current.emit('reject-user', { socketId });
        setAdmitRequests(prev => prev.filter(r => r.socketId !== socketId));
    };

    const totalParticipants = 1 + videos.length;
    const getGridClass = (c) => {
        if (c === 1) return styles.count1;
        if (c === 2) return styles.count2;
        if (c <= 4) return styles.count3;
        if (c <= 6) return styles.count5;
        return styles.countMany;
    }

    // ── WAITING SCREEN ────────────────────────────────────────────
    if (rejected) {
        return (
            <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', gap: '20px' }}>
                <div style={{ fontSize: '4rem' }}>🚫</div>
                <h2 style={{ margin: 0 }}>Your request was declined</h2>
                <p style={{ color: '#94a3b8' }}>The host did not admit you into this meeting.</p>
                <button onClick={() => window.location.href = '/'} style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', color: 'white', padding: '12px 28px', borderRadius: '10px', fontSize: '15px', cursor: 'pointer' }}>
                    Go Home
                </button>
            </div>
        );
    }

    if (isWaiting) {
        return (
            <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', gap: '24px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', animation: 'pulse 2s infinite' }}>⏳</div>
                <h2 style={{ margin: 0, fontSize: '1.8rem' }}>Waiting for host to admit you</h2>
                <p style={{ color: '#94a3b8', margin: 0 }}>The host has been notified. Please wait...</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {[0,1,2].map(i => (
                        <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#667eea', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                </div>
                <button onClick={() => window.location.href = '/'} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
                    Cancel
                </button>
                <style>{`
                    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
                    @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
                `}</style>
            </div>
        );
    }

    // ── LOBBY SCREEN ──────────────────────────────────────────────
    if (askForUsername) {
        return (
            <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a, #1a1a2e)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', gap: '24px', padding: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700' }}>Join Meeting</h2>
                <p style={{ margin: 0, color: '#94a3b8' }}>Check your camera and set your display name</p>
                <video ref={localVideoref} autoPlay muted playsInline
                    style={{ width: '340px', maxWidth: '90vw', borderRadius: '16px', background: '#1a1a2e', border: '1px solid rgba(102,126,234,0.3)' }} />
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <input
                        type="text" placeholder="Your display name"
                        value={username} onChange={e => setUsername(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && username.trim() && connect()}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(102,126,234,0.4)', color: 'white', padding: '14px 18px', borderRadius: '10px', fontSize: '15px', outline: 'none', width: '220px' }}
                    />
                    <button onClick={connect} disabled={!username.trim()}
                        style={{ background: username.trim() ? 'linear-gradient(135deg,#667eea,#764ba2)' : '#333', border: 'none', color: 'white', padding: '14px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: username.trim() ? 'pointer' : 'not-allowed', transition: 'opacity 0.2s' }}>
                        Join Now →
                    </button>
                </div>
            </div>
        );
    }

    // ── MAIN MEETING SCREEN ───────────────────────────────────────
    return (
        <div className={styles.meetVideoContainer}>

            {/* ADMIT REQUESTS PANEL (host only) */}
            {isHost && admitRequests.length > 0 && (
                <div style={{ position: 'absolute', top: '16px', right: showModal ? '316px' : '16px', zIndex: 30, display: 'flex', flexDirection: 'column', gap: '10px', transition: 'right 0.3s' }}>
                    {admitRequests.map(req => (
                        <div key={req.socketId} style={{ background: 'rgba(15,15,26,0.95)', border: '1px solid rgba(102,126,234,0.4)', borderRadius: '14px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', animation: 'slideIn 0.3s ease' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '16px' }}>
                                {req.name[0]?.toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ color: 'white', fontWeight: '600', fontSize: '14px' }}>{req.name}</div>
                                <div style={{ color: '#94a3b8', fontSize: '12px' }}>wants to join</div>
                            </div>
                            <button onClick={() => handleAdmit(req.socketId)}
                                style={{ background: 'rgba(74,222,128,0.2)', border: '1px solid rgba(74,222,128,0.4)', color: '#4ade80', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                                ✓ Admit
                            </button>
                            <button onClick={() => handleReject(req.socketId)}
                                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '7px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* HOST BADGE */}
            {isHost && (
                <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 20, background: 'rgba(102,126,234,0.25)', border: '1px solid rgba(102,126,234,0.4)', borderRadius: '20px', padding: '5px 14px', color: '#a78bfa', fontSize: '12px', fontWeight: '700' }}>
                    👑 Host
                </div>
            )}

            {/* VIDEO GRID */}
            <div className={`${styles.conferenceView} ${getGridClass(totalParticipants)}`}>
                {/* Self */}
                <div className={styles.videoTile}>
                    <video ref={localVideoref} autoPlay muted playsInline />
                    <span className={styles.nameTag}>{username || "You"}</span>
                    {isHost && <span className={styles.selfBadge}>👑 Host</span>}
                    {!isHost && <span className={styles.selfBadge}>You</span>}
                </div>
                {/* Remote */}
                {videos.map(v => (
                    <div key={v.socketId} className={styles.videoTile}>
                        <video ref={ref => { if (ref && v.stream) ref.srcObject = v.stream; }} autoPlay playsInline />
                        <span className={styles.nameTag}>{participantNames.current[v.socketId] || "Participant"}</span>
                    </div>
                ))}
            </div>

            {/* CHAT */}
            {showModal && (
                <div className={styles.chatRoom}>
                    <div className={styles.chatContainer}>
                        <h1>Chat</h1>
                        <div className={styles.chattingDisplay}>
                            {messages.length ? messages.map((item, i) => (
                                <div key={i} style={{ marginBottom: '16px' }}>
                                    <p style={{ fontWeight: '700', color: '#a78bfa', margin: '0 0 3px' }}>{item.sender}</p>
                                    <p style={{ margin: 0, color: '#e2e8f0' }}>{item.data}</p>
                                </div>
                            )) : <p style={{ color: '#555' }}>No messages yet</p>}
                        </div>
                        <div className={styles.chattingArea}>
                            <TextField value={message} onChange={e => setMessage(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                                label="Message" variant="outlined" size="small"
                                sx={{ flex: 1, input: { color: 'white' }, label: { color: '#888' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#333' } } }}
                            />
                            <Button variant='contained' onClick={sendMessage} style={{ background: '#667eea', minWidth: 'unset', padding: '8px 14px' }}>Send</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONTROL BAR */}
            <div className={styles.buttonContainers}>
                <IconButton onClick={handleVideo} style={{ color: video ? 'white' : '#ff5555' }} title={video ? 'Turn off camera' : 'Turn on camera'}>
                    {video ? <VideocamIcon /> : <VideocamOffIcon />}
                </IconButton>
                <IconButton onClick={handleEndCall} style={{ color: 'white', background: '#e53e3e', borderRadius: '50%', padding: '10px' }} title="End call">
                    <CallEndIcon />
                </IconButton>
                <IconButton onClick={handleAudio} style={{ color: audio ? 'white' : '#ff5555' }} title={audio ? 'Mute' : 'Unmute'}>
                    {audio ? <MicIcon /> : <MicOffIcon />}
                </IconButton>
                {screenAvailable && (
                    <IconButton onClick={handleScreen} style={{ color: screen ? '#667eea' : 'white' }} title="Share screen">
                        {screen ? <ScreenShareIcon /> : <StopScreenShareIcon />}
                    </IconButton>
                )}
                <Badge badgeContent={newMessages} max={99} color='primary'>
                    <IconButton onClick={() => { setModal(p => !p); setNewMessages(0); }} style={{ color: showModal ? '#667eea' : 'white' }} title="Chat">
                        <ChatIcon />
                    </IconButton>
                </Badge>
            </div>

            <style>{`
                @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
            `}</style>
        </div>
    );
}
