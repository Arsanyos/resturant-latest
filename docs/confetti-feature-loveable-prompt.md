# Loveable Prompt — Confetti Celebration Feature (Mulasport)

> **Chosen animation:** **Side Cannons** confetti (from [Magic UI](https://magicui.design/docs/components/confetti)),
> built on [`canvas-confetti`](https://www.npmjs.com/package/canvas-confetti).
> It fires from the **left and right screen edges at mid-height** for ~3 seconds,
> keeping the center of the screen clear so it never blocks betting activity.

---

## Goal

Add a lightweight **confetti celebration** to the Mulasport app that gives users instant
gratification when they hit key milestones. It must feel exciting but never get in the way of
betting. This is a **time-limited promotional feature for the 2026 FIFA World Cup**.

## Why "Side Cannons" (animation selection)

Evaluated against the Magic UI variants:

- **Fireworks** bursts across the center/top of the screen for 5s → covers content, risks
  blocking the betting view. ❌
- **Stars / Custom Shapes / Emoji** are novelty effects, heavier and less "clean celebration." ❌
- **Side Cannons** runs for **3 seconds**, fires only from the **edges**, leaves the center clear,
  and accepts a custom **brand color array** → exciting but not intrusive, mobile-friendly, and
  does not block betting. ✅ **Selected.**

## Where it triggers (Milestones)

Fire one confetti celebration on the **success state** of each event (not on button click,
not on pending/error/retry):

1. **Successful login** — user authenticated and lands on home/dashboard.
2. **Successful deposit** — deposit confirmed (status = completed).
3. **Successful bet placed** — bet slip confirmed and accepted.
4. **Successful withdrawal** — withdrawal request successfully submitted/confirmed.

## User Experience Principles (hard requirements)

- **Exciting but not intrusive** — edge cannons, no full-screen takeover.
- **Lightweight** — performant, target 60fps on mid-range mobile, minimal bundle/CPU/GPU impact.
- **Mobile-first** — tuned for mobile screens first, then scaled up to desktop.
- **Duration: 3 seconds** (within the 3–5s max) — auto-completes and cleans up.
- **Easily dismissible** — a tap/click anywhere clears it instantly; never traps interaction.
- **Does NOT block betting** — the confetti canvas is **non-interactive** (`pointer-events: none`),
  overlaid above content so users can keep tapping, scrolling, and placing bets while it plays.
- **Respects `prefers-reduced-motion`** — show a minimal effect or skip when reduced motion is on.

## Visual / Brand

- Use **Mulasport brand colors** for the confetti `colors` array (pull from existing theme tokens;
  do not introduce random colors). Replace the placeholder palette below with the real brand hexes.
- Confetti launches from the left edge (angle 60°) and right edge (angle 120°) at mid-height.

## Technical Implementation

- Library: **`canvas-confetti`** (lightest/most performant for mobile).
- Build a **reusable hook/util** (e.g. `useCelebration()` / `celebrate()`) triggered from all four
  milestone success callbacks — avoid duplicating logic in four places.
- Render in a **top-level portal/overlay** with a high z-index, `pointer-events: none`.
- Auto-cleanup: the animation loop stops after 3s; remove canvas/listeners (no memory leaks).
- Works on both **desktop and mobile** viewports.

### Reference implementation (Side Cannons)

```tsx
"use client";

import confetti from "canvas-confetti";

// TODO: replace with real Mulasport brand colors
const MULASPORT_COLORS = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];

export function celebrate() {
  // Respect reduced-motion preference
  if (typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const end = Date.now() + 3 * 1000; // 3 seconds

  const frame = () => {
    if (Date.now() > end) return;

    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      startVelocity: 60,
      origin: { x: 0, y: 0.5 },
      colors: MULASPORT_COLORS,
      zIndex: 9999,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      startVelocity: 60,
      origin: { x: 1, y: 0.5 },
      colors: MULASPORT_COLORS,
      zIndex: 9999,
      disableForReducedMotion: true,
    });

    requestAnimationFrame(frame);
  };

  frame();
}
```

Then call `celebrate()` inside each milestone's success handler, e.g.:

```ts
onLoginSuccess(() => isPromoActive() && celebrate());
onDepositConfirmed(() => isPromoActive() && celebrate());
onBetPlaced(() => isPromoActive() && celebrate());
onWithdrawalConfirmed(() => isPromoActive() && celebrate());
```

## Time-Limited Activation (Feature Flag)

- Valid only **until 19 July 2026** (end of day), for the duration of the 2026 FIFA World Cup,
  for **all registered Mulasport accounts**.
- Gate behind a date check so it auto-disables with no code changes after the end date:

```ts
const PROMO_END = new Date("2026-07-19T23:59:59"); // configurable via env
export const isPromoActive = () => new Date() <= PROMO_END;
```

- Make start/end dates configurable (env var or config constant).

## Acceptance Criteria

- [ ] Confetti fires once on each: successful login, deposit, bet placed, withdrawal.
- [ ] Does NOT fire on failures, cancellations, or pending states.
- [ ] Animation lasts ~3 seconds, then fully cleans up.
- [ ] Users can place bets / interact with the UI uninterrupted while it plays (`pointer-events: none`).
- [ ] Tapping/clicking dismisses it instantly.
- [ ] Uses Mulasport brand colors.
- [ ] Looks and performs well on both mobile and desktop.
- [ ] Honors `prefers-reduced-motion`.
- [ ] Automatically disabled after 19 July 2026 via the date flag.

## Out of Scope

- No sound effects unless explicitly requested.
- No full-screen modal, popup, or anything that pauses/blocks the betting flow.
