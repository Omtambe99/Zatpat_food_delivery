import express from "express";
import dotenv from "dotenv";
dotenv.config();
import connectDb from "./config/db.js";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes.js";
import cors from "cors";
import userRouter from "./routes/user.routes.js";

import itemRouter from "./routes/item.routes.js";
import shopRouter from "./routes/shop.routes.js";
import orderRouter from "./routes/order.routes.js";
import http from "http";
import { Server } from "socket.io";
import { socketHandler } from "./socket.js";
import fs from "fs";

// Ensure public directory exists for multer temp uploads
if (!fs.existsSync("./public")) fs.mkdirSync("./public");

const app = express();
const server = http.createServer(app);

// Required on Render/Heroku so secure cookies work behind the HTTPS proxy
app.set("trust proxy", 1);

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  // Vercel production + preview deployments
  if (/^https:\/\/[\w.-]+\.vercel\.app$/.test(origin)) return true;
  return false;
};

const corsOrigin = (origin, callback) => {
  if (isOriginAllowed(origin)) {
    callback(null, origin || allowedOrigins[0]);
  } else {
    callback(new Error("Not allowed by CORS"));
  }
};

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    credentials: true,
    methods: ["POST", "GET"],
  },
});

app.set("io", io);

const port = process.env.PORT || 5000;
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/shop", shopRouter);
app.use("/api/item", itemRouter);
app.use("/api/order", orderRouter);

socketHandler(io);
server.listen(port, () => {
  connectDb();
  console.log(`server started at ${port}`);
});
