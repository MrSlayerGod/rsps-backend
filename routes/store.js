const express = require("express");
const websiteDB = require("../db/website-db");
const { authenticate } = require("../middleware/auth");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { sendReceiptEmail } = require("../lib/email");

// Validates requests from the game server via r_auth cookie
function authenticateGameServer(req, res, next) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/r_auth=([^;]+)/);
  const token = match ? match[1] : null;
  if (!token || token !== process.env.API_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.get("/items", async (req, res) => {
  const conn = await websiteDB.getConnection();
  try {
    const { category } = req.query;
    let items;
    if (category && category !== "all") {
      [items] = await conn.query("SELECT * FROM store_items WHERE category = ? AND in_stock = 1 ORDER BY price ASC", [category]);
    } else {
      [items] = await conn.query("SELECT * FROM store_items WHERE in_stock = 1 ORDER BY category, price ASC");
    }
    res.json({ items });
  } finally { conn.release(); }
});

router.get("/featured", async (req, res) => {
  const conn = await websiteDB.getConnection();
  try {
    const [items] = await conn.query("SELECT * FROM store_items WHERE featured = 1 AND in_stock = 1 ORDER BY price ASC");
    res.json({ items });
  } finally { conn.release(); }
});

router.post("/checkout", authenticate, async (req, res) => {
  const conn = await websiteDB.getConnection();
  try {
    const { items } = req.body;
    if (!items || !items.length) return res.status(400).json({ error: "Cart is empty" });

    await conn.beginTransaction();
    let total = 0;
    const lineItems = [];

    for (const cartItem of items) {
      const [storeItems] = await conn.query("SELECT * FROM store_items WHERE id = ? AND in_stock = 1", [cartItem.id]);
      if (storeItems.length === 0) throw new Error("Item not found");
      const qty = Math.max(1, parseInt(cartItem.quantity) || 1);
      total += storeItems[0].price * qty;
      lineItems.push({ ...storeItems[0], quantity: qty });
    }

    const [users] = await conn.query("SELECT username FROM website_users WHERE id = ?", [req.user.id]);
    const username = users[0]?.username || "unknown";

    const [orderResult] = await conn.query(
      "INSERT INTO orders (user_id, username, total, status) VALUES (?, ?, ?, 'pending')",
      [req.user.id, username, total]
    );

    for (const li of lineItems) {
      await conn.query("INSERT INTO order_items (order_id, item_id, quantity, price) VALUES (?, ?, ?, ?)",
        [orderResult.insertId, li.id, li.quantity, li.price]);
    }

    await conn.commit();
    res.status(201).json({ order: { orderId: orderResult.insertId, total, items: lineItems } });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message || "Server error" });
  } finally { conn.release(); }
});

router.post("/complete", authenticate, async (req, res) => {
  const conn = await websiteDB.getConnection();
  try {
    const { orderId, paymentId: sessionId } = req.body;

    // Verify with Stripe that the session is actually paid
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (e) {
      return res.status(400).json({ error: "Invalid payment session" });
    }
    if (session.payment_status !== "paid") return res.status(400).json({ error: "Payment not completed" });
    if (session.metadata?.orderId !== String(orderId)) return res.status(400).json({ error: "Order mismatch" });

    const [orders] = await conn.query("SELECT * FROM orders WHERE id = ? AND user_id = ?", [orderId, req.user.id]);
    if (orders.length === 0) return res.status(404).json({ error: "Order not found" });
    if (orders[0].status === "completed") return res.status(400).json({ error: "Already completed" });

    await conn.beginTransaction();

    await conn.query("UPDATE orders SET status = 'completed', payment_id = ?, payment_method = 'stripe' WHERE id = ?",
      [sessionId, orderId]);
    await conn.query("UPDATE website_users SET donor_total = donor_total + ? WHERE id = ?",
      [orders[0].total, req.user.id]);

    const [userRows] = await conn.query("SELECT * FROM website_users WHERE id = ?", [req.user.id]);
    const dt = parseFloat(userRows[0].donor_total);
    let newRank = "None";
    if (dt >= 250) newRank = "Uber";
    else if (dt >= 100) newRank = "Legendary";
    else if (dt >= 50) newRank = "Extreme";
    else if (dt >= 25) newRank = "Super";
    else if (dt >= 10) newRank = "Regular";

    await conn.query("UPDATE website_users SET donor_rank = ? WHERE id = ?", [newRank, req.user.id]);

    const [orderItems] = await conn.query(
      "SELECT oi.*, si.name FROM order_items oi JOIN store_items si ON si.id = oi.item_id WHERE oi.order_id = ?",
      [orderId]
    );
    for (const oi of orderItems) {
      await conn.query(
        "INSERT INTO pending_deliveries (username, item_name, item_id, quantity, order_id) VALUES (?, ?, ?, ?, ?)",
        [orders[0].username, oi.name, oi.item_id, oi.quantity, orderId]
      );
    }

    await conn.commit();

    // Send receipt email (non-blocking)
    sendReceiptEmail(userRows[0].email, userRows[0].username, orders[0], orderItems).catch(err =>
      console.error("Failed to send receipt email:", err.message)
    );

    res.json({ message: "Payment completed", donor_rank: newRank });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: "Server error" });
  } finally { conn.release(); }
});

