import React, { useEffect, useRef, useState, useCallback } from 'react'
import io from "socket.io-client";
import { Badge, IconButton } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import server from '../environment';

const server_url = server;

// connections object — socketId -> RTCPeerConnection
var connections = {};

const peerConfig = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" }
    ]
};

// ── Sounds ────────────────────────────────────────────────────────
const playJoinSound = () => { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); [[523.25, 0], [659.25, 0.18]].forEach(([f, d]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.value = f; o.type = 'sine'; g.gain.setValueAtTime(0, ctx.currentTime + d); g.gain.linearRampToValueAtTime(0.25, ctx.currentTime + d + 0.02); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d + 0.5); o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.5); }); } catch (e) { } };
const playLeaveSound = () => { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); [[659.25, 0], [523.25, 0.18]].forEach(([f, d]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.value = f; o.type = 'sine'; g.gain.setValueAtTime(0, ctx.currentTime + d); g.gain.linearRampToValueAtTime(0.2, ctx.currentTime + d + 0.02); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d + 0.45); o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.45); }); } catch (e) { } };
const playKnockSound = () => { try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); [0, 0.2, 0.4].forEach(d => { const o = ctx.createOscillator(), g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.value = 300; o.type = 'sine'; g.gain.setValueAtTime(0.3, ctx.currentTime + d); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d + 0.12); o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.12); }); } catch (e) { } };

// ── Floating Emoji Reactions ──────────────────────────────────────
function FloatingReactions({ reactions }) {
    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 25, overflow: 'hidden' }}>
            {reactions.map(r => (
                <div key={r.id} style={{ position: 'absolute', bottom: '80px', left: `${r.x}%`, fontSize: '2.4rem', animation: 'floatUp 3s ease-out forwards', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}>
                    {r.emoji}
                </div>
            ))}
        </div>
    );
}

