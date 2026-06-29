"use client";

import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/shared/AppCard";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/use-locale";

type Settings = {
  name: string;
  logoUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  telegramUrl: string | null;
  xUrl: string | null;
  taxPct: number;
  servicePct: number;
  timezone: string;
  manualOpen: boolean | null;
  primaryColor: string;
  secondaryColor: string;
};

async function uploadLogo(slug: string, file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`/api/restaurants/${slug}/admin/logo`, {
    method: "POST",
    body: form,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Upload failed");
  }
  return json.url as string;
}

export function SettingsForm({ slug }: { slug: string }) {
  const { locale } = useLocale();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/restaurants/${slug}/admin/settings`);
    if (res.ok) {
      const data = await res.json();
      setSettings(data);
      setLogoFile(null);
      setLogoPreview(data.logoUrl ?? null);
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
    try {
      let logoUrl = settings.logoUrl;
      if (logoFile) {
        logoUrl = await uploadLogo(slug, logoFile);
      }

      const res = await fetch(`/api/restaurants/${slug}/admin/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, logoUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setLogoFile(null);
        setLogoPreview(data.logoUrl ?? null);
        setMessage(t("admin.settings_saved", locale));
      } else {
        setMessage(t("admin.error", locale));
      }
    } catch {
      setMessage(t("admin.error", locale));
    } finally {
      setSaving(false);
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
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">
            {t("admin.brand_logo", locale)}
          </p>
          {(logoPreview || settings.logoUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoPreview ?? settings.logoUrl ?? ""}
              alt=""
              className="h-16 w-16 rounded-lg border border-card-border object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-card-border bg-muted text-lg font-semibold text-muted-foreground">
              {settings.name.charAt(0).toUpperCase()}
            </div>
          )}
          <label className="block">
            <span className="text-sm text-muted-foreground">
              {t("admin.logo_upload", locale)}
            </span>
            <input
              type="file"
              accept="image/*"
              className="mt-1 w-full text-sm"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setLogoFile(file);
                setLogoPreview(
                  file ? URL.createObjectURL(file) : settings.logoUrl
                );
              }}
            />
          </label>
          <label className="block">
            <span className="text-sm text-muted-foreground">
              {t("admin.logo_url", locale)}
            </span>
            <input
              className="mt-1 w-full rounded-lg border border-card-border px-3 py-2 text-sm"
              placeholder="https://"
              value={settings.logoUrl ?? ""}
              onChange={(e) => {
                const value = e.target.value || null;
                setSettings({ ...settings, logoUrl: value });
                if (!logoFile) {
                  setLogoPreview(value);
                }
              }}
            />
          </label>
          {settings.logoUrl || logoPreview ? (
            <button
              type="button"
              className="text-sm text-muted-foreground underline"
              onClick={() => {
                setLogoFile(null);
                setLogoPreview(null);
                setSettings({ ...settings, logoUrl: null });
              }}
            >
              {t("admin.remove_logo", locale)}
            </button>
          ) : null}
        </div>
        <div className="space-y-3 border-t border-card-border pt-4">
          <p className="text-sm font-medium text-foreground">
            {t("admin.social_links", locale)}
          </p>
          {(
            [
              ["instagramUrl", "admin.social_instagram"],
              ["facebookUrl", "admin.social_facebook"],
              ["tiktokUrl", "admin.social_tiktok"],
              ["telegramUrl", "admin.social_telegram"],
              ["xUrl", "admin.social_x"],
            ] as const
          ).map(([field, labelKey]) => (
            <label key={field} className="block">
              <span className="text-sm text-muted-foreground">
                {t(labelKey, locale)}
              </span>
              <input
                className="mt-1 w-full rounded-lg border border-card-border px-3 py-2 text-sm"
                placeholder="https://"
                value={settings[field] ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    [field]: e.target.value || null,
                  })
                }
              />
            </label>
          ))}
        </div>
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
