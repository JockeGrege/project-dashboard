import { useContext, useSyncExternalStore } from "react";
import { StoreContext } from "./store-context";
import type { Store, StoreSnapshot } from "./store";

function useStoreContext(): Store {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error("useStore must be used within <StoreProvider>.");
  }
  return store;
}

/** The reactive dataset snapshot. Re-renders the caller on any change. */
export function useStore(): StoreSnapshot {
  const store = useStoreContext();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

/** The stable mutation surface. Does not cause re-renders. */
export function useStoreApi(): Store {
  return useStoreContext();
}