router.get("/orders", authenticate, async (req, res) => {
  const conn = await websiteDB.getConnection();
  try {
    const [orders] = await conn.query(
      "SELECT o.*, GROUP_CONCAT(si.name SEPARATOR ', ') as item_names FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id LEFT JOIN store_items si ON si.id = oi.item_id WHERE o.user_id = ? GROUP BY o.id ORDER BY o.created_at DESC",
      [req.user.id]
    );
    res.json({ orders });
  } finally { conn.release(); }
});

// Creates a Stripe Checkout session and returns the redirect URL
router.post("/create-checkout-session", authenticate, async (req, res) => {
  const conn = await websiteDB.getConnection();
  try {
    const { orderId } = req.body;
    const [orders] = await conn.query(
      "SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = 'pending'",
      [orderId, req.user.id]
    );
    if (!orders.length) return res.status(404).json({ error: "Order not found" });

    const [orderItems] = await conn.query(
      "SELECT oi.quantity, oi.price, si.name FROM order_items oi JOIN store_items si ON si.id = oi.item_id WHERE oi.order_id = ?",
      [orderId]
    );

    const line_items = orderItems.map(item => ({
      price_data: {
        currency: "gbp",
        product_data: { name: item.name },
        unit_amount: Math.round(parseFloat(item.price) * 100),
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: process.env.FRONTEND_URL + "/store?payment=success&order_id=" + orderId + "&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: process.env.FRONTEND_URL + "/store?payment=cancelled",
      metadata: { orderId: String(orderId) },
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally { conn.release(); }
});

// Game server calls GET /api/store/claim?username=X to get pending deliveries
router.get("/claim", authenticateGameServer, async (req, res) => {
  const conn = await websiteDB.getConnection();
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: "Missing username" });

    const [deliveries] = await conn.query(
      `SELECT pd.id, pd.quantity, si.game_item_id, si.price
       FROM pending_deliveries pd
       JOIN store_items si ON si.id = pd.item_id
       WHERE pd.username = ? AND pd.delivered = 0 AND si.game_item_id > 0`,
      [username]
    );

    const [userRows] = await conn.query(
      "SELECT donor_total FROM website_users WHERE username = ?", [username]
    );
    const overallSpent = userRows.length ? Math.round(parseFloat(userRows[0].donor_total) * 100) : 0;
    const totalSpentThisClaim = deliveries.reduce((s, d) => s + Math.round(parseFloat(d.price) * 100 * d.quantity), 0);

    const viewModels = deliveries.map(d => ({
      basketModel: { id: String(d.id) },
      inGameItems: { items: [{ itemId: d.game_item_id, amount: d.quantity }] }
    }));

    res.json({ username, totalSpentThisClaim, overallSpent, viewModels });
  } finally { conn.release(); }
});

// Game server calls POST /api/store/claim/confirm after delivering items
router.post("/claim/confirm", authenticateGameServer, async (req, res) => {
  const conn = await websiteDB.getConnection();
  try {
    const ids = req.body; // array of delivery ID strings
    if (!Array.isArray(ids) || ids.length === 0) return res.json({ success: true });
    const numericIds = ids.map(id => parseInt(id)).filter(Boolean);
    await conn.query("UPDATE pending_deliveries SET delivered = 1 WHERE id IN (?)", [numericIds]);
    res.json({ success: true });
  } finally { conn.release(); }
});

module.exports = router;