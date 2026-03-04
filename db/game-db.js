const mysql = require("mysql2/promise");
require("dotenv").config();

const gamePool = mysql.createPool({
    host: process.env.GAME_DB_HOST || "localhost",
    port: parseInt(process.env.GAME_DB_PORT) || 3306,
    user: process.env.GAME_DB_USER || "root",
    password: process.env.GAME_DB_PASSWORD || "root",
    database: process.env.GAME_DB_NAME || "reason",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
});

gamePool.getConnection()
    .then(conn => {
        console.log("✅ Connected to game database: " + process.env.GAME_DB_NAME);
        conn.release();
    })
    .catch(err => {
        console.error("❌ Game database connection failed:", err.message);
        console.error("   Check GAME_DB settings in .env");
    });

module.exports = gamePool;