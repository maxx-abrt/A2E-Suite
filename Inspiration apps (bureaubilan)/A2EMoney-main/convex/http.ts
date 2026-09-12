import { httpRouter } from "convex/server";

// Auth is handled by WorkOS AuthKit at the Next.js layer (no Convex auth HTTP
// routes needed). Kept for future custom HTTP actions (webhooks, etc.).
const http = httpRouter();

export default http;
