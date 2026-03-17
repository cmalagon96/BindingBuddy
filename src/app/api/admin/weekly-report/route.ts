import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getPayloadClient } from "@/lib/payload";
import {
  generateWeeklyReport,
  buildReportEmailHtml,
  type WeeklyReportData,
} from "@/lib/weekly-report";
import { Resend } from "resend";

async function getAuthenticatedAdmin() {
  const payload = await getPayloadClient();
  const headersList = await headers();

  // Payload 3 uses JWT auth — pass headers to authenticate
  const result = await payload.auth({ headers: headersList });
  const user = result.user as { role?: string } | null;
  if (!user || user.role !== "admin") {
    return null;
  }
  return user;
}

async function sendReportEmail(
  data: WeeklyReportData,
): Promise<{ recipients: string[]; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { recipients: [], error: "RESEND_API_KEY not configured" };
  }

  const recipientEnv = process.env.WEEKLY_REPORT_RECIPIENTS;
  const contactEmail = process.env.CONTACT_EMAIL;
  const recipients = recipientEnv
    ? recipientEnv.split(",").map((e) => e.trim()).filter(Boolean)
    : contactEmail
      ? [contactEmail]
      : [];

  if (recipients.length === 0) {
    return {
      recipients: [],
      error: "No recipients configured (set WEEKLY_REPORT_RECIPIENTS or CONTACT_EMAIL)",
    };
  }

  const resend = new Resend(apiKey);
  const html = buildReportEmailHtml(data);

  const weekStartDisplay = new Date(data.weekStart).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric" },
  );
  const weekEndDisplay = new Date(data.weekEnd).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  try {
    await resend.emails.send({
      from: "Binding Buddy <onboarding@resend.dev>",
      to: recipients,
      subject: `Weekly Report: ${weekStartDisplay} - ${weekEndDisplay} | ${data.totalOrders} orders, $${(data.totalRevenue / 100).toFixed(2)}`,
      html,
    });
    return { recipients };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown send error";
    console.error("[weekly-report] Email send failed:", err);

    // Try to send failure alert to contact email
    if (contactEmail) {
      try {
        await resend.emails.send({
          from: "Binding Buddy <onboarding@resend.dev>",
          to: contactEmail,
          subject: "Weekly Report Email FAILED",
          text: `The weekly store attribution report failed to send.\n\nError: ${message}\n\nRecipients: ${recipients.join(", ")}`,
        });
      } catch (alertErr) {
        console.error("[weekly-report] Alert email also failed:", alertErr);
      }
    }

    return { recipients, error: message };
  }
}

export async function POST() {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized — admin access required" },
        { status: 401 },
      );
    }

    const data = await generateWeeklyReport();
    const { recipients, error: sendError } = await sendReportEmail(data);

    // Save report record
    const payload = await getPayloadClient();
    await payload.create({
      collection: "weekly-reports",
      data: {
        weekStart: data.weekStart,
        weekEnd: data.weekEnd,
        reportData: data,
        sentTo: recipients,
        sentAt: sendError ? undefined : new Date().toISOString(),
        status: sendError ? "failed" : "success",
      },
    });

    return NextResponse.json({
      success: !sendError,
      report: data,
      recipients,
      ...(sendError ? { emailError: sendError } : {}),
    });
  } catch (err) {
    console.error("[weekly-report] Unhandled error:", err);
    return NextResponse.json(
      { error: "Report generation failed" },
      { status: 500 },
    );
  }
}
