import * as React from "react"

const MOBILE_BREAKPOINT = 768

// shadcn ships this as useState + useEffect, which the React Compiler lint rightly flags: the
// effect sets state on mount purely to read a value that already exists. useSyncExternalStore is
// the same subscription without the extra render, and it gives SSR an explicit answer.
function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    // Server snapshot. The sidebar renders expanded by default, so desktop is the match that
    // avoids a visible swap on hydration for the console's usual viewport.
    () => false,
  )
}
