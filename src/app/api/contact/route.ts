import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import {
  getRateLimitKey,
  isRateLimited,
  recordFailedAttempt,
} from "@/lib/rate-limit";

// MED-4: Max lengths on all fields
const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(254),
  binderType: z.string().min(1).max(100),
  message: z.string().min(10).max(5000),
});

// MED-4: Rate limit config for contact form (unauthenticated)
const CONTACT_RATE_NAMESPACE = "contact";
const CONTACT_RATE_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 5, // 5 submissions per window
};

export async function POST(req: NextRequest) {
  try {
    // MED-4: Rate limit by IP (unauthenticated endpoint)
    const rateLimitKey = getRateLimitKey(req);
    if (isRateLimited(rateLimitKey, CONTACT_RATE_NAMESPACE, CONTACT_RATE_CONFIG)) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const data = contactSchema.parse(body);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);
    const contactEmail = process.env.CONTACT_EMAIL || "delivered@resend.dev";

    await resend.emails.send({
      from: "Binding Buddy <onboarding@resend.dev>",
      to: contactEmail,
      replyTo: data.email,
      subject: `Custom Order Request from ${data.name}`,
      text: [
        `Name: ${data.name}`,
        `Email: ${data.email}`,
        `Binder Type: ${data.binderType}`,
        ``,
        `Message:`,
        data.message,
      ].join("\n"),
    });

    // Count successful submissions toward rate limit too
    recordFailedAttempt(rateLimitKey, CONTACT_RATE_NAMESPACE, CONTACT_RATE_CONFIG);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid form data", details: err.issues },
        { status: 400 }
      );
    }
    // HIGH-11: Log full error, return generic message
    console.error("[contact] Unhandled error:", err);
    return NextResponse.json(
      { error: "Contact form submission failed" },
      { status: 500 }
    );
  }
}
