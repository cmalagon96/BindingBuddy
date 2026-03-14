import type { Order } from "../types";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderShippingUpdateHtml(
  order: Order,
  trackingNumber: string
): string {
  const addr = order.shippingAddress;
  const addressLines = [
    escapeHtml(addr.line1),
    addr.line2 ? escapeHtml(addr.line2) : null,
    `${escapeHtml(addr.city)}, ${escapeHtml(addr.state)} ${escapeHtml(addr.postalCode)}`,
    escapeHtml(addr.country),
  ]
    .filter(Boolean)
    .join("<br>");

  // Generic USPS tracking URL — easy to swap for carrier-specific later
  const trackingUrl = `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${encodeURIComponent(trackingNumber)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Order Has Shipped — Binding Buddy</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F1117; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #F0F0F8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0F1117; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a3d5c 0%, #2EC4B6 100%); border-radius: 12px 12px 0 0; padding: 36px 40px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 8px;">📦</div>
              <div style="font-size: 28px; font-weight: 800; letter-spacing: 0.05em; color: #F0F0F8;">⚡ BINDING BUDDY</div>
              <div style="margin-top: 8px; font-size: 14px; color: #0F1117; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700;">Your Order Has Shipped!</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color: #1A1D27; padding: 36px 40px;">

              <!-- Greeting -->
              <p style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #F0F0F8;">
                Great news, ${escapeHtml(addr.fullName.split(" ")[0])}! 🚀
              </p>
              <p style="margin: 0 0 28px; font-size: 15px; color: #8B8FA8; line-height: 1.6;">
                Your Binding Buddy order is on its way. Track your package using the information below.
              </p>

              <!-- Tracking Box -->
              <div style="background: linear-gradient(135deg, #0F1117 0%, #1A2D4F 100%); border: 1px solid #3B6B9E; border-radius: 10px; padding: 24px; margin-bottom: 28px; text-align: center;">
                <div style="font-size: 12px; color: #8B8FA8; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; margin-bottom: 10px;">Tracking Number</div>
                <div style="font-family: monospace; font-size: 20px; font-weight: 800; color: #2EC4B6; letter-spacing: 0.08em; margin-bottom: 20px;">${escapeHtml(trackingNumber)}</div>
                <a href="${trackingUrl}"
                   style="display: inline-block; background-color: #3B6B9E; color: #F0F0F8; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 700; font-size: 14px; letter-spacing: 0.05em;">
                  Track Your Package →
                </a>
              </div>

              <!-- Order Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px; background-color: #0F1117; border-radius: 8px; padding: 16px 20px;">
                <tr>
                  <td style="padding: 6px 0;">
                    <span style="color: #8B8FA8; font-size: 13px;">Order ID</span><br>
                    <span style="color: #2EC4B6; font-size: 14px; font-family: monospace;">#${escapeHtml(order.id)}</span>
                  </td>
                  <td style="padding: 6px 0;">
                    <span style="color: #8B8FA8; font-size: 13px;">Items</span><br>
                    <span style="color: #F0F0F8; font-size: 14px;">${order.items.reduce((sum, i) => sum + i.quantity, 0)} item${order.items.reduce((sum, i) => sum + i.quantity, 0) !== 1 ? "s" : ""}</span>
                  </td>
                  <td style="padding: 6px 0;">
                    <span style="color: #8B8FA8; font-size: 13px;">Status</span><br>
                    <span style="color: #2EC4B6; font-size: 14px; font-weight: 700;">Shipped ✓</span>
                  </td>
                </tr>
              </table>

              <!-- Delivery Address -->
              <div style="margin-bottom: 28px;">
                <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #8B8FA8; margin-bottom: 12px;">Delivering To</div>
                <div style="background-color: #0F1117; border-radius: 8px; padding: 16px 20px; border: 1px solid #2A2D3A; font-size: 14px; line-height: 1.8; color: #F0F0F8;">
                  <strong>${escapeHtml(addr.fullName)}</strong><br>
                  ${addressLines}
                </div>
              </div>

              <!-- Delivery Note -->
              <div style="background-color: #0F1117; border-left: 3px solid #2EC4B6; border-radius: 0 8px 8px 0; padding: 14px 18px; margin-bottom: 28px;">
                <p style="margin: 0; font-size: 13px; color: #8B8FA8; line-height: 1.6;">
                  <strong style="color: #F0F0F8;">Delivery estimate:</strong> Please allow 1–2 business days for tracking to update after receiving this email.
                </p>
              </div>

              <!-- Support -->
              <div style="border-top: 1px solid #2A2D3A; padding-top: 24px; text-align: center;">
                <p style="margin: 0 0 16px; font-size: 14px; color: #8B8FA8;">Issue with your shipment?</p>
                <a href="mailto:${escapeHtml(process.env.CONTACT_EMAIL || "support@bindingbuddy.com")}"
                   style="display: inline-block; background-color: transparent; color: #3B6B9E; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; letter-spacing: 0.05em; border: 1px solid #3B6B9E;">
                  Contact Support
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

export function renderShippingUpdateText(
  order: Order,
  trackingNumber: string
): string {
  const addr = order.shippingAddress;

  return `BINDING BUDDY — Your Order Has Shipped!

Great news, ${addr.fullName}! Your order is on its way.

TRACKING NUMBER
---------------
${trackingNumber}

Track your package:
https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${encodeURIComponent(trackingNumber)}

ORDER DETAILS
-------------
Order ID: #${order.id}
Items: ${order.items.reduce((sum, i) => sum + i.quantity, 0)} item(s)

DELIVERING TO
-------------
${addr.fullName}
${addr.line1}${addr.line2 ? `\n${addr.line2}` : ""}
${addr.city}, ${addr.state} ${addr.postalCode}
${addr.country}

Please allow 1–2 business days for tracking to update.

Questions? Contact us at ${process.env.CONTACT_EMAIL || "support@bindingbuddy.com"}.

© ${new Date().getFullYear()} Binding Buddy
`;
}
