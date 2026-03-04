// ═══════════════════════════════════════════════════════════════
//  GAME DATABASE ADAPTER FOR GALLIFREY
//
//  This reads player/skill data from your RSPS database.
//
//  HOW TO CONFIGURE:
//  1. Run: npm run discover
//  2. Look at the output — find your player/skill tables
//  3. Edit the CONFIG section below to match
//
//  Your server config shows:
//    game_db: MySQL "reason" database
//    mongo:   MongoDB on 127.0.0.1:27017
//
//  Set DATA_SOURCE to "mysql" or "mongo" depending on
//  where your server stores player data.
// ═══════════════════════════════════════════════════════════════

require("dotenv").config();

// ─────────────────────────────────────────────
//  ██████  CONFIGURE THIS SECTION  ██████
// ─────────────────────────────────────────────

// Where does your game server store player data?
// Options: "mysql", "mongo", "both"
//   "mysql" = players/skills in MySQL (reason database)
//   "mongo" = players/skills in MongoDB
//   "both"  = players in MongoDB, skills in MongoDB (embedded)
const DATA_SOURCE = "mysql";

// ─── MySQL Table/Column Names ───
// Edit these to match YOUR game database tables
// Run 'npm run discover' to see your actual table names
const MYSQL_CONFIG = {
    // Player table
    playersTable: "players",        // could be: characters, accounts, members
    colUsername: "username",       // could be: name, player_name, display_name
    colRights: "rights",         // could be: rank, privilege, authority
    colOnline: "online",         // could be: is_online, logged_in (set null if none)
    colXpMode: "xp_mode",        // could be: exp_mode, xp_rate (set null if none)
    colGameMode: "game_mode",      // could be: iron_mode, mode (set null if none)
    colCreatedAt: "created_at",     // could be: join_date, register_date (set null if none)
    colId: "id",             // primary key column

    // ─── How are skills stored? ───
    // Option "separate" = skills in a separate table
    // Option "columns"  = skills as columns in player table (attacklvl, attackxp, etc.)
    // Option "json"     = skills stored as JSON blob in player table
    skillStorage: "separate",

    // If skillStorage = "separate":
    skillsTable: "player_skills",  // could be: skills, highscores, experience
    skillColPlayerId: "player_id",      // FK to players table
    skillColName: "skill_name",     // could be: skill_id (number), name
    skillColLevel: "level",          // could be: lvl, current_level
    skillColXp: "xp",            // could be: experience, exp, total_xp
    skillUsesIds: false,            // true if skill_name is a number (0-22)

    // If skillStorage = "columns":
    // Map skill names to column names in your players table
    skillColumns: {
        "Attack": { level: "attacklvl", xp: "attackxp" },
        "Defence": { level: "defencelwl", xp: "defencexp" },
        "Strength": { level: "strengthlvl", xp: "strengthxp" },
        "Hitpoints": { level: "hitpointslvl", xp: "hitpointsxp" },
        "Ranged": { level: "rangedlvl", xp: "rangedxp" },
        "Prayer": { level: "prayerlvl", xp: "prayerxp" },
        "Magic": { level: "magiclvl", xp: "magicxp" },
        "Cooking": { level: "cookinglvl", xp: "cookingxp" },
        "Woodcutting": { level: "woodcuttinglvl", xp: "woodcuttingxp" },
        "Fletching": { level: "fletchinglvl", xp: "fletchingxp" },
        "Fishing": { level: "fishinglvl", xp: "fishingxp" },
        "Firemaking": { level: "firemakinglvl", xp: "firemakingxp" },
        "Crafting": { level: "craftinglvl", xp: "craftingxp" },
        "Smithing": { level: "smithinglvl", xp: "smithingxp" },
        "Mining": { level: "mininglvl", xp: "miningxp" },
        "Herblore": { level: "herblorelvl", xp: "herblorexp" },
        "Agility": { level: "agilitylvl", xp: "agilityxp" },
        "Thieving": { level: "thievinglvl", xp: "thievingxp" },
        "Slayer": { level: "slayerlvl", xp: "slayerxp" },
        "Farming": { level: "farminglvl", xp: "farmingxp" },
        "Runecrafting": { level: "runecraftinglvl", xp: "runecraftingxp" },
        "Hunter": { level: "hunterlvl", xp: "hunterxp" },
        "Construction": { level: "constructionlvl", xp: "constructionxp" },
    },

    // If skillStorage = "json":
    skillJsonColumn: "skills_data",  // column containing JSON skills
};

