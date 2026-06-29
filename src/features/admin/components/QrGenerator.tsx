"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { AppCard } from "@/components/shared/AppCard";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/use-locale";

export function QrGenerator({
  slug,
  tableNumber,
  label,
}: {
  slug: string;
  tableNumber: number;
  label: string;
}) {
  const { locale } = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const customerUrl = `${window.location.origin}/r/${slug}/t/${tableNumber}`;
    setUrl(customerUrl);
    if (canvasRef.current) {
      void QRCode.toCanvas(canvasRef.current, customerUrl, { width: 160 });
    }
  }, [slug, tableNumber]);

  async function downloadPng() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `table-${tableNumber}-qr.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(url);
  }

  return (
    <AppCard className="inline-block">
      <p className="mb-2 text-sm font-medium">
        {t("admin.table", locale)} {tableNumber} — {label}
      </p>
      <canvas ref={canvasRef} className="rounded-lg" />
      <p className="mt-2 max-w-[200px] break-all text-xs text-muted-foreground">
        {url}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => downloadPng()}
          className="rounded-lg border border-card-border px-2 py-1 text-xs"
        >
          {t("admin.download_qr", locale)}
        </button>
        <button
          type="button"
          onClick={() => copyUrl()}
          className="rounded-lg border border-card-border px-2 py-1 text-xs"
        >
          {t("admin.copy_url", locale)}
        </button>
      </div>
    </AppCard>
  );
}
