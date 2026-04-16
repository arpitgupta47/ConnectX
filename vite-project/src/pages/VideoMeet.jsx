import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { IconButton, TextField, Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
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

  const [video, setVideo] = useState(true);
  const [audio, setAudio] = useState(true);
  const [videos, setVideos] = useState([]);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState("");
  const [askUsername, setAskUsername] = useState(true);

  // 🔥 GET MEDIA
  const getMedia = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    window.localStream = stream;
    localVideoref.current.srcObject = stream;
    connectSocket();
  }

  // 🔥 SOCKET
  const connectSocket = () => {
    socketRef.current = io.connect(server_url);

    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;

      socketRef.current.emit("join-call", window.location.pathname);

      socketRef.current.on("user-joined", (id, clients) => {
        clients.forEach(socketListId => {

          connections[socketListId] = new RTCPeerConnection(peerConfigConnections);

          // ICE
          connections[socketListId].onicecandidate = (event) => {
            if (event.candidate) {
              socketRef.current.emit("signal", socketListId, JSON.stringify({ ice: event.candidate }));
            }
          };

          // 🔥 RECEIVE VIDEO
          connections[socketListId].ontrack = (event) => {
            const stream = event.streams[0];

            setVideos(prev => {
              const exists = prev.find(v => v.socketId === socketListId);
              if (exists) {
                return prev.map(v => v.socketId === socketListId ? { ...v, stream } : v);
              } else {
                return [...prev, { socketId: socketListId, stream }];
              }
            });
          };

          // 🔥 SEND VIDEO
          window.localStream.getTracks().forEach(track => {
            connections[socketListId].addTrack(track, window.localStream);
          });
        });

        if (id === socketIdRef.current) {
          for (let id2 in connections) {
            connections[id2].createOffer().then(desc => {
              connections[id2].setLocalDescription(desc).then(() => {
                socketRef.current.emit("signal", id2, JSON.stringify({ sdp: desc }));
              });
            });
          }
        }
      });

      socketRef.current.on("signal", (fromId, message) => {
        const signal = JSON.parse(message);

        if (signal.sdp) {
          connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
            if (signal.sdp.type === "offer") {
              connections[fromId].createAnswer().then(desc => {
                connections[fromId].setLocalDescription(desc).then(() => {
                  socketRef.current.emit("signal", fromId, JSON.stringify({ sdp: desc }));
                });
              });
            }
          });
        }

        if (signal.ice) {
          connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice));
        }
      });

      socketRef.current.on("chat-message", (data, sender) => {
        setMessages(prev => [...prev, { sender, data }]);
      });

    });
  }

  // 🔥 BUTTONS
  const handleVideo = () => {
    const track = window.localStream.getVideoTracks()[0];
    track.enabled = !track.enabled;
    setVideo(track.enabled);
  }

  const handleAudio = () => {
    const track = window.localStream.getAudioTracks()[0];
    track.enabled = !track.enabled;
    setAudio(track.enabled);
  }

  const sendMessage = () => {
    socketRef.current.emit("chat-message", message, username);
    setMessage("");
  }

  const connect = () => {
    if (!username) return alert("Enter username");
    setAskUsername(false);
    getMedia();
  }

  const endCall = () => {
    window.location.href = "/";
  }

  // UI
  return (
    <div>

      {askUsername ? (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
          <h2>Enter Username</h2>
          <TextField value={username} onChange={(e) => setUsername(e.target.value)} />
          <br /><br />
          <Button variant="contained" onClick={connect}>Join</Button>
        </div>
      ) : (

        <div style={{ padding: "10px" }}>

          {/* LOCAL VIDEO */}
          <video ref={localVideoref} autoPlay muted style={{ width: "300px" }} />

          {/* REMOTE VIDEOS */}
          <div>
            {videos.map(v => (
              <video
                key={v.socketId}
                ref={ref => {
                  if (ref && v.stream) ref.srcObject = v.stream;
                }}
                autoPlay
                style={{ width: "300px" }}
              />
            ))}
          </div>

          {/* CONTROLS */}
          <div style={{ marginTop: "10px" }}>
            <IconButton onClick={handleVideo}>
              {video ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>

            <IconButton onClick={handleAudio}>
              {audio ? <MicIcon /> : <MicOffIcon />}
            </IconButton>

            <IconButton onClick={endCall} style={{ color: "red" }}>
              <CallEndIcon />
            </IconButton>
          </div>

          {/* CHAT */}
          <div style={{ marginTop: "20px" }}>
            <h3>Chat</h3>

            <div style={{ height: "150px", overflowY: "auto", border: "1px solid gray" }}>
              {messages.map((msg, i) => (
                <div key={i}>
                  <b>{msg.sender}:</b> {msg.data}
                </div>
              ))}
            </div>

            <TextField
              fullWidth
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <Button onClick={sendMessage}>Send</Button>
          </div>

        </div>
      )}

    </div>
  );
}