// ─── MongoDB Collection/Field Names ───
const MONGO_CONFIG = {
    // Player collection
    playersCollection: "players",       // could be: characters, accounts, profiles
    fieldUsername: "username",      // could be: name, displayName, _id
    fieldRights: "rights",
    fieldOnline: "online",
    fieldXpMode: "xpMode",        // could be: xp_mode, expRate
    fieldGameMode: "gameMode",      // could be: game_mode, ironMode
    fieldCreatedAt: "createdAt",

    // How skills are stored in MongoDB
    // Option "embedded" = skills inside player document { skills: { Attack: { level, xp }, ... } }
    // Option "array"    = skills as array in player document { skills: [{ name, level, xp }] }
    // Option "separate" = separate collection for skills
    skillStorage: "embedded",

    // If "embedded" — path to skills object in player document
    skillsField: "skills",
    // Expected format: { Attack: { level: 99, xp: 13034431 }, ... }
    // OR:              { attack: { level: 99, experience: 13034431 }, ... }
    skillLevelField: "level",          // field name inside skill object
    skillXpField: "xp",            // could be: experience, exp

    // If "separate" — separate collection
    skillsCollection: "player_skills",
    skillPlayerIdField: "playerId",
};

// ─────────────────────────────────────────────
//  END OF CONFIG — code below reads from your DB
// ─────────────────────────────────────────────

const SKILLS = [
    "Attack", "Defence", "Strength", "Hitpoints", "Ranged", "Prayer", "Magic",
    "Cooking", "Woodcutting", "Fletching", "Fishing", "Firemaking", "Crafting",
    "Smithing", "Mining", "Herblore", "Agility", "Thieving", "Slayer", "Farming",
    "Runecrafting", "Hunter", "Construction"
];

const SKILL_IDS = {
    0: "Attack", 1: "Defence", 2: "Strength", 3: "Hitpoints", 4: "Ranged",
    5: "Prayer", 6: "Magic", 7: "Cooking", 8: "Woodcutting", 9: "Fletching",
    10: "Fishing", 11: "Firemaking", 12: "Crafting", 13: "Smithing", 14: "Mining",
    15: "Herblore", 16: "Agility", 17: "Thieving", 18: "Slayer", 19: "Farming",
    20: "Runecrafting", 21: "Hunter", 22: "Construction"
};

const VALID_XP_MODES = ["100x", "25x", "10x", "3x"];
const VALID_GAME_MODES = [
    "Regular", "Normal Ironman", "Ultimate Ironman",
    "Hardcore Ironman", "Group Ironman", "Hardcore Group Ironman"
];

// ═══════════════════════════════════════
//  MySQL functions
// ═══════════════════════════════════════

async function mysqlGetHighscores({ skill, page, limit, offset, search, xpMode, gameMode }) {
    const gamePool = require("./game-db");
    const conn = await gamePool.getConnection();
    const c = MYSQL_CONFIG;

    try {
        let conditions = [];
        let params = [];

        if (search) {
            conditions.push("p." + c.colUsername + " LIKE ?");
            params.push("%" + search + "%");
        }
        if (xpMode && xpMode !== "all" && c.colXpMode) {
            conditions.push("p." + c.colXpMode + " = ?");
            params.push(xpMode);
        }
        if (gameMode && gameMode !== "all" && c.colGameMode) {
            conditions.push("p." + c.colGameMode + " = ?");
            params.push(gameMode);
        }

        const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

        if (c.skillStorage === "separate") {
            return await mysqlSeparateSkills(conn, c, { skill, limit, offset, where, params });
        } else if (c.skillStorage === "columns") {
            return await mysqlColumnSkills(conn, c, { skill, limit, offset, where, params });
        } else if (c.skillStorage === "json") {
            return await mysqlJsonSkills(conn, c, { skill, limit, offset, where, params });
        }

        return { total: 0, data: [] };
    } finally {
        conn.release();
    }
}

