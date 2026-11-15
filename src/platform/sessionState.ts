import { useState } from "react";

/* State kept in memory for as long as the app is open, so a half-filled record
   survives moving between modules. Nothing is written to storage. */
const store = new Map<string, unknown>();

export function useSessionState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => (store.has(key) ? (store.get(key) as T) : initial));
  return [
    v,
    (next: T) => {
      store.set(key, next);
      setV(next);
    },
  ];
}
