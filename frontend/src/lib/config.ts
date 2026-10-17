// Where the backend lives. For a different server, build with VITE_API_URL=https://your-api.example.com
export const API_BASE: string = import.meta.env.VITE_API_URL || "http://localhost:3000";
export const WS_URL: string = API_BASE.replace(/^http/, "ws") + "/ws";
