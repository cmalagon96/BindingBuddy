import type { Order } from "../types";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function renderOrderConfirmationHtml(order: Order): string {
  const itemRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #2A2D3A; color: #F0F0F8;">
          <div style="font-weight: 600;">${escapeHtml(item.name)}</div>
          ${item.variant ? `<div style="font-size: 13px; color: #8B8FA8; margin-top: 2px;">${escapeHtml(item.variant)}</div>` : ""}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #2A2D3A; color: #8B8FA8; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #2A2D3A; color: #2EC4B6; text-align: right; font-weight: 600;">${formatPrice(item.price * item.quantity)}</td>
      </tr>`
    )
    .join("");

  const addr = order.shippingAddress;
  const addressLines = [
    escapeHtml(addr.line1),
    addr.line2 ? escapeHtml(addr.line2) : null,
    `${escapeHtml(addr.city)}, ${escapeHtml(addr.state)} ${escapeHtml(addr.postalCode)}`,
    escapeHtml(addr.country),
  ]
    .filter(Boolean)
    .join("<br>");

  const paymentLabel =
    order.paymentMethod === "stripe" ? "Credit Card" : "PayPal";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order Confirmation — Binding Buddy</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F1117; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #F0F0F8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0F1117; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3B6B9E 0%, #1A2D4F 100%); border-radius: 12px 12px 0 0; padding: 36px 40px; text-align: center;">
              <div style="font-size: 28px; font-weight: 800; letter-spacing: 0.05em; color: #F0F0F8;">⚡ BINDING BUDDY</div>
              <div style="margin-top: 8px; font-size: 14px; color: #2EC4B6; letter-spacing: 0.12em; text-transform: uppercase;">Order Confirmed</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color: #1A1D27; padding: 36px 40px;">

              <!-- Greeting -->
              <p style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #F0F0F8;">
                Thanks for your order, ${escapeHtml(addr.fullName.split(" ")[0])}! 🎉
              </p>
              <p style="margin: 0 0 28px; font-size: 15px; color: #8B8FA8; line-height: 1.6;">
                We've received your order and we're getting it ready. You'll receive another email when it ships.
              </p>

              <!-- Order Meta -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px; background-color: #0F1117; border-radius: 8px; padding: 16px 20px;">
                <tr>
                  <td style="padding: 6px 0;">
                    <span style="color: #8B8FA8; font-size: 13px;">Order ID</span><br>
                    <span style="color: #2EC4B6; font-size: 14px; font-family: monospace;">#${escapeHtml(order.id)}</span>
                  </td>
                  <td style="padding: 6px 0;">
                    <span style="color: #8B8FA8; font-size: 13px;">Date</span><br>
                    <span style="color: #F0F0F8; font-size: 14px;">${order.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                  </td>
                  <td style="padding: 6px 0;">
                    <span style="color: #8B8FA8; font-size: 13px;">Payment</span><br>
                    <span style="color: #F0F0F8; font-size: 14px;">${paymentLabel}</span>
                  </td>
                </tr>
              </table>

              <!-- Items -->
              <div style="margin-bottom: 28px;">
                <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #8B8FA8; margin-bottom: 12px;">Order Items</div>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-radius: 8px; overflow: hidden; border: 1px solid #2A2D3A;">
                  <thead>
                    <tr style="background-color: #0F1117;">
                      <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #8B8FA8; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;">Item</th>
                      <th style="padding: 10px 16px; text-align: center; font-size: 12px; color: #8B8FA8; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;">Qty</th>
                      <th style="padding: 10px 16px; text-align: right; font-size: 12px; color: #8B8FA8; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600;">Price</th>
                    </tr>
                  </thead>
                  <tbody>${itemRows}</tbody>
                  <tfoot>
                    <tr style="background-color: #0F1117;">
                      <td colspan="2" style="padding: 14px 16px; font-size: 15px; font-weight: 700; color: #F0F0F8;">Total</td>
                      <td style="padding: 14px 16px; text-align: right; font-size: 18px; font-weight: 800; color: #2EC4B6;">${formatPrice(order.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <!-- Shipping Address -->
              <div style="margin-bottom: 28px;">
                <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #8B8FA8; margin-bottom: 12px;">Shipping To</div>
                <div style="background-color: #0F1117; border-radius: 8px; padding: 16px 20px; border: 1px solid #2A2D3A; font-size: 14px; line-height: 1.8; color: #F0F0F8;">
                  <strong>${escapeHtml(addr.fullName)}</strong><br>
                  ${addressLines}
                </div>
              </div>

              <!-- Questions CTA -->
              <div style="border-top: 1px solid #2A2D3A; padding-top: 24px; text-align: center;">
                <p style="margin: 0 0 16px; font-size: 14px; color: #8B8FA8;">Have questions about your order?</p>
                <a href="mailto:${escapeHtml(process.env.CONTACT_EMAIL || "support@bindingbuddy.com")}"
                   style="display: inline-block; background-color: #3B6B9E; color: #F0F0F8; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; letter-spacing: 0.05em;">
                  Contact Us
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0F1117; border-radius: 0 0 12px 12px; padding: 24px 40px; text-align: center; border-top: 1px solid #2A2D3A;">
              <p style="margin: 0 0 6px; font-size: 13px; color: #8B8FA8;">© ${new Date().getFullYear()} Binding Buddy — Laser-Engraved Pokemon Binder Covers</p>
              <p style="margin: 0; font-size: 12px; color: #2A2D3A;">You're receiving this because you placed an order with us.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderOrderConfirmationText(order: Order): string {
  const itemLines = order.items
    .map(
      (item) =>
        `  - ${item.name}${item.variant ? ` (${item.variant})` : ""} x${item.quantity} — $${((item.price * item.quantity) / 100).toFixed(2)}`
    )
    .join("\n");

  const addr = order.shippingAddress;

  return `BINDING BUDDY — Order Confirmation

Thanks for your order, ${addr.fullName}!

Order ID: #${order.id}
Date: ${order.createdAt.toLocaleDateString("en-US")}
Payment: ${order.paymentMethod === "stripe" ? "Credit Card" : "PayPal"}

ORDER ITEMS
-----------
${itemLines}

TOTAL: $${(order.total / 100).toFixed(2)}

SHIPPING TO
-----------
${addr.fullName}
${addr.line1}${addr.line2 ? `\n${addr.line2}` : ""}
${addr.city}, ${addr.state} ${addr.postalCode}
${addr.country}

Questions? Reply to this email or contact us at ${process.env.CONTACT_EMAIL || "support@bindingbuddy.com"}.

© ${new Date().getFullYear()} Binding Buddy
`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
