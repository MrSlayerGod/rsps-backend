const express = require("express");
const gameDB = require("../db/game-adapter");
const router = express.Router();

const VALID_SKILLS = [
  "Overall", "Attack", "Defence", "Strength", "Hitpoints", "Ranged", "Prayer", "Magic",
  "Cooking", "Woodcutting", "Fletching", "Fishing", "Firemaking", "Crafting",
  "Smithing", "Mining", "Herblore", "Agility", "Thieving", "Slayer", "Farming",
  "Runecrafting", "Hunter", "Construction"
];

router.get("/", async (req, res) => {
  try {
    const { skill = "Overall", page = 1, limit = 25, search, xp_mode, game_mode } = req.query;
    if (!VALID_SKILLS.includes(skill)) return res.status(400).json({ error: "Invalid skill" });

    const result = await gameDB.getHighscores({
      skill, page: parseInt(page), limit: parseInt(limit),
      search: search || "", xpMode: xp_mode || "all", gameMode: game_mode || "all"
    });

    res.json({
      skill, page: parseInt(page), limit: parseInt(limit),
      total: result.total, totalPages: Math.ceil(result.total / parseInt(limit)),
      filters: { xp_mode: xp_mode || "all", game_mode: game_mode || "all" },
      data: result.data
    });
  } catch (err) {
    console.error("Highscores error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/player/:username", async (req, res) => {
  try {
    const player = await gameDB.getPlayerData(req.params.username);
    if (!player) return res.status(404).json({ error: "Player not found" });
    res.json(player);
  } catch (err) {
    console.error("Player lookup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const stats = await gameDB.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;