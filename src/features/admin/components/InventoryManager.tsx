"use client";

import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/shared/AppCard";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/use-locale";

type Ingredient = {
  id: string;
  name: string;
  stock: number;
  unit: string;
  lowStockThreshold: number;
  isLowStock: boolean;
  recipes: Array<{
    menuItemName: string;
    quantityNeeded: number;
  }>;
};

export function InventoryManager() {
  const { locale } = useLocale();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [menuItems, setMenuItems] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [stock, setStock] = useState("10");
  const [unit, setUnit] = useState("kg");
  const [threshold, setThreshold] = useState("2");
  const [recipeItemId, setRecipeItemId] = useState("");
  const [recipeIngredientId, setRecipeIngredientId] = useState("");
  const [recipeQty, setRecipeQty] = useState("1");

  const load = useCallback(async () => {
    setLoading(true);
    const [invRes, menuRes] = await Promise.all([
      fetch("/api/inventory"),
      fetch("/api/menu"),
    ]);
    if (invRes.ok) {
      const json = await invRes.json();
      setIngredients(json.ingredients ?? []);
    }
    if (menuRes.ok) {
      const json = await menuRes.json();
      const items =
        json.categories?.flatMap(
          (c: { items: Array<{ id: string; name: string }> }) => c.items
        ) ?? [];
      setMenuItems(items);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createIngredient() {
    if (!name) return;
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        stock: Number(stock),
        unit,
        lowStockThreshold: Number(threshold),
      }),
    });
    setName("");
    await load();
  }

  async function updateStock(id: string, newStock: number) {
    await fetch(`/api/inventory/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: newStock }),
    });
    await load();
  }

  async function linkRecipe() {
    if (!recipeItemId || !recipeIngredientId) return;
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menuItemId: recipeItemId,
        ingredientId: recipeIngredientId,
        quantityNeeded: Number(recipeQty),
      }),
    });
    await load();
  }

  if (loading) {
    return <p className="text-muted-foreground">{t("admin.loading", locale)}</p>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{t("admin.inventory", locale)}</h2>

      <AppCard>
        <h3 className="mb-3 font-medium">{t("admin.add_ingredient", locale)}</h3>
        <div className="flex flex-wrap gap-2">
          <input
            className="rounded-lg border border-card-border px-3 py-2 text-sm"
            placeholder={t("admin.ingredient_name", locale)}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="number"
            className="w-24 rounded-lg border border-card-border px-3 py-2 text-sm"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
          <input
            className="w-20 rounded-lg border border-card-border px-3 py-2 text-sm"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
          <button
            type="button"
            onClick={() => createIngredient()}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            {t("admin.save", locale)}
          </button>
        </div>
      </AppCard>

      <AppCard>
        <h3 className="mb-3 font-medium">{t("admin.link_recipe", locale)}</h3>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-lg border border-card-border px-3 py-2 text-sm"
            value={recipeItemId}
            onChange={(e) => setRecipeItemId(e.target.value)}
          >
            <option value="">{t("admin.select_menu_item", locale)}</option>
            {menuItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-card-border px-3 py-2 text-sm"
            value={recipeIngredientId}
            onChange={(e) => setRecipeIngredientId(e.target.value)}
          >
            <option value="">{t("admin.select_ingredient", locale)}</option>
            {ingredients.map((ing) => (
              <option key={ing.id} value={ing.id}>
                {ing.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="w-20 rounded-lg border border-card-border px-3 py-2 text-sm"
            value={recipeQty}
            onChange={(e) => setRecipeQty(e.target.value)}
          />
          <button
            type="button"
            onClick={() => linkRecipe()}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            {t("admin.link_recipe", locale)}
          </button>
        </div>
      </AppCard>

      <div className="space-y-3">
        {ingredients.map((ing) => (
          <AppCard key={ing.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={`font-medium ${ing.isLowStock ? "text-destructive" : ""}`}>
                  {ing.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {ing.stock} {ing.unit}
                  {ing.recipes.length > 0
                    ? ` · ${ing.recipes.map((r) => r.menuItemName).join(", ")}`
                    : null}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateStock(ing.id, ing.stock + 5)}
                  className="rounded-lg border border-card-border px-3 py-1 text-sm"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => updateStock(ing.id, 0)}
                  className="rounded-lg bg-destructive px-3 py-1 text-sm text-destructive-foreground"
                >
                  0
                </button>
              </div>
            </div>
          </AppCard>
        ))}
      </div>
    </div>
  );
}
