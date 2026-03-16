"use client";

import { useState, useEffect, useRef } from "react";

// ─── Style injection (static string, not user input) ─────────────────────────
// Payload admin components cannot import external .scss files from a TSX file,
// so we inject a <style> tag into the document head on mount and remove it on
// unmount. The string is entirely static — no interpolated user data — so there
// is no XSS risk here.

const BB_STYLES = [
  "@keyframes bb-shimmer{0%{background-position:-200% center}100%{background-position:200% center}}",
  "@keyframes bb-pulse{0%,100%{opacity:.4}50%{opacity:.7}}",
  "@keyframes bb-fade-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}",

  // Wrapper
  ".bb-dashboard{padding:0 0 3rem;font-family:'DM Sans',sans-serif}",
  ".bb-divider{height:1px;background:linear-gradient(90deg,transparent,#2A2D3A 20%,#2A2D3A 80%,transparent);margin:0 0 2rem}",

  // Section
  ".bb-section{margin-bottom:2rem;animation:bb-fade-up .4s ease both}",
  ".bb-section__header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem}",
  ".bb-section__title-group{display:flex;align-items:center;gap:10px}",
  ".bb-section__pokeball{display:inline-block;width:18px;height:18px;border-radius:50%;border:2px solid #E63946;position:relative;flex-shrink:0}",
  ".bb-section__pokeball::before{content:'';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:6px;height:6px;border-radius:50%;background:#E63946}",
  ".bb-section__pokeball::after{content:'';position:absolute;left:-2px;right:-2px;top:50%;transform:translateY(-50%);height:2px;background:#E63946}",
  ".bb-section__title{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:18px;color:#F0F0F8;letter-spacing:.02em;margin:0;text-transform:uppercase}",
  ".bb-section__viewall{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:500;color:#8B8FA8;text-decoration:none;letter-spacing:.02em;transition:color .15s ease}",
  ".bb-section__viewall:hover{color:#E63946}",

  // Stats grid
  ".bb-stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:2rem;animation:bb-fade-up .35s ease both}",
  "@media(max-width:1100px){.bb-stats-grid{grid-template-columns:repeat(2,1fr)}}",
  "@media(max-width:600px){.bb-stats-grid{grid-template-columns:1fr}}",

  // Stat card
  ".bb-stat-card{position:relative;overflow:hidden;background:rgba(26,29,39,.72);backdrop-filter:blur(12px) saturate(160%);-webkit-backdrop-filter:blur(12px) saturate(160%);border:1px solid rgba(255,255,255,.06);border-top:3px solid var(--card-accent,#3B6B9E);border-radius:10px;padding:20px 22px 18px;transition:box-shadow .2s ease,transform .15s ease}",
  "@supports not (backdrop-filter:blur(1px)){.bb-stat-card{background:rgba(26,29,39,.96)}}",
  ".bb-stat-card:hover{transform:translateY(-2px);box-shadow:0 0 0 1px rgba(255,255,255,.06),0 8px 28px rgba(0,0,0,.45)}",
  ".bb-stat-card--shimmer::after{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.035) 50%,transparent 65%);background-size:200% 100%;animation:bb-shimmer 3.5s ease-in-out infinite;pointer-events:none}",
  ".bb-stat-card__header{display:flex;align-items:center;gap:7px;margin-bottom:10px}",
  ".bb-stat-card__icon{font-size:14px;line-height:1;opacity:.65;color:var(--card-accent,#3B6B9E)}",
  ".bb-stat-card__label{font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#8B8FA8;flex:1}",
  ".bb-stat-card__trend{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;letter-spacing:.02em}",
  ".bb-stat-card__value{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:44px;line-height:1;color:#F0F0F8;letter-spacing:-.02em;margin-bottom:6px}",
  ".bb-stat-card__sub{font-family:'DM Sans',sans-serif;font-size:12px;color:#8B8FA8;line-height:1.4}",

  // Quick actions
  ".bb-quick-actions{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:0;animation:bb-fade-up .4s ease .05s both}",
  ".bb-quick-action{display:flex;align-items:center;gap:8px;padding:10px 18px;background:#1A1D27;border:1.5px solid #2A2D3A;border-radius:6px;text-decoration:none;color:#A0A3B8;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;transition:all .15s ease;white-space:nowrap}",
  ".bb-quick-action:hover{color:var(--qa-accent,#E63946);border-color:var(--qa-accent,#E63946);background:rgba(26,29,39,.9);box-shadow:0 0 0 1px var(--qa-accent,#E63946),3px 3px 0 var(--qa-accent,#E63946),0 4px 12px rgba(0,0,0,.3);transform:translate(-1px,-1px)}",
  ".bb-quick-action__icon{font-size:16px;line-height:1;color:var(--qa-accent,#E63946);opacity:.75;transition:opacity .15s ease}",
  ".bb-quick-action:hover .bb-quick-action__icon{opacity:1}",
  ".bb-quick-action__label{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:13px;letter-spacing:.04em;text-transform:uppercase}",

  // Table
  ".bb-table-wrap{overflow:auto;border:1px solid #2A2D3A;border-radius:10px;background:#1A1D27}",
  ".bb-table{width:100%;border-collapse:collapse;font-family:'DM Sans',sans-serif;font-size:13.5px}",
  ".bb-table thead th{padding:12px 16px;text-align:left;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8B8FA8;border-bottom:1px solid #2A2D3A;white-space:nowrap}",
  ".bb-table__row td{padding:13px 16px;border-bottom:1px solid rgba(42,45,58,.6);vertical-align:middle;color:#C8CAD8;transition:background .1s ease}",
  ".bb-table__row:last-child td{border-bottom:none}",
  ".bb-table__row:hover td{background:rgba(255,255,255,.025)}",
  ".bb-table__order-id{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:13px;letter-spacing:.06em;color:#E63946;text-decoration:none}",
  ".bb-table__order-id:hover{text-decoration:underline}",
  ".bb-table__email{color:#A0A3B8;font-size:13px}",
  ".bb-table__amount{font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:15px;color:#F0F0F8;letter-spacing:-.01em}",
  ".bb-table__date{color:#8B8FA8;font-size:12px;white-space:nowrap}",
  ".bb-table__empty td{text-align:center;padding:3rem 1rem}",
  ".bb-table__empty-inner{display:flex;flex-direction:column;align-items:center;gap:10px;color:#8B8FA8;font-size:14px}",
  ".bb-table__empty-icon{font-size:32px;opacity:.3}",

  // Status badge
  ".bb-badge{display:inline-block;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:11px;letter-spacing:.08em;text-transform:uppercase;border-width:1.5px;border-style:solid;border-radius:3px;padding:2px 8px;white-space:nowrap}",

  // Skeletons
  ".bb-skeleton{display:inline-block;border-radius:4px;background:linear-gradient(90deg,#2A2D3A 25%,#353849 50%,#2A2D3A 75%);background-size:200% 100%;animation:bb-shimmer 1.4s ease infinite,bb-pulse 1.4s ease infinite}",
  ".bb-skeleton--value{width:100px;height:40px;border-radius:4px;display:block}",
  ".bb-skeleton--sub{width:80px;height:14px;display:block}",
  ".bb-skeleton--cell{height:14px;width:60px}",
  ".bb-skeleton--wide{width:120px}",
].join("\n");

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
  stock: number;
}