// ── AI Assistant Panel ────────────────────────────────────────────
function AIAssistant({ isOpen, onClose, username, meetingCode, participants }) {
    const [messages, setMessages] = useState([
        { role: 'assistant', text: `Hello! I'm your AI Meeting Assistant 🤖\n\nI can:\n• Answer questions live in the meeting\n• Take meeting notes\n• Generate a meeting summary\n• Help with any topic!\n\nWhat can I help you with?` }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState([]);
    const [tab, setTab] = useState('chat');
    const [summary, setSummary] = useState('');
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [noteInput, setNoteInput] = useState('');
    const chatEndRef = useRef(null);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

    const callAI = async (msgs, sysPrompt) => {
        const res = await fetch(`${server_url}/api/v1/users/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: msgs, systemPrompt: sysPrompt })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `HTTP ${res.status}`);
        }
        const data = await res.json();
        return data.reply;
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;
        const userMsg = input.trim();
        setInput('');
        const newMsgs = [...messages, { role: 'user', text: userMsg }];
        setMessages(newMsgs);
        setLoading(true);

        const systemPrompt = `You are an intelligent AI Meeting Assistant inside ConnectX, a video meeting app.\nMeeting Code: ${meetingCode} | Host: ${username} | Participants: ${participants.join(', ') || 'Just you'} | Time: ${new Date().toLocaleTimeString()}\nBe concise and helpful. Keep responses under 120 words unless asked for more.`;

        const apiMsgs = newMsgs
            .filter((_, i) => i > 0)
            .map(m => ({ role: m.role, content: m.text }));

        try {
            const reply = await callAI(apiMsgs, systemPrompt);
            setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ ${e.message}\n\nMake sure GROQ_API_KEY is set in Render environment` }]);
        }
        setLoading(false);
    };

    const addNote = () => {
        if (!noteInput.trim()) return;
        setNotes(prev => [...prev, { text: noteInput.trim(), time: new Date().toLocaleTimeString() }]);
        setNoteInput('');
    };

    const generateSummary = async () => {
        setSummaryLoading(true);
        const chatHistory = messages.map(m => `${m.role === 'user' ? username : 'AI'}: ${m.text}`).join('\n');
        const notesText = notes.map(n => `[${n.time}] ${n.text}`).join('\n');
        const sysPrompt = "You are a professional meeting summarizer. Generate clear, structured summaries.";
        const prompt = `Generate a professional meeting summary.\n\nMeeting Code: ${meetingCode}\nParticipants: ${participants.join(', ') || username}\nDate: ${new Date().toLocaleDateString()}\n\nAI Chat history:\n${chatHistory}\n\nMeeting notes:\n${notesText || 'None'}\n\nFormat with: Overview, Key Points, Decisions, Action Items.`;
        try {
            const reply = await callAI([{ role: 'user', content: prompt }], sysPrompt);
            setSummary(reply);
        } catch (e) { setSummary(`⚠️ ${e.message}`); }
        setSummaryLoading(false);
    };

    if (!isOpen) return null;

    const panelStyle = { position: 'absolute', left: '16px', top: '16px', bottom: '80px', width: '300px', background: 'rgba(10,10,20,0.97)', border: '1px solid rgba(102,126,234,0.3)', borderRadius: '20px', display: 'flex', flexDirection: 'column', zIndex: 30, backdropFilter: 'blur(20px)', boxShadow: '0 24px 80px rgba(0,0,0,0.7)', overflow: 'hidden' };

    return (
        <div style={panelStyle}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <div style={{ width: '34px', height: '34px', background: 'linear-gradient(135deg,#667eea,#a78bfa)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🤖</div>
                <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: '700', fontSize: '13px' }}>AI Meeting Assistant</div>
                    <div style={{ color: '#4ade80', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', background: '#4ade80', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }} /> Online
                    </div>
                </div>
                <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px', borderRadius: '6px', padding: '4px 8px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', padding: '8px 10px', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
                {[['chat', '💬 Chat'], ['notes', '📝 Notes'], ['summary', '📋 Summary']].map(([t, l]) => (
                    <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '6px 2px', background: tab === t ? 'rgba(102,126,234,0.25)' : 'transparent', border: tab === t ? '1px solid rgba(102,126,234,0.4)' : '1px solid transparent', borderRadius: '8px', color: tab === t ? '#a78bfa' : '#64748b', fontSize: '11px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
                        {l}
                    </button>
                ))}
            </div>

            {tab === 'chat' && (
                <>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {messages.map((m, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                <div style={{ maxWidth: '88%', padding: '9px 13px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px', background: m.role === 'user' ? 'linear-gradient(135deg,#667eea,#764ba2)' : 'rgba(255,255,255,0.07)', color: 'white', fontSize: '13px', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div style={{ display: 'flex', gap: '5px', padding: '8px 12px' }}>
                                {[0, 1, 2].map(i => <div key={i} style={{ width: '7px', height: '7px', background: '#667eea', borderRadius: '50%', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                    <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} placeholder="Ask AI anything..." style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(102,126,234,0.3)', borderRadius: '10px', color: 'white', padding: '9px 11px', fontSize: '13px', outline: 'none' }} />
                        <button onClick={sendMessage} disabled={loading || !input.trim()} style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', color: 'white', borderRadius: '10px', padding: '9px 13px', cursor: 'pointer', fontSize: '15px', opacity: loading || !input.trim() ? 0.45 : 1, flexShrink: 0 }}>➤</button>
                    </div>
                </>
            )}

            {tab === 'notes' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px', gap: '10px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <input value={noteInput} onChange={e => setNoteInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote()} placeholder="Type a note..." style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(102,126,234,0.3)', borderRadius: '10px', color: 'white', padding: '9px 11px', fontSize: '13px', outline: 'none' }} />
                        <button onClick={addNote} style={{ background: 'rgba(102,126,234,0.2)', border: '1px solid rgba(102,126,234,0.4)', color: '#a78bfa', borderRadius: '10px', padding: '9px 14px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', flexShrink: 0 }}>+</button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {notes.length === 0 ? <p style={{ color: '#475569', textAlign: 'center', fontSize: '13px', marginTop: '20px' }}>No notes yet. Type above and press Enter.</p>
                            : notes.map((n, i) => (
                                <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>🕐 {n.time}</div>
                                    <div style={{ color: 'white', fontSize: '13px', lineHeight: 1.5 }}>{n.text}</div>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {tab === 'summary' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px', gap: '10px', overflow: 'hidden' }}>
                    <button onClick={generateSummary} disabled={summaryLoading} style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', color: 'white', borderRadius: '10px', padding: '11px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', opacity: summaryLoading ? 0.6 : 1, flexShrink: 0 }}>
                        {summaryLoading ? '⏳ Generating...' : '✨ Generate AI Summary'}
                    </button>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {summary ? <div style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{summary}</div>
                            : <p style={{ color: '#475569', textAlign: 'center', fontSize: '13px', marginTop: '20px' }}>Click above to generate an AI-powered meeting summary with key points, decisions and action items.</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Remote Video Tile ─────────────────────────────────────────────
// Alag component isliye banaya taaki har participant ka stream
// apne useEffect mein properly assign ho aur React re-render pe bhi kaam kare
function RemoteVideo({ socketId, stream, name }) {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            // FIX: srcObject hamesha fresh assign karo — React ke stale closure se bachne ke liye
            if (videoRef.current.srcObject !== stream) {
                videoRef.current.srcObject = stream;
            }
            // Autoplay resume karo (browser policy ke liye)
            videoRef.current.play().catch(() => { });
        }
    }, [stream]);

    return (
        <div className={styles.videoTile}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <span className={styles.nameTag}>{name || "Participant"}</span>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────

export default function VideoMeetComponent() {
    const socketRef = useRef();
    const socketIdRef = useRef();
    const localVideoref = useRef();

    const [videoAvailable, setVideoAvailable] = useState(true);
    const [audioAvailable, setAudioAvailable] = useState(true);
    const [video, setVideo] = useState(false);
    const [audio, setAudio] = useState(false);
    const [screen, setScreen] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showAI, setShowAI] = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(false);

    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [newMessages, setNewMessages] = useState(0);
    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState("");

    const [isWaiting, setIsWaiting] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [admitRequests, setAdmitRequests] = useState([]);
    const [rejected, setRejected] = useState(false);

    const [reactions, setReactions] = useState([]);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const reactionIdRef = useRef(0);

    // ── POLL STATE ─────────────────────────────────────────────────
    const [showPollPanel, setShowPollPanel] = useState(false);
    const [polls, setPolls] = useState([]);                    // all polls in room
    const [activePoll, setActivePoll] = useState(null);        // currently live poll
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [myVotes, setMyVotes] = useState({});                // pollId -> optionIndex
    const [pollCreating, setPollCreating] = useState(false);

    // ── MEETING SCORE STATE ────────────────────────────────────────
    const [showScorePanel, setShowScorePanel] = useState(false);
    const [scoreData, setScoreData] = useState(null);
    const [scoreLoading, setScoreLoading] = useState(false);
    const speakingTime = useRef({});     // socketId -> seconds
    const messageCount = useRef({});     // socketId -> count
    const meetingStartTime = useRef(Date.now());

    // videos = array of { socketId, stream, name }
    const [videos, setVideos] = useState([]);
    const participantNames = useRef({});
    const meetingCode = window.location.pathname.replace('/', '');

    // ── On mount: get camera/mic permissions ──────────────────────
    useEffect(() => { getPermissions(); }, []);

    // ── Screen share trigger ──────────────────────────────────────
    useEffect(() => { if (screen) getDisplayMedia(); }, [screen]);

    // ── PERMANENT FIX: ref callback use karo ─────────────────────
    // Jab bhi <video> DOM pe mount ho (lobby ya meeting dono mein),
    // turant stream assign ho jaye — koi setTimeout ya race condition nahi
    const localVideoCallback = useCallback((node) => {
        localVideoref.current = node;
        if (node && window.localStream) {
            node.srcObject = window.localStream;
            node.play().catch(() => { });
        }
    }, []);

    // Backup: jab meeting screen mount ho aur stream ready ho
    useEffect(() => {
        if (!askForUsername && localVideoref.current && window.localStream) {
            localVideoref.current.srcObject = window.localStream;
            localVideoref.current.play().catch(() => { });
        }
    }, [askForUsername]);

    // ── Get camera + mic permissions ─────────────────────────────
    const getPermissions = async () => {
        try {
            const v = await navigator.mediaDevices.getUserMedia({ video: true });
            setVideoAvailable(true);
            v.getTracks().forEach(t => t.stop());
        } catch { setVideoAvailable(false); }

        try {
            const a = await navigator.mediaDevices.getUserMedia({ audio: true });
            setAudioAvailable(true);
            a.getTracks().forEach(t => t.stop());
        } catch { setAudioAvailable(false); }

        if (navigator.mediaDevices.getDisplayMedia) setScreenAvailable(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            window.localStream = stream;
            // PERMANENT FIX: ref callback se assign hoga automatically
            // lekin agar ref already mounted hai toh direct assign bhi karo
            if (localVideoref.current) {
                localVideoref.current.srcObject = stream;
                localVideoref.current.play().catch(() => { });
            }
            setVideo(true);
            setAudio(true);
        } catch (e) {
            console.log("Media error:", e);
            window.localStream = createSilentBlackStream();
            setVideo(false);
            setAudio(false);
        }
    };

    // ── Silent black stream (fallback jab camera nahi ho) ────────
    const createSilentBlackStream = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 640; canvas.height = 480;
        canvas.getContext('2d').fillRect(0, 0, 640, 480);
        const videoTrack = canvas.captureStream().getVideoTracks()[0];

        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const dst = osc.connect(ctx.createMediaStreamDestination());
        osc.start();
        const audioTrack = dst.stream.getAudioTracks()[0];
        audioTrack.enabled = false;
        videoTrack.enabled = false;

        return new MediaStream([videoTrack, audioTrack]);
    };

    // ── FIX: replaceTrack use karo, addTrack nahi ─────────────────
    // Yeh function stream change hone pe sabhi peer connections ko update karta hai
    const updateTracksForAllPeers = (newStream) => {
        for (let id in connections) {
            if (id === socketIdRef.current) continue;
            const pc = connections[id];
            const senders = pc.getSenders();

            newStream.getTracks().forEach(track => {
                const existingSender = senders.find(s => s.track && s.track.kind === track.kind);
                if (existingSender) {
                    // FIX: replaceTrack — renegotiation nahi chahiye, track silently replace ho jaati hai
                    existingSender.replaceTrack(track).catch(e => console.log("replaceTrack error:", e));
                } else {
                    // Naya track type — addTrack karo aur naya offer bhejo
                    pc.addTrack(track, newStream);
                    pc.createOffer()
                        .then(d => pc.setLocalDescription(d))
                        .then(() => socketRef.current.emit('signal', id, JSON.stringify({ sdp: pc.localDescription })))
                        .catch(e => console.log("offer error:", e));
                }
            });
        }
    };

    // ── Camera/mic stream change handler ─────────────────────────
    const getUserMediaSuccess = (stream) => {
        // Purani stream band karo
        try { window.localStream.getTracks().forEach(t => t.stop()); } catch (e) { }

        window.localStream = stream;

        // Local preview update karo
        if (localVideoref.current) {
            localVideoref.current.srcObject = stream;
            localVideoref.current.play().catch(() => { });
        }

        // FIX: sabhi peers ko replaceTrack se update karo
        updateTracksForAllPeers(stream);
    };

    // ── Screen share ──────────────────────────────────────────────
    const getDisplayMedia = () => {
        navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
            .then(getDisplayMediaSuccess)
            .catch(e => { console.log(e); setScreen(false); });
    };

    const getDisplayMediaSuccess = (stream) => {
        try { window.localStream.getTracks().forEach(t => t.stop()); } catch (e) { }

        window.localStream = stream;

        if (localVideoref.current) {
            localVideoref.current.srcObject = stream;
            localVideoref.current.play().catch(() => { });
        }

        // FIX: replaceTrack use karo
        updateTracksForAllPeers(stream);

        // Jab user screen share band kare
        stream.getTracks().forEach(track => {
            track.onended = () => {
                setScreen(false);
                navigator.mediaDevices.getUserMedia({ video: videoAvailable, audio: audioAvailable })
                    .then(getUserMediaSuccess)
                    .catch(e => console.log(e));
            };
        });
    };

    // ── WebRTC signaling handler ──────────────────────────────────
    const gotMessageFromServer = (fromId, msg) => {
        const signal = JSON.parse(msg);
        if (fromId === socketIdRef.current) return;

        if (signal.sdp) {
            // Agar connection exist nahi karta (race condition) toh banao
            if (!connections[fromId]) {
                const pc = new RTCPeerConnection(peerConfig);
                connections[fromId] = pc;

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        socketRef.current.emit('signal', fromId, JSON.stringify({ ice: event.candidate }));
                    }
                };

                pc.ontrack = (event) => {
                    const remoteStream = event.streams[0];
                    if (!remoteStream) return;
                    setVideos(prev => {
                        const exists = prev.find(v => v.socketId === fromId);
                        const name = participantNames.current[fromId] || "Participant";
                        if (exists) {
                            return prev.map(v =>
                                v.socketId === fromId ? { ...v, stream: remoteStream, name } : v
                            );
                        }
                        return [...prev, { socketId: fromId, stream: remoteStream, name }];
                    });
                };

                // Local tracks add karo
                const streamToSend = window.localStream || createSilentBlackStream();
                if (!window.localStream) window.localStream = streamToSend;
                streamToSend.getTracks().forEach(track => pc.addTrack(track, streamToSend));
            }

            connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp))
                .then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer()
                            .then(d => connections[fromId].setLocalDescription(d))
                            .then(() => socketRef.current.emit('signal', fromId, JSON.stringify({ sdp: connections[fromId].localDescription })))
                            .catch(e => console.log("answer error:", e));
                    }
                })
                .catch(e => console.log("setRemoteDescription error:", e));
        }

        if (signal.ice) {
            connections[fromId]?.addIceCandidate(new RTCIceCandidate(signal.ice))
                .catch(e => console.log("addIceCandidate error:", e));
        }
    };

    // ── POLL HELPERS ─────────────────────────────────────────────
    const createPoll = () => {
        const opts = pollOptions.filter(o => o.trim());
        if (!pollQuestion.trim() || opts.length < 2) return;
        const poll = {
            id: Date.now().toString(),
            question: pollQuestion.trim(),
            options: opts,
            results: new Array(opts.length).fill(0),
            createdBy: username,
            ended: false
        };
        socketRef.current.emit('poll-create', poll);
        setPollQuestion('');
        setPollOptions(['', '']);
        setPollCreating(false);
    };

    const votePoll = (pollId, optionIndex) => {
        if (myVotes[pollId] !== undefined) return;
        setMyVotes(prev => ({ ...prev, [pollId]: optionIndex }));
        socketRef.current.emit('poll-vote', { pollId, optionIndex });
    };

    const endPoll = (pollId) => {
        socketRef.current.emit('poll-end', { pollId });
    };

    // ── AI MEETING SCORE ─────────────────────────────────────────
    const generateMeetingScore = async () => {
        setScoreLoading(true);
        setShowScorePanel(true);
        const duration = Math.round((Date.now() - meetingStartTime.current) / 60000);
        const participants = [username, ...Object.keys(participantNames.current).map(k => participantNames.current[k])];
        const msgData = Object.entries(messageCount.current).map(([k, v]) => `${k}: ${v} messages`).join(', ') || 'No messages';
        const pollSummary = polls.map(p => `"${p.question}" — ${p.options.map((o, i) => `${o}: ${p.results[i]} votes`).join(', ')}`).join('\n') || 'No polls';

        const prompt = `You are an expert meeting analyst. Analyze this meeting and give a detailed score report.

Meeting Details:
- Duration: ${duration} minutes
- Participants: ${participants.join(', ')}
- Total messages in chat: ${Object.values(messageCount.current).reduce((a, b) => a + b, 0)}
- Message breakdown: ${msgData}
- Polls conducted: ${pollSummary}

Give a JSON response ONLY (no markdown) with this exact structure:
{
  "overallScore": 85,
  "grade": "B+",
  "summary": "2-3 sentence overall summary",
  "metrics": {
    "engagement": 80,
    "participation": 75,
    "productivity": 90,
    "collaboration": 85
  },
  "highlights": ["positive point 1", "positive point 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "participantScores": [
    {"name": "Alice", "score": 90, "role": "Active Contributor"},
    {"name": "Bob", "score": 70, "role": "Passive Listener"}
  ]
}`;

        try {
            const res = await fetch(`${server_url}/api/v1/users/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: prompt }],
                    systemPrompt: 'You are a meeting analytics AI. Always respond with valid JSON only, no markdown, no explanation.'
                })
            });
            const data = await res.json();
            const clean = data.reply.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(clean);
            setScoreData(parsed);
        } catch (e) {
            setScoreData({ error: 'Could not generate score. Make sure AI is configured.' });
        }
        setScoreLoading(false);
    };

    // ── Socket connection + room logic ────────────────────────────
    const connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: true, transports: ['websocket', 'polling'] });

        socketRef.current.on('signal', gotMessageFromServer);
        socketRef.current.on('waiting-for-host', () => { setIsWaiting(true); playKnockSound(); });
        socketRef.current.on('admit-request', ({ socketId, name }) => {
            playKnockSound();
            setAdmitRequests(prev => prev.find(r => r.socketId === socketId) ? prev : [...prev, { socketId, name }]);
        });
        socketRef.current.on('rejected-by-host', () => { setRejected(true); setIsWaiting(false); });
        socketRef.current.on('you-are-host', () => setIsHost(true));
        socketRef.current.on('play-join-sound', () => playJoinSound());
        // ── POLL SOCKET EVENTS ──────────────────────────────────────
        socketRef.current.on('poll-created', (poll) => {
            setPolls(prev => [...prev, poll]);
            setActivePoll(poll);
            setShowPollPanel(true);
        });
        socketRef.current.on('poll-vote-update', ({ pollId, results }) => {
            setPolls(prev => prev.map(p => p.id === pollId ? { ...p, results } : p));
            setActivePoll(prev => prev?.id === pollId ? { ...prev, results } : prev);
        });
        socketRef.current.on('poll-ended', ({ pollId }) => {
            setPolls(prev => prev.map(p => p.id === pollId ? { ...p, ended: true } : p));
            setActivePoll(prev => prev?.id === pollId ? { ...prev, ended: true } : prev);
        });

        socketRef.current.on('reaction', ({ emoji, name }) => {
            const id = reactionIdRef.current++;
            const x = 10 + Math.random() * 75;
            setReactions(prev => [...prev, { id, emoji, x }]);
            setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 3200);
        });

        socketRef.current.on('connect', () => {
            socketIdRef.current = socketRef.current.id;
            const roomId = window.location.pathname;
            socketRef.current.emit('join-call', { path: roomId, name: username });

            socketRef.current.on('chat-message', addMessage);

            socketRef.current.on('user-left', (id) => {
                // Peer connection band karo
                if (connections[id]) {
                    connections[id].close();
                    delete connections[id];
                }
                setVideos(prev => prev.filter(v => v.socketId !== id));
                delete participantNames.current[id];
                playLeaveSound();
            });

            socketRef.current.on('participants-update', (participants) => {
                participants.forEach(p => { participantNames.current[p.socketId] = p.name; });
                // Videos mein bhi name update karo
                setVideos(prev => prev.map(v => ({
                    ...v,
                    name: participantNames.current[v.socketId] || v.name
                })));
            });

            socketRef.current.on('user-joined', (id, clients) => {
                // Agar main naya join kiya hoon
                if (id === socketIdRef.current) {
                    setIsWaiting(false);
                    setIsHost(clients.length === 1);
                    playJoinSound();
                }
                setAdmitRequests(prev => prev.filter(r => r.socketId !== id));

                // ── FIXED LOGIC ──
                // Sirf naye user ko existing members ke saath connections banana chahiye
                // Existing members sirf naye user ke saath connection banayenge
                // "Offerer" = naya joined user (id === socketIdRef.current)
                // "Answerer" = existing users (id !== socketIdRef.current)

                const iAmNewUser = (id === socketIdRef.current);
                const newUserId = id;

                if (iAmNewUser) {
                    // Main naya join kiya hoon — sabhi existing members ke saath connection banao
                    // Aur unhe offer bhejo (main initiator hoon)
                    clients.forEach(clientId => {
                        if (clientId === socketIdRef.current) return; // self skip

                        // Agar connection already hai toh skip
                        if (connections[clientId]) return;

                        const pc = new RTCPeerConnection(peerConfig);
                        connections[clientId] = pc;

                        pc.onicecandidate = (event) => {
                            if (event.candidate) {
                                socketRef.current.emit('signal', clientId, JSON.stringify({ ice: event.candidate }));
                            }
                        };

                        pc.ontrack = (event) => {
                            const remoteStream = event.streams[0];
                            if (!remoteStream) return;
                            setVideos(prev => {
                                const exists = prev.find(v => v.socketId === clientId);
                                const name = participantNames.current[clientId] || "Participant";
                                if (exists) {
                                    return prev.map(v =>
                                        v.socketId === clientId ? { ...v, stream: remoteStream, name } : v
                                    );
                                }
                                return [...prev, { socketId: clientId, stream: remoteStream, name }];
                            });
                        };

                        pc.onconnectionstatechange = () => {
                            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                                console.log(`Peer ${clientId} connection ${pc.connectionState}`);
                            }
                        };

                        // Local stream tracks add karo
                        const streamToSend = window.localStream || createSilentBlackStream();
                        if (!window.localStream) window.localStream = streamToSend;
                        streamToSend.getTracks().forEach(track => pc.addTrack(track, streamToSend));

                        // Main offer bhejta hoon (naya user = initiator)
                        pc.createOffer()
                            .then(d => pc.setLocalDescription(d))
                            .then(() => socketRef.current.emit('signal', clientId, JSON.stringify({ sdp: pc.localDescription })))
                            .catch(e => console.log("createOffer error:", e));
                    });

                } else {
                    // Koi aur naya join kiya — sirf us naye user ke saath connection banao
                    // Main answerer hoon, offer aane ka wait karunga (gotMessageFromServer handle karega)
                    if (connections[newUserId]) return; // already exists skip

                    const pc = new RTCPeerConnection(peerConfig);
                    connections[newUserId] = pc;

                    pc.onicecandidate = (event) => {
                        if (event.candidate) {
                            socketRef.current.emit('signal', newUserId, JSON.stringify({ ice: event.candidate }));
                        }
                    };

                    pc.ontrack = (event) => {
                        const remoteStream = event.streams[0];
                        if (!remoteStream) return;
                        setVideos(prev => {
                            const exists = prev.find(v => v.socketId === newUserId);
                            const name = participantNames.current[newUserId] || "Participant";
                            if (exists) {
                                return prev.map(v =>
                                    v.socketId === newUserId ? { ...v, stream: remoteStream, name } : v
                                );
                            }
                            return [...prev, { socketId: newUserId, stream: remoteStream, name }];
                        });
                    };

                    pc.onconnectionstatechange = () => {
                        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                            console.log(`Peer ${newUserId} connection ${pc.connectionState}`);
                        }
                    };

                    // Local stream tracks add karo (taaki naya user meri video dekh sake)
                    const streamToSend = window.localStream || createSilentBlackStream();
                    if (!window.localStream) window.localStream = streamToSend;
                    streamToSend.getTracks().forEach(track => pc.addTrack(track, streamToSend));

                    // Main offer NAHI bhejta — naya user bhejega, main answer karunga
                    // gotMessageFromServer mein offer receive hoga aur answer bhejega
                }
            });
        });
    };

    // ── Controls ──────────────────────────────────────────────────
    const handleVideo = () => {
        const track = window.localStream?.getVideoTracks()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        setVideo(track.enabled);
    };

    const handleAudio = () => {
        const track = window.localStream?.getAudioTracks()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        setAudio(track.enabled);
    };

    const handleScreen = () => setScreen(p => !p);

    const handleEndCall = () => {
        try {
            localVideoref.current?.srcObject?.getTracks().forEach(t => t.stop());
            window.localStream?.getTracks().forEach(t => t.stop());
        } catch (e) { }
        for (let id in connections) {
            try { connections[id].close(); } catch (e) { }
        }
        connections = {};
        socketRef.current?.disconnect();
        window.location.href = "/";
    };

    const addMessage = (data, sender, socketIdSender) => {
        setMessages(prev => [...prev, { sender, data }]);
        if (socketIdSender !== socketIdRef.current) setNewMessages(p => p + 1);
    };

    const sendMessage = () => {
        if (!message.trim()) return;
        socketRef.current.emit('chat-message', message, username);
        setMessage("");
    };

    const handleAdmit = (socketId) => {
        socketRef.current.emit('admit-user', { socketId });
        setAdmitRequests(prev => prev.filter(r => r.socketId !== socketId));
    };

    const handleReject = (socketId) => {
        socketRef.current.emit('reject-user', { socketId });
        setAdmitRequests(prev => prev.filter(r => r.socketId !== socketId));
    };

    const launchReaction = useCallback((emoji) => {
        const id = reactionIdRef.current++;
        const x = 10 + Math.random() * 75;
        setReactions(prev => [...prev, { id, emoji, x }]);
        setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 3200);
        socketRef.current?.emit('reaction', { emoji, name: username });
    }, [username]);

    const connect = () => {
        setAskForUsername(false);
        connectToSocketServer();
    };

    // Grid layout
    const totalParticipants = 1 + videos.length;
    const getGridClass = (c) => {
        if (c === 1) return styles.count1;
        if (c === 2) return styles.count2;
        if (c <= 4) return styles.count3;
        if (c <= 6) return styles.count5;
        return styles.countMany;
    };

    const participantList = [username, ...Object.values(participantNames.current)].filter(Boolean);

    // ── Special screens ───────────────────────────────────────────
    if (rejected) return (
        <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', gap: '20px' }}>
            <div style={{ fontSize: '4rem' }}>🚫</div>
            <h2 style={{ margin: 0 }}>Your request was declined</h2>
            <p style={{ color: '#94a3b8' }}>The host did not admit you into this meeting.</p>
            <button onClick={() => window.location.href = '/'} style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', color: 'white', padding: '12px 28px', borderRadius: '10px', fontSize: '15px', cursor: 'pointer' }}>Go Home</button>
        </div>
    );

    if (isWaiting) return (
        <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', gap: '24px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', animation: 'pulse 2s infinite' }}>⏳</div>
            <h2 style={{ margin: 0, fontSize: '1.8rem' }}>Waiting for host to admit you</h2>
            <p style={{ color: '#94a3b8', margin: 0 }}>Please wait...</p>
            <div style={{ display: 'flex', gap: '8px' }}>{[0, 1, 2].map(i => <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#667eea', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}</div>
            <button onClick={() => window.location.href = '/'} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} @keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}`}</style>
        </div>
    );

    // ── Lobby / username screen ───────────────────────────────────
    if (askForUsername) return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f0f1a,#1a1a2e)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', gap: '24px', padding: '20px' }}>
            <div style={{ fontSize: '3rem' }}>📡</div>
            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '700' }}>Join Meeting</h2>
            <p style={{ margin: 0, color: '#94a3b8' }}>Code: <strong style={{ color: '#a78bfa' }}>{meetingCode}</strong></p>
            {/* FIX: Lobby preview — srcObject getPermissions mein assign hoti hai */}
            <video
                ref={localVideoCallback}
                autoPlay
                muted
                playsInline
                style={{ width: '340px', maxWidth: '90vw', borderRadius: '16px', background: '#1a1a2e', border: '1px solid rgba(102,126,234,0.3)' }}
            />
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                <input
                    type="text"
                    placeholder="Your display name"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && username.trim() && connect()}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(102,126,234,0.4)', color: 'white', padding: '14px 18px', borderRadius: '10px', fontSize: '15px', outline: 'none', width: '220px' }}
                />
                <button
                    onClick={connect}
                    disabled={!username.trim()}
                    style={{ background: username.trim() ? 'linear-gradient(135deg,#667eea,#764ba2)' : '#333', border: 'none', color: 'white', padding: '14px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: username.trim() ? 'pointer' : 'not-allowed' }}
                >
                    Join Now →
                </button>
            </div>
        </div>
    );

    // ── MAIN MEETING SCREEN ───────────────────────────────────────
    return (
        <div className={styles.meetVideoContainer}>
            <FloatingReactions reactions={reactions} />

            <AIAssistant
                isOpen={showAI}
                onClose={() => setShowAI(false)}
                username={username}
                meetingCode={meetingCode}
                participants={participantList}
            />

            {/* Admit requests (host ko dikhta hai) */}
            {isHost && admitRequests.length > 0 && (
                <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 30, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {admitRequests.map(req => (
                        <div key={req.socketId} style={{ background: 'rgba(15,15,26,0.97)', border: '1px solid rgba(102,126,234,0.4)', borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', maxWidth: '320px' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '15px', color: 'white', flexShrink: 0 }}>{req.name[0]?.toUpperCase()}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ color: 'white', fontWeight: '600', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.name}</div>
                                <div style={{ color: '#94a3b8', fontSize: '12px' }}>wants to join</div>
                            </div>
                            <button onClick={() => handleAdmit(req.socketId)} style={{ background: 'rgba(74,222,128,0.2)', border: '1px solid rgba(74,222,128,0.4)', color: '#4ade80', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', flexShrink: 0 }}>✓</button>
                            <button onClick={() => handleReject(req.socketId)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', flexShrink: 0 }}>✕</button>
                        </div>
                    ))}
                </div>
            )}

            {/* Host badge */}
            {isHost && (
                <div style={{ position: 'absolute', top: '16px', left: showAI ? '332px' : '16px', zIndex: 20, background: 'rgba(102,126,234,0.25)', border: '1px solid rgba(102,126,234,0.4)', borderRadius: '20px', padding: '5px 14px', color: '#a78bfa', fontSize: '12px', fontWeight: '700', transition: 'left 0.3s', pointerEvents: 'none' }}>
                    👑 Host
                </div>
            )}

            {/* VIDEO GRID */}
            <div className={`${styles.conferenceView} ${getGridClass(totalParticipants)}`}>

                {/* Self tile — hamesha pehle */}
                <div className={styles.videoTile}>
                    <video
                        ref={localVideoCallback}
                        autoPlay
                        muted
                        playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <span className={styles.nameTag}>{username || "You"}</span>
                    <span className={styles.selfBadge}>{isHost ? '👑 Host' : 'You'}</span>
                </div>

                {/* FIX: Remote tiles — alag RemoteVideo component use karo
                    taaki har participant ka stream apne useEffect mein assign ho */}
                {videos.map(v => (
                    <RemoteVideo
                        key={v.socketId}
                        socketId={v.socketId}
                        stream={v.stream}
                        name={v.name || participantNames.current[v.socketId] || "Participant"}
                    />
                ))}
            </div>

            {/* CHAT PANEL */}
            {showChat && (
                <div className={styles.chatRoom}>
                    <div className={styles.chatContainer}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h3 style={{ margin: 0, color: 'white', fontSize: '16px', fontWeight: '700' }}>Chat</h3>
                            <button onClick={() => setShowChat(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8', cursor: 'pointer', borderRadius: '6px', padding: '4px 8px', fontSize: '13px' }}>✕</button>
                        </div>
                        <div className={styles.chattingDisplay}>
                            {messages.length ? messages.map((item, i) => (
                                <div key={i} style={{ marginBottom: '14px' }}>
                                    <p style={{ fontWeight: '700', color: '#a78bfa', margin: '0 0 3px', fontSize: '13px' }}>{item.sender}</p>
                                    <p style={{ margin: 0, color: '#e2e8f0', fontSize: '13px', lineHeight: 1.5 }}>{item.data}</p>
                                </div>
                            )) : <p style={{ color: '#475569', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>No messages yet</p>}
                        </div>
                        <div className={styles.chattingArea}>
                            <input value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(102,126,234,0.3)', borderRadius: '10px', color: 'white', padding: '9px 11px', fontSize: '13px', outline: 'none' }} />
                            <button onClick={sendMessage} style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', border: 'none', color: 'white', borderRadius: '10px', padding: '9px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap', flexShrink: 0 }}>Send</button>
                        </div>
                    </div>
                </div>
            )}

            {/* REACTION PICKER */}
            {showReactionPicker && (
                <div style={{ position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 40, background: 'rgba(15,15,26,0.97)', border: '1px solid rgba(102,126,234,0.3)', borderRadius: '16px', padding: '12px 16px', display: 'flex', gap: '8px', backdropFilter: 'blur(20px)', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
                    {['👍', '❤️', '😂', '😮', '🎉', '👏', '🔥', '💯'].map(emoji => (
                        <button key={emoji} onClick={() => { launchReaction(emoji); setShowReactionPicker(false); }}
                            style={{ background: 'none', border: 'none', fontSize: '1.8rem', cursor: 'pointer', padding: '4px 6px', borderRadius: '8px', transition: 'transform 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                            {emoji}
                        </button>
                    ))}
                </div>
            )}

            {/* ── POLL PANEL ─────────────────────────────────────── */}
            {showPollPanel && (
                <div style={{ position: 'absolute', right: '16px', top: '16px', bottom: '80px', width: '300px', background: 'rgba(10,10,20,0.97)', border: '1px solid rgba(102,126,234,0.3)', borderRadius: '20px', display: 'flex', flexDirection: 'column', zIndex: 30, backdropFilter: 'blur(20px)', boxShadow: '0 24px 80px rgba(0,0,0,0.7)', overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '34px', height: '34px', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🗳️</div>
                            <div>
                                <div style={{ color: 'white', fontWeight: '700', fontSize: '13px' }}>Live Polls</div>
                                <div style={{ color: '#94a3b8', fontSize: '11px' }}>{polls.length} poll{polls.length !== 1 ? 's' : ''} total</div>
                            </div>
                        </div>
                        <button onClick={() => setShowPollPanel(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px', borderRadius: '6px', padding: '4px 8px' }}>✕</button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Create Poll — host only */}
                        {isHost && (
                            <div>
                                {!pollCreating ? (
                                    <button onClick={() => setPollCreating(true)} style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                                        + Create New Poll
                                    </button>
                                ) : (
                                    <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Ask a question..." style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', padding: '8px 10px', fontSize: '13px', outline: 'none' }} />
                                        {pollOptions.map((opt, i) => (
                                            <div key={i} style={{ display: 'flex', gap: '6px' }}>
                                                <input value={opt} onChange={e => { const o = [...pollOptions]; o[i] = e.target.value; setPollOptions(o); }} placeholder={`Option ${i + 1}`} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', padding: '7px 10px', fontSize: '12px', outline: 'none' }} />
                                                {pollOptions.length > 2 && <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', color: '#ef4444', borderRadius: '6px', padding: '0 8px', cursor: 'pointer' }}>✕</button>}
                                            </div>
                                        ))}
                                        {pollOptions.length < 5 && <button onClick={() => setPollOptions([...pollOptions, ''])} style={{ background: 'transparent', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px', color: '#94a3b8', padding: '6px', fontSize: '12px', cursor: 'pointer' }}>+ Add Option</button>}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={createPoll} style={{ flex: 1, padding: '8px', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Launch Poll 🚀</button>
                                            <button onClick={() => setPollCreating(false)} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Polls list */}
                        {polls.length === 0 && !pollCreating && (
                            <p style={{ color: '#475569', textAlign: 'center', fontSize: '13px', marginTop: '20px' }}>
                                {isHost ? 'Create a poll to get instant feedback from participants!' : 'No polls yet. Wait for the host to create one.'}
                            </p>
                        )}
                        {[...polls].reverse().map(poll => {
                            const total = poll.results.reduce((a, b) => a + b, 0);
                            const voted = myVotes[poll.id] !== undefined;
                            return (
                                <div key={poll.id} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${poll.ended ? 'rgba(255,255,255,0.08)' : 'rgba(245,158,11,0.3)'}`, borderRadius: '14px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ color: 'white', fontWeight: '600', fontSize: '13px', lineHeight: 1.4, flex: 1 }}>{poll.question}</div>
                                        {!poll.ended && isHost && <button onClick={() => endPoll(poll.id)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer', flexShrink: 0, marginLeft: '8px' }}>End</button>}
                                        {poll.ended && <span style={{ color: '#64748b', fontSize: '11px', flexShrink: 0, marginLeft: '8px' }}>Ended</span>}
                                    </div>
                                    {poll.options.map((opt, i) => {
                                        const pct = total > 0 ? Math.round((poll.results[i] / total) * 100) : 0;
                                        const isMyVote = myVotes[poll.id] === i;
                                        const showBar = voted || poll.ended;
                                        return (
                                            <div key={i}>
                                                {!voted && !poll.ended ? (
                                                    <button onClick={() => votePoll(poll.id, i)} style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: 'white', fontSize: '13px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                                                        onMouseEnter={e => e.target.style.borderColor = 'rgba(245,158,11,0.5)'}
                                                        onMouseLeave={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}>
                                                        {opt}
                                                    </button>
                                                ) : (
                                                    <div style={{ position: 'relative' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                            <span style={{ color: isMyVote ? '#f59e0b' : 'white', fontSize: '12px', fontWeight: isMyVote ? '700' : '400' }}>{opt} {isMyVote ? '✓' : ''}</span>
                                                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>{pct}% ({poll.results[i]})</span>
                                                        </div>
                                                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', width: `${pct}%`, background: isMyVote ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : 'rgba(255,255,255,0.25)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    <div style={{ color: '#475569', fontSize: '11px' }}>{total} vote{total !== 1 ? 's' : ''} • by {poll.createdBy}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── MEETING SCORE PANEL ──────────────────────────────── */}
            {showScorePanel && (
                <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: '360px', maxHeight: '80vh', background: 'rgba(10,10,20,0.98)', border: '1px solid rgba(102,126,234,0.4)', borderRadius: '24px', display: 'flex', flexDirection: 'column', zIndex: 40, backdropFilter: 'blur(20px)', boxShadow: '0 32px 100px rgba(0,0,0,0.8)', overflow: 'hidden' }}>
                    <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '38px', height: '38px', background: 'linear-gradient(135deg,#667eea,#06b6d4)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>📊</div>
                            <div>
                                <div style={{ color: 'white', fontWeight: '700', fontSize: '15px' }}>Meeting Score</div>
                                <div style={{ color: '#94a3b8', fontSize: '11px' }}>AI-powered analytics</div>
                            </div>
                        </div>
                        <button onClick={() => setShowScorePanel(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px', borderRadius: '6px', padding: '4px 8px' }}>✕</button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                        {scoreLoading && (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤖</div>
                                <div style={{ color: '#94a3b8', fontSize: '14px' }}>AI is analyzing your meeting...</div>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '16px' }}>
                                    {[0,1,2].map(i => <div key={i} style={{ width: '8px', height: '8px', background: '#667eea', borderRadius: '50%', animation: `bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
                                </div>
                            </div>
                        )}
                        {scoreData && !scoreLoading && (
                            scoreData.error ? <p style={{ color: '#ef4444', textAlign: 'center', fontSize: '13px' }}>{scoreData.error}</p> : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {/* Overall score */}
                                    <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(102,126,234,0.1)', borderRadius: '16px', border: '1px solid rgba(102,126,234,0.2)' }}>
                                        <div style={{ fontSize: '56px', fontWeight: '800', background: 'linear-gradient(135deg,#667eea,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{scoreData.overallScore}</div>
                                        <div style={{ fontSize: '24px', color: '#f59e0b', fontWeight: '700' }}>{scoreData.grade}</div>
                                        <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '6px', lineHeight: 1.5 }}>{scoreData.summary}</div>
                                    </div>

                                    {/* Metrics */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ color: 'white', fontSize: '13px', fontWeight: '700', marginBottom: '2px' }}>📈 Metrics</div>
                                        {Object.entries(scoreData.metrics || {}).map(([key, val]) => (
                                            <div key={key}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                    <span style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'capitalize' }}>{key}</span>
                                                    <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>{val}/100</span>
                                                </div>
                                                <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px' }}>
                                                    <div style={{ height: '100%', width: `${val}%`, background: 'linear-gradient(90deg,#667eea,#06b6d4)', borderRadius: '3px' }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Highlights */}
                                    {scoreData.highlights?.length > 0 && (
                                        <div>
                                            <div style={{ color: 'white', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>✅ Highlights</div>
                                            {scoreData.highlights.map((h, i) => <div key={i} style={{ color: '#86efac', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>• {h}</div>)}
                                        </div>
                                    )}

                                    {/* Improvements */}
                                    {scoreData.improvements?.length > 0 && (
                                        <div>
                                            <div style={{ color: 'white', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>💡 Improvements</div>
                                            {scoreData.improvements.map((h, i) => <div key={i} style={{ color: '#fca5a5', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>• {h}</div>)}
                                        </div>
                                    )}

                                    {/* Participant scores */}
                                    {scoreData.participantScores?.length > 0 && (
                                        <div>
                                            <div style={{ color: 'white', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>👥 Participants</div>
                                            {scoreData.participantScores.map((p, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '6px' }}>
                                                    <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '14px', flexShrink: 0 }}>{p.name?.[0]?.toUpperCase()}</div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>{p.name}</div>
                                                        <div style={{ color: '#64748b', fontSize: '11px' }}>{p.role}</div>
                                                    </div>
                                                    <div style={{ fontSize: '18px', fontWeight: '800', color: p.score >= 80 ? '#4ade80' : p.score >= 60 ? '#f59e0b' : '#ef4444' }}>{p.score}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}

            {/* CONTROL BAR */}
            <div className={styles.buttonContainers}>
                <button onClick={() => setShowAI(p => !p)} title="AI Meeting Assistant"
                    style={{ background: showAI ? 'linear-gradient(135deg,#667eea,#764ba2)' : 'rgba(102,126,234,0.15)', border: `1px solid ${showAI ? '#667eea' : 'rgba(102,126,234,0.4)'}`, color: 'white', borderRadius: '12px', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                    🤖 AI
                </button>
                <button onClick={() => setShowPollPanel(p => !p)} title="Live Polls"
                    style={{ background: showPollPanel ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'rgba(245,158,11,0.15)', border: `1px solid ${showPollPanel ? '#f59e0b' : 'rgba(245,158,11,0.4)'}`, color: 'white', borderRadius: '12px', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', transition: 'all 0.2s', whiteSpace: 'nowrap', position: 'relative' }}>
                    🗳️ Poll
                    {polls.filter(p => !p.ended).length > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>{polls.filter(p => !p.ended).length}</span>}
                </button>
                <button onClick={generateMeetingScore} title="AI Meeting Score"
                    style={{ background: showScorePanel ? 'linear-gradient(135deg,#06b6d4,#667eea)' : 'rgba(6,182,212,0.15)', border: `1px solid ${showScorePanel ? '#06b6d4' : 'rgba(6,182,212,0.4)'}`, color: 'white', borderRadius: '12px', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                    📊 Score
                </button>
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
                <button onClick={() => setShowReactionPicker(p => !p)} title="React"
                    style={{ background: showReactionPicker ? 'rgba(102,126,234,0.25)' : 'transparent', border: 'none', color: 'white', borderRadius: '50%', padding: '8px', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1 }}>
                    😊
                </button>
                <Badge badgeContent={newMessages} max={99} color='primary'>
                    <IconButton onClick={() => { setShowChat(p => !p); setNewMessages(0); }} style={{ color: showChat ? '#667eea' : 'white' }} title="Chat">
                        <ChatIcon />
                    </IconButton>
                </Badge>
            </div>

            <style>{`
                @keyframes floatUp{0%{opacity:0;transform:translateY(0) scale(0.5)}15%{opacity:1;transform:translateY(-20px) scale(1.2)}85%{opacity:1;transform:translateY(-120px) scale(1)}100%{opacity:0;transform:translateY(-160px) scale(0.8)}}
                @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
                @keyframes fadeUp{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}
                @keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
                @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
            `}</style>
        </div>
    );
}
