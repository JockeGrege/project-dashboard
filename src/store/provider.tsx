import { type ReactNode } from "react";
import { StoreContext } from "./store-context";
import type { Store } from "./store";

export interface StoreProviderProps {
  store: Store;
  children: ReactNode;
}

export function StoreProvider({ store, children }: StoreProviderProps) {
  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
}
