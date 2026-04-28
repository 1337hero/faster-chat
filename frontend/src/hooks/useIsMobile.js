import { UI_CONSTANTS } from "@faster-chat/shared";
import { useEffect, useState } from "preact/hooks";

export function useIsMobile() {
  const query = `(max-width: ${UI_CONSTANTS.BREAKPOINT_MD - 1}px)`;

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mql = window.matchMedia(query);
    const handler = (e) => setIsMobile(e.matches);

    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
}
