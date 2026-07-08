/**
 * Hook that detects whether the viewport is currently at a mobile width.
 *
 * Uses a `matchMedia` listener for reactive updates.
 *
 * @module use-mobile
 */

import * as React from "react";

/** Pixel width threshold below which the device is considered "mobile". */
const MOBILE_BREAKPOINT = 768;

/**
 * Returns `true` when the viewport width is strictly less than
 * `MOBILE_BREAKPOINT` (768 px). Re-renders on resize.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
