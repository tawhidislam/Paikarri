import { useSyncExternalStore } from 'react';
import { z } from 'zod';
const key = 'paikari-compare';
const empty: string[] = [];
let snapshot: string[] = empty;
try {
  snapshot = z
    .array(z.uuid())
    .max(4)
    .parse(JSON.parse(localStorage.getItem(key) ?? '[]'));
} catch {
  /* Invalid saved IDs are discarded. */
}
const listeners = new Set<() => void>();
function update(ids: string[]) {
  snapshot = ids;
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* Comparison still works in memory. */
  }
  listeners.forEach((f) => f());
}
window.addEventListener('storage', (e) => {
  if (e.key === key) {
    try {
      snapshot = z
        .array(z.uuid())
        .max(4)
        .parse(JSON.parse(e.newValue ?? '[]'));
    } catch {
      snapshot = [];
    }
    listeners.forEach((f) => f());
  }
});
export function useComparison() {
  const ids = useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => {
        listeners.delete(f);
      };
    },
    () => snapshot,
    () => empty,
  );
  return {
    ids,
    toggle(id: string) {
      z.uuid().parse(id);
      if (ids.includes(id)) update(ids.filter((v) => v !== id));
      else {
        if (ids.length === 4)
          throw new Error('Remove a product before adding another. You can compare four products.');
        update([...ids, id]);
      }
    },
  };
}
