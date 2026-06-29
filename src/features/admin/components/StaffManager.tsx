"use client";

import { StaffRole } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/shared/AppCard";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/use-locale";
import { ShiftAssignmentForm } from "./ShiftAssignmentForm";

type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
};

export function StaffManager() {
  const { locale } = useLocale();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password");
  const [role, setRole] = useState<StaffRole>(StaffRole.WAITER);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/staff");
    if (res.ok) {
      const json = await res.json();
      setStaff(json.staff ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createStaff() {
    if (!name || !email) return;
    await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    setName("");
    setEmail("");
    await load();
  }

  async function deactivate(id: string) {
    await fetch(`/api/staff/${id}`, { method: "DELETE" });
    await load();
  }

  if (loading) {
    return <p className="text-muted-foreground">{t("admin.loading", locale)}</p>;
  }

  const waiters = staff.filter((s) => s.role === StaffRole.WAITER && s.isActive);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{t("admin.staff", locale)}</h2>

      <AppCard>
        <h3 className="mb-3 font-medium">{t("admin.create_staff", locale)}</h3>
        <div className="flex flex-wrap gap-2">
          <input
            className="rounded-lg border border-card-border px-3 py-2 text-sm"
            placeholder={t("admin.staff_name", locale)}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="rounded-lg border border-card-border px-3 py-2 text-sm"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="rounded-lg border border-card-border px-3 py-2 text-sm"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <select
            className="rounded-lg border border-card-border px-3 py-2 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
          >
            {Object.values(StaffRole).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => createStaff()}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            {t("admin.save", locale)}
          </button>
        </div>
      </AppCard>

      <ShiftAssignmentForm waiters={waiters} />

      <div className="space-y-2">
        {staff.map((member) => (
          <AppCard key={member.id}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-muted-foreground">
                  {member.email} · {member.role}
                  {!member.isActive ? ` · ${t("admin.inactive", locale)}` : ""}
                </p>
              </div>
              {member.isActive && member.role !== StaffRole.OWNER ? (
                <button
                  type="button"
                  onClick={() => deactivate(member.id)}
                  className="rounded-lg border border-destructive px-3 py-1 text-sm text-destructive"
                >
                  {t("admin.deactivate", locale)}
                </button>
              ) : null}
            </div>
          </AppCard>
        ))}
      </div>
    </div>
  );
}
