const mysql = require("mysql2/promise");
require("dotenv").config();

// game_item_id = the actual in-game item ID the server gives on claim
// Ranks use bond items (game server converts bond -> donor rank via claimDonation)
// Set game_item_id to 0 for items not yet mapped — they will be skipped on claim
const STORE_ITEMS = [
  { name: "Regular Donor",     description: "Unlock Regular Donor rank with bonus XP, donor zone access, and a custom title.", price: 10,  category: "ranks",      featured: 1, image_url: "/img/rank-regular.png",    game_item_id: 30279 }, // 10 bond
  { name: "Super Donor",       description: "Super Donor rank with enhanced drop rates, exclusive cosmetics, and priority support.", price: 25,  category: "ranks",      featured: 1, image_url: "/img/rank-super.png",      game_item_id: 30282 }, // 25 bond
  { name: "Extreme Donor",     description: "Extreme Donor rank with boss teleports, double vote rewards, and special aura.", price: 50,  category: "ranks",      featured: 1, image_url: "/img/rank-extreme.png",    game_item_id: 30285 }, // 50 bond
  { name: "Legendary Donor",   description: "Legendary rank with all perks, custom yell tag, personal shop, and exclusive pet.", price: 100, category: "ranks",      featured: 1, image_url: "/img/rank-legendary.png",  game_item_id: 30288 }, // 100 bond
  { name: "Uber Donor",        description: "The ultimate rank. Everything unlocked, custom title color, and developer access preview.", price: 250, category: "ranks",      featured: 1, image_url: "/img/rank-uber.png",       game_item_id: 30291 }, // 250 bond
  { name: "Mystery Box",       description: "Contains a random rare item! Could be anything from cosmetics to best-in-slot gear.", price: 5,   category: "boxes",      featured: 1, image_url: "/img/mystery-box.png",     game_item_id: 0     }, // TODO: set your mystery box item ID
  { name: "Super Mystery Box", description: "Higher chance for ultra-rare items. Guaranteed at least a tier-3 reward.", price: 15,  category: "boxes",      featured: 0, image_url: "/img/super-mystery-box.png",game_item_id: 0     }, // TODO: set item ID
  { name: "Pet Mystery Box",   description: "Guaranteed exclusive pet! Over 20 unique pets available.", price: 20,  category: "boxes",      featured: 0, image_url: "/img/pet-box.png",         game_item_id: 0     }, // TODO: set item ID
  { name: "50M Gold Pack",     description: "Receive 50 million gold coins delivered instantly to your account.", price: 5,   category: "supplies",   featured: 0, image_url: "/img/gold-50m.png",        game_item_id: 0     }, // TODO: set item ID (995 = coins?)
  { name: "200M Gold Pack",    description: "Receive 200 million gold coins. Best value gold pack!", price: 15,  category: "supplies",   featured: 0, image_url: "/img/gold-200m.png",       game_item_id: 0     }, // TODO: set item ID
  { name: "XP Lamp (Large)",   description: "Grants 500,000 XP in any skill of your choice.", price: 3,   category: "experience", featured: 0, image_url: "/img/xp-lamp.png",         game_item_id: 0     }, // TODO: set item ID
  { name: "XP Lamp (Huge)",    description: "Grants 2,000,000 XP in any skill of your choice.", price: 8,   category: "experience", featured: 0, image_url: "/img/xp-lamp-huge.png",    game_item_id: 0     }, // TODO: set item ID
  { name: "Custom Title Scroll",description: "Create your own custom title displayed in-game. Subject to approval.", price: 10,  category: "cosmetics",  featured: 0, image_url: "/img/title-scroll.png",    game_item_id: 0     }, // TODO: set item ID
  { name: "Rainbow Partyhat",  description: "An exclusive cosmetic partyhat with animated rainbow colors.", price: 30,  category: "cosmetics",  featured: 1, image_url: "/img/rainbow-phat.png",    game_item_id: 0     }, // TODO: set item ID
  { name: "Infernal Wings",    description: "Cosmetic wings with a fiery infernal effect.", price: 20,  category: "cosmetics",  featured: 0, image_url: "/img/infernal-wings.png",  game_item_id: 0     }, // TODO: set item ID
];

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.WEBSITE_DB_HOST || "localhost",
    port: parseInt(process.env.WEBSITE_DB_PORT) || 3306,
    user: process.env.WEBSITE_DB_USER || "root",
    password: process.env.WEBSITE_DB_PASSWORD || "root",
    database: process.env.WEBSITE_DB_NAME || "runevault_website",
  });

  try {
    console.log("Seeding store items...");
    await conn.query("DELETE FROM order_items");
    await conn.query("DELETE FROM orders");
    await conn.query("DELETE FROM store_items");

    for (const item of STORE_ITEMS) {
      await conn.query(
        "INSERT INTO store_items (name, description, price, category, image_url, featured, game_item_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [item.name, item.description, item.price, item.category, item.image_url, item.featured, item.game_item_id]
      );
    }

    console.log("✅ Seeded " + STORE_ITEMS.length + " store items");
    console.log("   Highscores are blank — data comes from game server");
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    console.error("   Run 'npm run setup' first");
  } finally {
    await conn.end();
    process.exit(0);
  }
}

seed();