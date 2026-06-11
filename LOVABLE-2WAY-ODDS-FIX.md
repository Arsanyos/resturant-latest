# Fix: Show 2-way odds (Darts / Tennis) on Classic match rows

## Problem

Darts and some tennis matches have valid odds in the API (`featured_market_instances`) but **no odds buttons** appear on `ClassicMatchRow`. The match still shows `+12` from `item_count`.

**Example (API has data, UI shows nothing):**
- Event: `Jose Justicia v Brian Raman`
- `total_odds_count`: 12
- `featured_market_instances`: 2 items, `Match Winner (2 way)`, odds `2.5` and `1.51`
- `outcome_id`: `"25"` / `"26"` (not `"1"` / `"2"` / `"3"`)
- `outcome_name`: player names (`"Justicia, J"`, `"Raman, B"`), not `"Home"` / `"Away"`

**Root cause:** `win_odds` is built and sorted using **football-only** rules (1/X/2 + Double Chance). 2-way markets are dropped before `ClassicMatchRow` renders.

---

## Goals

1. Show odds for **2-way sports** (darts, tennis, etc.) on `ClassicMatchRow`.
2. **Do not change** existing football 3-way + double chance behavior.
3. **Bet slip must keep working** — same `addSelection` / `removeSelection` / `isSelected` flow, correct labels and `gamepick` ids.

---

## Do NOT change

- `ClassicSportsSection` layout, filters, grouping, pagination
- `SportsDataContext` polling, caching, live score merge
- Football odds grid: **6 columns** when 6 outcomes exist (`1 | X | 2 | 1X | X2 | 12`)
- Existing bet slip selection shape:

```ts
addSelection({
  matchId: `${match.id}-${oddId}`,
  league, home, away,
  betType: "1x2",
  selection: label,
  odds,
  gamepick: oddId,
  realMatchId: match.id,
  schedule, country,
});
```

- `handleOddClick` logic in `ClassicMatchRow` (only extend what feeds into it)

---

## Files to update (only these)

1. **`src/lib/sports-api.ts`** (or wherever `featured_market_instances` → `win_odds` is mapped)
2. **`src/lib/sports-utils.ts`** — `splitAndSortOdds`
3. **`src/components/ClassicMatchRow.tsx`** — minimal display logic for 2-way vs 3-way

Optional: **`src/lib/neogen/registry.ts`** — register `HOME` / `AWAY` bet type names if needed.

---

## Step 1: Map 2-way featured markets into `win_odds`

In the event → `ApiMatch` mapper, **after** existing football mapping, add a fallback for 2-way winner markets.

### Detection rules

Treat a featured market as **2-way** when ALL are true:

- Exactly **2** active outcomes (`is_enabled && is_active && odds > 0`)
- Same `mark_ins_id` for both outcomes
- **No** outcome named `"Draw"`
- Market name matches (case-insensitive):
  - `"Match Winner (2 way)"`
  - `"Match Winner"`
  - `"Match Result"` with only 2 outcomes

### Mapping rules

For 2-way markets, map outcomes **by order** (first = home/player1, second = away/player2).  
**Do not** require `outcome_id` to be `"1"` / `"2"` / `"3"`.

```ts
// Pseudocode — integrate into existing mapper, do not replace football path
function mapTwoWayFeatured(instances, match): WinOdd[] | null {
  const active = instances.filter(i => i.is_enabled && i.is_active && i.odds > 0);
  const byMarket = groupBy(active, i => i.mark_ins_id);

  for (const outcomes of byMarket.values()) {
    if (outcomes.length !== 2) continue;
    if (outcomes.some(o => o.outcome_name === "Draw")) continue;

    const marketName = outcomes[0].market_name ?? "";
    const isTwoWayMarket =
      /match winner/i.test(marketName) ||
      (marketName === "Match Result" && outcomes.length === 2);

    if (!isTwoWayMarket) continue;

    const [o1, o2] = outcomes;
    const homeBt = registerBetTypeName("HOME");  // existing registry helper
    const awayBt = registerBetTypeName("AWAY");

    return [
      toWinOdd(o1, homeBt, match),  // same toWinOdd helper used for football
      toWinOdd(o2, awayBt, match),
    ];
  }
  return null;
}
```

### Priority (important — avoids breaking football)

```
1. If existing football 3-way / double-chance mapping produces win_odds → keep it (unchanged)
2. Else if mapTwoWayFeatured returns 2 items → use those as win_odds
3. Else → win_odds = [] (current behavior)
```

---

## Step 2: Extend `splitAndSortOdds` (non-breaking)

Add a `twoWay` return bucket. **Existing `threeWay` and `doubleChance` logic must stay identical.**

