import { createContext } from "react";
import type { Store } from "./store";

/** Kept in its own file so the provider module exports only a component (HMR). */
export const StoreContext = createContext<Store | null>(null);
