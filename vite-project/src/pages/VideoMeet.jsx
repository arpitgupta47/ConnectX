import React, { useEffect, useRef, useState, useCallback } from 'react'
import io from "socket.io-client";
import { Badge, IconButton } from '@mui/material';
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

const peerConfig = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" }
    ]
};

// ── Sounds ────────────────────────────────────────────────────────
const playJoinSound = () => { try { const ctx = new (window.AudioContext||window.webkitAudioContext)(); [[523.25,0],[659.25,0.18]].forEach(([f,d])=>{ const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g);g.connect(ctx.destination); o.frequency.value=f;o.type='sine'; g.gain.setValueAtTime(0,ctx.currentTime+d); g.gain.linearRampToValueAtTime(0.25,ctx.currentTime+d+0.02); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+d+0.5); o.start(ctx.currentTime+d);o.stop(ctx.currentTime+d+0.5); }); }catch(e){} };
const playLeaveSound = () => { try { const ctx = new (window.AudioContext||window.webkitAudioContext)(); [[659.25,0],[523.25,0.18]].forEach(([f,d])=>{ const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g);g.connect(ctx.destination); o.frequency.value=f;o.type='sine'; g.gain.setValueAtTime(0,ctx.currentTime+d); g.gain.linearRampToValueAtTime(0.2,ctx.currentTime+d+0.02); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+d+0.45); o.start(ctx.currentTime+d);o.stop(ctx.currentTime+d+0.45); }); }catch(e){} };
const playKnockSound = () => { try { const ctx = new (window.AudioContext||window.webkitAudioContext)(); [0,0.2,0.4].forEach(d=>{ const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g);g.connect(ctx.destination); o.frequency.value=300;o.type='sine'; g.gain.setValueAtTime(0.3,ctx.currentTime+d); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+d+0.12); o.start(ctx.currentTime+d);o.stop(ctx.currentTime+d+0.12); }); }catch(e){} };
// ─────────────────────────────────────────────────────────────────

// ── Floating Emoji Reactions ──────────────────────────────────────
function FloatingReactions({ reactions }) {
    return (
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:25, overflow:'hidden' }}>
            {reactions.map(r => (
                <div key={r.id} style={{
                    position:'absolute', bottom:'80px', left:`${r.x}%`,
                    fontSize:'2.4rem', animation:'floatUp 3s ease-out forwards',
                    filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.5))'
                }}>
                    {r.emoji}
                </div>
            ))}
        </div>
    );
}

