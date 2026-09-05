"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Gives a modal the keyboard behaviour users expect: focus moves into the
 * dialog on open, Tab cycles inside it, Escape closes it, and focus returns to
 * whatever opened it. Attach the returned ref to the dialog panel.
 *
 * Pair it with role="dialog", aria-modal and tabIndex={-1} on that same panel.
 */
export function useModalA11y<T extends HTMLElement>(
  isOpen: boolean,
  onClose?: () => void
) {
  const ref = useRef<T>(null);

  // Held in a ref so an inline arrow for onClose doesn't re-run the focus
  // effect below (which would yank focus back to the top on every render).
  // Assigned in an effect, never during render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = ref.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (firstFocusable ?? panel)?.focus();

    function visibleFocusable(): HTMLElement[] {
      if (!ref.current) return [];
      return Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        // Capture phase + stopImmediatePropagation so the dashboard's own
        // Escape shortcut doesn't also fire behind the open dialog.
        event.stopImmediatePropagation();
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab") return;
      const items = visibleFocusable();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  return ref;
}
