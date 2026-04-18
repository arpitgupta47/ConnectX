import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { IconButton } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import CallEndIcon from "@mui/icons-material/CallEnd";

const server_url = "http://localhost:5000"; // change if needed

var connections = {};

const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VideoMeetComponent() {
  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoref = useRef();

  const [video, setVideo] = useState(true);
  const [audio, setAudio] = useState(true);
  const [videos, setVideos] = useState([]);

  // 🔥 INIT MEDIA (ONLY ONCE)
  useEffect(() => {
    startMedia();
  }, []);

  const startMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      window.localStream = stream;

      if (localVideoref.current) {
        localVideoref.current.srcObject = stream;
        localVideoref.current.muted = true;
        localVideoref.current.play().catch(() => {});
      }

      connectToSocketServer();
    } catch (err) {
      console.log("Media error:", err);
    }
  };

  // 🎥 CAMERA TOGGLE
  const handleVideo = () => {
    const track = window.localStream?.getVideoTracks()[0];
    if (!track) return;

    track.enabled = !track.enabled;
    setVideo(track.enabled);
  };

  // 🎤 MIC TOGGLE
  const handleAudio = () => {
    const track = window.localStream?.getAudioTracks()[0];
    if (!track) return;

    track.enabled = !track.enabled;
    setAudio(track.enabled);
  };

  // ❌ END CALL
  const handleEndCall = () => {
    window.localStream?.getTracks().forEach((t) => t.stop());
    window.location.reload();
  };

  // 🔗 SOCKET + WEBRTC
  const connectToSocketServer = () => {
    socketRef.current = io.connect(server_url);

    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;
      socketRef.current.emit("join-call", window.location.href);

      socketRef.current.on("user-joined", (id, clients) => {
        clients.forEach((socketListId) => {
          connections[socketListId] = new RTCPeerConnection(
            peerConfigConnections
          );

          connections[socketListId].onicecandidate = (event) => {
            if (event.candidate) {
              socketRef.current.emit(
                "signal",
                socketListId,
                JSON.stringify({ ice: event.candidate })
              );
            }
          };

          connections[socketListId].ontrack = (event) => {
            setVideos((prev) => {
              const exists = prev.find(
                (v) => v.socketId === socketListId
              );
              if (exists) return prev;

              return [
                ...prev,
                {
                  socketId: socketListId,
                  stream: event.streams[0],
                },
              ];
            });
          };

          // 🔥 ADD LOCAL STREAM
          window.localStream
            .getTracks()
            .forEach((track) =>
              connections[socketListId].addTrack(
                track,
                window.localStream
              )
            );
        });
      });

      socketRef.current.on("signal", (fromId, message) => {
        const signal = JSON.parse(message);

        if (signal.sdp) {
          connections[fromId]
            .setRemoteDescription(new RTCSessionDescription(signal.sdp))
            .then(() => {
              if (signal.sdp.type === "offer") {
                connections[fromId]
                  .createAnswer()
                  .then((desc) => {
                    connections[fromId]
                      .setLocalDescription(desc)
                      .then(() => {
                        socketRef.current.emit(
                          "signal",
                          fromId,
                          JSON.stringify({
                            sdp: connections[fromId].localDescription,
                          })
                        );
                      });
                  });
              }
            });
        }

        if (signal.ice) {
          connections[fromId].addIceCandidate(
            new RTCIceCandidate(signal.ice)
          );
        }
      });
    });
  };

  return (
    <div>
      {/* 🎥 LOCAL VIDEO */}
      <video
        ref={localVideoref}
        autoPlay
        muted
        playsInline
        style={{ width: "300px", background: "black" }}
      />

      {/* 👥 REMOTE VIDEOS */}
      <div>
        {videos.map((v) => (
          <video
            key={v.socketId}
            ref={(ref) => {
              if (ref) ref.srcObject = v.stream;
            }}
            autoPlay
            playsInline
            style={{ width: "300px" }}
          />
        ))}
      </div>

      {/* 🎛 CONTROLS */}
      <div>
        <IconButton onClick={handleVideo}>
          {video ? <VideocamIcon /> : <VideocamOffIcon />}
        </IconButton>

        <IconButton onClick={handleAudio}>
          {audio ? <MicIcon /> : <MicOffIcon />}
        </IconButton>

        <IconButton onClick={handleEndCall}>
          <CallEndIcon />
        </IconButton>
      </div>
    </div>
  );
}
