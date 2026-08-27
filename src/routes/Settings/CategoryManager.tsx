import { useState } from "react";
import { CATEGORY_COLOURS, DEFAULT_CATEGORY_COLOUR, type Category } from "@/domain";
import { useStore, useStoreApi } from "@/store";
import { ConfirmDialog, Popover } from "@/ui";
import styles from "./CategoryManager.module.css";

/** Create, rename, recolour, reorder and delete categories. */
export function CategoryManager() {
  const { categories } = useStore();
  const store = useStoreApi();
  const [newName, setNewName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  const move = (index: number, dir: -1 | 1) => {
    const next = [...categories];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    if (item) next.splice(target, 0, item);
    void store.reorderCategories(next.map((c) => c.id));
  };

  return (
    <div className={styles.manager}>
      <ul className={styles.list}>
        {categories.map((category, index) => (
          <li key={category.id} className={styles.row}>
            <Popover
              triggerLabel={`Colour for ${category.name}`}
              align="start"
              trigger={
                <span
                  className={styles.swatch}
                  style={{ background: category.colour }}
                />
              }
            >
              {(close) => (
                <div className={styles.swatchGrid}>
                  {CATEGORY_COLOURS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={styles.swatchOption}
                      data-active={c.hex === category.colour}
                      style={{ background: c.hex }}
                      aria-label={c.label}
                      onClick={() => {
                        void store.updateCategory(category.id, { colour: c.hex });
                        close();
                      }}
                    />
                  ))}
                </div>
              )}
            </Popover>

            <input
              className={styles.name}
              defaultValue={category.name}
              aria-label={`Rename ${category.name}`}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value && value !== category.name) {
                  void store.updateCategory(category.id, { name: value });
                } else {
                  e.target.value = category.name;
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />

            <div className={styles.controls}>
              <button
                type="button"
                className={styles.arrow}
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Move ${category.name} up`}
              >
                ↑
              </button>
              <button
                type="button"
                className={styles.arrow}
                onClick={() => move(index, 1)}
                disabled={index === categories.length - 1}
                aria-label={`Move ${category.name} down`}
              >
                ↓
              </button>
              <button
                type="button"
                className={styles.remove}
                onClick={() => setPendingDelete(category)}
              >
                delete
              </button>
            </div>
          </li>
        ))}
        {categories.length === 0 ? (
          <li className={styles.empty}>No categories yet.</li>
        ) : null}
      </ul>

      <form
        className={styles.addRow}
        onSubmit={(e) => {
          e.preventDefault();
          const name = newName.trim();
          if (!name) return;
          void store.createCategory({ name, colour: DEFAULT_CATEGORY_COLOUR });
          setNewName("");
        }}
      >
        <input
          className={styles.name}
          placeholder="new category"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit" className={styles.add} disabled={!newName.trim()}>
          Add
        </button>
      </form>

      {pendingDelete ? (
        <ConfirmDialog
          title={`Delete “${pendingDelete.name}”?`}
          body="Its projects move to Uncategorised. The projects themselves are kept."
          confirmLabel="Delete category"
          tone="danger"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            void store.deleteCategory(pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      ) : null}
    </div>
  );
}
