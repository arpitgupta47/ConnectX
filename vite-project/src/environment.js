const server = import.meta.env.PROD
  ? "https://syncora-95py.onrender.com"
  : "http://localhost:8002";

export default server;
