"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TenantStatus, TenantType } from "@prisma/client";
import { AppCard } from "@/components/shared/AppCard";
import { Money } from "@/components/shared/Money";

type TenantDetailData = {
  tenant: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    tenantType: TenantType;
    onboardingStatus: TenantStatus;
    isActive: boolean;
    currency: string;
    timezone: string;
    subscriptionPlan: string | null;
    notes: string | null;
    primaryColor: string;
    secondaryColor: string;
    instagramUrl: string | null;
    facebookUrl: string | null;
    tiktokUrl: string | null;
    telegramUrl: string | null;
    xUrl: string | null;
    createdAt: string;
    owner: {
      id: string;
      name: string;
      email: string;
    } | null;
  };
  metrics: {
    ordersToday: number;
    ordersLast7: number;
    revenueToday: number;
    revenueLast7: number;
    activeSessions: number;
    awaitingKitchen: number;
    lowStockAlerts: number;
    tableCount: number;
    staffCount: number;
    lastActivityAt: string | null;
  };
};

type ActivityEntry = {
  id: string;
  action: string;
  entityType: string;
  actorName: string | null;
  createdAt: string;
};

const inputClass =
  "w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary";

type Tab = "overview" | "branding" | "activity";

export function TenantDetail({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<TenantDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}`);
      if (!res.ok) throw new Error("Failed to load tenant");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-muted-foreground">Loading tenant...</p>;
  }

  if (error || !data) {
    return <p className="text-destructive">{error ?? "Failed to load"}</p>;
  }

  const { tenant } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {tenant.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logoUrl}
              alt=""
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
              {tenant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold">{tenant.name}</h2>
            <p className="text-sm text-muted-foreground">
              /r/{tenant.slug} · {tenant.tenantType} · {tenant.onboardingStatus}
            </p>
          </div>
        </div>
        <Link
          href={`/r/${tenant.slug}/admin`}
          className="rounded-lg border border-card-border px-3 py-2 text-sm text-foreground transition hover:bg-muted"
        >
          Open owner admin →
        </Link>
      </div>

      <div className="flex gap-2 border-b border-card-border">
        {(["overview", "branding", "activity"] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === item
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <OverviewTab data={data} />
      ) : tab === "branding" ? (
        <BrandingTab tenant={tenant} onSaved={load} />
      ) : (
        <ActivityTab tenantId={tenantId} />
      )}
    </div>
  );
}

function OverviewTab({ data }: { data: TenantDetailData }) {
  const { tenant, metrics } = data;
  const cards = [
    { label: "Orders today", value: metrics.ordersToday },
    { label: "Orders last 7 days", value: metrics.ordersLast7 },
    {
      label: "Revenue today",
      value: <Money amount={metrics.revenueToday} currency={tenant.currency} />,
    },
    {
      label: "Revenue last 7 days",
      value: <Money amount={metrics.revenueLast7} currency={tenant.currency} />,
    },
    { label: "Active sessions", value: metrics.activeSessions },
    { label: "Awaiting kitchen", value: metrics.awaitingKitchen },
    {
      label: "Low stock alerts",
      value: metrics.lowStockAlerts,
      alert: metrics.lowStockAlerts > 0,
    },
    { label: "Tables", value: metrics.tableCount },
    { label: "Staff", value: metrics.staffCount },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <AppCard key={c.label}>
            <p className="text-sm text-muted-foreground">{c.label}</p>
            <p
              className={`mt-1 text-2xl font-bold ${
                c.alert ? "text-destructive" : ""
              }`}
            >
              {c.value}
            </p>
          </AppCard>
        ))}
      </div>
      <AppCard>
        <p className="text-sm text-muted-foreground">
          Timezone: {tenant.timezone}
        </p>
        <p className="text-sm text-muted-foreground">
          Subscription: {tenant.subscriptionPlan ?? "—"}
        </p>
        <p className="text-sm text-muted-foreground">
          Created: {new Date(tenant.createdAt).toLocaleString()}
        </p>
        <p className="text-sm text-muted-foreground">
          Last activity:{" "}
          {metrics.lastActivityAt
            ? new Date(metrics.lastActivityAt).toLocaleString()
            : "No activity yet"}
        </p>
      </AppCard>
      <OwnerAccessCard tenantId={tenant.id} owner={tenant.owner} />
    </div>
  );
}

function OwnerAccessCard({
  tenantId,
  owner,
}: {
  tenantId: string;
  owner: TenantDetailData["tenant"]["owner"];
}) {
  const [newPassword, setNewPassword] = useState("password");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function resetPassword() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/platform/tenants/${tenantId}/owner/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword }),
        }
      );
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Failed to reset owner password");
        return;
      }
      setMessage("Owner password updated");
      setNewPassword("password");
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppCard className="space-y-4">
      <div>
        <h3 className="font-medium">Owner access</h3>
        {owner ? (
          <p className="text-sm text-muted-foreground">
            {owner.name} · {owner.email}
          </p>
        ) : (
          <p className="text-sm text-destructive">No active owner account found.</p>
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <div className="flex flex-wrap gap-2">
        <input
          type="password"
          className={`${inputClass} max-w-sm`}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Set temporary password"
          disabled={!owner || saving}
        />
        <button
          type="button"
          disabled={!owner || saving}
          onClick={() => resetPassword()}
          className="rounded-pill bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Resetting..." : "Reset owner password"}
        </button>
      </div>
    </AppCard>
  );
}

function BrandingTab({
  tenant,
  onSaved,
}: {
  tenant: TenantDetailData["tenant"];
  onSaved: () => void;
}) {
  const [name, setName] = useState(tenant.name);
  const [tenantType, setTenantType] = useState<TenantType>(tenant.tenantType);
  const [onboardingStatus, setOnboardingStatus] = useState<TenantStatus>(
    tenant.onboardingStatus
  );
  const [subscriptionPlan, setSubscriptionPlan] = useState(
    tenant.subscriptionPlan ?? ""
  );
  const [notes, setNotes] = useState(tenant.notes ?? "");
  const [logoUrl, setLogoUrl] = useState(tenant.logoUrl ?? "");
  const [primaryColor, setPrimaryColor] = useState(tenant.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(tenant.secondaryColor);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/platform/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          tenantType,
          onboardingStatus,
          subscriptionPlan: subscriptionPlan || null,
          notes: notes || null,
          logoUrl: logoUrl || "",
          primaryColor,
          secondaryColor,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(json.error ?? "Failed to save");
        return;
      }
      setMessage("Saved");
      onSaved();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}

      <AppCard className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Name</label>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Type</label>
            <select
              className={inputClass}
              value={tenantType}
              onChange={(e) => setTenantType(e.target.value as TenantType)}
            >
              {Object.values(TenantType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Status
            </label>
            <select
              className={inputClass}
              value={onboardingStatus}
              onChange={(e) =>
                setOnboardingStatus(e.target.value as TenantStatus)
              }
            >
              {Object.values(TenantStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            Subscription plan
          </label>
          <input
            className={inputClass}
            value={subscriptionPlan}
            onChange={(e) => setSubscriptionPlan(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Notes</label>
          <textarea
            className={inputClass}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </AppCard>

      <AppCard className="space-y-4">
        <h3 className="font-medium">Branding</h3>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            Logo URL
          </label>
          <input
            className={inputClass}
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Primary color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-9 w-12 rounded border border-card-border"
              />
              <input
                className={inputClass}
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Secondary color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-9 w-12 rounded border border-card-border"
              />
              <input
                className={inputClass}
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
              />
            </div>
          </div>
        </div>
      </AppCard>

      <button
        type="button"
        onClick={() => save()}
        disabled={saving}
        className="rounded-pill bg-primary px-6 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save changes"}
      </button>
    </div>
  );
}

function ActivityTab({ tenantId }: { tenantId: string }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void fetch(`/api/platform/tenants/${tenantId}/activity?limit=50`)
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((json: { entries?: ActivityEntry[] }) => {
        setEntries(json.entries ?? []);
      })
      .finally(() => setLoading(false));
  }, [tenantId]);

  if (loading) {
    return <p className="text-muted-foreground">Loading activity...</p>;
  }

  if (entries.length === 0) {
    return (
      <AppCard>
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      </AppCard>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <AppCard key={entry.id}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">{entry.action}</p>
              <p className="text-sm text-muted-foreground">
                {entry.entityType}
                {entry.actorName ? ` · ${entry.actorName}` : ""}
              </p>
            </div>
            <span className="text-sm text-muted-foreground">
              {new Date(entry.createdAt).toLocaleString()}
            </span>
          </div>
        </AppCard>
      ))}
    </div>
  );
}
