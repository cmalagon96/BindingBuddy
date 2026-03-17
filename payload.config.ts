import path from "path";
import { fileURLToPath } from "url";
import { buildConfig } from "payload";
import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import sharp from "sharp";
import { Users } from "./src/collections/Users";
import { Media } from "./src/collections/Media";
import { Products } from "./src/collections/Products";
import { Orders } from "./src/collections/Orders";
import { WeeklyReports } from "./src/collections/WeeklyReports";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const payloadSecret = process.env.PAYLOAD_SECRET;
if (!payloadSecret) throw new Error("PAYLOAD_SECRET environment variable is required");

const databaseUri = process.env.DATABASE_URI;
if (!databaseUri) throw new Error("DATABASE_URI environment variable is required");

export default buildConfig({
  secret: payloadSecret,
  db: mongooseAdapter({
    url: databaseUri,
  }),
  editor: lexicalEditor(),
  sharp,
  collections: [Users, Media, Products, Orders, WeeklyReports],
  jobs: {
    tasks: [
      {
        slug: "weekly-store-report",
        label: "Weekly Store Attribution Report",
        handler: async ({ req }) => {
          // Dynamic import to keep the handler lightweight at config parse time
          const { generateWeeklyReport, buildReportEmailHtml } = await import(
            "./src/lib/weekly-report"
          );
          const { Resend } = await import("resend");

          const data = await generateWeeklyReport();

          const apiKey = process.env.RESEND_API_KEY;
          const recipientEnv = process.env.WEEKLY_REPORT_RECIPIENTS;
          const contactEmail = process.env.CONTACT_EMAIL;
          const recipients = recipientEnv
            ? recipientEnv.split(",").map((e: string) => e.trim()).filter(Boolean)
            : contactEmail
              ? [contactEmail]
              : [];

          let status: "success" | "failed" = "success";
          let sendError: string | undefined;

          if (apiKey && recipients.length > 0) {
            const resend = new Resend(apiKey);
            const html = buildReportEmailHtml(data);
            const weekStartDisplay = new Date(data.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const weekEndDisplay = new Date(data.weekEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" });

            try {
              await resend.emails.send({
                from: "Binding Buddy <onboarding@resend.dev>",
                to: recipients,
                subject: `Weekly Report: ${weekStartDisplay} - ${weekEndDisplay} | ${data.totalOrders} orders, $${(data.totalRevenue / 100).toFixed(2)}`,
                html,
              });
            } catch (err) {
              status = "failed";
              sendError = err instanceof Error ? err.message : "Send failed";
              console.error("[weekly-report-job] Email send failed:", err);

              // Alert on failure
              if (contactEmail) {
                try {
                  await resend.emails.send({
                    from: "Binding Buddy <onboarding@resend.dev>",
                    to: contactEmail,
                    subject: "Weekly Report Email FAILED",
                    text: `Error: ${sendError}\nRecipients: ${recipients.join(", ")}`,
                  });
                } catch (alertErr) {
                  console.error("[weekly-report-job] Alert also failed:", alertErr);
                }
              }
            }
          } else {
            status = "failed";
            sendError = "Missing RESEND_API_KEY or recipients";
          }

          // Store report record
          await req.payload.create({
            collection: "weekly-reports",
            data: {
              weekStart: data.weekStart,
              weekEnd: data.weekEnd,
              reportData: data,
              sentTo: recipients,
              sentAt: status === "success" ? new Date().toISOString() : undefined,
              status,
            },
          });

          return { output: { success: status === "success", error: sendError } };
        },
        outputSchema: [
          { name: "success", type: "checkbox" },
          { name: "error", type: "text" },
        ],
        retries: { attempts: 2, backoff: { type: "fixed", delay: 60000 } },
        schedule: [
          {
            cron: "0 8 * * 1", // Every Monday at 8:00 AM
            queue: "weekly-reports",
          },
        ],
      },
    ],
    autoRun: [
      {
        queue: "weekly-reports",
        cron: "*/5 * * * *", // Poll every 5 minutes
      },
    ],
  },
  admin: {
    user: Users.slug,
    theme: "dark",
    meta: {
      titleSuffix: " | Binding Buddy",
    },
    components: {
      graphics: {
        Logo: "/src/components/admin/Logo",
        Icon: "/src/components/admin/Icon",
      },
      beforeLogin: ["/src/components/admin/BeforeLogin"],
      beforeDashboard: ["/src/components/admin/BeforeDashboard"],
      afterDashboard: ["/src/components/admin/AfterDashboard"],
      providers: ["/src/components/admin/TOTPProvider"],
      // Injects Google Fonts + theme-color into <head> for the admin panel.
      // Fonts are loaded here (preconnect + stylesheet) instead of via
      // @import in custom.scss to avoid Next.js generating a stale preload
      // hint that fires before the fonts are actually consumed.
      // `head` is a valid Payload runtime slot but missing from the beta types.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error — Payload 3 beta types don't yet expose `head`
      head: ["/src/components/admin/Head"],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  typescript: {
    outputFile: path.resolve(dirname, "src/payload-types.ts"),
  },
});