interface Order {
  id: string;
  customerEmail: string;
  total: number;
  status: string;
  createdAt: string;
}

interface StatsData {
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  productCount: number;
  lowStockCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function truncateEmail(email: string): string {
  if (email.length <= 24) return email;
  const atIdx = email.indexOf("@");
  if (atIdx < 0) return email.slice(0, 22) + "…";
  const user = email.slice(0, atIdx);
  const domain = email.slice(atIdx);
  return user.slice(0, 10) + "…" + domain;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  pending:    { color: "#f59e0b", bg: "rgba(245,158,11,0.08)",   label: "PENDING"    },
  confirmed:  { color: "#3B6B9E", bg: "rgba(59,107,158,0.08)",   label: "CONFIRMED"  },
  processing: { color: "#6366f1", bg: "rgba(99,102,241,0.08)",   label: "PROCESSING" },
  shipped:    { color: "#6366f1", bg: "rgba(99,102,241,0.08)",   label: "SHIPPED"    },
  delivered:  { color: "#22c55e", bg: "rgba(34,197,94,0.08)",    label: "DELIVERED"  },
  cancelled:  { color: "#E63946", bg: "rgba(230,57,70,0.08)",    label: "CANCELLED"  },
  refunded:   { color: "#8B8FA8", bg: "rgba(139,143,168,0.08)",  label: "REFUNDED"   },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["pending"];
  return (
    <span
      className="bb-badge"
      style={{
        color: cfg.color,
        background: cfg.bg,
        borderColor: cfg.color,
        boxShadow: `2px 2px 0 ${cfg.color}30`,
      }}
    >
      {cfg.label}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  accentColor: string;
  icon: string;
  trend?: { value: string; positive: boolean } | null;
  shimmer?: boolean;
  loading: boolean;
}

function StatCard({ label, value, sub, accentColor, icon, trend, shimmer, loading }: StatCardProps) {
  const cardClass = ["bb-stat-card", shimmer ? "bb-stat-card--shimmer" : ""].filter(Boolean).join(" ");
  return (
    <div className={cardClass} style={{ "--card-accent": accentColor } as React.CSSProperties}>
      <div className="bb-stat-card__header">
        <span className="bb-stat-card__icon">{icon}</span>
        <span className="bb-stat-card__label">{label}</span>
        {trend && (
          <span
            className="bb-stat-card__trend"
            style={{ color: trend.positive ? "#22c55e" : "#E63946" }}
          >
            {trend.positive ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
      <div className="bb-stat-card__value">
        {loading ? <span className="bb-skeleton bb-skeleton--value" /> : value}
      </div>
      <div className="bb-stat-card__sub">
        {loading ? <span className="bb-skeleton bb-skeleton--sub" /> : sub}
      </div>
    </div>
  );
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "Add Product",  icon: "＋", href: "/admin/collections/products/create", accent: "#E63946" },
  { label: "View Orders",  icon: "◈",  href: "/admin/collections/orders",          accent: "#3B6B9E" },
  { label: "Manage Media", icon: "⬡",  href: "/admin/collections/media",           accent: "#6366f1" },
  { label: "View Users",   icon: "◉",  href: "/admin/collections/users",           accent: "#22c55e" },
  { label: "All Products", icon: "▦",  href: "/admin/collections/products",        accent: "#f59e0b" },
];

function QuickActions() {
  return (
    <div className="bb-quick-actions">
      {QUICK_ACTIONS.map((action) => (
        <a
          key={action.href}
          href={action.href}
          className="bb-quick-action"
          style={{ "--qa-accent": action.accent } as React.CSSProperties}
        >
          <span className="bb-quick-action__icon">{action.icon}</span>
          <span className="bb-quick-action__label">{action.label}</span>
        </a>
      ))}
    </div>
  );
}

// ─── Recent Orders ────────────────────────────────────────────────────────────

function RecentOrders({ orders, loading }: { orders: Order[]; loading: boolean }) {
  const skeletonRows = Array.from({ length: 5 });

  return (
    <div className="bb-section">
      <div className="bb-section__header">
        <div className="bb-section__title-group">
          <span className="bb-section__pokeball" aria-hidden="true" />
          <h3 className="bb-section__title">Recent Orders</h3>
        </div>
        <a href="/admin/collections/orders" className="bb-section__viewall">
          View All →
        </a>
      </div>

      <div className="bb-table-wrap">
        <table className="bb-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              skeletonRows.map((_, i) => (
                <tr key={i} className="bb-table__row">
                  <td><span className="bb-skeleton bb-skeleton--cell" /></td>
                  <td><span className="bb-skeleton bb-skeleton--cell bb-skeleton--wide" /></td>
                  <td><span className="bb-skeleton bb-skeleton--cell" /></td>
                  <td><span className="bb-skeleton bb-skeleton--cell" /></td>
                  <td><span className="bb-skeleton bb-skeleton--cell bb-skeleton--wide" /></td>
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr className="bb-table__empty">
                <td colSpan={5}>
                  <div className="bb-table__empty-inner">
                    <span className="bb-table__empty-icon">◈</span>
                    <span>No orders yet — your first sale is incoming.</span>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="bb-table__row">
                  <td>
                    <a
                      href={`/admin/collections/orders/${order.id}`}
                      className="bb-table__order-id"
                    >
                      #{order.id.slice(-6).toUpperCase()}
                    </a>
                  </td>
                  <td className="bb-table__email">{truncateEmail(order.customerEmail)}</td>
                  <td className="bb-table__amount">{formatCurrency(order.total)}</td>
                  <td><StatusBadge status={order.status} /></td>
                  <td className="bb-table__date">{formatDate(order.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

export default function AfterDashboard() {
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // Inject static CSS into document head — content is a compile-time constant,
  // no user data is interpolated, so this is safe.
  useEffect(() => {
    const el = document.createElement("style");
    el.setAttribute("data-bb-dashboard", "1");
    el.textContent = BB_STYLES;
    document.head.appendChild(el);
    styleRef.current = el;
    return () => {
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
        styleRef.current = null;
      }
    };
  }, []);

  const [stats, setStats] = useState<StatsData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [productRes, orderRes] = await Promise.all([
          fetch("/api/products?limit=200&depth=0"),
          fetch("/api/orders?limit=200&depth=0&sort=-createdAt"),
        ]);

        let products: Product[] = [];
        let allOrders: Order[] = [];

        if (productRes.ok) {
          const data = await productRes.json();
          products = data.docs ?? [];
        }

        if (orderRes.ok) {
          const data = await orderRes.json();
          allOrders = data.docs ?? [];
        }

        const totalRevenue = allOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);
        const orderCount = allOrders.length;
        const avgOrderValue = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;
        const productCount = products.length;
        const lowStockCount = products.filter(
          (p) => p.inStock && p.stock >= 0 && p.stock < 5
        ).length;

        setStats({ totalRevenue, orderCount, avgOrderValue, productCount, lowStockCount });
      } catch {
        setStats({ totalRevenue: 0, orderCount: 0, avgOrderValue: 0, productCount: 0, lowStockCount: 0 });
      } finally {
        setLoadingStats(false);
      }
    }

    async function fetchOrders() {
      try {
        const res = await fetch("/api/orders?limit=8&depth=0&sort=-createdAt");
        if (res.ok) {
          const data = await res.json();
          setOrders(data.docs ?? []);
        }
      } catch {
        // handled by empty state
      } finally {
        setLoadingOrders(false);
      }
    }

    fetchData();
    fetchOrders();
  }, []);

  const statCards: StatCardProps[] = [
    {
      label: "Total Revenue",
      value: stats ? formatCurrency(stats.totalRevenue) : "—",
      sub: `${stats?.orderCount ?? "…"} orders lifetime`,
      accentColor: "#E63946",
      icon: "◈",
      trend: null,
      shimmer: true,
      loading: loadingStats,
    },
    {
      label: "Orders",
      value: stats ? String(stats.orderCount) : "—",
      sub: "All time",
      accentColor: "#3B6B9E",
      icon: "▦",
      trend: null,
      shimmer: false,
      loading: loadingStats,
    },
    {
      label: "Avg Order Value",
      value: stats ? formatCurrency(stats.avgOrderValue) : "—",
      sub: "Per transaction",
      accentColor: "#6366f1",
      icon: "⬡",
      trend: null,
      shimmer: false,
      loading: loadingStats,
    },
    {
      label: "Products",
      value: stats ? String(stats.productCount) : "—",
      sub: stats?.lowStockCount ? `${stats.lowStockCount} low stock` : "In catalog",
      accentColor: stats?.lowStockCount ? "#f59e0b" : "#22c55e",
      icon: "◉",
      trend: stats?.lowStockCount
        ? { value: `${stats.lowStockCount} low`, positive: false }
        : null,
      shimmer: false,
      loading: loadingStats,
    },
  ];

  return (
    <div className="bb-dashboard">
      <div className="bb-divider" />

      {/* KPI Stat Cards */}
      <div className="bb-stats-grid">
        {statCards.map((card, i) => (
          <StatCard key={i} {...card} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bb-section">
        <div className="bb-section__header">
          <div className="bb-section__title-group">
            <span className="bb-section__pokeball" aria-hidden="true" />
            <h3 className="bb-section__title">Quick Actions</h3>
          </div>
        </div>
        <QuickActions />
      </div>

      {/* Recent Orders */}
      <RecentOrders orders={orders} loading={loadingOrders} />
    </div>
  );
}
