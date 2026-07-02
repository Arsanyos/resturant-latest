"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { TenantType } from "@prisma/client";
import { AppCard } from "@/components/shared/AppCard";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const inputClass =
  "w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function TenantCreateForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [tenantType, setTenantType] = useState<TenantType>(TenantType.CAFE);
  const [currency, setCurrency] = useState("ETB");
  const [timezone, setTimezone] = useState("Africa/Addis_Ababa");
  const [primaryColor, setPrimaryColor] = useState("#F97316");
  const [secondaryColor, setSecondaryColor] = useState("#111827");
  const [logoUrl, setLogoUrl] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState("");

  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("password");

  const [seedDefaultTables, setSeedDefaultTables] = useState(true);
  const [defaultTableCount, setDefaultTableCount] = useState(12);
  const [seedStarterMenu, setSeedStarterMenu] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: effectiveSlug,
          tenantType,
          currency,
          timezone,
          primaryColor,
          secondaryColor,
          logoUrl: logoUrl || undefined,
          subscriptionPlan: subscriptionPlan || undefined,
          owner: {
            name: ownerName,
            email: ownerEmail,
            password: ownerPassword,
          },
          setup: {
            seedDefaultTables,
            defaultTableCount,
            seedStarterMenu,
          },
        }),
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(json.error ?? "Failed to create tenant");
        return;
      }

      const tenant = (await res.json()) as { id: string };
      router.push(`/platform/tenants/${tenant.id}`);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold">Create tenant</h2>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <AppCard className="space-y-4">
        <h3 className="font-medium">Business</h3>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            Business name
          </label>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Booty Cafe"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Slug</label>
          <input
            className={inputClass}
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="booty-cafe"
            required
          />
          <p className="text-xs text-muted-foreground">
            Customer URL: /r/{effectiveSlug || "your-slug"}
          </p>
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
              Currency
            </label>
            <input
              className={inputClass}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            Timezone
          </label>
          <input
            className={inputClass}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            Subscription plan (optional)
          </label>
          <input
            className={inputClass}
            value={subscriptionPlan}
            onChange={(e) => setSubscriptionPlan(e.target.value)}
            placeholder="Starter / Professional / Premium"
          />
        </div>
      </AppCard>

      <AppCard className="space-y-4">
        <h3 className="font-medium">Branding</h3>
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
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            Logo URL (optional)
          </label>
          <input
            className={inputClass}
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
      </AppCard>

      <AppCard className="space-y-4">
        <h3 className="font-medium">Owner account</h3>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            Owner name
          </label>
          <input
            className={inputClass}
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Owner email
            </label>
            <input
              type="email"
              className={inputClass}
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Temporary password
            </label>
            <input
              className={inputClass}
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              required
            />
          </div>
        </div>
      </AppCard>

      <AppCard className="space-y-4">
        <h3 className="font-medium">Initial setup</h3>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={seedDefaultTables}
            onChange={(e) => setSeedDefaultTables(e.target.checked)}
          />
          Seed default tables
        </label>
        {seedDefaultTables ? (
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Number of tables
            </label>
            <input
              type="number"
              min={0}
              max={200}
              className={`${inputClass} max-w-32`}
              value={defaultTableCount}
              onChange={(e) => setDefaultTableCount(Number(e.target.value))}
            />
          </div>
        ) : null}
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={seedStarterMenu}
            onChange={(e) => setSeedStarterMenu(e.target.checked)}
          />
          Seed starter menu (optional)
        </label>
      </AppCard>

      <button
        type="submit"
        disabled={saving}
        className="rounded-pill bg-primary px-6 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Creating..." : "Create tenant"}
      </button>
    </form>
  );
}