```ts
export function splitAndSortOdds(winOdds, betTypeMap) {
  // KEEP existing threeWay + doubleChance sorting exactly as-is
  const threeWay = /* existing */;
  const doubleChance = /* existing */;

  // NEW: only when football buckets are empty
  if (threeWay.length === 0 && doubleChance.length === 0 && winOdds.length === 2) {
    const sorted = [...winOdds].sort((a, b) => a.bet_type - b.bet_type);
    // HOME bet_type should sort before AWAY (register HOME with lower id or sort by name)
    return { threeWay: [], doubleChance: [], twoWay: sorted };
  }

  // Also catch explicit HOME/AWAY/PLAYER1/PLAYER2 bet type names
  const twoWay = winOdds.filter(wo => {
    const name = betTypeMap.get(wo.bet_type)?.name?.toUpperCase() ?? "";
    return ["HOME", "AWAY", "PLAYER1", "PLAYER2"].includes(name);
  });

  if (threeWay.length === 0 && doubleChance.length === 0 && twoWay.length === 2) {
    return { threeWay: [], doubleChance: [], twoWay };
  }

  return { threeWay, doubleChance, twoWay: [] };
}
```

---

## Step 3: Minimal `ClassicMatchRow` change

```tsx
const LABEL_ORDER_3WAY = ["1", "X", "2", "1X", "X2", "12"];
const LABEL_ORDER_2WAY = ["1", "2"];

const { threeWay, doubleChance, twoWay } = splitAndSortOdds(match.win_odds || [], betTypeMap);

const isTwoWay = twoWay.length === 2;
const allOdds = isTwoWay ? twoWay : [...threeWay, ...doubleChance];
const labelOrder = isTwoWay ? LABEL_ORDER_2WAY : LABEL_ORDER_3WAY;

// Grid columns — unchanged pattern, just use allOdds.length
style={{
  gridTemplateColumns: `repeat(${Math.min(allOdds.length, 6)}, minmax(0, 1fr))`,
}}

// Inside map — use labelOrder instead of hardcoded LABEL_ORDER
const shortLabel = labelOrder[i] ?? wo.label;
```

**Do not use `"X"` for 2-way sports** — use `"1"` and `"2"` only.

---

## Step 4: Bet slip labels (must work for selections)

When building the selection `label` passed to `handleOddClick` / `addSelection`:

| Sport | `selection` label shown in slip |
|-------|----------------------------------|
| Football 3-way | Existing resolved labels (`1`, `X`, `2`, etc.) — **unchanged** |
| 2-way (darts/tennis) | Use `resolveBetTypeName("HOME", home, away)` → `"1"` and `"AWAY"` → `"2"`, **or** player short name if `useFullNames` is preferred |

**Critical:** `gamepick` must remain `wo.id` (the `outcome_ins_id` from API).  
**Critical:** `isSelected(selId, wo.label)` must use the **same label string** on add and check.

For 2-way darts after fix, slip should show something like:

```
Modus Super Series
Jose Justicia v Brian Raman
1 @ 2.50
```

---

## Acceptance criteria

### Football (regression — must still pass)

- [ ] 3-way match shows `1 | X | 2` when only match result featured
- [ ] 6-way match shows `1 | X | 2 | 1X | X2 | 12` when double chance included
- [ ] Clicking an odd adds/removes from bet slip correctly
- [ ] Selected state highlights the correct button

### Darts (new — must pass)

- [ ] `Jose Justicia v Brian Raman` shows **2 buttons**: `1` (2.50) and `2` (1.51)
- [ ] `+12` still visible on the row
- [ ] Clicking `1` adds selection with odds `2.50`, `gamepick` = `outcome_ins_id` of Justicia
- [ ] Clicking again removes selection
- [ ] Selected button shows primary highlight

### Tennis (new — must pass)

- [ ] ITF matches with 2 featured outcomes show `1 | 2` (not `1 | X` unless already working and intentional)

---

## Debug checklist (if still broken)

Log in `ClassicMatchRow` for one darts match:

```ts
console.log(match.name, match.win_odds, match.item_count);
```

| `win_odds` | Problem location |
|------------|------------------|
| `[]` | Step 1 mapper — `featured_market_instances` not converted |
| 2 items, no UI | Step 2 `splitAndSortOdds` — not returning `twoWay` |
| 2 items, UI ok, slip broken | Step 4 label / `gamepick` mismatch |

---

## Summary

- API is fine — `featured_market_instances` has darts odds.
- Fix the **mapper** and **`splitAndSortOdds`** to support 2-way markets alongside existing football logic.
- Touch **`ClassicMatchRow` only for display** (2 columns, labels `1`/`2`).
- Keep all existing football paths and bet slip APIs unchanged.
