import { useEffect } from 'react';

// Tiny global keyboard-shortcut hook. Pass a map of `keyCombo → handler`.
// Combos: "mod+k", "mod+shift+s", "?", "esc". `mod` = Cmd on macOS, Ctrl
// elsewhere. Multi-key combos with `+`. Single non-mod keys allowed when
// the user isn't typing in an input/textarea/contenteditable element.
//
// Handlers receive the event; call `event.preventDefault()` if you want
// to swallow it.

function isTypingTarget(target) {
    if (!target) return false;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (target.isContentEditable) return true;
    return false;
}

function comboMatches(e, combo) {
    const parts = combo.toLowerCase().split('+').map((s) => s.trim());
    const key = parts[parts.length - 1];
    const wantMod = parts.includes('mod');
    const wantShift = parts.includes('shift');
    const wantAlt = parts.includes('alt');

    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || '');
    const modPressed = isMac ? e.metaKey : e.ctrlKey;

    if (wantMod !== modPressed) return false;
    if (wantShift !== e.shiftKey) return false;
    if (wantAlt !== e.altKey) return false;

    // Compare key — special-case "esc" / "escape", otherwise direct.
    const eventKey = (e.key || '').toLowerCase();
    if (key === 'esc' || key === 'escape') return eventKey === 'escape';
    if (key === '?') return e.key === '?';
    return eventKey === key;
}

export default function useKeyboardShortcuts(shortcuts) {
    useEffect(() => {
        const handler = (e) => {
            const isTyping = isTypingTarget(e.target);
            for (const [combo, fn] of Object.entries(shortcuts || {})) {
                // Allow mod-combos and Escape even while typing; block plain
                // keys (like "?", "/") when in inputs.
                const involvesMod = /mod\+/i.test(combo);
                const isEscape = /^esc(ape)?$/i.test(combo);
                if (isTyping && !involvesMod && !isEscape) continue;
                if (comboMatches(e, combo)) {
                    fn(e);
                    return;
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [shortcuts]);
}
