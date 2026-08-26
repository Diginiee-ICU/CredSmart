import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop ensures that when navigating between different routes,
 * the window and any scrollable primary content containers scroll to top automatically.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // 1. Reset standard window scroll
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });

    // 2. Reset scroll on any main viewport / wrapper containers
    const scrollContainers = document.querySelectorAll(
      "main, .flex-1.overflow-y-auto, [data-scroll-container]"
    );
    scrollContainers.forEach((el) => {
      el.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });
  }, [pathname, search]);

  return null;
}
