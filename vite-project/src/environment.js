const isLocal = window.location.hostname === "192.168.1.8";

const server = isLocal
  ? "http://192.168.1.8:8002"
  : "https://syncora-95py.onrender.com";

export default server;