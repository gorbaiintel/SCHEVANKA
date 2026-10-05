import { useEffect, useRef } from 'react';

export interface HotkeyConfig {
  /** The key string, e.g. '1', '2', '3', 'b', 's', 'f', 'Escape', '?' */
  key: string;
  /** Callback to trigger */
  handler: (e: KeyboardEvent) => void;
  /** Whether Ctrl key must be pressed (default false) */
  ctrl?: boolean;
  /** Whether Shift key must be pressed (optional) */
  shift?: boolean;
  /** Whether Alt key must be pressed (default false) */
  alt?: boolean;
  /** Whether Meta / Cmd key must be pressed (default false) */
  meta?: boolean;
  /** Prevent default browser behavior (default true) */
  preventDefault?: boolean;
  /** Whether this specific hotkey is enabled (default true) */
  enabled?: boolean;
  /** Human-readable label for cheatsheet */
  label?: string;
  /** Description for cheatsheet / UI */
  description?: string;
  /** Category for cheatsheet */
  category?: 'Views' | 'Trading' | 'Navigation' | 'General' | 'Drawing';
}

export interface UseHotkeysOptions {
  enabled?: boolean;
  enableInInputs?: boolean;
}

/**
 * Global Hotkey Hook
 * Intercepts keyboard shortcuts when the user is not actively typing in input,
 * textarea, select, or contenteditable fields.
 */
export function useHotkeys(
  hotkeys: HotkeyConfig[],
  options: UseHotkeysOptions = {}
) {
  const { enabled = true, enableInInputs = false } = options;
  const hotkeysRef = useRef(hotkeys);
  hotkeysRef.current = hotkeys;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // 1. Check if user is typing in any form input
      if (!enableInInputs) {
        const target = event.target as HTMLElement | null;
        if (target) {
          const tagName = target.tagName?.toLowerCase();
          const isEditable =
            tagName === 'input' ||
            tagName === 'textarea' ||
            tagName === 'select' ||
            target.isContentEditable ||
            target.getAttribute('role') === 'textbox';

          if (isEditable) {
            return;
          }
        }
      }

      const eventKey = event.key;
      const eventCode = event.code;

      for (const config of hotkeysRef.current) {
        if (config.enabled === false) continue;

        const targetKey = config.key;

        // Check key equality
        let isKeyMatched = false;

        if (targetKey.length === 1 && !isNaN(Number(targetKey))) {
          // Number key (e.g. '1', '2', '3')
          isKeyMatched =
            eventKey === targetKey ||
            eventCode === `Digit${targetKey}` ||
            eventCode === `Numpad${targetKey}`;
        } else if (targetKey.length === 1 && /[a-zA-Z]/.test(targetKey)) {
          // Letter key (e.g. 'b', 's', 'f') - case insensitive
          isKeyMatched =
            eventKey.toLowerCase() === targetKey.toLowerCase() ||
            eventCode === `Key${targetKey.toUpperCase()}`;
        } else if (targetKey === '?') {
          isKeyMatched = eventKey === '?' || (event.shiftKey && eventKey === '/');
        } else {
          // Other keys like 'Escape', 'Enter', 'Tab'
          isKeyMatched =
            eventKey.toLowerCase() === targetKey.toLowerCase() ||
            eventCode.toLowerCase() === targetKey.toLowerCase();
        }

        if (!isKeyMatched) continue;

        // Modifier key checks
        const ctrlRequired = Boolean(config.ctrl);
        const altRequired = Boolean(config.alt);
        const metaRequired = Boolean(config.meta);

        // Don't accidentally fire if user is doing Ctrl+S (save file) or Ctrl+1 (switch browser tab)
        // unless specifically registered with ctrl: true
        if (event.ctrlKey !== ctrlRequired) continue;
        if (event.altKey !== altRequired) continue;
        if (event.metaKey !== metaRequired) continue;

        if (config.shift !== undefined) {
          if (event.shiftKey !== config.shift) continue;
        }

        if (config.preventDefault !== false) {
          event.preventDefault();
        }

        config.handler(event);
        break; // Match first active hotkey
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, enableInInputs]);
}
