import Link from "next/link";
import { t } from "@/lib/i18n";

export default function RestaurantNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6">
      <h1 className="text-2xl font-bold text-foreground">
        {t("common.not_found")}
      </h1>
      <Link
        href="/"
        className="rounded-pill bg-primary px-6 py-3 text-primary-foreground"
      >
        {t("common.back_home")}
      </Link>
    </div>
  );
}
