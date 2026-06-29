"use client";

import Script from "next/script";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getAdSlots } from "@/lib/ads/config";
import { cn } from "@/lib/utils";

const SLIDE_MS = 5000;

export function AdSenseCarousel() {
  const slots = useMemo(() => getAdSlots(), []);
  const [index, setIndex] = useState(0);
  const clientId = slots.find((s) => s.clientId)?.clientId ?? "";
  const count = slots.length;

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % count);
  }, [count]);

  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(goNext, SLIDE_MS);
    return () => clearInterval(timer);
  }, [count, goNext]);

  useEffect(() => {
    if (!clientId) return;
    try {
      const w = window as Window & { adsbygoogle?: unknown[] };
      w.adsbygoogle = w.adsbygoogle || [];
      w.adsbygoogle.push({});
    } catch {
      // AdSense may reject duplicate pushes in strict mode
    }
  }, [index, clientId]);

  if (count === 0) return null;

  return (
    <>
      {clientId ? (
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      ) : null}

      <section
        className="relative overflow-hidden border-b border-card-border bg-muted/30"
        aria-label="Advertisement"
      >
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="flex h-20 w-full shrink-0 items-center justify-center px-4"
            >
              {slot.clientId && slot.slotId ? (
                <ins
                  className="adsbygoogle block w-full max-w-3xl"
                  style={{ display: "block", minHeight: 50 }}
                  data-ad-client={slot.clientId}
                  data-ad-slot={slot.slotId}
                  data-ad-format="horizontal"
                  data-full-width-responsive="true"
                />
              ) : (
                <div className="flex h-14 w-full max-w-3xl items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-card/80 text-xs font-medium tracking-wide text-muted-foreground">
                  Ad spot
                </div>
              )}
            </div>
          ))}
        </div>

        {count > 1 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-1.5 flex justify-center gap-1.5">
            {slots.map((slot, i) => (
              <button
                key={slot.id}
                type="button"
                aria-label={`Ad slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "pointer-events-auto h-1.5 rounded-full transition-all",
                  i === index
                    ? "w-4 bg-primary"
                    : "w-1.5 bg-muted-foreground/35"
                )}
              />
            ))}
          </div>
        ) : null}
      </section>
    </>
  );
}
