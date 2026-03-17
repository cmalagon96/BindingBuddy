import { getPayloadClient } from "./payload";
import { stores, getStoreName } from "./stores";
import { formatPrice } from "./format-price";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StoreReport {
  storeId: string;
  storeName: string;
  orderCount: number;
  revenue: number; // cents
  topProducts: { name: string; quantity: number; revenue: number }[];
  previousOrderCount: number;
  previousRevenue: number;
}

export interface WeeklyReportData {
  weekStart: string; // ISO date
  weekEnd: string;
  generatedAt: string;
  stores: StoreReport[];
  totalOrders: number;
  totalRevenue: number;
  previousTotalOrders: number;
  previousTotalRevenue: number;
  directOrders: StoreReport; // orders with no storeRef
}

// ─── Date helpers ────────────────────────────────────────────────────────────

function getWeekRange(now: Date): { weekStart: Date; weekEnd: Date } {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  return { weekStart: start, weekEnd: end };
}

function getPreviousWeekRange(weekStart: Date): {
  prevStart: Date;
  prevEnd: Date;
} {
  const prevEnd = new Date(weekStart);
  prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);

  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - 6);
  prevStart.setHours(0, 0, 0, 0);

  return { prevStart, prevEnd };
}

// ─── Item parsing ────────────────────────────────────────────────────────────

interface OrderItem {
  name?: string;
  quantity?: number;
  price?: number;
}

function parseItems(items: unknown): OrderItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((i) => ({
    name: String(i?.name ?? "Unknown"),
    quantity: Number(i?.quantity ?? 1),
    price: Number(i?.price ?? 0),
  }));
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

interface OrderDoc {
  storeRef?: string | null;
  total: number;
  items: unknown;
}

function aggregateByStore(
  orders: OrderDoc[],
  storeIds: string[],
): Map<string, { orderCount: number; revenue: number; products: Map<string, { quantity: number; revenue: number }> }> {
  // Initialize map with all store IDs + "direct" bucket
  const map = new Map<string, { orderCount: number; revenue: number; products: Map<string, { quantity: number; revenue: number }> }>();
  for (const id of [...storeIds, "__direct__"]) {
    map.set(id, { orderCount: 0, revenue: 0, products: new Map() });
  }

  for (const order of orders) {
    const bucket = order.storeRef && storeIds.includes(order.storeRef)
      ? order.storeRef
      : "__direct__";
    const entry = map.get(bucket)!;
    entry.orderCount += 1;
    entry.revenue += order.total;

    for (const item of parseItems(order.items)) {
      const existing = entry.products.get(item.name!) ?? { quantity: 0, revenue: 0 };
      existing.quantity += item.quantity!;
      existing.revenue += item.price! * item.quantity!;
      entry.products.set(item.name!, existing);
    }
  }

  return map;
}

