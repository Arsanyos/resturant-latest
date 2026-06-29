"use client";

import { useCallback, useEffect, useState } from "react";
import { AppCard } from "@/components/shared/AppCard";
import { Money } from "@/components/shared/Money";
import { t } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/use-locale";

type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  basePrice: number;
  imageUrl: string;
  manualAvailable: boolean;
  derivedAvailable: boolean;
  modifiers: Array<{ id: string; nameI18nKey: string; priceDelta: number }>;
};

type Category = {
  id: string;
  sortOrder: number;
  name: string;
  imageUrl: string | null;
  isActive: boolean;
  items: MenuItem[];
};

type CategoryForm = {
  name: string;
  imageUrl: string | null;
  imageFile: File | null;
};

type ItemForm = {
  categoryId: string;
  name: string;
  description: string;
  basePrice: string;
  imageUrl: string;
  imageFile: File | null;
};

const emptyCategoryForm = (): CategoryForm => ({
  name: "",
  imageUrl: null,
  imageFile: null,
});

const emptyItemForm = (categoryId: string): ItemForm => ({
  categoryId,
  name: "",
  description: "",
  basePrice: "",
  imageUrl: "",
  imageFile: null,
});

async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/menu/upload", { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error ?? "Upload failed");
  }
  return json.url as string;
}

