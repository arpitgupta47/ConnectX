import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import styles from "../styles/videoComponent.module.css";
import {
  IconButton,
  TextField,
  Button,
  Badge,
} from "@mui/material";

import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import ChatIcon from "@mui/icons-material/Chat";

import server from "../environment";

const server_url = server;

let connections = {};

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VideoMeetComponent() {
  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoRef = useRef();

  const [username, setUsername] = useState("");
  const [askUsername, setAskUsername] = useState(true);

  const [video, setVideo] = useState(true);
  const [audio, setAudio] = useState(true);

  const [videos, setVideos] = useState([]);
  const videoRef = useRef([]);

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [participants, setParticipants] = useState([]);

  // ================= MEDIA =================

  const getUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video,
        audio: audio,
      });

      window.localStream = stream;
      localVideoRef.current.srcObject = stream;
    } catch (err) {
      console.log(err);
    }
  };

  // ================= SOCKET =================

  const connectSocket = () => {
    socketRef.current = io(server_url);

    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;

      socketRef.current.emit("join-call", {
        path: window.location.href,
        name: username,
      });

      socketRef.current.on("participants-update", setParticipants);

      socketRef.current.on("user-joined", (id, clients) => {
        clients.forEach((socketId) => {
          if (!connections[socketId]) {
            connections[socketId] = new RTCPeerConnection(config);

            // SEND TRACKS
            window.localStream.getTracks().forEach((track) => {
              connections[socketId].addTrack(track, window.localStream);
            });

            // RECEIVE TRACKS
            connections[socketId].ontrack = (event) => {
              const stream = event.streams[0];

              setVideos((prev) => {
                const exists = prev.find((v) => v.id === socketId);
                if (exists) return prev;

                return [...prev, { id: socketId, stream }];
              });
            };

            // ICE
            connections[socketId].onicecandidate = (e) => {
              if (e.candidate) {
                socketRef.current.emit(
                  "signal",
                  socketId,
                  JSON.stringify({ ice: e.candidate })
                );
              }
            };
          }
        });

        // CREATE OFFER
        if (id === socketIdRef.current) {
          Object.keys(connections).forEach((id2) => {
            connections[id2]
              .createOffer()
              .then((desc) => {
                connections[id2].setLocalDescription(desc);
                socketRef.current.emit(
                  "signal",
                  id2,
                  JSON.stringify({ sdp: desc })
                );
              });
          });
        }
      });

      socketRef.current.on("signal", handleSignal);

      socketRef.current.on("chat-message", (data, sender) => {
        setMessages((prev) => [...prev, { sender, data }]);
      });
    });
  };

  const handleSignal = (fromId, message) => {
    const signal = JSON.parse(message);

    if (!connections[fromId]) {
      connections[fromId] = new RTCPeerConnection(config);
    }

    if (signal.sdp) {
      connections[fromId]
        .setRemoteDescription(new RTCSessionDescription(signal.sdp))
        .then(() => {
          if (signal.sdp.type === "offer") {
            connections[fromId]
              .createAnswer()
              .then((desc) => {
                connections[fromId].setLocalDescription(desc);
                socketRef.current.emit(
                  "signal",
                  fromId,
                  JSON.stringify({ sdp: desc })
                );
              });
          }
        });
    }

    if (signal.ice) {
      connections[fromId].addIceCandidate(
        new RTCIceCandidate(signal.ice)
      );
    }
  };

  // ================= BUTTONS =================

  const toggleVideo = () => {
    const track = window.localStream.getVideoTracks()[0];
    track.enabled = !track.enabled;
    setVideo(track.enabled);
  };

  const toggleAudio = () => {
    const track = window.localStream.getAudioTracks()[0];
    track.enabled = !track.enabled;
    setAudio(track.enabled);
  };

  const endCall = () => {
    window.localStream.getTracks().forEach((t) => t.stop());
    window.location.href = "/";
  };

  const sendMessage = () => {
    socketRef.current.emit("chat-message", message, username);
    setMessage("");
  };

  const startCall = async () => {
    if (!username) return alert("Enter name");

    setAskUsername(false);
    await getUserMedia();
    connectSocket();
  };

  // ================= UI =================

  return (
    <div>
      {askUsername ? (
        <div style={{ textAlign: "center", marginTop: "100px" }}>
          <h2>Join Meeting</h2>
          <TextField
            label="Enter Name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <br /><br />
          <Button variant="contained" onClick={startCall}>
            Join
          </Button>
        </div>
      ) : (
        <div className={styles.meetVideoContainer}>

          {/* Participants */}
          <div className={styles.participants}>
            <h3>Participants</h3>
            {participants.map((p, i) => (
              <div key={i}>
                👤 {p.name} - <span style={{color:"green"}}>Online</span>
              </div>
            ))}
          </div>

          {/* Chat */}
          <div className={styles.chatBox}>
            <div className={styles.chatMessages}>
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.sender === username
                      ? styles.myMessage
                      : styles.otherMessage
                  }
                >
                  <b>{m.sender}</b>
                  <p>{m.data}</p>
                </div>
              ))}
            </div>

            <div className={styles.chatInput}>
              <TextField
                fullWidth
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button onClick={sendMessage}>Send</Button>
            </div>
          </div>

          {/* Controls */}
          <div className={styles.controls}>
            <IconButton onClick={toggleVideo} style={{ color: "white" }}>
              {video ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>

            <IconButton onClick={toggleAudio} style={{ color: "white" }}>
              {audio ? <MicIcon /> : <MicOffIcon />}
            </IconButton>

            <IconButton onClick={endCall} style={{ color: "red" }}>
              <CallEndIcon />
            </IconButton>
          </div>

          {/* Local Video */}
          <video
            ref={localVideoRef}
            autoPlay
            muted
            className={styles.localVideo}
          />

          {/* Remote Videos */}
          <div className={styles.videoGrid}>
            {videos.map((v) => (
              <video
                key={v.id}
                ref={(ref) => {
                  if (ref) ref.srcObject = v.stream;
                }}
                autoPlay
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
