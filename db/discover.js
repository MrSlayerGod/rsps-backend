// ═══════════════════════════════════════════════════════
// DATABASE DISCOVERY TOOL
// Run this to see your RSPS database structure
// 
// Usage: npm run discover
// ═══════════════════════════════════════════════════════

require("dotenv").config();
const gamePool = require("./game-db");
const { connectMongo } = require("./mongo");

async function discoverMySQL() {
    console.log("\n══════════════════════════════════════");
    console.log("  MySQL Database: " + process.env.GAME_DB_NAME);
    console.log("══════════════════════════════════════\n");

    const conn = await gamePool.getConnection();

    try {
        // List all tables
        const [tables] = await conn.query("SHOW TABLES");
        const tableKey = Object.keys(tables[0])[0];

        console.log("📋 Tables found:");
        console.log("─────────────────────────────────");

        for (const row of tables) {
            const tableName = row[tableKey];
            const [countRows] = await conn.query("SELECT COUNT(*) as count FROM `" + tableName + "`");
            const count = countRows[0].count;

            console.log("  ► " + tableName + " (" + count + " rows)");

            // Show columns
            const [columns] = await conn.query("SHOW COLUMNS FROM `" + tableName + "`");
            const colNames = columns.map(c => c.Field);
            console.log("    Columns: " + colNames.join(", "));

            // Show sample row
            if (count > 0) {
                const [sample] = await conn.query("SELECT * FROM `" + tableName + "` LIMIT 1");
                console.log("    Sample:  " + JSON.stringify(sample[0], null, 0).substring(0, 200));
            }
            console.log("");
        }

        // Look for player-related tables
        console.log("\n🔍 Searching for player/skill tables...");
        console.log("─────────────────────────────────");

        const playerTables = tables
            .map(r => r[tableKey])
            .filter(t => /player|character|user|account|member|skill|highscore|experience|stat/i.test(t));

        if (playerTables.length > 0) {
            console.log("  Likely player tables: " + playerTables.join(", "));

            for (const pt of playerTables) {
                const [columns] = await conn.query("SHOW COLUMNS FROM `" + pt + "`");
                console.log("\n  📊 " + pt + " columns:");
                columns.forEach(c => {
                    console.log("     " + c.Field + " (" + c.Type + ")" + (c.Key === "PRI" ? " [PRIMARY KEY]" : ""));
                });
            }
        } else {
            console.log("  ⚠️  No obvious player tables found in MySQL");
            console.log("     Your server might store player data in MongoDB or files");
        }

    } catch (err) {
        console.error("MySQL discovery failed:", err.message);
    } finally {
        conn.release();
    }
}

async function discoverMongo() {
    console.log("\n══════════════════════════════════════");
    console.log("  MongoDB Database: " + process.env.MONGO_DB);
    console.log("══════════════════════════════════════\n");

    try {
        const db = await connectMongo();
        if (!db) {
            console.log("  ⚠️  Could not connect to MongoDB");
            return;
        }

        const collections = await db.listCollections().toArray();

        console.log("📋 Collections found:");
        console.log("─────────────────────────────────");

        for (const col of collections) {
            const collection = db.collection(col.name);
            const count = await collection.countDocuments();
            console.log("  ► " + col.name + " (" + count + " documents)");

            // Show sample document
            if (count > 0) {
                const sample = await collection.findOne();
                const keys = Object.keys(sample);
                console.log("    Fields: " + keys.join(", "));

                // Check for player-like data
                if (keys.some(k => /username|player|skill|level|xp|experience|attack|strength/i.test(k))) {
                    console.log("    ⭐ This looks like it contains player data!");
                    console.log("    Sample: " + JSON.stringify(sample, null, 0).substring(0, 300));
                }
            }
            console.log("");
        }

        // Look specifically for player data
        console.log("\n🔍 Searching for player data in MongoDB...");
        console.log("─────────────────────────────────");

        const playerCollections = collections
            .map(c => c.name)
            .filter(n => /player|character|user|account|member|profile|save/i.test(n));

        if (playerCollections.length > 0) {
            for (const pc of playerCollections) {
                const collection = db.collection(pc);
                const sample = await collection.findOne();
                console.log("\n  📊 " + pc + " structure:");
                printStructure(sample, "     ");
            }
        }

        // Also check if skills are embedded or separate
        for (const col of collections) {
            const collection = db.collection(col.name);
            const sample = await collection.findOne();
            if (sample && (sample.skills || sample.skill_levels || sample.stats || sample.levels)) {
                console.log("\n  ⭐ Found skills data in collection: " + col.name);
                const skillData = sample.skills || sample.skill_levels || sample.stats || sample.levels;
                console.log("     " + JSON.stringify(skillData).substring(0, 400));
            }
        }

    } catch (err) {
        console.error("MongoDB discovery failed:", err.message);
    }
}

function printStructure(obj, prefix, depth) {
    if (!obj || (depth || 0) > 2) return;
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        const type = Array.isArray(val) ? "Array[" + val.length + "]" : typeof val;
        if (type === "object" && val !== null && !Array.isArray(val)) {
            console.log(prefix + key + ": {Object}");
            printStructure(val, prefix + "  ", (depth || 0) + 1);
        } else {
            const display = type === "string" ? '"' + String(val).substring(0, 50) + '"' : String(val).substring(0, 50);
            console.log(prefix + key + ": " + type + " = " + display);
        }
    }
}

async function main() {
    console.log("🔎 RSPS Database Discovery Tool");
    console.log("================================\n");
    console.log("This tool scans your databases to find");
    console.log("where player data and skills are stored.\n");

    await discoverMySQL();
    await discoverMongo();

    console.log("\n══════════════════════════════════════");
    console.log("  WHAT TO DO NEXT");
    console.log("══════════════════════════════════════");
    console.log("");
    console.log("  1. Look at the output above");
    console.log("  2. Find which table/collection has player data");
    console.log("  3. Find which table/collection has skill data");
    console.log("  4. Edit: backend/db/game-adapter.js");
    console.log("     Set the correct table/collection names");
    console.log("     Set the correct column/field names");
    console.log("  5. Run: npm run dev");
    console.log("");

    process.exit(0);
}

main().catch(console.error);