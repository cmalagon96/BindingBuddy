export interface WeeklyReportData {
  weekStart: string; // ISO date
  weekEnd: string;
  stores: {
    slug: string;
    name: string;
    orderCount: number;
    revenue: number; // in cents
    topProduct: string | null;
    previousWeekOrders: number;
    previousWeekRevenue: number;
  }[];
  unattributed: {
    orderCount: number;
    revenue: number;
    topProduct: string | null;
    previousWeekOrders: number;
    previousWeekRevenue: number;
  };
  totals: {
    orderCount: number;
    revenue: number;
    previousWeekOrders: number;
    previousWeekRevenue: number;
  };
}

// Color palette matching Binding Buddy Pokemon theme
const C = {
  bg: "#0F1117",
  card: "#1A1D27",
  border: "#2A2D3A",
  text: "#F0F0F8",
  muted: "#8B8FA8",
  crimson: "#E63946",
  blue: "#3B6B9E",
  teal: "#2EC4B6",
  green: "#22C55E",
  red: "#EF4444",
} as const;

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDateRange(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart);
  const end = new Date(weekEnd);
  const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

function trendCell(current: number, previous: number): string {
  const diff = current - previous;
  if (diff === 0 || previous === 0) {
    return `<span style="color:${C.muted};font-family:Arial,sans-serif;font-size:13px;">—</span>`;
  }
  const sign = diff > 0 ? "+" : "";
  const color = diff > 0 ? C.green : C.red;
  return `<span style="color:${color};font-family:Arial,sans-serif;font-size:13px;font-weight:600;">${sign}${diff} order${Math.abs(diff) !== 1 ? "s" : ""}</span>`;
}

function emDash(): string {
  return `<span style="color:${C.muted};">—</span>`;
}

