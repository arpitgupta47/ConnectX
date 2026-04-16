import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
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
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import styles from "../styles/videoComponent.module.css";
import server from "../environment";

const connections = {};
const peerConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VideoMeetComponent() {
  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoRef = useRef();

  const [video, setVideo] = useState(true);
  const [audio, setAudio] = useState(true);
  const [screen, setScreen] = useState(false);
  const [videos, setVideos] = useState([]);
  const [username, setUsername] = useState("");
  const [askUsername, setAskUsername] = useState(true);

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [newMsg, setNewMsg] = useState(0);

  // 🔥 GET MEDIA
  const getMedia = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    window.localStream = stream;
    localVideoRef.current.srcObject = stream;

    connectSocket();
  };

  // 🔥 SOCKET CONNECT
  const connectSocket = () => {
    socketRef.current = io(server);

    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;

      socketRef.current.emit("join-call", {
        path: window.location.href,
        name: username,
      });

      socketRef.current.on("signal", gotMessage);
      socketRef.current.on("chat-message", addMessage);

      socketRef.current.on("user-left", (id) => {
        setVideos((prev) => prev.filter((v) => v.id !== id));
      });

      socketRef.current.on("user-joined", (id, clients) => {
        clients.forEach((socketId) => {
          connections[socketId] = new RTCPeerConnection(peerConfig);

          connections[socketId].onicecandidate = (e) => {
            if (e.candidate) {
              socketRef.current.emit(
                "signal",
                socketId,
                JSON.stringify({ ice: e.candidate })
              );
            }
          };

          connections[socketId].ontrack = (e) => {
            setVideos((prev) => [
              ...prev.filter((v) => v.id !== socketId),
              { id: socketId, stream: e.streams[0] },
            ]);
          };

          window.localStream
            .getTracks()
            .forEach((track) =>
              connections[socketId].addTrack(track, window.localStream)
            );
        });
      });
    });
  };

  // 🔥 SIGNAL HANDLER
  const gotMessage = (fromId, message) => {
    const signal = JSON.parse(message);

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

  // 🔥 CAMERA TOGGLE
  const handleVideo = async () => {
    const track = window.localStream.getVideoTracks()[0];

    if (track.enabled) {
      track.enabled = false;
      setVideo(false);
    } else {
      track.enabled = true;
      setVideo(true);
    }
  };

  // 🔥 MIC TOGGLE
  const handleAudio = () => {
    const track = window.localStream.getAudioTracks()[0];

    track.enabled = !track.enabled;
    setAudio(track.enabled);
  };

  // 🔥 SCREEN SHARE
  const handleScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      const screenTrack = stream.getVideoTracks()[0];

      for (let id in connections) {
        const sender = connections[id]
          .getSenders()
          .find((s) => s.track.kind === "video");

        sender.replaceTrack(screenTrack);
      }

      screenTrack.onended = () => {
        window.location.reload();
      };

      setScreen(true);
    } catch (e) {
      console.log(e);
    }
  };

  // 🔥 CHAT
  const addMessage = (data, sender, id) => {
    setMessages((prev) => [...prev, { sender, data }]);
    if (id !== socketIdRef.current) setNewMsg((p) => p + 1);
  };

  const sendMessage = () => {
    socketRef.current.emit("chat-message", message, username);
    setMessage("");
  };

  // 🔥 CONNECT BUTTON
  const connect = () => {
    if (!username) return alert("Enter username");
    setAskUsername(false);
    getMedia();
  };

  return (
    <div>
      {askUsername ? (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
          <h2>Enter Lobby</h2>
          <TextField
            label="Username"
            onChange={(e) => setUsername(e.target.value)}
          />
          <br /><br />
          <Button variant="contained" onClick={connect}>
            Join
          </Button>
        </div>
      ) : (
        <div className={styles.meetVideoContainer}>
          {/* LOCAL VIDEO */}
          <video
            ref={localVideoRef}
            autoPlay
            muted
            className={styles.meetUserVideo}
          />

          {/* REMOTE USERS */}
          <div className={styles.conferenceView}>
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

          {/* CONTROLS */}
          <div className={styles.buttonContainers}>
            <IconButton onClick={handleVideo}>
              {video ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>

            <IconButton onClick={handleAudio}>
              {audio ? <MicIcon /> : <MicOffIcon />}
            </IconButton>

            {window.innerWidth > 768 && (
              <IconButton onClick={handleScreen}>
                {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
              </IconButton>
            )}

            <IconButton onClick={() => (window.location.href = "/")}>
              <CallEndIcon style={{ color: "red" }} />
            </IconButton>

            <Badge badgeContent={newMsg} color="error">
              <IconButton onClick={() => setShowChat(!showChat)}>
                <ChatIcon />
              </IconButton>
            </Badge>
          </div>

          {/* CHAT */}
          {showChat && (
            <div className={styles.chatRoom}>
              <div>
                {messages.map((m, i) => (
                  <div key={i}>
                    <b>{m.sender}</b>: {m.data}
                  </div>
                ))}
              </div>

              <TextField
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button onClick={sendMessage}>Send</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
