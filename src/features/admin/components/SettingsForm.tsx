"use client";

import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/shared/AppCard";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/use-locale";

type Settings = {
  name: string;
  taxPct: number;
  servicePct: number;
  timezone: string;
  manualOpen: boolean | null;
  primaryColor: string;
  secondaryColor: string;
};

export function SettingsForm({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/restaurants/${slug}/admin/settings`);
    if (res.ok) {
      setSettings(await res.json());
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/restaurants/${slug}/admin/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (res.ok) {
      setSettings(await res.json());
      setMessage(t("admin.settings_saved", locale));
    } else {
      setMessage(t("admin.error", locale));
    }
  }

  if (loading || !settings) {
    return <p className="text-muted-foreground">{t("admin.loading", locale)}</p>;
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">{t("admin.settings", locale)}</h2>
      <AppCard className="max-w-lg space-y-4">
        <label className="block">
          <span className="text-sm text-muted-foreground">{t("admin.restaurant_name", locale)}</span>
          <input
            className="mt-1 w-full rounded-lg border border-card-border px-3 py-2 text-sm"
            value={settings.name}
            onChange={(e) => setSettings({ ...settings, name: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted-foreground">{t("admin.tax_pct", locale)}</span>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-card-border px-3 py-2 text-sm"
            value={settings.taxPct}
            onChange={(e) =>
              setSettings({ ...settings, taxPct: Number(e.target.value) })
            }
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted-foreground">{t("admin.service_pct", locale)}</span>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-card-border px-3 py-2 text-sm"
            value={settings.servicePct}
            onChange={(e) =>
              setSettings({ ...settings, servicePct: Number(e.target.value) })
            }
          />
        </label>
        <label className="block">
          <span className="text-sm text-muted-foreground">{t("admin.manual_open", locale)}</span>
          <select
            className="mt-1 w-full rounded-lg border border-card-border px-3 py-2 text-sm"
            value={
              settings.manualOpen === null
                ? "auto"
                : settings.manualOpen
                  ? "open"
                  : "closed"
            }
            onChange={(e) => {
              const v = e.target.value;
              setSettings({
                ...settings,
                manualOpen: v === "auto" ? null : v === "open",
              });
            }}
          >
            <option value="auto">{t("admin.open_auto", locale)}</option>
            <option value="open">{t("admin.force_open", locale)}</option>
            <option value="closed">{t("admin.force_closed", locale)}</option>
          </select>
        </label>
        <p className="text-xs text-muted-foreground">{t("admin.telebirr_placeholder", locale)}</p>
        <button
          type="button"
          disabled={saving}
          onClick={() => save()}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          {t("admin.save", locale)}
        </button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </AppCard>
    </div>
  );
}
