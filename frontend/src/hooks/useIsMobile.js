import { UI_CONSTANTS } from "@faster-chat/shared";
import { useEffect, useState } from "preact/hooks";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < UI_CONSTANTS.BREAKPOINT_MD;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsMobile(window.innerWidth < UI_CONSTANTS.BREAKPOINT_MD);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}
