import { useMatches } from "@remix-run/react";

// TODO: Decide if I love or hate this
export function useParentData<T>() {
  return useMatches().slice(-2)[0].data as T;
}
