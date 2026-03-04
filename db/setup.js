const mysql = require("mysql2/promise");
require("dotenv").config();

async function setup() {
    console.log("Setting up website database...\n");

    // Connect directly to the specified database
    const conn = await mysql.createConnection({
        host: process.env.WEBSITE_DB_HOST || "localhost",
        port: parseInt(process.env.WEBSITE_DB_PORT) || 3306,
        user: process.env.WEBSITE_DB_USER || "root",
        password: process.env.WEBSITE_DB_PASSWORD || "",
        database: process.env.WEBSITE_DB_NAME || "railway",
    });

    const dbName = process.env.WEBSITE_DB_NAME || "railway";

    try {
        console.log("✅ Connected to database: " + dbName);

        // Website users (separate from game accounts)
        await conn.query(`
      CREATE TABLE IF NOT EXISTS website_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(12) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(12),
        donor_rank VARCHAR(20) DEFAULT 'None',
        donor_total DECIMAL(10,2) DEFAULT 0,
        email_verified TINYINT(1) DEFAULT 0,
        email_token VARCHAR(64),
        email_token_expires DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Add email verification columns to existing tables
        for (const col of [
          "ALTER TABLE website_users ADD COLUMN email_verified TINYINT(1) DEFAULT 0",
          "ALTER TABLE website_users ADD COLUMN email_token VARCHAR(64)",
          "ALTER TABLE website_users ADD COLUMN email_token_expires DATETIME"
        ]) { try { await conn.query(col); } catch (e) { /* already exists */ } }
        console.log("✅ Table: website_users");

        // Store items
        await conn.query(`
      CREATE TABLE IF NOT EXISTS store_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(50) NOT NULL,
        image_url VARCHAR(255) DEFAULT '',
        in_stock TINYINT DEFAULT 1,
        featured TINYINT DEFAULT 0,
        game_item_id INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Add game_item_id to existing tables that predate this column
        try {
            await conn.query("ALTER TABLE store_items ADD COLUMN game_item_id INT DEFAULT 0");
        } catch (e) { /* column already exists */ }
        console.log("✅ Table: store_items");

        // Orders
        await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        username VARCHAR(12) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        payment_method VARCHAR(20) DEFAULT 'paypal',
        payment_id VARCHAR(100),
        claimed TINYINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES website_users(id)
      )
    `);
        console.log("✅ Table: orders");

        // Order items
        await conn.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        item_id INT NOT NULL,
        quantity INT DEFAULT 1,
        price DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES store_items(id)
      )
    `);
        console.log("✅ Table: order_items");

        // Pending deliveries — game server reads this
        await conn.query(`
      CREATE TABLE IF NOT EXISTS pending_deliveries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(12) NOT NULL,
        item_name VARCHAR(100) NOT NULL,
        item_id INT NOT NULL,
        quantity INT DEFAULT 1,
        order_id INT NOT NULL,
        delivered TINYINT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pending_user (username, delivered)
      )
    `);
        console.log("✅ Table: pending_deliveries");

        console.log("\n🎉 Website database setup complete!");
        console.log("\nNext steps:");
        console.log("  1. npm run discover   (find your game tables)");
        console.log("  2. Edit db/game-adapter.js (set table names)");
        console.log("  3. npm run seed       (add store items)");
        console.log("  4. npm run dev        (start server)");

    } catch (err) {
        console.error("❌ Setup failed:", err.message);
    } finally {
        await conn.end();
        process.exit(0);
    }
}

setup();