"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/platform/dashboard", label: "Dashboard" },
  { href: "/platform/tenants", label: "Tenants" },
  { href: "/platform/system", label: "System" },
] as const;

export function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminName, setAdminName] = useState("");

  useEffect(() => {
    void fetch("/api/platform/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { name?: string } | null) => {
        if (json?.name) setAdminName(json.name);
      });
  }, []);

  async function logout() {
    await fetch("/api/platform/auth/logout", { method: "POST" });
    router.push("/platform/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-56 shrink-0 flex-col border-r border-card-border bg-card">
        <div className="border-b border-card-border p-4">
          <p className="text-sm font-bold text-foreground">Platform Admin</p>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Control Plane
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active =
              item.href === "/platform/tenants"
                ? pathname.startsWith("/platform/tenants")
                : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-card-border bg-card px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Platform Control Plane
            </h1>
            {adminName ? (
              <p className="text-sm text-muted-foreground">{adminName}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-lg border border-card-border px-3 py-1.5 text-sm text-foreground transition hover:bg-muted"
          >
            Sign out
          </button>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