async function mysqlSeparateSkills(conn, c, { skill, limit, offset, where, params }) {
    if (skill === "Overall") {
        const [countRows] = await conn.query(
            "SELECT COUNT(DISTINCT p." + c.colId + ") as count FROM " + c.playersTable + " p " + where,
            params
        );
        const total = countRows[0]?.count || 0;

        const xpModeCol = c.colXpMode ? "p." + c.colXpMode + " as xp_mode," : "'100x' as xp_mode,";
        const gameModeCol = c.colGameMode ? "p." + c.colGameMode + " as game_mode," : "'Regular' as game_mode,";

        const [rows] = await conn.query(`
      SELECT p.${c.colUsername} as username, ${xpModeCol} ${gameModeCol}
             COALESCE(SUM(sk.${c.skillColLevel}), 0) as total_level,
             COALESCE(SUM(sk.${c.skillColXp}), 0) as total_xp
      FROM ${c.playersTable} p
      LEFT JOIN ${c.skillsTable} sk ON sk.${c.skillColPlayerId} = p.${c.colId}
      ${where}
      GROUP BY p.${c.colId}
      ORDER BY total_xp DESC, total_level DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

        return {
            total,
            data: rows.map((r, i) => ({
                rank: offset + i + 1, username: r.username, donor_rank: "None",
                xp_mode: r.xp_mode || "100x", game_mode: r.game_mode || "Regular",
                level: r.total_level, xp: Math.floor(r.total_xp)
            }))
        };
    } else {
        let skillFilter;
        let skillParams;
        if (c.skillUsesIds) {
            const skillId = Object.keys(SKILL_IDS).find(k => SKILL_IDS[k] === skill);
            skillFilter = "sk." + c.skillColName + " = ?";
            skillParams = [parseInt(skillId), ...params];
        } else {
            skillFilter = "sk." + c.skillColName + " = ?";
            skillParams = [skill, ...params];
        }

        const fullWhere = where
            ? where + " AND " + skillFilter
            : "WHERE " + skillFilter;

        // Reorder params: skill filter first, then user filters
        const finalCountParams = c.skillUsesIds
            ? [parseInt(Object.keys(SKILL_IDS).find(k => SKILL_IDS[k] === skill)), ...params]
            : [skill, ...params];

        const [countRows] = await conn.query(
            "SELECT COUNT(*) as count FROM " + c.skillsTable + " sk JOIN " + c.playersTable + " p ON p." + c.colId + " = sk." + c.skillColPlayerId + " " + fullWhere,
            finalCountParams
        );
        const total = countRows[0]?.count || 0;

        const xpModeCol = c.colXpMode ? "p." + c.colXpMode + " as xp_mode," : "'100x' as xp_mode,";
        const gameModeCol = c.colGameMode ? "p." + c.colGameMode + " as game_mode," : "'Regular' as game_mode,";

        const [rows] = await conn.query(`
      SELECT p.${c.colUsername} as username, ${xpModeCol} ${gameModeCol}
             sk.${c.skillColLevel} as level, sk.${c.skillColXp} as xp
      FROM ${c.skillsTable} sk
      JOIN ${c.playersTable} p ON p.${c.colId} = sk.${c.skillColPlayerId}
      ${fullWhere}
      ORDER BY sk.${c.skillColXp} DESC, sk.${c.skillColLevel} DESC
      LIMIT ? OFFSET ?
    `, [...finalCountParams, limit, offset]);

        return {
            total,
            data: rows.map((r, i) => ({
                rank: offset + i + 1, username: r.username, donor_rank: "None",
                xp_mode: r.xp_mode || "100x", game_mode: r.game_mode || "Regular",
                level: r.level, xp: Math.floor(r.xp)
            }))
        };
    }
}

async function mysqlColumnSkills(conn, c, { skill, limit, offset, where, params }) {
    const [countRows] = await conn.query(
        "SELECT COUNT(*) as count FROM " + c.playersTable + " p " + where, params
    );
    const total = countRows[0]?.count || 0;

    const xpModeCol = c.colXpMode ? "p." + c.colXpMode + " as xp_mode," : "'100x' as xp_mode,";
    const gameModeCol = c.colGameMode ? "p." + c.colGameMode + " as game_mode," : "'Regular' as game_mode,";

    if (skill === "Overall") {
        const levelSum = Object.values(c.skillColumns).map(s => "COALESCE(p." + s.level + ", 1)").join(" + ");
        const xpSum = Object.values(c.skillColumns).map(s => "COALESCE(p." + s.xp + ", 0)").join(" + ");

        const [rows] = await conn.query(`
      SELECT p.${c.colUsername} as username, ${xpModeCol} ${gameModeCol}
             (${levelSum}) as total_level, (${xpSum}) as total_xp
      FROM ${c.playersTable} p ${where}
      ORDER BY total_xp DESC LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

        return {
            total,
            data: rows.map((r, i) => ({
                rank: offset + i + 1, username: r.username, donor_rank: "None",
                xp_mode: r.xp_mode || "100x", game_mode: r.game_mode || "Regular",
                level: r.total_level, xp: Math.floor(r.total_xp)
            }))
        };
    } else {
        const col = c.skillColumns[skill];
        if (!col) return { total: 0, data: [] };

        const [rows] = await conn.query(`
      SELECT p.${c.colUsername} as username, ${xpModeCol} ${gameModeCol}
             COALESCE(p.${col.level}, 1) as level, COALESCE(p.${col.xp}, 0) as xp
      FROM ${c.playersTable} p ${where}
      ORDER BY xp DESC, level DESC LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

        return {
            total,
            data: rows.map((r, i) => ({
                rank: offset + i + 1, username: r.username, donor_rank: "None",
                xp_mode: r.xp_mode || "100x", game_mode: r.game_mode || "Regular",
                level: r.level, xp: Math.floor(r.xp)
            }))
        };
    }
}

async function mysqlJsonSkills(conn, c, { skill, limit, offset, where, params }) {
    // JSON skills stored in a column — extract with JSON_EXTRACT
    const [countRows] = await conn.query(
        "SELECT COUNT(*) as count FROM " + c.playersTable + " p " + where, params
    );
    const total = countRows[0]?.count || 0;

    const [rows] = await conn.query(
        "SELECT p.* FROM " + c.playersTable + " p " + where + " LIMIT ? OFFSET ?",
        [...params, limit, offset]
    );

    const results = rows.map(r => {
        let skills = {};
        try { skills = JSON.parse(r[c.skillJsonColumn]); } catch (e) { }

        if (skill === "Overall") {
            let totalLevel = 0, totalXp = 0;
            for (const s of SKILLS) {
                const sk = skills[s] || skills[s.toLowerCase()] || {};
                totalLevel += sk.level || sk.lvl || 1;
                totalXp += sk.xp || sk.experience || sk.exp || 0;
            }
            return { username: r[c.colUsername], xp_mode: c.colXpMode ? r[c.colXpMode] : "100x", game_mode: c.colGameMode ? r[c.colGameMode] : "Regular", level: totalLevel, xp: totalXp };
        } else {
            const sk = skills[skill] || skills[skill.toLowerCase()] || {};
            return { username: r[c.colUsername], xp_mode: c.colXpMode ? r[c.colXpMode] : "100x", game_mode: c.colGameMode ? r[c.colGameMode] : "Regular", level: sk.level || sk.lvl || 1, xp: sk.xp || sk.experience || sk.exp || 0 };
        }
    });

    results.sort((a, b) => b.xp - a.xp);

    return {
        total,
        data: results.map((r, i) => ({
            rank: offset + i + 1, username: r.username, donor_rank: "None",
            xp_mode: r.xp_mode, game_mode: r.game_mode,
            level: r.level, xp: Math.floor(r.xp)
        }))
    };
}

// ═══════════════════════════════════════
//  MongoDB functions
// ═══════════════════════════════════════

async function mongoGetHighscores({ skill, page, limit, offset, search, xpMode, gameMode }) {
    const { getMongoDB } = require("./mongo");
    const db = await getMongoDB();
    if (!db) return { total: 0, data: [] };

    const mc = MONGO_CONFIG;
    const collection = db.collection(mc.playersCollection);

    // Build filter
    const filter = {};
    if (search) filter[mc.fieldUsername] = { $regex: search, $options: "i" };
    if (xpMode && xpMode !== "all" && mc.fieldXpMode) filter[mc.fieldXpMode] = xpMode;
    if (gameMode && gameMode !== "all" && mc.fieldGameMode) filter[mc.fieldGameMode] = gameMode;

    const total = await collection.countDocuments(filter);

    if (mc.skillStorage === "embedded") {
        return await mongoEmbeddedSkills(collection, mc, { skill, limit, offset, filter });
    } else if (mc.skillStorage === "array") {
        return await mongoArraySkills(collection, mc, { skill, limit, offset, filter });
    }

    return { total: 0, data: [] };
}

async function mongoEmbeddedSkills(collection, mc, { skill, limit, offset, filter }) {
    const total = await collection.countDocuments(filter);

    if (skill === "Overall") {
        // Sum all skills
        const pipeline = [
            { $match: filter },
            {
                $addFields: {
                    total_level: {
                        $reduce: {
                            input: { $objectToArray: "$" + mc.skillsField },
                            initialValue: 0,
                            in: { $add: ["$$value", { $ifNull: ["$$this.v." + mc.skillLevelField, 1] }] }
                        }
                    },
                    total_xp: {
                        $reduce: {
                            input: { $objectToArray: "$" + mc.skillsField },
                            initialValue: 0,
                            in: { $add: ["$$value", { $ifNull: ["$$this.v." + mc.skillXpField, 0] }] }
                        }
                    }
                }
            },
            { $sort: { total_xp: -1, total_level: -1 } },
            { $skip: offset },
            { $limit: limit }
        ];

        const rows = await collection.aggregate(pipeline).toArray();
        return {
            total,
            data: rows.map((r, i) => ({
                rank: offset + i + 1,
                username: r[mc.fieldUsername],
                donor_rank: "None",
                xp_mode: mc.fieldXpMode ? r[mc.fieldXpMode] || "100x" : "100x",
                game_mode: mc.fieldGameMode ? r[mc.fieldGameMode] || "Regular" : "Regular",
                level: r.total_level || 0,
                xp: Math.floor(r.total_xp || 0)
            }))
        };
    } else {
        const skillPath = mc.skillsField + "." + skill;
        const levelPath = skillPath + "." + mc.skillLevelField;
        const xpPath = skillPath + "." + mc.skillXpField;

        const rows = await collection
            .find(filter)
            .sort({ [xpPath]: -1, [levelPath]: -1 })
            .skip(offset)
            .limit(limit)
            .toArray();

        return {
            total,
            data: rows.map((r, i) => {
                const sk = r[mc.skillsField]?.[skill] || {};
                return {
                    rank: offset + i + 1,
                    username: r[mc.fieldUsername],
                    donor_rank: "None",
                    xp_mode: mc.fieldXpMode ? r[mc.fieldXpMode] || "100x" : "100x",
                    game_mode: mc.fieldGameMode ? r[mc.fieldGameMode] || "Regular" : "Regular",
                    level: sk[mc.skillLevelField] || 1,
                    xp: Math.floor(sk[mc.skillXpField] || 0)
                };
            })
        };
    }
}

async function mongoArraySkills(collection, mc, { skill, limit, offset, filter }) {
    const total = await collection.countDocuments(filter);

    const rows = await collection.find(filter).toArray();

    const results = rows.map(r => {
        const skills = r[mc.skillsField] || [];

        if (skill === "Overall") {
            let totalLevel = 0, totalXp = 0;
            for (const s of skills) {
                totalLevel += s[mc.skillLevelField] || s.level || 1;
                totalXp += s[mc.skillXpField] || s.xp || 0;
            }
            return { username: r[mc.fieldUsername], xp_mode: r[mc.fieldXpMode] || "100x", game_mode: r[mc.fieldGameMode] || "Regular", level: totalLevel, xp: totalXp };
        } else {
            const sk = skills.find(s => s.name === skill || s.skill_name === skill) || {};
            return { username: r[mc.fieldUsername], xp_mode: r[mc.fieldXpMode] || "100x", game_mode: r[mc.fieldGameMode] || "Regular", level: sk[mc.skillLevelField] || sk.level || 1, xp: sk[mc.skillXpField] || sk.xp || 0 };
        }
    });

    results.sort((a, b) => b.xp - a.xp);
    const paged = results.slice(offset, offset + limit);

    return {
        total,
        data: paged.map((r, i) => ({
            rank: offset + i + 1, username: r.username, donor_rank: "None",
            xp_mode: r.xp_mode, game_mode: r.game_mode,
            level: r.level, xp: Math.floor(r.xp)
        }))
    };
}

// ═══════════════════════════════════════
//  Player Lookup
// ═══════════════════════════════════════

async function getPlayerData(username) {
    if (DATA_SOURCE === "mongo" || DATA_SOURCE === "both") {
        return await mongoGetPlayer(username);
    }
    return await mysqlGetPlayer(username);
}

async function mysqlGetPlayer(username) {
    const gamePool = require("./game-db");
    const conn = await gamePool.getConnection();
    const c = MYSQL_CONFIG;

    try {
        const [players] = await conn.query(
            "SELECT * FROM " + c.playersTable + " WHERE " + c.colUsername + " = ?", [username]
        );
        if (players.length === 0) return null;
        const player = players[0];

        let skills = [];

        if (c.skillStorage === "separate") {
            const [skillRows] = await conn.query(
                "SELECT " + c.skillColName + " as skill_name, " + c.skillColLevel + " as level, " + c.skillColXp + " as xp FROM " + c.skillsTable + " WHERE " + c.skillColPlayerId + " = ?",
                [player[c.colId]]
            );
            skills = skillRows.map(sk => ({
                skill_name: c.skillUsesIds ? (SKILL_IDS[sk.skill_name] || "Unknown") : sk.skill_name,
                level: sk.level, xp: sk.xp
            }));
        } else if (c.skillStorage === "columns") {
            skills = SKILLS.map(name => {
                const col = c.skillColumns[name];
                return { skill_name: name, level: player[col.level] || 1, xp: player[col.xp] || 0 };
            });
        } else if (c.skillStorage === "json") {
            let parsed = {};
            try { parsed = JSON.parse(player[c.skillJsonColumn]); } catch (e) { }
            skills = SKILLS.map(name => {
                const sk = parsed[name] || parsed[name.toLowerCase()] || {};
                return { skill_name: name, level: sk.level || sk.lvl || 1, xp: sk.xp || sk.experience || 0 };
            });
        }

        const totalLevel = skills.reduce((s, sk) => s + sk.level, 0);
        const totalXp = skills.reduce((s, sk) => s + sk.xp, 0);

        return {
            username: player[c.colUsername],
            donor_rank: "None",
            xp_mode: c.colXpMode ? player[c.colXpMode] || "100x" : "100x",
            game_mode: c.colGameMode ? player[c.colGameMode] || "Regular" : "Regular",
            online: c.colOnline ? player[c.colOnline] || 0 : 0,
            created_at: c.colCreatedAt ? player[c.colCreatedAt] : null,
            total_level: totalLevel,
            total_xp: Math.floor(totalXp),
            skills
        };
    } finally {
        conn.release();
    }
}

async function mongoGetPlayer(username) {
    const { getMongoDB } = require("./mongo");
    const db = await getMongoDB();
    if (!db) return null;

    const mc = MONGO_CONFIG;
    const collection = db.collection(mc.playersCollection);
    const player = await collection.findOne({ [mc.fieldUsername]: username });
    if (!player) return null;

    let skills = [];
    const skillData = player[mc.skillsField] || {};

    if (mc.skillStorage === "embedded") {
        skills = SKILLS.map(name => {
            const sk = skillData[name] || skillData[name.toLowerCase()] || {};
            return { skill_name: name, level: sk[mc.skillLevelField] || sk.level || 1, xp: sk[mc.skillXpField] || sk.xp || 0 };
        });
    } else if (mc.skillStorage === "array") {
        const arr = Array.isArray(skillData) ? skillData : [];
        skills = SKILLS.map(name => {
            const sk = arr.find(s => s.name === name || s.skill_name === name) || {};
            return { skill_name: name, level: sk[mc.skillLevelField] || sk.level || 1, xp: sk[mc.skillXpField] || sk.xp || 0 };
        });
    }

    const totalLevel = skills.reduce((s, sk) => s + sk.level, 0);
    const totalXp = skills.reduce((s, sk) => s + sk.xp, 0);

    return {
        username: player[mc.fieldUsername],
        donor_rank: "None",
        xp_mode: mc.fieldXpMode ? player[mc.fieldXpMode] || "100x" : "100x",
        game_mode: mc.fieldGameMode ? player[mc.fieldGameMode] || "Regular" : "Regular",
        online: mc.fieldOnline ? player[mc.fieldOnline] || 0 : 0,
        created_at: mc.fieldCreatedAt ? player[mc.fieldCreatedAt] : null,
        total_level: totalLevel,
        total_xp: Math.floor(totalXp),
        skills
    };
}

// ═══════════════════════════════════════
//  Server Stats
// ═══════════════════════════════════════

async function getStats() {
    if (DATA_SOURCE === "mongo" || DATA_SOURCE === "both") {
        return await mongoGetStats();
    }
    return await mysqlGetStats();
}

async function mysqlGetStats() {
    const gamePool = require("./game-db");
    const conn = await gamePool.getConnection();
    const c = MYSQL_CONFIG;
    try {
        const [totalRows] = await conn.query("SELECT COUNT(*) as count FROM " + c.playersTable);
        let onlinePlayers = 0;
        if (c.colOnline) {
            const [onlineRows] = await conn.query("SELECT COUNT(*) as count FROM " + c.playersTable + " WHERE " + c.colOnline + " = 1");
            onlinePlayers = onlineRows[0]?.count || 0;
        }
        return { totalPlayers: totalRows[0]?.count || 0, onlinePlayers, topPlayer: null };
    } finally {
        conn.release();
    }
}

async function mongoGetStats() {
    const { getMongoDB } = require("./mongo");
    const db = await getMongoDB();
    if (!db) return { totalPlayers: 0, onlinePlayers: 0, topPlayer: null };

    const mc = MONGO_CONFIG;
    const collection = db.collection(mc.playersCollection);
    const totalPlayers = await collection.countDocuments();
    let onlinePlayers = 0;
    if (mc.fieldOnline) {
        onlinePlayers = await collection.countDocuments({ [mc.fieldOnline]: true });
    }
    return { totalPlayers, onlinePlayers, topPlayer: null };
}

// ═══════════════════════════════════════
//  Main exports
// ═══════════════════════════════════════

async function getHighscores(opts) {
    const offset = (opts.page - 1) * opts.limit;
    if (DATA_SOURCE === "mongo" || DATA_SOURCE === "both") {
        return await mongoGetHighscores({ ...opts, offset });
    }
    return await mysqlGetHighscores({ ...opts, offset });
}

module.exports = { getHighscores, getPlayerData, getStats, SKILLS };