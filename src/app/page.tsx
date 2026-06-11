import Link from "next/link";
import { DEMO_RESTAURANT_SLUG } from "@/lib/constants";
import { t } from "@/lib/i18n";

const slug = DEMO_RESTAURANT_SLUG;

const roles = [
  {
    key: "role.customer",
    href: `/r/${slug}/t/1`,
    color: "bg-primary",
  },
  {
    key: "role.waiter",
    href: `/r/${slug}/waiter`,
    color: "bg-warning",
  },
  {
    key: "role.kitchen",
    href: `/r/${slug}/kitchen`,
    color: "bg-secondary",
  },
  {
    key: "role.cashier",
    href: `/r/${slug}/cashier`,
    color: "bg-success",
  },
  {
    key: "role.admin",
    href: `/r/${slug}/admin`,
    color: "bg-danger",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-card-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {t("app.name")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("app.subtitle")}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-4xl font-bold leading-tight text-foreground">
              {t("landing.hero")}
            </h2>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href={`/r/${slug}/t/1`}
                className="rounded-pill bg-primary px-6 py-3 font-medium text-primary-foreground transition hover:opacity-90"
              >
                {t("landing.try_customer")}
              </Link>
              <Link
                href={`/r/${slug}/kitchen`}
                className="rounded-pill border border-card-border bg-card px-6 py-3 font-medium text-foreground transition hover:bg-muted"
              >
                {t("landing.open_kitchen")}
              </Link>
            </div>
          </div>

          <div className="rounded-card border border-card-border bg-card p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">Demo preview</p>
            <p className="mt-2 text-3xl font-bold text-foreground">
              ETB 12,450
            </p>
            <p className="text-sm text-muted-foreground">Today&apos;s revenue</p>
            <div className="mt-6 grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-12 items-center justify-center rounded-xl border border-card-border bg-muted text-sm font-medium"
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {roles.map((role) => (
            <Link
              key={role.key}
              href={role.href}
              className="overflow-hidden rounded-card border border-card-border bg-card transition hover:shadow-md"
            >
              <div className={`h-2 ${role.color}`} />
              <div className="p-4">
                <p className="font-medium text-foreground">{t(role.key)}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="mt-12 bg-secondary px-6 py-8 text-secondary-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-8">
          <span>{t("feature.mobile_first")}</span>
          <span>{t("feature.tablet_kitchen")}</span>
          <span>{t("feature.bilingual")}</span>
        </div>
      </footer>
    </div>
  );
}
