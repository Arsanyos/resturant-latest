"use client";

import React, { useEffect, useState } from "react";
import { StaffRole } from "@prisma/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/use-locale";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "", key: "admin.title" },
  { href: "/menu", key: "admin.menu" },
  { href: "/inventory", key: "admin.inventory" },
  { href: "/tables", key: "admin.tables" },
  { href: "/staff", key: "admin.staff" },
  { href: "/settings", key: "admin.settings" },
  { href: "/audit-log", key: "admin.audit_log" },
] as const;

export function AdminSidebar({ slug }: { slug: string }) {
  const pathname = usePathname();
  const { locale, setLocale } = useLocale();
  const base = `/r/${slug}/admin`;

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-card-border bg-card">
      <div className="border-b border-card-border p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {t("admin.nav_label", locale)}
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map((item) => {
          const href = `${base}${item.href}`;
          const active =
            item.href === ""
              ? pathname === base
              : pathname.startsWith(href);
          return (
            <Link
              key={item.key}
              href={href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              )}
            >
              {t(item.key, locale)}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-card-border p-3">
        <LanguageToggle locale={locale} onChange={setLocale} />
      </div>
    </aside>
  );
}

export function AdminHeader({
  restaurantName,
  staffName,
}: {
  restaurantName: string;
  staffName: string;
}) {
  return (
    <header className="flex items-center justify-between border-b border-card-border bg-card px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{restaurantName}</h1>
        {staffName ? (
          <p className="text-sm text-muted-foreground">{staffName}</p>
        ) : null}
      </div>
      <RoleBadge role={StaffRole.OWNER} />
    </header>
  );
}

export function AdminLayout({
  slug,
  restaurantName,
  children,
}: {
  slug: string;
  restaurantName: string;
  children: React.ReactNode;
}) {
  const [staffName, setStaffName] = useState("");

  useEffect(() => {
    void fetch("/api/auth/staff/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { name?: string } | null) => {
        if (json?.name) setStaffName(json.name);
      });
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar slug={slug} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader restaurantName={restaurantName} staffName={staffName} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
