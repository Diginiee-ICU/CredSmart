import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Helper to instantly scroll any target element and all its scrollable children to top
 */
export function scrollElementAndChildrenToTop(root: HTMLElement | Element) {
  try {
    if ("scrollTop" in root) {
      (root as HTMLElement).scrollTop = 0;
      root.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }

    const scrollables = root.querySelectorAll(
      ".overflow-y-auto, .overflow-auto, .max-h-\\[90dvh\\], .max-h-\\[92vh\\], .max-h-\\[96vh\\], [role='dialog'], form, main, [data-scrollable], [data-radix-scroll-area-viewport], [class*='overflow-y-auto']"
    );
    scrollables.forEach((el) => {
      (el as HTMLElement).scrollTop = 0;
      el.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });
  } catch (err) {
    // silent fallback
  }
}

/**
 * ScrollToTop ensures:
 * 1. When navigating between routes, window and content containers scroll to top.
 * 2. When ANY modal, pop up, or dialog opens anywhere in the application, it automatically scrolls to top.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  // 1. Reset page & container scroll on route change
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });

    const scrollContainers = document.querySelectorAll(
      "main, .flex-1.overflow-y-auto, [data-scroll-container]"
    );
    scrollContainers.forEach((el) => {
      (el as HTMLElement).scrollTop = 0;
      el.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });
  }, [pathname, search]);

  // 2. Global Modal / Popup Autoscroll-To-Top Watcher
  useEffect(() => {
    const handleModalOpen = (targetNode: Element) => {
      const isModal =
        targetNode.matches?.(
          "[role='dialog'], [data-state='open'], [aria-modal='true'], .z-modal, [data-radix-portal], .fixed.inset-0, [class*='fixed'][class*='inset-0'], [class*='z-50']"
        ) ||
        targetNode.querySelector?.(
          "[role='dialog'], [data-state='open'], [aria-modal='true'], .z-modal, .z-50.fixed, [data-dialog-content], [class*='fixed'][class*='inset-0']"
        );

      if (isModal) {
        // Immediate scroll to top
        scrollElementAndChildrenToTop(targetNode);

        // Frame-delayed scroll to top (after CSS layout recalculation)
        requestAnimationFrame(() => {
          scrollElementAndChildrenToTop(targetNode);
        });

        // Timeout backup (after form hydration / dynamic fields load)
        const t1 = setTimeout(() => {
          scrollElementAndChildrenToTop(targetNode);
        }, 50);

        const t2 = setTimeout(() => {
          scrollElementAndChildrenToTop(targetNode);
        }, 150);

        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
        };
      }
    };

    // MutationObserver to catch any modal added to the DOM or opened via state change
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof Element) {
              handleModalOpen(node);
            }
          });
        } else if (mutation.type === "attributes") {
          if (
            (mutation.attributeName === "data-state" ||
              mutation.attributeName === "open" ||
              mutation.attributeName === "aria-hidden" ||
              mutation.attributeName === "class") &&
            mutation.target instanceof Element
          ) {
            const el = mutation.target as Element;
            if (
              el.getAttribute("data-state") === "open" ||
              el.getAttribute("aria-modal") === "true" ||
              el.getAttribute("role") === "dialog" ||
              el.classList.contains("z-modal") ||
              el.classList.contains("fixed")
            ) {
              handleModalOpen(el);
            }
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "open", "aria-modal", "class"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
