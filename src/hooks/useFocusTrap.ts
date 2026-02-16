"use client";

import { useEffect, useRef } from 'react';

/**
 * Traps keyboard focus within a container element.
 * - Tab / Shift+Tab cycle within focusable children
 * - Restores focus to the previously-focused element on unmount
 */
export function useFocusTrap(isActive: boolean) {
    const containerRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isActive) return;

        // Save current focus to restore later
        previousFocusRef.current = document.activeElement as HTMLElement;

        const container = containerRef.current;
        if (!container) return;

        // Focus the container or its first focusable child
        const focusFirst = () => {
            const focusable = getFocusableElements(container);
            if (focusable.length > 0) {
                focusable[0].focus();
            } else {
                container.focus();
            }
        };

        // Small delay to let the modal render
        const timer = setTimeout(focusFirst, 50);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            const focusable = getFocusableElements(container);
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey) {
                // Shift+Tab: if on first element, wrap to last
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                // Tab: if on last element, wrap to first
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('keydown', handleKeyDown);
            // Restore focus
            if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
                previousFocusRef.current.focus();
            }
        };
    }, [isActive]);

    return containerRef;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'textarea:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(container.querySelectorAll<HTMLElement>(selector));
}
