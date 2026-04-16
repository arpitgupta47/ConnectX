import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField, Button } from '@mui/material';

import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';

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
  const [screen, setScreen] = useState(false);

  const [participants, setParticipants] = useState([]);

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [typingUser, setTypingUser] = useState("");

  const [showModal, setModal] = useState(true);
  const [newMessages, setNewMessages] = useState(0);

  const [username, setUsername] = useState("");
  const [askForUsername, setAskForUsername] = useState(true);

  const [videos, setVideos] = useState([]);

  // ================= MEDIA =================
  const getMedia = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    window.localStream = stream;
    localVideoref.current.srcObject = stream;

    connectToSocketServer();
  };

  // ================= SOCKET =================
  const connectToSocketServer = () => {
    socketRef.current = io.connect(server_url);

    socketRef.current.on('connect', () => {

      socketIdRef.current = socketRef.current.id;

      socketRef.current.emit('join-call', {
        path: window.location.href,
        name: username
      });

      socketRef.current.on("participants-update", setParticipants);

      socketRef.current.on('chat-message', addMessage);

      socketRef.current.on("typing", (name) => {
        setTypingUser(name);
        setTimeout(() => setTypingUser(""), 2000);
      });

      socketRef.current.on('user-joined', (id, clients) => {

        clients.forEach((socketListId) => {

          connections[socketListId] = new RTCPeerConnection(peerConfigConnections);

          connections[socketListId].onicecandidate = (event) => {
            if (event.candidate) {
              socketRef.current.emit('signal', socketListId, JSON.stringify({ ice: event.candidate }));
            }
          };

          connections[socketListId].ontrack = (event) => {
            setVideos(prev => {
              const exists = prev.find(v => v.socketId === socketListId);
              if (exists) {
                return prev.map(v =>
                  v.socketId === socketListId ? { ...v, stream: event.streams[0] } : v
                );
              }
              return [...prev, { socketId: socketListId, stream: event.streams[0] }];
            });
          };

          window.localStream.getTracks().forEach(track => {
            connections[socketListId].addTrack(track, window.localStream);
          });
        });
      });

      socketRef.current.on('signal', gotMessageFromServer);
    });
  };

  const gotMessageFromServer = (fromId, message) => {
    const signal = JSON.parse(message);

    if (signal.sdp) {
      connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
        if (signal.sdp.type === 'offer') {
          connections[fromId].createAnswer().then(description => {
            connections[fromId].setLocalDescription(description).then(() => {
              socketRef.current.emit('signal', fromId, JSON.stringify({ sdp: connections[fromId].localDescription }));
            });
          });
        }
      });
    }

    if (signal.ice) {
      connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice));
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

  const handleScreen = async () => {
    if (!screen) {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      localVideoref.current.srcObject = stream;
      setScreen(true);
    } else {
      getMedia();
      setScreen(false);
    }
  };

  const handleEndCall = () => {
    window.location.href = "/";
  };

  // ================= CHAT =================
  const addMessage = (data, sender) => {
    setMessages(prev => [...prev, { sender, data }]);

    if (sender !== username) {
      setNewMessages(prev => prev + 1);
    }
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    socketRef.current.emit('chat-message', message, username);
    setMessage("");
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    socketRef.current.emit("typing", username);
  };

  const connect = () => {
    if (!username) return alert("Enter username");
    setAskForUsername(false);
    getMedia();
  };

  // ================= UI =================
  if (askForUsername) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px" }}>
        <h2>Enter into Lobby</h2>
        <TextField value={username} onChange={(e) => setUsername(e.target.value)} />
        <Button variant="contained" onClick={connect}>Join</Button>
      </div>
    );
  }

  return (
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
            {user.name}
            <span style={{ color: "lightgreen", marginLeft: "8px" }}>● online</span>
          </div>
        ))}
      </div>

      {/* CHAT */}
      {showModal && (
        <div style={{
          position: "absolute",
          right: 10,
          bottom: 10,
          width: "320px",
          height: "420px",
          background: "white",
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          padding: "10px"
        }}>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {messages.map((m, i) => {
              const isMe = m.sender === username;
              return (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: isMe ? "flex-end" : "flex-start",
                  marginBottom: "10px"
                }}>
                  <div style={{
                    background: isMe ? "#667eea" : "#eee",
                    color: isMe ? "white" : "black",
                    padding: "8px",
                    borderRadius: "10px"
                  }}>
                    {m.data}
                  </div>
                </div>
              );
            })}

            {typingUser && <p>✍️ {typingUser} typing...</p>}
          </div>

          <div style={{ display: "flex", gap: "5px" }}>
            <TextField value={message} onChange={handleTyping} fullWidth size="small" />
            <Button onClick={sendMessage}>Send</Button>
          </div>
        </div>
      )}

      {/* BUTTONS */}
      <div style={{
        position: "absolute",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: "10px"
      }}>
        <IconButton style={{ color: "white", background: "#333" }} onClick={handleVideo}>
          {video ? <VideocamIcon /> : <VideocamOffIcon />}
        </IconButton>

        <IconButton style={{ color: "white", background: "#333" }} onClick={handleAudio}>
          {audio ? <MicIcon /> : <MicOffIcon />}
        </IconButton>

        <IconButton style={{ color: "white", background: "#333" }} onClick={handleScreen}>
          {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
        </IconButton>

        <Badge badgeContent={newMessages} color="error">
          <IconButton onClick={() => { setModal(!showModal); setNewMessages(0); }} style={{ color: "white", background: "#333" }}>
            <ChatIcon />
          </IconButton>
        </Badge>

        <IconButton style={{ color: "white", background: "red" }} onClick={handleEndCall}>
          <CallEndIcon />
        </IconButton>
      </div>

      {/* LOCAL VIDEO */}
      <video ref={localVideoref} autoPlay muted className={styles.meetUserVideo}></video>

      {/* REMOTE */}
      <div className={styles.conferenceView}>
        {videos.map(v => (
          <video key={v.socketId} ref={ref => ref && (ref.srcObject = v.stream)} autoPlay />
        ))}
      </div>

    </div>
  );
}
