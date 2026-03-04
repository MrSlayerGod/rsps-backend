const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL || "Gallifrey <noreply@gallifrey.gg>";
const SITE = process.env.FRONTEND_URL || "http://localhost:5173";
const SERVER = process.env.SERVER_NAME || "Gallifrey";

async function sendVerificationEmail(email, username, token) {
  const link = SITE + "/verify-email?token=" + token;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Verify your " + SERVER + " account",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0c12;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0c12;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111318;border:1px solid #2a2010;border-radius:16px;overflow:hidden">
        <tr><td style="background:linear-gradient(135deg,#1a1200,#0a0c12);padding:32px;text-align:center;border-bottom:1px solid #2a2010">
          <h1 style="margin:0;color:#d4a017;font-size:28px;font-weight:bold;letter-spacing:2px">${SERVER}</h1>
          <p style="margin:8px 0 0;color:#6b6b6b;font-size:13px">RSPS Account Verification</p>
        </td></tr>
        <tr><td style="padding:36px 40px">
          <h2 style="margin:0 0 16px;color:#f0f0f0;font-size:20px">Welcome, ${username}!</h2>
          <p style="margin:0 0 24px;color:#9a9a9a;line-height:1.6">Thanks for registering. Click the button below to verify your email address and activate your account.</p>
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${link}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#c8900a,#d4a017);color:#000;font-weight:bold;font-size:15px;text-decoration:none;border-radius:8px">Verify My Account</a>
          </td></tr></table>
          <p style="margin:24px 0 0;color:#555;font-size:12px">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
          <p style="margin:8px 0 0;color:#444;font-size:11px;word-break:break-all">Or copy: ${link}</p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #1a1a1a;text-align:center">
          <p style="margin:0;color:#444;font-size:11px">&copy; ${new Date().getFullYear()} ${SERVER}. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  });
}

async function sendReceiptEmail(email, username, order, items) {
  const itemRows = items.map(i =>
    `<tr>
      <td style="padding:10px 0;color:#d0d0d0;border-bottom:1px solid #1a1a1a">${i.name}</td>
      <td style="padding:10px 0;color:#d0d0d0;border-bottom:1px solid #1a1a1a;text-align:center">x${i.quantity}</td>
      <td style="padding:10px 0;color:#d4a017;border-bottom:1px solid #1a1a1a;text-align:right;font-weight:bold">$${(parseFloat(i.price) * i.quantity).toFixed(2)}</td>
    </tr>`
  ).join("");

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: SERVER + " — Order #" + order.id + " Confirmed",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0c12;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0c12;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111318;border:1px solid #2a2010;border-radius:16px;overflow:hidden">
        <tr><td style="background:linear-gradient(135deg,#1a1200,#0a0c12);padding:32px;text-align:center;border-bottom:1px solid #2a2010">
          <h1 style="margin:0;color:#d4a017;font-size:28px;font-weight:bold;letter-spacing:2px">${SERVER}</h1>
          <p style="margin:8px 0 0;color:#4ade80;font-size:13px;font-weight:bold">&#10003; Payment Confirmed</p>
        </td></tr>
        <tr><td style="padding:36px 40px">
          <h2 style="margin:0 0 8px;color:#f0f0f0;font-size:20px">Thanks for your purchase, ${username}!</h2>
          <p style="margin:0 0 28px;color:#9a9a9a">Order #${order.id} &bull; ${new Date().toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" })}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1a1a1a;border-radius:8px;overflow:hidden">
            <tr style="background:#0d0f15">
              <th style="padding:12px 16px;color:#666;font-size:11px;text-align:left;font-weight:600;text-transform:uppercase">Item</th>
              <th style="padding:12px 16px;color:#666;font-size:11px;text-align:center;font-weight:600;text-transform:uppercase">Qty</th>
              <th style="padding:12px 16px;color:#666;font-size:11px;text-align:right;font-weight:600;text-transform:uppercase">Price</th>
            </tr>
            <tr><td colspan="3" style="padding:0 16px">${itemRows}</td></tr>
            <tr style="background:#0d0f15">
              <td colspan="2" style="padding:14px 16px;color:#aaa;font-weight:600">Total</td>
              <td style="padding:14px 16px;color:#d4a017;font-size:18px;font-weight:bold;text-align:right">$${parseFloat(order.total).toFixed(2)}</td>
            </tr>
          </table>
          <div style="margin:28px 0 0;padding:16px;background:#0d1a0d;border:1px solid #1a3a1a;border-radius:8px">
            <p style="margin:0;color:#4ade80;font-size:13px;font-weight:bold">&#9654; How to claim in-game</p>
            <p style="margin:6px 0 0;color:#86a886;font-size:13px">Log into ${SERVER} and type <strong style="color:#d4a017">::donated</strong> in the chat to receive your items.</p>
          </div>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #1a1a1a;text-align:center">
          <p style="margin:0;color:#444;font-size:11px">&copy; ${new Date().getFullYear()} ${SERVER}. Thank you for supporting the server!</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  });
}

module.exports = { sendVerificationEmail, sendReceiptEmail };