function storeRow(
  name: string,
  orderCount: number,
  revenue: number,
  topProduct: string | null,
  previousWeekOrders: number,
  isAlt: boolean
): string {
  const rowBg = isAlt ? "#141720" : C.card;
  const orders = orderCount > 0 ? `<span style="color:${C.text};font-family:Arial,sans-serif;font-size:13px;">${orderCount}</span>` : emDash();
  const rev = orderCount > 0 ? `<span style="color:${C.teal};font-family:Arial,sans-serif;font-size:13px;font-weight:600;">${formatDollars(revenue)}</span>` : emDash();
  const product = topProduct
    ? `<span style="color:${C.muted};font-family:Arial,sans-serif;font-size:12px;">${escapeHtml(topProduct)}</span>`
    : emDash();
  const trend = orderCount > 0 ? trendCell(orderCount, previousWeekOrders) : emDash();

  return `
    <tr style="background-color:${rowBg};">
      <td style="padding:10px 16px;border-bottom:1px solid ${C.border};font-family:Arial,sans-serif;font-size:13px;color:${C.text};">${escapeHtml(name)}</td>
      <td style="padding:10px 16px;border-bottom:1px solid ${C.border};text-align:center;">${orders}</td>
      <td style="padding:10px 16px;border-bottom:1px solid ${C.border};text-align:right;">${rev}</td>
      <td style="padding:10px 16px;border-bottom:1px solid ${C.border};">${product}</td>
      <td style="padding:10px 16px;border-bottom:1px solid ${C.border};text-align:center;">${trend}</td>
    </tr>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function summaryCard(label: string, value: string, sub?: string): string {
  return `
    <td style="width:33%;padding:0 8px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background-color:${C.card};border:1px solid ${C.border};border-top:3px solid ${C.crimson};border-radius:4px;padding:16px;text-align:center;">
            <div style="font-family:'Arial Narrow',Arial,sans-serif;font-size:22px;font-weight:700;color:${C.crimson};letter-spacing:1px;">${value}</div>
            <div style="font-family:Arial,sans-serif;font-size:11px;color:${C.muted};text-transform:uppercase;letter-spacing:1px;margin-top:4px;">${label}</div>
            ${sub ? `<div style="font-family:Arial,sans-serif;font-size:12px;color:${C.teal};margin-top:6px;">${sub}</div>` : ""}
          </td>
        </tr>
      </table>
    </td>
  `;
}

export function renderWeeklyReport(data: WeeklyReportData): string {
  const { weekStart, weekEnd, stores, unattributed, totals } = data;

  const dateRange = formatDateRange(weekStart, weekEnd);
  const activeStores = stores.filter((s) => s.orderCount > 0).length + (unattributed.orderCount > 0 ? 1 : 0);

  // Build store rows — all stores first, then unattributed
  const storeRows = stores
    .sort((a, b) => b.orderCount - a.orderCount)
    .map((s, i) =>
      storeRow(s.name, s.orderCount, s.revenue, s.topProduct, s.previousWeekOrders, i % 2 === 1)
    )
    .join("");

  const unattributedRow = storeRow(
    "(no referral)",
    unattributed.orderCount,
    unattributed.revenue,
    unattributed.topProduct,
    unattributed.previousWeekOrders,
    stores.length % 2 === 1
  );

  // Total row
  const totalsTrend = trendCell(totals.orderCount, totals.previousWeekOrders);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Weekly Store Attribution Report</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0C12;font-family:Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0A0C12;padding:32px 16px;">
    <tr>
      <td align="center">

        <!-- Main container: max 600px -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- ===== HEADER ===== -->
          <tr>
            <td style="background-color:${C.bg};border:1px solid ${C.border};border-bottom:none;border-radius:6px 6px 0 0;padding:32px 32px 24px;">

              <!-- Logo row -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <!-- Wordmark -->
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color:${C.crimson};width:4px;border-radius:2px;">&nbsp;</td>
                        <td style="padding-left:10px;">
                          <div style="font-family:'Arial Narrow',Arial,sans-serif;font-size:26px;font-weight:700;color:${C.text};letter-spacing:2px;text-transform:uppercase;">BINDING BUDDY</div>
                          <div style="font-family:Arial,sans-serif;font-size:11px;color:${C.muted};letter-spacing:3px;text-transform:uppercase;margin-top:2px;">Pokemon Binder Covers</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="top">
                    <div style="background-color:${C.blue};border-radius:3px;padding:4px 10px;display:inline-block;">
                      <span style="font-family:'Arial Narrow',Arial,sans-serif;font-size:11px;font-weight:700;color:#FFFFFF;letter-spacing:2px;text-transform:uppercase;">WEEKLY REPORT</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;margin-bottom:20px;">
                <tr>
                  <td style="border-top:1px solid ${C.border};"></td>
                </tr>
              </table>

              <!-- Title + date range -->
              <div style="font-family:'Arial Narrow',Arial,sans-serif;font-size:28px;font-weight:700;color:${C.text};letter-spacing:1px;">Store Attribution Report</div>
              <div style="font-family:Arial,sans-serif;font-size:14px;color:${C.muted};margin-top:6px;">${escapeHtml(dateRange)}</div>
            </td>
          </tr>

          <!-- ===== SUMMARY CARDS ===== -->
          <tr>
            <td style="background-color:${C.bg};border-left:1px solid ${C.border};border-right:1px solid ${C.border};padding:0 32px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  ${summaryCard("Total Orders", String(totals.orderCount))}
                  ${summaryCard("Total Revenue", formatDollars(totals.revenue))}
                  ${summaryCard("Active Stores", String(activeStores))}
                </tr>
              </table>
            </td>
          </tr>

          <!-- ===== STORE BREAKDOWN TABLE ===== -->
          <tr>
            <td style="background-color:${C.bg};border-left:1px solid ${C.border};border-right:1px solid ${C.border};padding:0 32px 28px;">

              <!-- Section heading -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                <tr>
                  <td style="border-left:3px solid ${C.blue};padding-left:10px;">
                    <span style="font-family:'Arial Narrow',Arial,sans-serif;font-size:16px;font-weight:700;color:${C.text};letter-spacing:1px;text-transform:uppercase;">Store Breakdown</span>
                  </td>
                </tr>
              </table>

              <!-- Table -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${C.border};border-radius:4px;overflow:hidden;">

                <!-- Table header -->
                <tr style="background-color:#111420;">
                  <th style="padding:10px 16px;text-align:left;font-family:'Arial Narrow',Arial,sans-serif;font-size:11px;font-weight:700;color:${C.muted};letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid ${C.border};">Store</th>
                  <th style="padding:10px 16px;text-align:center;font-family:'Arial Narrow',Arial,sans-serif;font-size:11px;font-weight:700;color:${C.muted};letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid ${C.border};">Orders</th>
                  <th style="padding:10px 16px;text-align:right;font-family:'Arial Narrow',Arial,sans-serif;font-size:11px;font-weight:700;color:${C.muted};letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid ${C.border};">Revenue</th>
                  <th style="padding:10px 16px;text-align:left;font-family:'Arial Narrow',Arial,sans-serif;font-size:11px;font-weight:700;color:${C.muted};letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid ${C.border};">Top Product</th>
                  <th style="padding:10px 16px;text-align:center;font-family:'Arial Narrow',Arial,sans-serif;font-size:11px;font-weight:700;color:${C.muted};letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid ${C.border};">vs Last Week</th>
                </tr>

                <!-- Store rows -->
                ${storeRows}

                <!-- Unattributed row -->
                ${unattributedRow}

                <!-- Totals row -->
                <tr style="background-color:#111420;">
                  <td style="padding:12px 16px;border-top:2px solid ${C.border};font-family:'Arial Narrow',Arial,sans-serif;font-size:13px;font-weight:700;color:${C.text};text-transform:uppercase;letter-spacing:1px;">TOTAL</td>
                  <td style="padding:12px 16px;border-top:2px solid ${C.border};text-align:center;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:${C.text};">${totals.orderCount}</td>
                  <td style="padding:12px 16px;border-top:2px solid ${C.border};text-align:right;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:${C.teal};">${formatDollars(totals.revenue)}</td>
                  <td style="padding:12px 16px;border-top:2px solid ${C.border};"></td>
                  <td style="padding:12px 16px;border-top:2px solid ${C.border};text-align:center;">${totalsTrend}</td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- ===== FOOTER ===== -->
          <tr>
            <td style="background-color:#111420;border:1px solid ${C.border};border-top:none;border-radius:0 0 6px 6px;padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="font-family:Arial,sans-serif;font-size:12px;color:${C.muted};line-height:1.6;">
                      This is an automated report from <span style="color:${C.crimson};font-weight:600;">Binding Buddy</span>.
                    </div>
                    <div style="font-family:Arial,sans-serif;font-size:12px;color:${C.muted};margin-top:4px;">
                      Manage report settings in your <a href="#" style="color:${C.blue};text-decoration:none;">admin panel</a>.
                    </div>
                  </td>
                  <td align="right" valign="top">
                    <a href="#" style="font-family:Arial,sans-serif;font-size:11px;color:${C.muted};text-decoration:underline;">Unsubscribe</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