function topProducts(
  products: Map<string, { quantity: number; revenue: number }>,
  limit = 5,
): { name: string; quantity: number; revenue: number }[] {
  return [...products.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, limit)
    .map(([name, data]) => ({ name, ...data }));
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function generateWeeklyReport(
  asOf?: Date,
): Promise<WeeklyReportData> {
  const payload = await getPayloadClient();
  const now = asOf ?? new Date();
  const { weekStart, weekEnd } = getWeekRange(now);
  const { prevStart, prevEnd } = getPreviousWeekRange(weekStart);

  const storeIds = Object.keys(stores);

  // Fetch current and previous week orders in parallel.
  // Only count confirmed+ statuses (exclude pending, cancelled, refunded).
  const validStatuses = ["confirmed", "processing", "shipped", "delivered"];

  const [currentResult, previousResult] = await Promise.all([
    payload.find({
      collection: "orders",
      where: {
        and: [
          { createdAt: { greater_than_equal: weekStart.toISOString() } },
          { createdAt: { less_than_equal: weekEnd.toISOString() } },
          { status: { in: validStatuses } },
        ],
      },
      limit: 10000,
      depth: 0,
    }),
    payload.find({
      collection: "orders",
      where: {
        and: [
          { createdAt: { greater_than_equal: prevStart.toISOString() } },
          { createdAt: { less_than_equal: prevEnd.toISOString() } },
          { status: { in: validStatuses } },
        ],
      },
      limit: 10000,
      depth: 0,
    }),
  ]);

  const currentOrders = currentResult.docs as unknown as OrderDoc[];
  const previousOrders = previousResult.docs as unknown as OrderDoc[];

  const currentAgg = aggregateByStore(currentOrders, storeIds);
  const previousAgg = aggregateByStore(previousOrders, storeIds);

  // Build per-store reports
  const storeReports: StoreReport[] = storeIds.map((id) => {
    const curr = currentAgg.get(id)!;
    const prev = previousAgg.get(id)!;
    return {
      storeId: id,
      storeName: getStoreName(id),
      orderCount: curr.orderCount,
      revenue: curr.revenue,
      topProducts: topProducts(curr.products),
      previousOrderCount: prev.orderCount,
      previousRevenue: prev.revenue,
    };
  });

  // Direct orders (no store attribution)
  const currDirect = currentAgg.get("__direct__")!;
  const prevDirect = previousAgg.get("__direct__")!;
  const directReport: StoreReport = {
    storeId: "__direct__",
    storeName: "Direct (No Store)",
    orderCount: currDirect.orderCount,
    revenue: currDirect.revenue,
    topProducts: topProducts(currDirect.products),
    previousOrderCount: prevDirect.orderCount,
    previousRevenue: prevDirect.revenue,
  };

  const totalOrders = currentOrders.length;
  const totalRevenue = currentOrders.reduce((sum, o) => sum + o.total, 0);
  const previousTotalOrders = previousOrders.length;
  const previousTotalRevenue = previousOrders.reduce(
    (sum, o) => sum + o.total,
    0,
  );

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    generatedAt: new Date().toISOString(),
    stores: storeReports,
    totalOrders,
    totalRevenue,
    previousTotalOrders,
    previousTotalRevenue,
    directOrders: directReport,
  };
}

// ─── Email HTML builder ──────────────────────────────────────────────────────

function trendArrow(current: number, previous: number): string {
  if (previous === 0 && current === 0) return "—";
  if (previous === 0) return "&#9650; New";
  const pct = ((current - previous) / previous) * 100;
  if (pct > 0) return `<span style="color:#2EC4B6">&#9650; +${pct.toFixed(1)}%</span>`;
  if (pct < 0) return `<span style="color:#E63946">&#9660; ${pct.toFixed(1)}%</span>`;
  return "&#8212; 0%";
}

