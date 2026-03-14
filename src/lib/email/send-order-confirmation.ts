import { Resend } from "resend";
import type { Order, EmailResult } from "./types";
import {
  renderOrderConfirmationHtml,
  renderOrderConfirmationText,
} from "./templates/order-confirmation";

/**
 * Sends an order confirmation email to the customer.
 *
 * @param order - The completed order to confirm
 * @returns EmailResult with success flag and optional messageId or error
 */
export async function sendOrderConfirmation(
  order: Order
): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY is not set");
    return { success: false, error: "Email service not configured" };
  }

  const fromEmail = buildFromAddress();

  try {
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: order.customerEmail,
      subject: `Order Confirmed — #${order.id}`,
      html: renderOrderConfirmationHtml(order),
      text: renderOrderConfirmationText(order),
    });

    if (error) {
      console.error("[email] Resend error (order confirmation):", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error sending email";
    console.error("[email] Failed to send order confirmation:", message);
    return { success: false, error: message };
  }
}

function buildFromAddress(): string {
  // In production, replace with a verified domain like noreply@bindingbuddy.com.
  // Falls back to Resend's test sender during development.
  const domain = process.env.EMAIL_FROM_DOMAIN;
  if (domain) {
    return `Binding Buddy <noreply@${domain}>`;
  }
  return "Binding Buddy <onboarding@resend.dev>";
}
