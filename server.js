require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const highscoresRoutes = require("./routes/highscores");
const storeRoutes = require("./routes/store");

// Connect MongoDB on startup
const { connectMongo } = require("./db/mongo");
connectMongo();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use("/api/", limiter);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/highscores", highscoresRoutes);
app.use("/api/store", storeRoutes);

app.get("/api/health", (req, res) => res.json({
  status: "ok",
  server: process.env.SERVER_NAME,
  world: process.env.SERVER_WORLD_ID
}));

app.listen(PORT, () => {
  console.log("");
  console.log("  " + (process.env.SERVER_NAME || "RSPS") + " Website API");
  console.log("  Running on port " + PORT);
  console.log("  Game DB: " + process.env.GAME_DB_NAME);
  console.log("  Website DB: " + process.env.WEBSITE_DB_NAME);
  console.log("");
});