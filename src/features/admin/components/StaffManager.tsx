"use client";

import { StaffRole } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/shared/AppCard";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/use-locale";
import { createStaffSchema } from "@/lib/validation/staff-admin";
import { ShiftAssignmentForm } from "./ShiftAssignmentForm";

type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
};

type CurrentStaff = {
  staffId: string;
  role: StaffRole;
  name: string;
  email: string;
};

export function StaffManager() {
  const { locale } = useLocale();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password");
  const [role, setRole] = useState<StaffRole>(StaffRole.WAITER);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<CurrentStaff | null>(null);
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [resettingStaffId, setResettingStaffId] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [staffRes, meRes] = await Promise.all([
      fetch("/api/staff"),
      fetch("/api/auth/staff/me"),
    ]);
    if (staffRes.ok) {
      const json = await staffRes.json();
      const members = json.staff ?? [];
      setStaff(members);
      setResetPasswords(
        Object.fromEntries(members.map((member: StaffMember) => [member.id, "password"]))
      );
    }
    if (meRes.ok) {
      setCurrentStaff(await meRes.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createStaff() {
    setError(null);
    setMessage(null);

    const payload = {
      name: name.trim(),
      email: email.trim(),
      password,
      role,
    };
    const parsed = createStaffSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("admin.error", locale));
      return;
    }

    setSaving(true);
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    setSaving(false);

    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? t("admin.error", locale));
      return;
    }

    setName("");
    setEmail("");
    setPassword("password");
    setMessage(t("admin.staff_created", locale));
    await load();
  }

  async function deactivate(id: string) {
    await fetch(`/api/staff/${id}`, { method: "DELETE" });
    await load();
  }

  async function resetStaffPassword(member: StaffMember) {
    setError(null);
    setMessage(null);
    setResettingStaffId(member.id);
    const password = resetPasswords[member.id]?.trim() || "";

    const res = await fetch(`/api/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setResettingStaffId(null);

    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? t("admin.error", locale));
      return;
    }

    setMessage(`Password reset for ${member.name}`);
    setResetPasswords((prev) => ({ ...prev, [member.id]: "password" }));
  }

  async function changeOwnPassword() {
    setPasswordError(null);
    setPasswordMessage(null);
    setChangingPassword(true);

    const res = await fetch("/api/auth/staff/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    });

    setChangingPassword(false);

    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setPasswordError(json.error ?? t("admin.error", locale));
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("Your password was updated");
  }

  if (loading) {
    return <p className="text-muted-foreground">{t("admin.loading", locale)}</p>;
  }

  const waiters = staff.filter((s) => s.role === StaffRole.WAITER && s.isActive);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{t("admin.staff", locale)}</h2>

      <AppCard>
        <h3 className="mb-3 font-medium">Change my password</h3>
        {passwordError ? (
          <p className="mb-3 text-sm text-destructive">{passwordError}</p>
        ) : null}
        {passwordMessage ? (
          <p className="mb-3 text-sm text-muted-foreground">{passwordMessage}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <input
            className="rounded-lg border border-card-border px-3 py-2 text-sm"
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <input
            className="rounded-lg border border-card-border px-3 py-2 text-sm"
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <input
            className="rounded-lg border border-card-border px-3 py-2 text-sm"
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button
            type="button"
            disabled={changingPassword || !currentStaff}
            onClick={() => changeOwnPassword()}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {changingPassword ? "Updating..." : "Change password"}
          </button>
        </div>
        {currentStaff ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Signed in as {currentStaff.name} ({currentStaff.email})
          </p>
        ) : null}
      </AppCard>

      <AppCard>
        <h3 className="mb-3 font-medium">{t("admin.create_staff", locale)}</h3>
        {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
        {message ? (
          <p className="mb-3 text-sm text-muted-foreground">{message}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <input
            className="rounded-lg border border-card-border px-3 py-2 text-sm"
            placeholder={t("admin.staff_name", locale)}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="rounded-lg border border-card-border px-3 py-2 text-sm"
            type="email"
            placeholder={t("admin.staff_email", locale)}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="rounded-lg border border-card-border px-3 py-2 text-sm"
            type="password"
            placeholder={t("admin.staff_password", locale)}
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
            disabled={saving}
            onClick={() => createStaff()}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
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
              <div className="flex flex-wrap items-center justify-end gap-2">
                {member.isActive ? (
                  <>
                    <input
                      className="rounded-lg border border-card-border px-3 py-2 text-sm"
                      type="password"
                      placeholder="Temporary password"
                      value={resetPasswords[member.id] ?? ""}
                      onChange={(e) =>
                        setResetPasswords((prev) => ({
                          ...prev,
                          [member.id]: e.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => resetStaffPassword(member)}
                      disabled={resettingStaffId === member.id}
                      className="rounded-lg border border-card-border px-3 py-1 text-sm text-foreground"
                    >
                      {resettingStaffId === member.id
                        ? "Resetting..."
                        : "Reset password"}
                    </button>
                  </>
                ) : null}
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
            </div>
          </AppCard>
        ))}
      </div>
    </div>
  );
}
