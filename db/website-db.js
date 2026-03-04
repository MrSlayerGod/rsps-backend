const mysql = require("mysql2/promise");
require("dotenv").config();

const websitePool = mysql.createPool({
    host: process.env.WEBSITE_DB_HOST || "localhost",
    port: parseInt(process.env.WEBSITE_DB_PORT) || 3306,
    user: process.env.WEBSITE_DB_USER || "root",
    password: process.env.WEBSITE_DB_PASSWORD || "root",
    database: process.env.WEBSITE_DB_NAME || "runevault_website",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
});

websitePool.getConnection()
    .then(conn => {
        console.log("✅ Connected to website database: " + process.env.WEBSITE_DB_NAME);
        conn.release();
    })
    .catch(err => {
        console.error("❌ Website database connection failed:", err.message);
        console.error("   Run: npm run setup");
    });

module.exports = websitePool;