const mysql = require("mysql2/promise");
require("dotenv").config();

const STORE_ITEMS = [
  { name: "Regular Donor", description: "Unlock Regular Donor rank with bonus XP, donor zone access, and a custom title.", price: 10, category: "ranks", featured: 1, image_url: "/img/rank-regular.png" },
  { name: "Super Donor", description: "Super Donor rank with enhanced drop rates, exclusive cosmetics, and priority support.", price: 25, category: "ranks", featured: 1, image_url: "/img/rank-super.png" },
  { name: "Extreme Donor", description: "Extreme Donor rank with boss teleports, double vote rewards, and special aura.", price: 50, category: "ranks", featured: 1, image_url: "/img/rank-extreme.png" },
  { name: "Legendary Donor", description: "Legendary rank with all perks, custom yell tag, personal shop, and exclusive pet.", price: 100, category: "ranks", featured: 1, image_url: "/img/rank-legendary.png" },
  { name: "Uber Donor", description: "The ultimate rank. Everything unlocked, custom title color, and developer access preview.", price: 250, category: "ranks", featured: 1, image_url: "/img/rank-uber.png" },
  { name: "Mystery Box", description: "Contains a random rare item! Could be anything from cosmetics to best-in-slot gear.", price: 5, category: "boxes", featured: 1, image_url: "/img/mystery-box.png" },
  { name: "Super Mystery Box", description: "Higher chance for ultra-rare items. Guaranteed at least a tier-3 reward.", price: 15, category: "boxes", featured: 0, image_url: "/img/super-mystery-box.png" },
  { name: "Pet Mystery Box", description: "Guaranteed exclusive pet! Over 20 unique pets available.", price: 20, category: "boxes", featured: 0, image_url: "/img/pet-box.png" },
  { name: "50M Gold Pack", description: "Receive 50 million gold coins delivered instantly to your account.", price: 5, category: "supplies", featured: 0, image_url: "/img/gold-50m.png" },
  { name: "200M Gold Pack", description: "Receive 200 million gold coins. Best value gold pack!", price: 15, category: "supplies", featured: 0, image_url: "/img/gold-200m.png" },
  { name: "XP Lamp (Large)", description: "Grants 500,000 XP in any skill of your choice.", price: 3, category: "experience", featured: 0, image_url: "/img/xp-lamp.png" },
  { name: "XP Lamp (Huge)", description: "Grants 2,000,000 XP in any skill of your choice.", price: 8, category: "experience", featured: 0, image_url: "/img/xp-lamp-huge.png" },
  { name: "Custom Title Scroll", description: "Create your own custom title displayed in-game. Subject to approval.", price: 10, category: "cosmetics", featured: 0, image_url: "/img/title-scroll.png" },
  { name: "Rainbow Partyhat", description: "An exclusive cosmetic partyhat with animated rainbow colors.", price: 30, category: "cosmetics", featured: 1, image_url: "/img/rainbow-phat.png" },
  { name: "Infernal Wings", description: "Cosmetic wings with a fiery infernal effect.", price: 20, category: "cosmetics", featured: 0, image_url: "/img/infernal-wings.png" }
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
        "INSERT INTO store_items (name, description, price, category, image_url, featured) VALUES (?, ?, ?, ?, ?, ?)",
        [item.name, item.description, item.price, item.category, item.image_url, item.featured]
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