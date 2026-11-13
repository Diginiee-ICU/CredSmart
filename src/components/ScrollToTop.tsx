import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Helper to instantly scroll any target element and all its scrollable children to top
 */
// eslint-disable-next-line react-refresh/only-export-components
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
 * 2. When ANY modal, pop up, or dialog opens anywhere in the application, it automatically scrolls to top ONCE upon opening.
 *    (Subsequent DOM mutations, switch toggles, or typing while filling out forms NEVER trigger unwanted auto-scrolls).
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

  // 2. Global Modal / Popup Autoscroll-To-Top Watcher (Scrolled ONCE upon opening)
  useEffect(() => {
    // Track modal roots that have already been scrolled upon opening
    const scrolledModals = new WeakSet<Element>();

    const isInteractiveInput = () => {
      const active = document.activeElement;
      if (!active) return false;
      const tag = active.tagName.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        (active as HTMLElement).isContentEditable
      );
    };

    const getModalRoot = (node: Element): Element | null => {
      if (
        node.matches?.(
          "[role='dialog'], [data-state='open'], [aria-modal='true'], .z-modal, [data-dialog-content], [data-vaul-drawer]"
        )
      ) {
        return node;
      }
      return (
        node.closest?.(
          "[role='dialog'], [data-state='open'], [aria-modal='true'], .z-modal, [data-dialog-content], [data-vaul-drawer]"
        ) || null
      );
    };

    const handleModalOpen = (targetNode: Element) => {
      // If user is actively typing or interacting with an input/control, never steal scroll
      if (isInteractiveInput()) return;

      const modalRoot = getModalRoot(targetNode);
      if (!modalRoot) return;

      // Ensure modal is scrolled to top ONCE upon initial appearance
      if (scrolledModals.has(modalRoot)) {
        return;
      }
      scrolledModals.add(modalRoot);

      // Immediate scroll to top
      scrollElementAndChildrenToTop(modalRoot);

      // Frame-delayed scroll to top (after CSS layout recalculation)
      requestAnimationFrame(() => {
        if (!isInteractiveInput()) {
          scrollElementAndChildrenToTop(modalRoot);
        }
      });

      // Single backup timeout for dynamic form hydration
      const t1 = setTimeout(() => {
        if (!isInteractiveInput()) {
          scrollElementAndChildrenToTop(modalRoot);
        }
      }, 60);

      return () => clearTimeout(t1);
    };

    // MutationObserver to catch any modal added to the DOM or opened via state change
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof Element) {
              // Only handle if node itself is a modal or contains a modal, NOT if added inside an already open modal
              const parentModal = node.closest?.(
                "[role='dialog'], [data-state='open'], [aria-modal='true'], .z-modal, [data-dialog-content], [data-vaul-drawer]"
              );
              if (parentModal && scrolledModals.has(parentModal)) {
                // Node added inside an already-open, already-scrolled modal (e.g. typing or dynamic fields) -> DO NOT scroll!
                return;
              }
              const modalCandidate =
                node.matches?.(
                  "[role='dialog'], [data-state='open'], [aria-modal='true'], .z-modal, [data-dialog-content], [data-vaul-drawer]"
                )
                  ? node
                  : node.querySelector?.(
                      "[role='dialog'], [data-state='open'], [aria-modal='true'], .z-modal, [data-dialog-content], [data-vaul-drawer]"
                    );
              if (modalCandidate) {
                handleModalOpen(modalCandidate);
              }
            }
          });
        } else if (mutation.type === "attributes") {
          const el = mutation.target;
          if (!(el instanceof Element)) return;

          // Only care when a modal root transitions to open
          if (mutation.attributeName === "data-state") {
            const newState = el.getAttribute("data-state");
            const oldState = mutation.oldValue;
            if (newState === "open" && oldState !== "open") {
              handleModalOpen(el);
            }
          } else if (mutation.attributeName === "open") {
            if (el.hasAttribute("open") && mutation.oldValue === null) {
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
      attributeFilter: ["data-state", "open"],
      attributeOldValue: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