export function MenuManager() {
  const { locale } = useLocale();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const [categoryModal, setCategoryModal] = useState<
    { mode: "create" } | { mode: "edit"; category: Category } | null
  >(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategoryForm());

  const [itemModal, setItemModal] = useState<
    { mode: "create"; categoryId: string } | { mode: "edit"; item: MenuItem } | null
  >(null);
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm(""));

  const [modifierItem, setModifierItem] = useState<MenuItem | null>(null);
  const [modifierKey, setModifierKey] = useState("");
  const [modifierPrice, setModifierPrice] = useState("30");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/menu");
    if (res.ok) {
      const json = await res.json();
      setCategories(json.categories ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreateCategory() {
    setCategoryForm(emptyCategoryForm());
    setCategoryModal({ mode: "create" });
    setError(null);
  }

  function openEditCategory(category: Category) {
    setCategoryForm({
      name: category.name,
      imageUrl: category.imageUrl,
      imageFile: null,
    });
    setCategoryModal({ mode: "edit", category });
    setError(null);
  }

  function openCreateItem(categoryId: string) {
    setItemForm(emptyItemForm(categoryId));
    setItemModal({ mode: "create", categoryId });
    setError(null);
  }

  function openEditItem(item: MenuItem) {
    setItemForm({
      categoryId: item.categoryId,
      name: item.name,
      description: item.description ?? "",
      basePrice: String(item.basePrice),
      imageUrl: item.imageUrl,
      imageFile: null,
    });
    setItemModal({ mode: "edit", item });
    setError(null);
  }

  async function saveCategory() {
    if (!categoryModal || !categoryForm.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      let imageUrl = categoryForm.imageUrl;
      if (categoryForm.imageFile) {
        imageUrl = await uploadImage(categoryForm.imageFile);
      }

      if (categoryModal.mode === "create") {
        const res = await fetch("/api/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: categoryForm.name.trim(),
            imageUrl,
          }),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error ?? "Failed to create category");
        }
      } else {
        const res = await fetch(
          `/api/menu/categories/${categoryModal.category.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: categoryForm.name.trim(),
              imageUrl,
            }),
          }
        );
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error ?? "Failed to update category");
        }
      }

      setCategoryModal(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCategoryActive(category: Category) {
    setSaving(true);
    await fetch(`/api/menu/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !category.isActive }),
    });
    await load();
    setSaving(false);
  }

  async function deleteCategory(category: Category) {
    if (
      !confirm(
        category.items.length > 0
          ? t("admin.disable_category_confirm", locale)
          : t("admin.delete_category_confirm", locale)
      )
    ) {
      return;
    }
    setSaving(true);
    await fetch(`/api/menu/categories/${category.id}`, { method: "DELETE" });
    await load();
    setSaving(false);
  }

  async function saveItem() {
    if (!itemModal || !itemForm.name.trim() || !itemForm.basePrice) return;
    setSaving(true);
    setError(null);
    try {
      let imageUrl = itemForm.imageUrl;
      if (itemForm.imageFile) {
        imageUrl = await uploadImage(itemForm.imageFile);
      }
      if (!imageUrl) {
        throw new Error(t("admin.photo_required", locale));
      }

      const payload = {
        categoryId: itemForm.categoryId,
        name: itemForm.name.trim(),
        description: itemForm.description.trim() || undefined,
        basePrice: Number(itemForm.basePrice),
        imageUrl,
      };

      if (itemModal.mode === "create") {
        const res = await fetch("/api/menu/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error ?? "Failed to create item");
        }
      } else {
        const res = await fetch(`/api/menu/items/${itemModal.item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error ?? "Failed to update item");
        }
      }

      setItemModal(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(item: MenuItem) {
    setSaving(true);
    await fetch(`/api/menu/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manualAvailable: !item.manualAvailable }),
    });
    await load();
    setSaving(false);
  }

  async function addModifier() {
    if (!modifierItem || !modifierKey) return;
    setSaving(true);
    const existing = modifierItem.modifiers.map((m) => ({
      nameI18nKey: m.nameI18nKey,
      priceDelta: m.priceDelta,
      isRequired: false,
    }));
    await fetch(`/api/menu/items/${modifierItem.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modifiers: [
          ...existing,
          {
            nameI18nKey: modifierKey,
            priceDelta: Number(modifierPrice) || 0,
            isRequired: false,
          },
        ],
      }),
    });
    setModifierKey("");
    setModifierItem(null);
    await load();
    setSaving(false);
  }

  async function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = categories.map((c) => c.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;

    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    setCategories((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      return next.map((id, i) => ({ ...map.get(id)!, sortOrder: i + 1 }));
    });

    setSaving(true);
    await fetch("/api/menu/categories/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryIds: next }),
    });
    setSaving(false);
    setDragId(null);
  }

  if (loading) {
    return <p className="text-muted-foreground">{t("admin.loading", locale)}</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{t("admin.menu", locale)}</h2>
        <button
          type="button"
          disabled={saving}
          onClick={openCreateCategory}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          {t("admin.add_category", locale)}
        </button>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => (
          <div
            key={cat.id}
            draggable
            onDragStart={() => setDragId(cat.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => void handleDrop(cat.id)}
          >
          <AppCard className={!cat.isActive ? "opacity-60" : undefined}>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="cursor-grab text-muted-foreground"
                  title={t("admin.drag_to_reorder", locale)}
                >
                  ⠿
                </span>
                {cat.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cat.imageUrl}
                    alt=""
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : null}
                <div>
                  <h3 className="font-medium">{cat.name}</h3>
                  {!cat.isActive ? (
                    <p className="text-xs text-muted-foreground">
                      {t("admin.inactive", locale)}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => openCreateItem(cat.id)}
                  className="rounded-lg border border-card-border px-3 py-1 text-sm hover:bg-muted"
                >
                  {t("admin.add_item", locale)}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => openEditCategory(cat)}
                  className="rounded-lg border border-card-border px-3 py-1 text-sm hover:bg-muted"
                >
                  {t("admin.edit", locale)}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void toggleCategoryActive(cat)}
                  className="rounded-lg border border-card-border px-3 py-1 text-sm hover:bg-muted"
                >
                  {cat.isActive
                    ? t("admin.disable_category", locale)
                    : t("admin.enable_category", locale)}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void deleteCategory(cat)}
                  className="rounded-lg border border-danger/30 px-3 py-1 text-sm text-danger hover:bg-danger/5"
                >
                  {cat.items.length > 0
                    ? t("admin.disable_category", locale)
                    : t("admin.delete_category", locale)}
                </button>
              </div>
            </div>

            <ul className="space-y-2">
              {cat.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-card-border p-3"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0">
                      <p className="font-medium">{item.name}</p>
                      {item.description ? (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm text-muted-foreground">
                        <Money amount={item.basePrice} /> ·{" "}
                        {item.manualAvailable && item.derivedAvailable
                          ? t("admin.menu_available", locale)
                          : t("admin.menu_unavailable", locale)}
                      </p>
                      {item.modifiers.length > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.modifiers
                            .map((m) => t(m.nameI18nKey, locale))
                            .join(", ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => openEditItem(item)}
                      className="rounded-lg border border-card-border px-3 py-1 text-sm hover:bg-muted"
                    >
                      {t("admin.edit", locale)}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setModifierItem(item)}
                      className="rounded-lg border border-card-border px-3 py-1 text-sm hover:bg-muted"
                    >
                      {t("admin.add_modifier", locale)}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => toggleAvailability(item)}
                      className="rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground"
                    >
                      {item.manualAvailable
                        ? t("admin.disable_item", locale)
                        : t("admin.enable_item", locale)}
                    </button>
                  </div>
                </li>
              ))}
              {cat.items.length === 0 ? (
                <li className="rounded-lg border border-dashed border-card-border p-4 text-center text-sm text-muted-foreground">
                  {t("admin.no_items_in_category", locale)}
                </li>
              ) : null}
            </ul>
          </AppCard>
          </div>
        ))}
      </div>

      {categoryModal ? (
        <Modal
          title={
            categoryModal.mode === "create"
              ? t("admin.add_category", locale)
              : t("admin.edit_category", locale)
          }
          onClose={() => setCategoryModal(null)}
        >
          {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">
                {t("admin.category_name", locale)}
              </span>
              <input
                className="w-full rounded-lg border border-card-border px-3 py-2 text-sm"
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">
                {t("admin.category_image", locale)}
              </span>
              <input
                type="file"
                accept="image/*"
                className="w-full text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setCategoryForm((f) => ({
                    ...f,
                    imageFile: file,
                    imageUrl: file ? URL.createObjectURL(file) : f.imageUrl,
                  }));
                }}
              />
            </label>
            {categoryForm.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={categoryForm.imageUrl}
                alt=""
                className="h-20 w-20 rounded-lg object-cover"
              />
            ) : null}
            <ModalActions
              saving={saving}
              onSave={() => void saveCategory()}
              onCancel={() => setCategoryModal(null)}
              locale={locale}
            />
          </div>
        </Modal>
      ) : null}

      {itemModal ? (
        <Modal
          title={
            itemModal.mode === "create"
              ? t("admin.add_item", locale)
              : t("admin.edit_item", locale)
          }
          onClose={() => setItemModal(null)}
        >
          {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">
                {t("admin.item_category", locale)}
              </span>
              <select
                className="w-full rounded-lg border border-card-border px-3 py-2 text-sm"
                value={itemForm.categoryId}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, categoryId: e.target.value }))
                }
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">
                {t("admin.item_name", locale)}
              </span>
              <input
                className="w-full rounded-lg border border-card-border px-3 py-2 text-sm"
                value={itemForm.name}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">
                {t("admin.item_description", locale)}
              </span>
              <textarea
                className="w-full rounded-lg border border-card-border px-3 py-2 text-sm"
                rows={3}
                value={itemForm.description}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">
                {t("admin.item_price", locale)}
              </span>
              <input
                type="number"
                step="any"
                className="w-full rounded-lg border border-card-border px-3 py-2 text-sm"
                value={itemForm.basePrice}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, basePrice: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">
                {t("admin.item_photo", locale)} *
              </span>
              <input
                type="file"
                accept="image/*"
                required={itemModal.mode === "create"}
                className="w-full text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setItemForm((f) => ({
                    ...f,
                    imageFile: file,
                    imageUrl: file ? URL.createObjectURL(file) : f.imageUrl,
                  }));
                }}
              />
            </label>
            {itemForm.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={itemForm.imageUrl}
                alt=""
                className="h-24 w-24 rounded-lg object-cover"
              />
            ) : null}
            <ModalActions
              saving={saving}
              onSave={() => void saveItem()}
              onCancel={() => setItemModal(null)}
              locale={locale}
            />
          </div>
        </Modal>
      ) : null}

      {modifierItem ? (
        <Modal
          title={`${t("admin.add_modifier", locale)} — ${modifierItem.name}`}
          onClose={() => setModifierItem(null)}
        >
          <div className="space-y-3">
            <input
              className="w-full rounded-lg border border-card-border px-3 py-2 text-sm"
              placeholder="modifier.extra_injera"
              value={modifierKey}
              onChange={(e) => setModifierKey(e.target.value)}
            />
            <input
              type="number"
              className="w-full rounded-lg border border-card-border px-3 py-2 text-sm"
              value={modifierPrice}
              onChange={(e) => setModifierPrice(e.target.value)}
            />
            <ModalActions
              saving={saving}
              onSave={() => void addModifier()}
              onCancel={() => setModifierItem(null)}
              locale={locale}
            />
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <AppCard className="max-h-[90vh] w-full max-w-md overflow-y-auto">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
        {children}
      </AppCard>
    </div>
  );
}

function ModalActions({
  saving,
  onSave,
  onCancel,
  locale,
}: {
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  locale: ReturnType<typeof useLocale>["locale"];
}) {
  return (
    <div className="flex gap-2 pt-2">
      <button
        type="button"
        disabled={saving}
        onClick={onSave}
        className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        {t("admin.save", locale)}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-card-border px-4 py-2 text-sm"
      >
        {t("admin.cancel", locale)}
      </button>
    </div>
  );
}
