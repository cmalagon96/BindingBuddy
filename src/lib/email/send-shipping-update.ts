import { Resend } from "resend";
import type { Order, EmailResult } from "./types";
import {
  renderShippingUpdateHtml,
  renderShippingUpdateText,
} from "./templates/shipping-update";

/**
 * Sends a shipping notification email to the customer.
 *
 * @param order          - The order that has been shipped
 * @param trackingNumber - Carrier tracking number for the shipment
 * @returns EmailResult with success flag and optional messageId or error
 */
export async function sendShippingUpdate(
  order: Order,
  trackingNumber: string
): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY is not set");
    return { success: false, error: "Email service not configured" };
  }

  if (!trackingNumber || trackingNumber.trim().length === 0) {
    return { success: false, error: "Tracking number is required" };
  }

  const fromEmail = buildFromAddress();
  const trimmedTracking = trackingNumber.trim();

  try {
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: order.customerEmail,
      subject: `Your Order Has Shipped! Tracking: ${trimmedTracking}`,
      html: renderShippingUpdateHtml(order, trimmedTracking),
      text: renderShippingUpdateText(order, trimmedTracking),
    });

    if (error) {
      console.error("[email] Resend error (shipping update):", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error sending email";
    console.error("[email] Failed to send shipping update:", message);
    return { success: false, error: message };
  }
}

function buildFromAddress(): string {
  const domain = process.env.EMAIL_FROM_DOMAIN;
  if (domain) {
    return `Binding Buddy <noreply@${domain}>`;
  }
  return "Binding Buddy <onboarding@resend.dev>";
}
