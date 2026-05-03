import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls the window to the top of the page on every route change.
 *
 * - Excluded routes (anchor / multi-step / scroll-restoration use cases): you can pass
 *   `exclude` patterns. Defaults: nothing excluded — every navigation jumps to top.
 * - If the new URL contains a hash (#section), we let the browser handle anchor scroll
 *   instead of forcing top.
 *
 * Usage: <BrowserRouter><ScrollToTop /><Routes>…</Routes></BrowserRouter>
 */
export default function ScrollToTop({ behavior = "instant" }) {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Anchor scroll: let the browser jump to the #section after a tick.
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    // Default: jump to the very top — fixes "you land at the bottom of the page".
    window.scrollTo({ top: 0, left: 0, behavior });
  }, [pathname, hash, behavior]);

  return null;
}
