"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { StaffRole } from "@prisma/client";
import { t, type SupportedLocale } from "@/lib/i18n";
import { roleDashboardPath } from "@/lib/auth/role-routes";

interface StaffLoginFormProps {
  slug: string;
  locale?: SupportedLocale;
}

export function StaffLoginForm({ slug, locale = "en" }: StaffLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantSlug: slug, email, password }),
      });

      if (!response.ok) {
        setError(t("staff.login_error", locale));
        return;
      }

      const data = (await response.json()) as { role: StaffRole };
      router.push(roleDashboardPath(slug, data.role));
      router.refresh();
    } catch {
      setError(t("staff.login_error", locale));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-foreground"
        >
          {t("staff.email", locale)}
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-foreground"
        >
          {t("staff.password", locale)}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-pill bg-primary px-6 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? t("common.loading", locale) : t("staff.sign_in", locale)}
      </button>
    </form>
  );
}