export function buildReportEmailHtml(data: WeeklyReportData): string {
  const weekStartDisplay = new Date(data.weekStart).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const weekEndDisplay = new Date(data.weekEnd).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const storeRows = [...data.stores, data.directOrders]
    .map(
      (s) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2A2D3A;color:#F0F0F8;">${s.storeName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2A2D3A;color:#F0F0F8;text-align:center;">${s.orderCount}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2A2D3A;color:#F0F0F8;text-align:right;">${formatPrice(s.revenue)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2A2D3A;color:#8B8FA8;text-align:center;">${trendArrow(s.orderCount, s.previousOrderCount)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2A2D3A;color:#8B8FA8;text-align:center;">${trendArrow(s.revenue, s.previousRevenue)}</td>
      </tr>`,
    )
    .join("");

  // Top products across all stores
  const allProducts = new Map<string, { quantity: number; revenue: number }>();
  for (const store of [...data.stores, data.directOrders]) {
    for (const p of store.topProducts) {
      const existing = allProducts.get(p.name) ?? { quantity: 0, revenue: 0 };
      existing.quantity += p.quantity;
      existing.revenue += p.revenue;
      allProducts.set(p.name, existing);
    }
  }
  const globalTopProducts = [...allProducts.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 10);

  const productRows = globalTopProducts
    .map(
      ([name, d]) => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #2A2D3A;color:#F0F0F8;">${name}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #2A2D3A;color:#F0F0F8;text-align:center;">${d.quantity}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #2A2D3A;color:#F0F0F8;text-align:right;">${formatPrice(d.revenue)}</td>
      </tr>`,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0F1117;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="text-align:center;padding:24px 0;border-bottom:2px solid #E63946;">
      <h1 style="margin:0;font-family:'Barlow Condensed',Arial,sans-serif;font-size:28px;color:#E63946;text-transform:uppercase;letter-spacing:2px;">
        Binding Buddy
      </h1>
      <p style="margin:8px 0 0;color:#8B8FA8;font-size:14px;">
        Weekly Store Attribution Report
      </p>
      <p style="margin:4px 0 0;color:#8B8FA8;font-size:13px;">
        ${weekStartDisplay} &mdash; ${weekEndDisplay}
      </p>
    </div>

    <!-- Summary Cards -->
    <div style="display:flex;gap:12px;margin:24px 0;">
      <div style="flex:1;background:#1A1D27;border:1px solid #2A2D3A;border-radius:8px;padding:16px;text-align:center;">
        <div style="color:#8B8FA8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Total Orders</div>
        <div style="color:#F0F0F8;font-size:28px;font-weight:700;margin:4px 0;">${data.totalOrders}</div>
        <div style="font-size:12px;">${trendArrow(data.totalOrders, data.previousTotalOrders)}</div>
      </div>
      <div style="flex:1;background:#1A1D27;border:1px solid #2A2D3A;border-radius:8px;padding:16px;text-align:center;">
        <div style="color:#8B8FA8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Total Revenue</div>
        <div style="color:#F0F0F8;font-size:28px;font-weight:700;margin:4px 0;">${formatPrice(data.totalRevenue)}</div>
        <div style="font-size:12px;">${trendArrow(data.totalRevenue, data.previousTotalRevenue)}</div>
      </div>
    </div>

    <!-- Store Breakdown -->
    <h2 style="font-family:'Barlow Condensed',Arial,sans-serif;color:#F0F0F8;font-size:20px;margin:32px 0 12px;text-transform:uppercase;letter-spacing:1px;">
      Store Breakdown
    </h2>
    <table style="width:100%;border-collapse:collapse;background:#1A1D27;border:1px solid #2A2D3A;border-radius:8px;">
      <thead>
        <tr style="background:#0F1117;">
          <th style="padding:10px 12px;text-align:left;color:#8B8FA8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Store</th>
          <th style="padding:10px 12px;text-align:center;color:#8B8FA8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Orders</th>
          <th style="padding:10px 12px;text-align:right;color:#8B8FA8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Revenue</th>
          <th style="padding:10px 12px;text-align:center;color:#8B8FA8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Orders WoW</th>
          <th style="padding:10px 12px;text-align:center;color:#8B8FA8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Revenue WoW</th>
        </tr>
      </thead>
      <tbody>
        ${storeRows}
        <tr style="background:#0F1117;font-weight:700;">
          <td style="padding:10px 12px;color:#E63946;">TOTAL</td>
          <td style="padding:10px 12px;color:#F0F0F8;text-align:center;">${data.totalOrders}</td>
          <td style="padding:10px 12px;color:#F0F0F8;text-align:right;">${formatPrice(data.totalRevenue)}</td>
          <td style="padding:10px 12px;text-align:center;">${trendArrow(data.totalOrders, data.previousTotalOrders)}</td>
          <td style="padding:10px 12px;text-align:center;">${trendArrow(data.totalRevenue, data.previousTotalRevenue)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Top Products -->
    ${globalTopProducts.length > 0 ? `
    <h2 style="font-family:'Barlow Condensed',Arial,sans-serif;color:#F0F0F8;font-size:20px;margin:32px 0 12px;text-transform:uppercase;letter-spacing:1px;">
      Top Products
    </h2>
    <table style="width:100%;border-collapse:collapse;background:#1A1D27;border:1px solid #2A2D3A;border-radius:8px;">
      <thead>
        <tr style="background:#0F1117;">
          <th style="padding:10px 12px;text-align:left;color:#8B8FA8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Product</th>
          <th style="padding:10px 12px;text-align:center;color:#8B8FA8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Qty Sold</th>
          <th style="padding:10px 12px;text-align:right;color:#8B8FA8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Revenue</th>
        </tr>
      </thead>
      <tbody>${productRows}</tbody>
    </table>
    ` : ""}

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0;margin-top:32px;border-top:1px solid #2A2D3A;">
      <p style="color:#8B8FA8;font-size:12px;margin:0;">
        Generated ${new Date(data.generatedAt).toLocaleString("en-US")} &bull; Binding Buddy
      </p>
    </div>

  </div>
</body>
</html>`.trim();
}
