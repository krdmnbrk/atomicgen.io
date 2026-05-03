import { useCallback, useEffect, useState } from 'react';

const KEY = 'atomicgen.library.v1';
// Same-tab fan-out — `storage` events only fire across tabs, so we emit
// a synthetic CustomEvent to keep multiple useLocalLibrary instances
// (drawer + InputButtons count badge + YamlContent save button) in sync
// within a single tab.
const CHANGE_EVENT = 'atomicgen.library.changed';

function notify() {
    try {
        window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
        /* noop */
    }
}

function read() {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function write(items) {
    try {
        localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
        /* quota */
    }
}

function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Multi-slot localStorage-backed library so users can keep more than one
// in-progress test. Independent of the single auto-save draft slot.
export default function useLocalLibrary() {
    const [items, setItems] = useState(read);

    // Stay in sync — both across tabs (storage event) and within the
    // same tab (custom CHANGE_EVENT we dispatch on every mutation below).
    useEffect(() => {
        const storageHandler = (e) => {
            if (e.key === KEY) setItems(read());
        };
        const sameTabHandler = () => setItems(read());
        window.addEventListener('storage', storageHandler);
        window.addEventListener(CHANGE_EVENT, sameTabHandler);
        return () => {
            window.removeEventListener('storage', storageHandler);
            window.removeEventListener(CHANGE_EVENT, sameTabHandler);
        };
    }, []);

    const save = useCallback((name, inputs) => {
        setItems((prev) => {
            const now = new Date().toISOString();
            const cleanedName = (name && name.trim()) || `Untitled — ${now.slice(0, 16).replace('T', ' ')}`;
            const next = [
                { id: uuid(), name: cleanedName, inputs, savedAt: now },
                ...prev,
            ];
            write(next);
            notify();
            return next;
        });
    }, []);

    const remove = useCallback((id) => {
        setItems((prev) => {
            const next = prev.filter((x) => x.id !== id);
            write(next);
            notify();
            return next;
        });
    }, []);

    const rename = useCallback((id, newName) => {
        setItems((prev) => {
            const next = prev.map((x) =>
                x.id === id ? { ...x, name: (newName && newName.trim()) || x.name } : x
            );
            write(next);
            notify();
            return next;
        });
    }, []);

    return { items, save, remove, rename };
}