// ── AI Assistant Panel ────────────────────────────────────────────
function AIAssistant({ isOpen, onClose, username, meetingCode, participants }) {
    const [messages, setMessages] = useState([
        { role: 'assistant', text: `Hello! I'm your AI Meeting Assistant 🤖. I'm here to help during your ConnectX meeting.\n\nI can:\n• Answer questions live in the meeting\n• Take meeting notes\n• Generate a summary when you're done\n• Help with any topic!\n\nWhat can I help you with?` }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState([]);
    const [tab, setTab] = useState('chat'); // chat | notes | summary
    const [summary, setSummary] = useState('');
    const [summaryLoading, setSummaryLoading] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;
        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const systemPrompt = `You are an intelligent AI Meeting Assistant inside ConnectX, a video meeting app. 
You are assisting in a live meeting. 
Meeting Code: ${meetingCode}
Host/Current User: ${username}
Participants: ${participants.join(', ') || 'Just you'}
Time: ${new Date().toLocaleTimeString()}

Be concise, helpful, and meeting-focused. You can:
- Answer general knowledge questions
- Help write agendas, action items, decisions
- Suggest meeting structures  
- Summarize what's been discussed if user tells you
- Take notes when asked
Keep responses brief (under 100 words unless asked for more).`;

            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1000,
                    system: systemPrompt,
                    messages: [
                        ...messages.filter(m => m.role !== 'assistant' || messages.indexOf(m) > 0).map(m => ({
                            role: m.role, content: m.text
                        })),
                        { role: 'user', content: userMsg }
                    ]
                })
            });
            const data = await response.json();
            const reply = data.content?.[0]?.text || "Sorry, I couldn't process that.";
            setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', text: "⚠️ Connection issue. Please try again." }]);
        }
        setLoading(false);
    };

    const addNote = () => {
        const note = prompt('Add a meeting note:');
        if (note?.trim()) setNotes(prev => [...prev, { text: note, time: new Date().toLocaleTimeString() }]);
    };

    const generateSummary = async () => {
        setSummaryLoading(true); setTab('summary');
        const chatHistory = messages.map(m => `${m.role === 'user' ? username : 'AI'}: ${m.text}`).join('\n');
        const notesText = notes.map(n => `[${n.time}] ${n.text}`).join('\n');
        try {
            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1000,
                    messages: [{
                        role: 'user',
                        content: `Generate a professional meeting summary for this ConnectX meeting.\n\nMeeting Code: ${meetingCode}\nParticipants: ${participants.join(', ') || username}\nDate: ${new Date().toLocaleDateString()}\n\nChat history:\n${chatHistory}\n\nMeeting notes:\n${notesText || 'No notes taken'}\n\nFormat: Title, Key Points, Action Items, Decisions Made. Keep it concise.`
                    }]
                })
            });
            const data = await response.json();
            setSummary(data.content?.[0]?.text || 'Unable to generate summary.');
        } catch (e) { setSummary('⚠️ Could not generate summary. Check connection.'); }
        setSummaryLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div style={{ position:'absolute', left:'16px', top:'16px', bottom:'80px', width:'320px', background:'rgba(10,10,20,0.96)', border:'1px solid rgba(102,126,234,0.3)', borderRadius:'20px', display:'flex', flexDirection:'column', zIndex:30, backdropFilter:'blur(20px)', boxShadow:'0 24px 80px rgba(0,0,0,0.7)', overflow:'hidden' }}>
            {/* Header */}
            <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:'36px', height:'36px', background:'linear-gradient(135deg,#667eea,#a78bfa)', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>🤖</div>
                <div style={{ flex:1 }}>
                    <div style={{ color:'white', fontWeight:'700', fontSize:'14px' }}>AI Meeting Assistant</div>
                    <div style={{ color:'#4ade80', fontSize:'11px', display:'flex', alignItems:'center', gap:'4px' }}>
                        <span style={{ width:'6px', height:'6px', background:'#4ade80', borderRadius:'50%', display:'inline-block' }} /> Online
                    </div>
                </div>
                <button onClick={onClose} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:'18px' }}>✕</button>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', padding:'8px 12px', gap:'4px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
                {[['chat','💬 Chat'],['notes','📝 Notes'],['summary','📋 Summary']].map(([t,l])=>(
                    <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'6px 4px', background:tab===t?'rgba(102,126,234,0.25)':'transparent', border:tab===t?'1px solid rgba(102,126,234,0.4)':'1px solid transparent', borderRadius:'8px', color:tab===t?'#a78bfa':'#64748b', fontSize:'11px', fontWeight:'600', cursor:'pointer', transition:'all 0.2s' }}>
                        {l}
                    </button>
                ))}
            </div>

            {/* Chat Tab */}
            {tab==='chat' && (
                <>
                    <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:'12px' }}>
                        {messages.map((m,i)=>(
                            <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start' }}>
                                <div style={{ maxWidth:'85%', padding:'10px 14px', borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px', background:m.role==='user'?'linear-gradient(135deg,#667eea,#764ba2)':'rgba(255,255,255,0.06)', color:'white', fontSize:'13px', lineHeight:1.5, whiteSpace:'pre-wrap' }}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div style={{ display:'flex', gap:'4px', padding:'10px 14px' }}>
                                {[0,1,2].map(i=><div key={i} style={{ width:'7px', height:'7px', background:'#667eea', borderRadius:'50%', animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                    <div style={{ padding:'12px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', gap:'8px' }}>
                        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMessage()} placeholder="Ask AI anything..." style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(102,126,234,0.3)', borderRadius:'10px', color:'white', padding:'10px 12px', fontSize:'13px', outline:'none' }} />
                        <button onClick={sendMessage} disabled={loading||!input.trim()} style={{ background:'linear-gradient(135deg,#667eea,#764ba2)', border:'none', color:'white', borderRadius:'10px', padding:'10px 14px', cursor:'pointer', fontSize:'16px', opacity:loading||!input.trim()?0.5:1 }}>➤</button>
                    </div>
                </>
            )}

            {/* Notes Tab */}
            {tab==='notes' && (
                <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'16px', gap:'12px' }}>
                    <button onClick={addNote} style={{ background:'rgba(102,126,234,0.2)', border:'1px solid rgba(102,126,234,0.4)', color:'#a78bfa', borderRadius:'10px', padding:'10px', cursor:'pointer', fontSize:'14px', fontWeight:'600' }}>
                        + Add Note
                    </button>
                    <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'8px' }}>
                        {notes.length===0 ? <p style={{ color:'#475569', textAlign:'center', fontSize:'13px', marginTop:'20px' }}>No notes yet. Click "Add Note" to capture key points.</p>
                        : notes.map((n,i)=>(
                            <div key={i} style={{ background:'rgba(255,255,255,0.05)', borderRadius:'10px', padding:'12px', border:'1px solid rgba(255,255,255,0.08)' }}>
                                <div style={{ color:'#64748b', fontSize:'11px', marginBottom:'4px' }}>🕐 {n.time}</div>
                                <div style={{ color:'white', fontSize:'13px' }}>{n.text}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Summary Tab */}
            {tab==='summary' && (
                <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'16px', gap:'12px' }}>
                    <button onClick={generateSummary} disabled={summaryLoading} style={{ background:'linear-gradient(135deg,#667eea,#764ba2)', border:'none', color:'white', borderRadius:'10px', padding:'12px', cursor:'pointer', fontSize:'14px', fontWeight:'600', opacity:summaryLoading?0.6:1 }}>
                        {summaryLoading ? '⏳ Generating...' : '✨ Generate AI Summary'}
                    </button>
                    <div style={{ flex:1, overflowY:'auto' }}>
                        {summary ? <div style={{ color:'#e2e8f0', fontSize:'13px', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{summary}</div>
                        : <p style={{ color:'#475569', textAlign:'center', fontSize:'13px', marginTop:'20px' }}>Click above to generate an AI-powered meeting summary including key points, decisions, and action items.</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

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
    let [showChat, setShowChat] = useState(false);
    let [showAI, setShowAI] = useState(false);
    let [screenAvailable, setScreenAvailable] = useState(false);

    let [messages, setMessages] = useState([]);
    let [message, setMessage] = useState("");
    let [newMessages, setNewMessages] = useState(0);
    let [askForUsername, setAskForUsername] = useState(true);
    let [username, setUsername] = useState("");

    let [isWaiting, setIsWaiting] = useState(false);
    let [isHost, setIsHost] = useState(false);
    let [admitRequests, setAdmitRequests] = useState([]);
    let [rejected, setRejected] = useState(false);

    // Reactions
    let [reactions, setReactions] = useState([]);
    let [showReactionPicker, setShowReactionPicker] = useState(false);
    const reactionIdRef = useRef(0);

    const videoRef = useRef([]);
    let [videos, setVideos] = useState([]);
    const participantNames = useRef({});
    const meetingCode = window.location.pathname.replace('/', '');

    useEffect(() => { getPermissions(); }, []);
    useEffect(() => { if (screen) getDislayMedia(); }, [screen]);

    const getPermissions = async () => {
        try { const v = await navigator.mediaDevices.getUserMedia({video:true}); setVideoAvailable(true); v.getTracks().forEach(t=>t.stop()); } catch { setVideoAvailable(false); }
        try { const a = await navigator.mediaDevices.getUserMedia({audio:true}); setAudioAvailable(true); a.getTracks().forEach(t=>t.stop()); } catch { setAudioAvailable(false); }
        if (navigator.mediaDevices.getDisplayMedia) setScreenAvailable(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({video:true,audio:true});
            window.localStream = stream;
            if (localVideoref.current) localVideoref.current.srcObject = stream;
            setVideo(true); setAudio(true);
        } catch(e) { console.log(e); }
    };

    const launchReaction = useCallback((emoji) => {
        const id = reactionIdRef.current++;
        const x = 10 + Math.random() * 80;
        setReactions(prev => [...prev, { id, emoji, x }]);
        setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id)), 3200);
        // Also broadcast to others
        socketRef.current?.emit('reaction', { emoji, name: username });
    }, [username]);

    let getUserMediaSuccess = (stream) => {
        try { window.localStream.getTracks().forEach(t=>t.stop()); } catch(e){}
        window.localStream = stream;
        if (localVideoref.current) localVideoref.current.srcObject = stream;
        for (let id in connections) {
            if (id===socketIdRef.current) continue;
            window.localStream.getTracks().forEach(track=>{ try{connections[id].addTrack(track,window.localStream);}catch(e){} });
            connections[id].createOffer().then(d=>connections[id].setLocalDescription(d).then(()=>socketRef.current.emit('signal',id,JSON.stringify({sdp:connections[id].localDescription}))));
        }
    }

    let getDislayMedia = () => {
        navigator.mediaDevices.getDisplayMedia({video:true,audio:true}).then(getDislayMediaSuccess).catch(e=>{console.log(e);setScreen(false);});
    }
    let getDislayMediaSuccess = (stream) => {
        try{window.localStream.getTracks().forEach(t=>t.stop());}catch(e){}
        window.localStream=stream;
        if(localVideoref.current) localVideoref.current.srcObject=stream;
        for(let id in connections){
            if(id===socketIdRef.current) continue;
            window.localStream.getTracks().forEach(track=>{try{connections[id].addTrack(track,window.localStream);}catch(e){}});
            connections[id].createOffer().then(d=>connections[id].setLocalDescription(d).then(()=>socketRef.current.emit('signal',id,JSON.stringify({sdp:connections[id].localDescription}))));
        }
        stream.getTracks().forEach(track=>track.onended=()=>{setScreen(false);navigator.mediaDevices.getUserMedia({video:videoAvailable,audio:audioAvailable}).then(getUserMediaSuccess).catch(e=>console.log(e));});
    }

    let gotMessageFromServer = (fromId, msg) => {
        const signal = JSON.parse(msg);
        if (fromId!==socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(()=>{
                    if (signal.sdp.type==='offer') connections[fromId].createAnswer().then(d=>connections[fromId].setLocalDescription(d).then(()=>socketRef.current.emit('signal',fromId,JSON.stringify({sdp:connections[fromId].localDescription}))));
                }).catch(e=>console.log(e));
            }
            if (signal.ice) connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e=>console.log(e));
        }
    }

    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url,{secure:true,transports:['websocket','polling']});
        socketRef.current.on('signal',gotMessageFromServer);
        socketRef.current.on('waiting-for-host',()=>{ setIsWaiting(true); playKnockSound(); });
        socketRef.current.on('admit-request',({socketId,name})=>{ playKnockSound(); setAdmitRequests(prev=>prev.find(r=>r.socketId===socketId)?prev:[...prev,{socketId,name}]); });
        socketRef.current.on('rejected-by-host',()=>{ setRejected(true); setIsWaiting(false); });
        socketRef.current.on('you-are-host',()=>setIsHost(true));
        socketRef.current.on('play-join-sound',()=>playJoinSound());
        socketRef.current.on('reaction',({emoji,name})=>{
            const id=reactionIdRef.current++;
            const x=10+Math.random()*80;
            setReactions(prev=>[...prev,{id,emoji,x}]);
            setTimeout(()=>setReactions(prev=>prev.filter(r=>r.id!==id)),3200);
        });

        socketRef.current.on('connect',()=>{
            const roomId=window.location.pathname;
            socketRef.current.emit('join-call',{path:roomId,name:username});
            socketIdRef.current=socketRef.current.id;
            socketRef.current.on('chat-message',addMessage);
            socketRef.current.on('user-left',(id)=>{ setVideos(prev=>prev.filter(v=>v.socketId!==id)); playLeaveSound(); });
            socketRef.current.on('participants-update',(participants)=>{ participants.forEach(p=>{participantNames.current[p.socketId]=p.name;}); });
            socketRef.current.on('user-joined',(id,clients)=>{
                if (id===socketIdRef.current){ setIsWaiting(false); setIsHost(clients.length===1); playJoinSound(); }
                setAdmitRequests(prev=>prev.filter(r=>r.socketId!==id));
                clients.forEach(socketListId=>{
                    if (connections[socketListId]) return;
                    connections[socketListId]=new RTCPeerConnection(peerConfig);
                    connections[socketListId].onicecandidate=(event)=>{ if(event.candidate) socketRef.current.emit('signal',socketListId,JSON.stringify({ice:event.candidate})); };
                    connections[socketListId].ontrack=(event)=>{
                        const remoteStream=event.streams[0];
                        if (!remoteStream||socketListId===socketIdRef.current) return;
                        let exists=videoRef.current.find(v=>v.socketId===socketListId);
                        if(exists){ setVideos(vids=>{const u=vids.map(v=>v.socketId===socketListId?{...v,stream:remoteStream}:v);videoRef.current=u;return u;}); }
                        else { const nv={socketId:socketListId,stream:remoteStream}; setVideos(vids=>{const u=[...vids,nv];videoRef.current=u;return u;}); }
                    };
                    if(window.localStream) window.localStream.getTracks().forEach(t=>{connections[socketListId].addTrack(t,window.localStream);});
                    else { const bs=()=>new MediaStream([black(),silence()]); window.localStream=bs(); window.localStream.getTracks().forEach(t=>{connections[socketListId].addTrack(t,window.localStream);}); }
                });
                if(id===socketIdRef.current){
                    for(let id2 in connections){
                        if(id2===socketIdRef.current) continue;
                        window.localStream?.getTracks().forEach(t=>{try{connections[id2].addTrack(t,window.localStream);}catch(e){}});
                        connections[id2].createOffer().then(d=>connections[id2].setLocalDescription(d).then(()=>socketRef.current.emit('signal',id2,JSON.stringify({sdp:connections[id2].localDescription}))));
                    }
                }
            });
        });
    }

    let silence=()=>{let ctx=new AudioContext(),osc=ctx.createOscillator(),dst=osc.connect(ctx.createMediaStreamDestination());osc.start();ctx.resume();return Object.assign(dst.stream.getAudioTracks()[0],{enabled:false});};
    let black=({width=640,height=480}={})=>{let c=Object.assign(document.createElement("canvas"),{width,height});c.getContext('2d').fillRect(0,0,width,height);return Object.assign(c.captureStream().getVideoTracks()[0],{enabled:false});};

    let handleVideo=()=>{ const t=window.localStream?.getVideoTracks()[0]; if(!t)return; t.enabled=!t.enabled; setVideo(t.enabled); };
    let handleAudio=()=>{ const t=window.localStream?.getAudioTracks()[0]; if(!t)return; t.enabled=!t.enabled; setAudio(t.enabled); };
    let handleScreen=()=>setScreen(p=>!p);
    let handleEndCall=()=>{ try{localVideoref.current?.srcObject?.getTracks().forEach(t=>t.stop());window.localStream?.getTracks().forEach(t=>t.stop());}catch(e){} for(let id in connections){try{connections[id].close();}catch(e){}} connections={}; socketRef.current?.disconnect(); window.location.href="/"; };
    const addMessage=(data,sender,socketIdSender)=>{ setMessages(prev=>[...prev,{sender,data}]); if(socketIdSender!==socketIdRef.current) setNewMessages(p=>p+1); };
    let sendMessage=()=>{ if(!message.trim())return; socketRef.current.emit('chat-message',message,username); setMessage(""); };
    let connect=()=>{ setAskForUsername(false); connectToSocketServer(); };
    const handleAdmit=(socketId)=>{ socketRef.current.emit('admit-user',{socketId}); setAdmitRequests(prev=>prev.filter(r=>r.socketId!==socketId)); };
    const handleReject=(socketId)=>{ socketRef.current.emit('reject-user',{socketId}); setAdmitRequests(prev=>prev.filter(r=>r.socketId!==socketId)); };

    const totalParticipants=1+videos.length;
    const getGridClass=(c)=>{ if(c===1)return styles.count1; if(c===2)return styles.count2; if(c<=4)return styles.count3; if(c<=6)return styles.count5; return styles.countMany; };
    const participantList=[username,...Object.values(participantNames.current)].filter(Boolean);

    // ── Screens ────────────────────────────────────────────────────
    if (rejected) return (
        <div style={{minHeight:'100vh',background:'#0f0f1a',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'white',gap:'20px'}}>
            <div style={{fontSize:'4rem'}}>🚫</div>
            <h2 style={{margin:0}}>Your request was declined</h2>
            <p style={{color:'#94a3b8'}}>The host did not admit you into this meeting.</p>
            <button onClick={()=>window.location.href='/'} style={{background:'linear-gradient(135deg,#667eea,#764ba2)',border:'none',color:'white',padding:'12px 28px',borderRadius:'10px',fontSize:'15px',cursor:'pointer'}}>Go Home</button>
        </div>
    );

    if (isWaiting) return (
        <div style={{minHeight:'100vh',background:'#0f0f1a',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'white',gap:'24px'}}>
            <div style={{width:'80px',height:'80px',borderRadius:'50%',background:'linear-gradient(135deg,#667eea,#764ba2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2.5rem',animation:'pulse 2s infinite'}}>⏳</div>
            <h2 style={{margin:0,fontSize:'1.8rem'}}>Waiting for host to admit you</h2>
            <p style={{color:'#94a3b8',margin:0}}>Please wait...</p>
            <div style={{display:'flex',gap:'8px'}}>{[0,1,2].map(i=><div key={i} style={{width:'10px',height:'10px',borderRadius:'50%',background:'#667eea',animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}</div>
            <button onClick={()=>window.location.href='/'} style={{background:'transparent',border:'1px solid rgba(239,68,68,0.4)',color:'#f87171',padding:'10px 24px',borderRadius:'8px',cursor:'pointer',fontSize:'14px'}}>Cancel</button>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} @keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}`}</style>
        </div>
    );

    if (askForUsername) return (
        <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0f0f1a,#1a1a2e)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'white',gap:'24px',padding:'20px'}}>
            <div style={{fontSize:'3rem'}}>📡</div>
            <h2 style={{margin:0,fontSize:'1.8rem',fontWeight:'700'}}>Join Meeting</h2>
            <p style={{margin:0,color:'#94a3b8'}}>Meeting Code: <strong style={{color:'#a78bfa'}}>{meetingCode}</strong></p>
            <video ref={localVideoref} autoPlay muted playsInline style={{width:'340px',maxWidth:'90vw',borderRadius:'16px',background:'#1a1a2e',border:'1px solid rgba(102,126,234,0.3)'}}/>
            <div style={{display:'flex',gap:'12px',alignItems:'center',flexWrap:'wrap',justifyContent:'center'}}>
                <input type="text" placeholder="Your display name" value={username} onChange={e=>setUsername(e.target.value)} onKeyDown={e=>e.key==='Enter'&&username.trim()&&connect()}
                    style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(102,126,234,0.4)',color:'white',padding:'14px 18px',borderRadius:'10px',fontSize:'15px',outline:'none',width:'220px'}}/>
                <button onClick={connect} disabled={!username.trim()} style={{background:username.trim()?'linear-gradient(135deg,#667eea,#764ba2)':'#333',border:'none',color:'white',padding:'14px 28px',borderRadius:'10px',fontSize:'15px',fontWeight:'700',cursor:username.trim()?'pointer':'not-allowed'}}>
                    Join Now →
                </button>
            </div>
        </div>
    );

    // ── MAIN MEETING ───────────────────────────────────────────────
    return (
        <div className={styles.meetVideoContainer}>
            <FloatingReactions reactions={reactions} />

            {/* AI Panel */}
            <AIAssistant isOpen={showAI} onClose={()=>setShowAI(false)} username={username} meetingCode={meetingCode} participants={participantList}/>

            {/* Admit requests */}
            {isHost&&admitRequests.length>0&&(
                <div style={{position:'absolute',top:'16px',right:showChat?'316px':'16px',zIndex:30,display:'flex',flexDirection:'column',gap:'10px',transition:'right 0.3s'}}>
                    {admitRequests.map(req=>(
                        <div key={req.socketId} style={{background:'rgba(15,15,26,0.95)',border:'1px solid rgba(102,126,234,0.4)',borderRadius:'14px',padding:'16px 20px',display:'flex',alignItems:'center',gap:'14px',backdropFilter:'blur(16px)',boxShadow:'0 8px 32px rgba(0,0,0,0.5)',animation:'slideIn 0.3s ease'}}>
                            <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'linear-gradient(135deg,#667eea,#764ba2)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'700',fontSize:'16px',color:'white'}}>{req.name[0]?.toUpperCase()}</div>
                            <div style={{flex:1}}>
                                <div style={{color:'white',fontWeight:'600',fontSize:'14px'}}>{req.name}</div>
                                <div style={{color:'#94a3b8',fontSize:'12px'}}>wants to join</div>
                            </div>
                            <button onClick={()=>handleAdmit(req.socketId)} style={{background:'rgba(74,222,128,0.2)',border:'1px solid rgba(74,222,128,0.4)',color:'#4ade80',padding:'7px 14px',borderRadius:'8px',cursor:'pointer',fontSize:'13px',fontWeight:'600'}}>✓ Admit</button>
                            <button onClick={()=>handleReject(req.socketId)} style={{background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',color:'#f87171',padding:'7px 14px',borderRadius:'8px',cursor:'pointer',fontSize:'13px',fontWeight:'600'}}>✕</button>
                        </div>
                    ))}
                </div>
            )}

            {/* Host badge */}
            {isHost&&<div style={{position:'absolute',top:'16px',left:showAI?'348px':'16px',zIndex:20,background:'rgba(102,126,234,0.25)',border:'1px solid rgba(102,126,234,0.4)',borderRadius:'20px',padding:'5px 14px',color:'#a78bfa',fontSize:'12px',fontWeight:'700',transition:'left 0.3s'}}>👑 Host</div>}

            {/* VIDEO GRID */}
            <div className={`${styles.conferenceView} ${getGridClass(totalParticipants)}`}>
                <div className={styles.videoTile}>
                    <video ref={localVideoref} autoPlay muted playsInline/>
                    <span className={styles.nameTag}>{username||"You"}</span>
                    {isHost&&<span className={styles.selfBadge}>👑 Host</span>}
                    {!isHost&&<span className={styles.selfBadge}>You</span>}
                </div>
                {videos.map(v=>(
                    <div key={v.socketId} className={styles.videoTile}>
                        <video ref={ref=>{if(ref&&v.stream) ref.srcObject=v.stream;}} autoPlay playsInline/>
                        <span className={styles.nameTag}>{participantNames.current[v.socketId]||"Participant"}</span>
                    </div>
                ))}
            </div>

            {/* CHAT */}
            {showChat&&(
                <div className={styles.chatRoom}>
                    <div className={styles.chatContainer}>
                        <h1>Chat</h1>
                        <div className={styles.chattingDisplay}>
                            {messages.length?messages.map((item,i)=>(
                                <div key={i} style={{marginBottom:'16px'}}>
                                    <p style={{fontWeight:'700',color:'#a78bfa',margin:'0 0 3px'}}>{item.sender}</p>
                                    <p style={{margin:0,color:'#e2e8f0'}}>{item.data}</p>
                                </div>
                            )):<p style={{color:'#555'}}>No messages yet</p>}
                        </div>
                        <div className={styles.chattingArea}>
                            <input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMessage()} placeholder="Message..." style={{flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(102,126,234,0.3)',borderRadius:'10px',color:'white',padding:'10px 12px',fontSize:'13px',outline:'none'}}/>
                            <button onClick={sendMessage} style={{background:'linear-gradient(135deg,#667eea,#764ba2)',border:'none',color:'white',borderRadius:'10px',padding:'10px 14px',cursor:'pointer',fontSize:'14px',fontWeight:'600',whiteSpace:'nowrap'}}>Send</button>
                        </div>
                    </div>
                </div>
            )}

            {/* REACTION PICKER */}
            {showReactionPicker&&(
                <div style={{position:'absolute',bottom:'85px',left:'50%',transform:'translateX(-50%)',zIndex:40,background:'rgba(15,15,26,0.97)',border:'1px solid rgba(102,126,234,0.3)',borderRadius:'16px',padding:'12px 16px',display:'flex',gap:'8px',backdropFilter:'blur(20px)',boxShadow:'0 16px 48px rgba(0,0,0,0.6)',animation:'fadeUp 0.2s ease'}}>
                    {['👍','❤️','😂','😮','🎉','👏','🔥','💯'].map(emoji=>(
                        <button key={emoji} onClick={()=>{launchReaction(emoji);setShowReactionPicker(false);}} style={{background:'none',border:'none',fontSize:'1.8rem',cursor:'pointer',padding:'4px 6px',borderRadius:'8px',transition:'transform 0.15s'}}
                            onMouseEnter={e=>e.target.style.transform='scale(1.3)'}
                            onMouseLeave={e=>e.target.style.transform='scale(1)'}>
                            {emoji}
                        </button>
                    ))}
                </div>
            )}

            {/* CONTROL BAR */}
            <div className={styles.buttonContainers}>
                {/* AI Button — unique feature */}
                <button onClick={()=>setShowAI(p=>!p)} title="AI Meeting Assistant"
                    style={{background:showAI?'linear-gradient(135deg,#667eea,#764ba2)':'rgba(102,126,234,0.15)',border:`1px solid ${showAI?'#667eea':'rgba(102,126,234,0.4)'}`,color:'white',borderRadius:'12px',padding:'8px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',fontSize:'13px',fontWeight:'700',transition:'all 0.2s'}}>
                    🤖 <span>AI</span>
                </button>

                <IconButton onClick={handleVideo} style={{color:video?'white':'#ff5555'}}>
                    {video?<VideocamIcon/>:<VideocamOffIcon/>}
                </IconButton>
                <IconButton onClick={handleEndCall} style={{color:'white',background:'#e53e3e',borderRadius:'50%',padding:'10px'}}>
                    <CallEndIcon/>
                </IconButton>
                <IconButton onClick={handleAudio} style={{color:audio?'white':'#ff5555'}}>
                    {audio?<MicIcon/>:<MicOffIcon/>}
                </IconButton>
                {screenAvailable&&<IconButton onClick={handleScreen} style={{color:screen?'#667eea':'white'}}>{screen?<ScreenShareIcon/>:<StopScreenShareIcon/>}</IconButton>}

                {/* Reaction button */}
                <button onClick={()=>setShowReactionPicker(p=>!p)} title="React"
                    style={{background:showReactionPicker?'rgba(102,126,234,0.25)':'transparent',border:'none',color:'white',borderRadius:'50%',padding:'8px',cursor:'pointer',fontSize:'1.4rem',lineHeight:1}}>
                    😊
                </button>

                <Badge badgeContent={newMessages} max={99} color='primary'>
                    <IconButton onClick={()=>{setShowChat(p=>!p);setNewMessages(0);}} style={{color:showChat?'#667eea':'white'}}>
                        <ChatIcon/>
                    </IconButton>
                </Badge>
            </div>

            <style>{`
                @keyframes floatUp{0%{opacity:0;transform:translateY(0) scale(0.5)}15%{opacity:1;transform:translateY(-20px) scale(1.2)}85%{opacity:1;transform:translateY(-120px) scale(1)}100%{opacity:0;transform:translateY(-160px) scale(0.8)}}
                @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
                @keyframes fadeUp{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}
                @keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
            `}</style>
        </div>
    );
}
